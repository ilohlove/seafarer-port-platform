import type { StaffTitle, SupporterTier, UserRankReadModel } from "../../types";
import { DEMO_AVATAR_ARTWORK } from "./identity-artwork";
import { resolveUserRank } from "./user-rank";

export interface DemoMemberIdentity {
  readonly id: string;
  readonly alias: string;
  readonly rank: UserRankReadModel;
  readonly context: string;
  readonly avatarUrl: string;
}

export interface DemoStaffIdentity {
  readonly id: StaffTitle;
  readonly alias: string;
  readonly avatarUrl: string;
}

export interface DemoSupporterIdentity {
  readonly tier: SupporterTier;
  readonly alias: string;
  readonly rank: UserRankReadModel;
  readonly avatarUrl: string;
}

export const DEMO_AVATAR_URL = DEMO_AVATAR_ARTWORK.src256;

const memberFixtures = [
  ["port_newcomer", 0],
  ["deck_explorer", 100],
  ["wave_tamer", 300],
  ["rust_breaker", 700],
  ["night_watcher", 1_500],
  ["signal_hunter", 3_000],
  ["horizon_seeker", 6_000],
  ["CaptainSea", 18_420],
  ["beacon_keeper", 25_000],
  ["ocean_legend", 50_000],
] as const;

export const DEMO_MEMBERS: readonly DemoMemberIdentity[] = memberFixtures.map(
  ([alias, xp], index) => ({
    id: `demo-member-${index}`,
    alias,
    rank: resolveUserRank(xp),
    context: index % 2 === 0 ? "Port Notes" : "Helpful answer",
    avatarUrl: DEMO_AVATAR_URL,
  }),
);

export const DEMO_STAFF: readonly DemoStaffIdentity[] = [
  { id: "founder", alias: "CrewPort Founder", avatarUrl: DEMO_AVATAR_URL },
  { id: "admin", alias: "Fleet Admin", avatarUrl: DEMO_AVATAR_URL },
  { id: "moderator", alias: "Port Moderator", avatarUrl: DEMO_AVATAR_URL },
  { id: "ops", alias: "CrewPort Ops", avatarUrl: DEMO_AVATAR_URL },
];

export const DEMO_SUPPORTERS: readonly DemoSupporterIdentity[] = [
  { tier: "bronze", alias: "bronze_supporter", rank: resolveUserRank(100), avatarUrl: DEMO_AVATAR_URL },
  { tier: "silver", alias: "silver_supporter", rank: resolveUserRank(3_000), avatarUrl: DEMO_AVATAR_URL },
  { tier: "gold", alias: "gold_supporter", rank: resolveUserRank(25_000), avatarUrl: DEMO_AVATAR_URL },
];
