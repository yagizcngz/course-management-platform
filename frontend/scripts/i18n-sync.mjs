#!/usr/bin/env node
// Locale sync and check. `npm run i18n:check` fails when:
//   1. a key exists in one of src/locales/{tr,en}.json but not the other (plural forms like
//      key_one/key_other count as the key itself) and scripts/i18n-dictionary.json has no text for it;
//   2. an English value is still Turkish (identical to tr and containing Turkish letters);
//   3. an error message the API returns (BadRequest/NotFound/... literals in backend/**/*.cs) has
//      no rule in src/lib/errorTranslator.ts, so it would reach an English UI in Turkish.
// `npm run i18n:sync` first writes the missing keys it can fill from the dictionary.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const LANGS = ["tr", "en"];
const localePath = (l) => join(root, "src", "locales", `${l}.json`);
const dictPath = join(root, "scripts", "i18n-dictionary.json");

const locales = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(readFileSync(localePath(l), "utf8"))]),
);
const dict = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, "utf8")) : {};

const PLURAL = /_(zero|one|two|few|many|other)$/;
const flatten = (obj, prefix = "", out = new Map()) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
};
const setPath = (obj, key, value) => {
  const parts = key.split(".");
  let node = obj;
  for (const p of parts.slice(0, -1)) node = node[p] ??= {};
  node[parts.at(-1)] = value;
};
const base = (key) => key.replace(PLURAL, "");

const problems = [];
let filled = 0;
let scanned = 0;
let usedKeys = 0;

// 1. parity, filling from the dictionary where it can
const flat = Object.fromEntries(LANGS.map((l) => [l, flatten(locales[l])]));
const bases = Object.fromEntries(LANGS.map((l) => [l, new Set([...flat[l].keys()].map(base))]));
for (const lang of LANGS)
  for (const other of LANGS.filter((o) => o !== lang))
    for (const key of bases[other]) {
      if (bases[lang].has(key)) continue;
      if ((dict.optionalIn?.[lang] ?? []).some((prefix) => key.startsWith(prefix))) continue;
      const text = dict[lang]?.[key];
      if (text === undefined) {
        problems.push(`missing ${lang}: ${key}`);
        continue;
      }
      setPath(locales[lang], key, text);
      bases[lang].add(key);
      filled++;
    }

// 2. English left in Turkish
const TURKISH = /[çğıİöşüÇĞÖŞÜ]/;
const allowSame = new Set(dict.allowSame ?? []);
for (const [key, en] of flatten(locales.en)) {
  const tr = flat.tr.get(key);
  if (typeof en === "string" && en === tr && TURKISH.test(en) && !allowSame.has(key))
    problems.push(`untranslated en: ${key} = ${JSON.stringify(en).slice(0, 80)}`);
}

// 3. every API message has a translation rule
const translator = readFileSync(join(root, "src", "lib", "errorTranslator.ts"), "utf8");
const rules = [...translator.matchAll(/^\s*\[\s*\/((?:\\\/|[^/])+)\/([a-z]*)\s*,/gm)].map(
  ([, src, flags]) => new RegExp(src, flags),
);
const backend = join(root, "..", "backend");
const csFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!/^(bin|obj|Migrations|\.vs|EdTechApi\.Tests)$/.test(name)) walk(p);
      // Program.cs only throws at startup (bad configuration); those messages never reach the UI
    } else if (p.endsWith(".cs") && name !== "Program.cs") csFiles.push(p);
  }
};
if (existsSync(backend)) walk(backend);
const RESULT =
  /\b(?:BadRequest|NotFound|Unauthorized|Conflict|Forbid|StatusCode\(\s*\d+\s*,)\s*\(?\s*\$?"((?:[^"\\]|\\.)*)"/g;
const THROWN =
  /throw new (?:ArgumentException|InvalidOperationException|KeyNotFoundException)\(\s*\$?"((?:[^"\\]|\\.)*)"/g;
for (const file of csFiles) {
  const src = readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, ""); // whole-line comments
  for (const re of [RESULT, THROWN])
    for (const [, raw] of src.matchAll(re)) {
      // interpolated parts become a sample value, as the API would send them
      const message = raw.replace(/\{[^}]*\}/g, "5").replace(/\\"/g, '"');
      if (!message.trim()) continue;
      scanned++;
      if (!rules.some((r) => r.test(message)))
        problems.push(`no errorTranslator rule: "${message}" (${file.slice(backend.length + 1)})`);
    }
}

// 4. every literal t("key") in the UI exists (template keys like t(`a.${b}`) are skipped)
const uiFiles = [];
const walkUi = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkUi(p);
    else if (/\.(tsx?|mjs)$/.test(name) && !name.endsWith(".gen.ts")) uiFiles.push(p);
  }
};
walkUi(join(root, "src"));
for (const file of uiFiles)
  for (const [, key] of readFileSync(file, "utf8").matchAll(/\bt\(\s*"([A-Za-z0-9_.]+)"/g))
    if (++usedKeys && (!bases.en.has(`translation.${key}`) || !bases.tr.has(`translation.${key}`)))
      problems.push(`unknown key: ${key} (${file.slice(root.length + 1)})`);

if (write && filled)
  for (const l of LANGS) writeFileSync(localePath(l), JSON.stringify(locales[l], null, 2) + "\n");
if (filled) console.log(`${write ? "filled" : "can fill"} ${filled} key(s) from ${dictPath}`);
if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} i18n problem(s).`);
  process.exit(1);
}
console.log(
  `i18n ok: ${bases.tr.size} keys in tr and en, ${rules.length} rules cover ${scanned} API messages, ${usedKeys} t() calls resolve.`,
);
