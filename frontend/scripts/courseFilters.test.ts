import { test } from "node:test";
import assert from "node:assert/strict";
import {
  facetCounts,
  filterCourses,
  inScope,
  parseCourseSearch,
  sortCourses,
  statsById,
  type FacetCourse,
} from "../src/lib/courseFilters.ts";
import type { CourseStats } from "../src/lib/showcase.ts";

const course = (id: number, extra: Partial<FacetCourse> = {}): FacetCourse => ({
  id,
  category: "Yazılım",
  price: 0,
  ...extra,
});
const stat = (courseId: number, extra: Partial<CourseStats> = {}): CourseStats => ({
  courseId,
  students: 0,
  last7: 0,
  prev7: 0,
  last30: 0,
  ratingAverage: 0,
  ratingCount: 0,
  lessons: 0,
  durationSeconds: 0,
  ...extra,
});

const courses = [
  course(1, {
    price: 0,
    level: "Beginner",
    language: "tr",
    subtitleLanguages: "en",
    topic: "Python",
  }),
  course(2, { price: 600, level: "Advanced", language: "en", createdAt: "2026-05-01" }),
  course(3, { price: 1500, level: "Beginner", language: null, subtitleLanguages: "en,de" }),
  course(4, { price: 200, category: "Müzik", createdAt: "2026-09-01" }),
];
const stats = statsById([
  stat(1, { students: 5, ratingAverage: 4.6, ratingCount: 3, durationSeconds: 1800 }),
  stat(2, { students: 9, ratingAverage: 3.2, ratingCount: 10, durationSeconds: 4 * 3600 }),
  stat(3, { students: 1, ratingAverage: 4.6, ratingCount: 8, durationSeconds: 2 * 3600 }),
]);
const ids = (list: FacetCourse[]) => list.map((c) => c.id);
const self = (c: FacetCourse) => c;

test("filters compose and never touch the source list", () => {
  const before = [...courses];
  assert.deepEqual(ids(filterCourses(courses, self, stats, { level: "Beginner" })), [1, 3]);
  assert.deepEqual(
    ids(filterCourses(courses, self, stats, { level: "Beginner", price: "paid" })),
    [3],
  );
  assert.deepEqual(ids(filterCourses(courses, self, stats, { price: "free" })), [1]);
  assert.deepEqual(ids(filterCourses(courses, self, stats, { price: "500to1000" })), [2]);
  assert.deepEqual(ids(filterCourses(courses, self, stats, { duration: "under1" })), [1, 4]);
  assert.deepEqual(ids(filterCourses(courses, self, stats, { duration: "3to6" })), [2]);
  // an unrated course never passes a rating threshold
  assert.deepEqual(ids(filterCourses(courses, self, stats, { rating: 4.5 })), [1, 3]);
  // no language means Turkish
  assert.deepEqual(ids(filterCourses(courses, self, stats, { language: "tr" })), [1, 3, 4]);
  assert.deepEqual(ids(filterCourses(courses, self, stats, { subtitle: "de" })), [3]);
  assert.deepEqual(courses, before);
});

test("sorting returns a copy with stable ties", () => {
  const before = [...courses];
  const title = (c: FacetCourse) => String(c.id);
  assert.deepEqual(ids(sortCourses(courses, self, stats, "popular", title)), [2, 1, 3, 4]);
  // equal averages: more ratings first; unrated last
  assert.deepEqual(ids(sortCourses(courses, self, stats, "rated", title)), [3, 1, 2, 4]);
  assert.deepEqual(ids(sortCourses(courses, self, stats, "newest", title)), [4, 2, 3, 1]);
  assert.deepEqual(ids(sortCourses(courses, self, stats, "priceAsc", title)), [1, 4, 2, 3]);
  assert.deepEqual(ids(sortCourses(courses, self, stats, "priceDesc", title)), [3, 2, 4, 1]);
  assert.deepEqual(courses, before);
});

test("facet counts apply every other filter but their own", () => {
  const levels = facetCounts(courses, self, stats, { level: "Advanced", price: "paid" }, "level");
  assert.deepEqual(Object.fromEntries(levels), { Advanced: 1, Beginner: 1 });
  const ratings = facetCounts(courses, self, stats, {}, "rating");
  assert.deepEqual(Object.fromEntries(ratings), { "4.5": 2, "4": 2, "3.5": 2, "3": 3 });
});

test("scope and URL parsing", () => {
  assert.equal(inScope(courses[0], { category: "Yazılım", topic: "Python" }), true);
  assert.equal(inScope(courses[1], { category: "Yazılım", topic: "Python" }), false);
  assert.deepEqual(
    parseCourseSearch({ rating: "4.5", level: "Expert", sort: "rated", price: "free" }),
    {
      q: undefined,
      category: undefined,
      subCategory: undefined,
      topic: undefined,
      level: undefined,
      price: "free",
      duration: undefined,
      rating: 4.5,
      language: undefined,
      subtitle: undefined,
      sort: "rated",
    },
  );
});

test("facet counts do not depend on the order filters were picked in", () => {
  const list = [
    course(10, { topic: "Python" }),
    course(11, { topic: "Python" }),
    course(12, { topic: "React" }),
    course(13, { topic: "React", category: "Müzik" }),
  ];
  const durations = statsById([
    stat(10, { durationSeconds: 2 * 3600 }),
    stat(11, { durationSeconds: 1800 }),
    stat(12, { durationSeconds: 2 * 3600 }),
    stat(13, { durationSeconds: 2 * 3600 }),
  ]);
  const query = { duration: "1to3" as const, topic: "Python" };
  // the topic counts honour the duration, and the duration counts honour the topic
  const topics = facetCounts(list, self, durations, query, "topic");
  assert.deepEqual(
    [...topics],
    [
      ["Python", 1],
      ["React", 2],
    ],
  );
  assert.equal(facetCounts(list, self, durations, query, "duration").get("1to3"), 1);
  assert.deepEqual(ids(filterCourses(list, self, durations, query)), [10]);
  // the same pick in the other order gives the same list
  const reversed = { topic: "Python", duration: "1to3" as const };
  assert.deepEqual(
    filterCourses(list, self, durations, reversed),
    filterCourses(list, self, durations, query),
  );
  // a category scopes the others' counts
  const inMusic = facetCounts(list, self, durations, { category: "Müzik" }, "topic");
  assert.deepEqual([...inMusic], [["React", 1]]);
});
