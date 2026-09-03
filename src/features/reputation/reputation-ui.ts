import type { TranslationKey } from "../../i18n";
import type { XpEventReadModel, XpEventType } from "../../types";

const eventKeys: Partial<Record<XpEventType, TranslationKey>> = {
  approved_note: "xp.event.approved_note",
  backfill_approved_note: "xp.event.backfill_approved_note",
  community_confirmed: "xp.event.community_confirmed",
  backfill_community_confirmed: "xp.event.backfill_community_confirmed",
  accepted_correction: "xp.event.accepted_correction",
  verified_confirmation: "xp.event.verified_confirmation",
  note_confirmation_awarded: "xp.event.note_confirmation_awarded",
  note_confirmation_revoked: "xp.event.note_confirmation_revoked",
  note_confirmation_restored: "xp.event.note_confirmation_restored",
  highly_useful: "xp.event.highly_useful",
};

export function getXpEventLabelKey(type: XpEventType): TranslationKey {
  return eventKeys[type] ?? "xp.event.adjustment";
}

export function getEventContext(event: XpEventReadModel): string | undefined {
  const port = typeof event.metadata.port_key === "string" ? event.metadata.port_key : undefined;
  const summary = typeof event.metadata.summary === "string" ? event.metadata.summary : undefined;
  return [port, summary].filter(Boolean).join(" · ") || undefined;
}

export function formatXpAmount(amount: number, locale: "vi" | "en"): string {
  const value = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(Math.abs(amount));
  return `${amount >= 0 ? "+" : "−"}${value} XP`;
}

export function formatEventTime(value: string, locale: "vi" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const differenceDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (Math.abs(differenceDays) <= 1) {
    return new Intl.RelativeTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { numeric: "auto" }).format(differenceDays, "day");
  }
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
