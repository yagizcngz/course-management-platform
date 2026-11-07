// node --test scripts/ (Node 24 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fold, matchesSearch, rankBy, searchRank } from "../src/lib/search.ts";

const kvkk = ["KVKK ve Bilişim Hukuku", "Data Protection (KVKK) and IT Law"];

test("words match anywhere, in any order, across punctuation", () => {
  for (const q of ["Data Law", "data and law", "Law, Data", "kvkk law", "(kvkk)", "IT LAW"])
    assert.ok(searchRank(q, kvkk) > 0, q);
  assert.equal(searchRank("data biology", kvkk), 0);
});

test("Turkish casing and diacritics fold both ways", () => {
  assert.equal(fold("İSTANBUL Işık"), "istanbul isik");
  assert.ok(matchesSearch("bilisim", ...kvkk));
  assert.ok(matchesSearch("BİLİŞİM", ...kvkk));
  assert.ok(matchesSearch("hukuk", ...kvkk));
});

test("connectives alone still search, and do not match inside other words", () => {
  assert.ok(matchesSearch("and", "Data and Law"));
  assert.ok(!matchesSearch("python and", "Standard library tour"));
});

test("c++ and c# keep their symbols", () => {
  assert.ok(matchesSearch("c++", "Modern C++"));
  assert.ok(!matchesSearch("c++", "C Programming"));
});

test("empty query matches everything", () => {
  assert.equal(searchRank("  ", kvkk), 1);
});

test("phrase in title beats all words in title beats words spread over fields", () => {
  const items = [
    { titles: ["Law Basics"], fields: ["data handling"] },
    { titles: ["Law for Data Teams"], fields: [] },
    { titles: ["Data Law"], fields: [] },
    { titles: ["Cooking"], fields: [] },
  ];
  const ranked = rankBy(items, (i) => searchRank("data law", i.titles, i.fields));
  assert.deepEqual(
    ranked.map((i) => i.titles[0]),
    ["Data Law", "Law for Data Teams", "Law Basics"],
  );
});
