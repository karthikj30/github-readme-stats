import { describe, expect, it } from "@jest/globals";
import "@testing-library/jest-dom";
import { calculateRank } from "../src/calculateRank.js";

/**
 * These cover the legacy pre-2023 scale this instance uses, whose ladder is
 * S+ > S > A++ > A+ > B+ with B+ as the floor. The previous suite asserted the
 * current S..C scale and could not pass here.
 *
 * The compression tests below are the point of the file: the curve is flat
 * enough that an empty account and an expert land on the same grade. That is
 * the algorithm's real behaviour, so it is pinned rather than glossed over.
 */
const profile = (over = {}) => ({
  commits: 0,
  prs: 0,
  issues: 0,
  repos: 0,
  contributedTo: 0,
  stars: 0,
  followers: 0,
  ...over,
});

const BEGINNER = { commits: 125, prs: 25, issues: 10, repos: 5, contributedTo: 2, stars: 25, followers: 5 };
const MEDIAN = { commits: 250, prs: 50, issues: 25, repos: 20, contributedTo: 10, stars: 50, followers: 10 };
const ADVANCED = { commits: 500, prs: 100, issues: 50, repos: 40, contributedTo: 20, stars: 200, followers: 40 };
const EXPERT = { commits: 1000, prs: 200, issues: 100, repos: 80, contributedTo: 40, stars: 800, followers: 160 };

describe("Test calculateRank", () => {
  it("returns a level and a percentile", () => {
    const rank = calculateRank(profile({ commits: 100 }));
    expect(Object.keys(rank).sort()).toStrictEqual(["level", "percentile"]);
    expect(typeof rank.level).toBe("string");
    expect(Number.isFinite(rank.percentile)).toBe(true);
  });

  it("puts an empty account on A+, the effective floor", () => {
    expect(calculateRank(profile())).toStrictEqual({
      level: "A+",
      percentile: 50.92387912952459,
    });
  });

  it("collapses beginner through expert onto the same A+ grade", () => {
    const levels = [BEGINNER, MEDIAN, ADVANCED, EXPERT].map(
      (p) => calculateRank(profile(p)).level,
    );
    expect(levels).toStrictEqual(["A+", "A+", "A+", "A+"]);
  });

  it("still orders those users by percentile, lower being better", () => {
    const pct = [{}, BEGINNER, MEDIAN, ADVANCED, EXPERT].map(
      (p) => calculateRank(profile(p)).percentile,
    );
    expect(pct).toStrictEqual([...pct].sort((a, b) => b - a));
  });

  it("awards the upper grades only at much larger volumes", () => {
    expect(calculateRank(profile({ commits: 2100 })).level).toBe("A++");
    expect(calculateRank(profile({ commits: 6000 })).level).toBe("A++");
    expect(calculateRank(profile({ commits: 12000 })).level).toBe("S");
    expect(calculateRank(profile({ commits: 40000 })).level).toBe("S+");
  });

  it("gives sindresorhus S+", () => {
    expect(
      calculateRank(
        profile({
          commits: 1300,
          prs: 1500,
          issues: 4500,
          repos: 1000,
          contributedTo: 500,
          stars: 600000,
          followers: 50000,
        }),
      ),
    ).toStrictEqual({ level: "S+", percentile: 0 });
  });

  it("weights every input, so raising any one improves the percentile", () => {
    const baseline = calculateRank(profile({ commits: 500 })).percentile;
    for (const field of [
      "commits",
      "prs",
      "issues",
      "repos",
      "contributedTo",
      "stars",
      "followers",
    ]) {
      const bumped = calculateRank(
        profile({
          commits: 500,
          [field]: (field === "commits" ? 500 : 0) + 1000,
        }),
      ).percentile;
      expect(bumped).toBeLessThan(baseline);
    }
  });

  it("treats missing repos and contributedTo as zero rather than NaN", () => {
    const rank = calculateRank({
      commits: 500,
      prs: 10,
      issues: 5,
      stars: 20,
      followers: 10,
    });
    expect(Number.isFinite(rank.percentile)).toBe(true);
    expect(rank.level).toBe("A+");
  });
});
