export type UserRankLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type UserRankIconKey = "anchor" | "knot" | "wave" | "scraper" | "nightWatch" | "radar" | "horizon" | "shipBow" | "lighthouse" | "oceanLegend";
export type UserRankVisualVariant = "graphite" | "steelBlue" | "seaTeal" | "weatheredBronze" | "deepIndigo" | "radarTeal" | "copperHorizon" | "royalOcean" | "maritimeGold" | "blackPearl";

export interface UserRankDefinition {
  readonly level: UserRankLevel;
  readonly name: string;
  readonly shortTag: string;
  readonly nameVi: string;
  readonly minXp: number;
  readonly maxXp: number | null;
  readonly icon: UserRankIconKey;
  readonly visualVariant: UserRankVisualVariant;
}

export interface UserRankReadModel {
  readonly level: UserRankLevel;
  readonly name: string;
  readonly shortTag: string;
  readonly nameVi: string;
  readonly xp: number;
  readonly minXp: number;
  readonly maxXp: number | null;
  readonly nextRank?: UserRankDefinition;
  readonly progressPercent: number;
  readonly xpToNextRank?: number;
}

export type StaffTitle = "founder" | "admin" | "moderator" | "ops";
export type StaffRoleTitle = Extract<StaffTitle, "admin" | "moderator">;
export interface StaffTitleDefinition {
  readonly id: StaffTitle;
  readonly name: string;
  readonly tag: "FOUNDER" | "ADMIN" | "MODERATOR" | "OPS";
  readonly icon: "helm" | "command" | "harbor" | "operations";
}

export type SupporterTier = "bronze" | "silver" | "gold";
export interface SupporterDefinition {
  readonly tier: SupporterTier;
  readonly name: string;
  readonly tag: "BRONZE SUPPORTER" | "SILVER SUPPORTER" | "GOLD SUPPORTER";
  readonly icon: "heartAnchor" | "heartCompass" | "heartBeacon";
}
