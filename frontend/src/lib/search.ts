/**
 * Lower-cases with Turkish rules, folds diacritics and turns punctuation into spaces, so
 * "yazilim" finds "Yazılım", "IT" finds "it" in either UI language and "kvkk" finds "(KVKK)".
 * `+` and `#` stay, so "c++" and "c#" are not reduced to "c".
 */
export const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .trim();

// connectives that would otherwise match inside unrelated words ("and" in "standard")
const STOP = new Set([
  "and",
  "or",
  "the",
  "of",
  "for",
  "in",
  "a",
  "an",
  "ve",
  "ile",
  "veya",
  "icin",
]);

/** The query's words; connectives are dropped unless the query is nothing else. */
export function queryWords(query: string) {
  const words = fold(query).split(" ").filter(Boolean);
  const kept = words.filter((w) => !STOP.has(w));
  return kept.length ? kept : words;
}

/**
 * How well an item matches: 0 = not at all (some word is in none of the fields), 3 = the whole
 * phrase is in a title, 2 = every word is in one title, 1 = the words are spread over the fields.
 * Words may sit anywhere, in any order. An empty query matches everything with 1.
 * `titles` are the item's names (stored and translated); `fields` everything else searchable.
 */
export function searchRank(query: string, titles: string[], fields: string[] = []) {
  const words = queryWords(query);
  if (!words.length) return 1;
  const hay = fold([...titles, ...fields].join(" "));
  if (!words.every((w) => hay.includes(w))) return 0;
  const folded = titles.map(fold);
  const phrase = fold(query);
  if (folded.some((t) => t.includes(phrase))) return 3;
  if (folded.some((t) => words.every((w) => t.includes(w)))) return 2;
  return 1;
}

/** Whether every word of the query appears somewhere in the fields. */
export const matchesSearch = (query: string, ...fields: string[]) =>
  searchRank(query, [], fields) > 0;

/** Keeps the matches, best first; ties keep their original order. */
export function rankBy<T>(items: T[], rank: (item: T) => number) {
  return items
    .map((item, i) => ({ item, i, r: rank(item) }))
    .filter((x) => x.r > 0)
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map((x) => x.item);
}
