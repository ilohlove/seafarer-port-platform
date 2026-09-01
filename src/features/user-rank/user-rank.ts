import type { StaffRoleTitle, StaffTitle, StaffTitleDefinition, SupporterDefinition, SupporterTier, UserRankDefinition, UserRankLevel, UserRankReadModel, UserRole } from "../../types";

export const USER_RANKS: readonly UserRankDefinition[] = [
  { level: 0, name: "Port Newcomer", shortTag: "NEW CREW", nameVi: "Tân binh cập cảng", minXp: 0, maxXp: 99, icon: "anchor", visualVariant: "graphite" },
  { level: 1, name: "Deck Explorer", shortTag: "DECK EXPLORER", nameVi: "Nhà thám hiểm boong tàu", minXp: 100, maxXp: 299, icon: "knot", visualVariant: "steelBlue" },
  { level: 2, name: "Wave Tamer", shortTag: "WAVE TAMER", nameVi: "Kẻ thuần sóng", minXp: 300, maxXp: 699, icon: "wave", visualVariant: "seaTeal" },
  { level: 3, name: "Rust Breaker", shortTag: "RUST BREAKER", nameVi: "Chiến binh phá rỉ", minXp: 700, maxXp: 1_499, icon: "scraper", visualVariant: "weatheredBronze" },
  { level: 4, name: "Night Watcher", shortTag: "NIGHT WATCH", nameVi: "Người gác đêm", minXp: 1_500, maxXp: 2_999, icon: "nightWatch", visualVariant: "deepIndigo" },
  { level: 5, name: "Signal Hunter", shortTag: "SIGNAL HUNTER", nameVi: "Thợ săn tín hiệu", minXp: 3_000, maxXp: 5_999, icon: "radar", visualVariant: "radarTeal" },
  { level: 6, name: "Horizon Seeker", shortTag: "HORIZON SEEKER", nameVi: "Kẻ săn chân trời", minXp: 6_000, maxXp: 11_999, icon: "horizon", visualVariant: "copperHorizon" },
  { level: 7, name: "Ocean Vanguard", shortTag: "OCEAN VANGUARD", nameVi: "Tiên phong đại dương", minXp: 12_000, maxXp: 24_999, icon: "shipBow", visualVariant: "royalOcean" },
  { level: 8, name: "Beacon Keeper", shortTag: "BEACON KEEPER", nameVi: "Người giữ hải đăng", minXp: 25_000, maxXp: 49_999, icon: "lighthouse", visualVariant: "maritimeGold" },
  { level: 9, name: "Ocean Legend", shortTag: "OCEAN LEGEND", nameVi: "Huyền thoại đại dương", minXp: 50_000, maxXp: null, icon: "oceanLegend", visualVariant: "blackPearl" },
] as const;

export const STAFF_TITLES: Readonly<Record<StaffTitle, StaffTitleDefinition>> = {
  founder: { id: "founder", name: "Fleet Admiral", tag: "FOUNDER", icon: "helm" },
  admin: { id: "admin", name: "Fleet Commander", tag: "ADMIN", icon: "command" },
  moderator: { id: "moderator", name: "Port Authority", tag: "MODERATOR", icon: "harbor" },
  ops: { id: "ops", name: "CrewPort Operations", tag: "OPS", icon: "operations" },
};

export const SUPPORTER_TIERS: Readonly<Record<SupporterTier, SupporterDefinition>> = {
  bronze: { tier: "bronze", name: "Bronze Supporter", tag: "BRONZE SUPPORTER", icon: "heartAnchor" },
  silver: { tier: "silver", name: "Silver Supporter", tag: "SILVER SUPPORTER", icon: "heartCompass" },
  gold: { tier: "gold", name: "Gold Supporter", tag: "GOLD SUPPORTER", icon: "heartBeacon" },
};

export function getStaffTitleForRole(role: UserRole): StaffRoleTitle | undefined {
  return role === "admin" || role === "moderator" ? role : undefined;
}

function normalizeXp(rawXp: number): number {
  return Math.max(0, Math.floor(Number.isFinite(rawXp) ? rawXp : 0));
}

export function getRankFromXP(rawXp: number): UserRankDefinition {
  const xp = normalizeXp(rawXp);
  return [...USER_RANKS].reverse().find((rank) => xp >= rank.minXp) ?? USER_RANKS[0];
}

export function getNextRank(level: UserRankLevel): UserRankDefinition | undefined {
  return USER_RANKS.find((rank) => rank.level === level + 1);
}

export function getRankProgress(rawXp: number): number {
  const xp = normalizeXp(rawXp);
  const current = getRankFromXP(xp);
  const next = getNextRank(current.level);
  if (!next) return 100;
  return Math.min(100, Math.max(0, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)));
}

export function getXpToNextRank(rawXp: number): number | undefined {
  const xp = normalizeXp(rawXp);
  const next = getNextRank(getRankFromXP(xp).level);
  return next ? Math.max(0, next.minXp - xp) : undefined;
}

export function formatXp(rawXp: number, locale: "vi" | "en" = "en"): string {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(normalizeXp(rawXp));
}

export function getLocalizedRankName(
  rank: Pick<UserRankDefinition, "name" | "nameVi">,
  locale: "vi" | "en",
): string {
  return locale === "vi" ? rank.nameVi : rank.name;
}

export function resolveUserRank(rawXp: number): UserRankReadModel {
  const xp = normalizeXp(rawXp);
  const rank = getRankFromXP(xp);
  const nextRank = getNextRank(rank.level);
  const xpToNextRank = getXpToNextRank(xp);
  return {
    level: rank.level, name: rank.name, shortTag: rank.shortTag, nameVi: rank.nameVi,
    xp, minXp: rank.minXp, maxXp: rank.maxXp,
    ...(nextRank ? { nextRank } : {}), progressPercent: getRankProgress(xp),
    ...(xpToNextRank === undefined ? {} : { xpToNextRank }),
  };
}

export const DEFAULT_USER_RANK = resolveUserRank(0);
