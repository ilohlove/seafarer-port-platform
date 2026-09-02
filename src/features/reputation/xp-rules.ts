import type { XpRuleReadModel } from "../../types";

export const DEFAULT_XP_RULES: readonly XpRuleReadModel[] = [
  { eventType: "approved_note", amount: 100 },
  { eventType: "community_confirmed", amount: 50 },
  { eventType: "accepted_correction", amount: 30 },
  { eventType: "verified_confirmation", amount: 10, rewardedLimit: 3, windowHours: 24 },
];
