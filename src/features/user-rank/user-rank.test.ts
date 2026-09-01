import { describe, expect, test } from "vitest";
import { USER_RANKS, getLocalizedRankName, getRankFromXP, getRankProgress, getXpToNextRank, resolveUserRank } from "./user-rank";

describe("CrewPort user rank resolver", () => {
  test.each([
    [0,0],[99,0],[100,1],[299,1],[300,2],[699,2],[700,3],[1499,3],
    [1500,4],[2999,4],[3000,5],[5999,5],[6000,6],[11999,6],
    [12000,7],[24999,7],[25000,8],[49999,8],[50000,9],[50001,9],
  ] as const)("maps %i XP to level %i", (xp, level) => expect(getRankFromXP(xp).level).toBe(level));

  test("contains exactly ten contiguous, non-overlapping ranks", () => {
    expect(USER_RANKS).toHaveLength(10);
    USER_RANKS.slice(0, -1).forEach((rank, index) => expect(rank.maxXp! + 1).toBe(USER_RANKS[index + 1].minXp));
    expect(new Set(USER_RANKS.map((rank) => rank.icon)).size).toBe(10);
  });

  test("normalizes invalid XP and keeps very large XP at Ocean Legend", () => {
    expect(resolveUserRank(-5).xp).toBe(0);
    expect(resolveUserRank(Number.NaN).xp).toBe(0);
    expect(resolveUserRank(999_999_999).level).toBe(9);
  });

  test("calculates the approved CaptainSea example", () => {
    const rank = resolveUserRank(18_420);
    expect(rank).toMatchObject({ level: 7, name: "Ocean Vanguard", xpToNextRank: 6_580 });
    expect(getRankProgress(18_420)).toBe(49);
    expect(getXpToNextRank(50_000)).toBeUndefined();
  });

  test("localizes rank names without changing the rank model", () => {
    const signalHunter = resolveUserRank(3_000);
    expect(getLocalizedRankName(signalHunter, "vi")).toBe("Thợ săn tín hiệu");
    expect(getLocalizedRankName(signalHunter, "en")).toBe("Signal Hunter");
    expect(signalHunter.shortTag).toBe("SIGNAL HUNTER");
  });
});
