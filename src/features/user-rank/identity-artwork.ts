import type { StaffTitle, SupporterTier, UserRankLevel } from "../../types";

import demo128 from "../../assets/identity/demo-captain-128.webp";
import demo256 from "../../assets/identity/demo-captain-256.webp";
import rank0_160 from "../../assets/identity/rank-lv0-160.webp";
import rank0_320 from "../../assets/identity/rank-lv0-320.webp";
import rank1_160 from "../../assets/identity/rank-lv1-160.webp";
import rank1_320 from "../../assets/identity/rank-lv1-320.webp";
import rank2_160 from "../../assets/identity/rank-lv2-160.webp";
import rank2_320 from "../../assets/identity/rank-lv2-320.webp";
import rank3_160 from "../../assets/identity/rank-lv3-160.webp";
import rank3_320 from "../../assets/identity/rank-lv3-320.webp";
import rank4_160 from "../../assets/identity/rank-lv4-160.webp";
import rank4_320 from "../../assets/identity/rank-lv4-320.webp";
import rank5_160 from "../../assets/identity/rank-lv5-160.webp";
import rank5_320 from "../../assets/identity/rank-lv5-320.webp";
import rank6_160 from "../../assets/identity/rank-lv6-160.webp";
import rank6_320 from "../../assets/identity/rank-lv6-320.webp";
import rank7_160 from "../../assets/identity/rank-lv7-160.webp";
import rank7_320 from "../../assets/identity/rank-lv7-320.webp";
import rank8_160 from "../../assets/identity/rank-lv8-160.webp";
import rank8_320 from "../../assets/identity/rank-lv8-320.webp";
import rank9_160 from "../../assets/identity/rank-lv9-160.webp";
import rank9_320 from "../../assets/identity/rank-lv9-320.webp";
import staffAdmin160 from "../../assets/identity/staff-admin-160.webp";
import staffAdmin320 from "../../assets/identity/staff-admin-320.webp";
import staffFounder160 from "../../assets/identity/staff-founder-160.webp";
import staffFounder320 from "../../assets/identity/staff-founder-320.webp";
import staffModerator160 from "../../assets/identity/staff-moderator-160.webp";
import staffModerator320 from "../../assets/identity/staff-moderator-320.webp";
import staffOps160 from "../../assets/identity/staff-ops-160.webp";
import staffOps320 from "../../assets/identity/staff-ops-320.webp";
import supporterBronze320 from "../../assets/identity/supporter-bronze-320.webp";
import supporterBronze160 from "../../assets/identity/supporter-bronze-160.webp";
import supporterGold320 from "../../assets/identity/supporter-gold-320.webp";
import supporterGold160 from "../../assets/identity/supporter-gold-160.webp";
import supporterSilver320 from "../../assets/identity/supporter-silver-320.webp";
import supporterSilver160 from "../../assets/identity/supporter-silver-160.webp";

export interface AvatarGeometry {
  readonly canvas: 320;
  readonly centerX: 160;
  readonly centerY: number;
  readonly diameter: number;
}

export interface FrameArtwork {
  readonly src160: string;
  readonly src320: string;
  readonly geometry: AvatarGeometry;
}

export interface PlaqueArtwork {
  readonly src160: string;
  readonly src320: string;
  readonly width: 320;
  readonly height: 120;
}

export const RANK_AVATAR_GEOMETRY = {
  canvas: 320,
  centerX: 160,
  centerY: 148,
  diameter: 196,
} as const satisfies AvatarGeometry;

export const STAFF_AVATAR_GEOMETRY = {
  canvas: 320,
  centerX: 160,
  centerY: 150,
  diameter: 176,
} as const satisfies AvatarGeometry;

const rankSources = [
  [rank0_160, rank0_320], [rank1_160, rank1_320],
  [rank2_160, rank2_320], [rank3_160, rank3_320],
  [rank4_160, rank4_320], [rank5_160, rank5_320],
  [rank6_160, rank6_320], [rank7_160, rank7_320],
  [rank8_160, rank8_320], [rank9_160, rank9_320],
] as const;

export const RANK_ARTWORK = Object.fromEntries(
  rankSources.map(([src160, src320], level) => [
    level,
    { src160, src320, geometry: RANK_AVATAR_GEOMETRY },
  ]),
) as Record<UserRankLevel, FrameArtwork>;

export const STAFF_ARTWORK: Record<StaffTitle, FrameArtwork> = {
  founder: { src160: staffFounder160, src320: staffFounder320, geometry: STAFF_AVATAR_GEOMETRY },
  admin: { src160: staffAdmin160, src320: staffAdmin320, geometry: STAFF_AVATAR_GEOMETRY },
  moderator: { src160: staffModerator160, src320: staffModerator320, geometry: STAFF_AVATAR_GEOMETRY },
  ops: { src160: staffOps160, src320: staffOps320, geometry: STAFF_AVATAR_GEOMETRY },
};

export const SUPPORTER_ARTWORK: Record<SupporterTier, PlaqueArtwork> = {
  bronze: { src160: supporterBronze160, src320: supporterBronze320, width: 320, height: 120 },
  silver: { src160: supporterSilver160, src320: supporterSilver320, width: 320, height: 120 },
  gold: { src160: supporterGold160, src320: supporterGold320, width: 320, height: 120 },
};

export const DEMO_AVATAR_ARTWORK = {
  src128: demo128,
  src256: demo256,
  width: 256,
  height: 256,
} as const;
