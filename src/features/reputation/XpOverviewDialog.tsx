import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Skeleton } from "../../components";
import { useServices } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { StaffRoleTitle, XpSummaryReadModel } from "../../types";
import {
  RankAvatarFrame,
  STAFF_TITLES,
  StaffAvatarFrame,
  formatXp,
  getLocalizedRankName,
  getLocalizedStaffName,
} from "../user-rank";
import { XpActivityList } from "./XpActivityList";
import { DEFAULT_XP_RULES } from "./xp-rules";
import styles from "./reputation.module.css";

const ruleKeys = {
  approved_note: "xp.rule.approved_note",
  community_confirmed: "xp.rule.community_confirmed",
  accepted_correction: "xp.rule.accepted_correction",
  verified_confirmation: "xp.rule.verified_confirmation",
  highly_useful: "xp.rule.highly_useful",
} as const;

export function XpOverviewDialog({ alias, initialRank, staffTitle }: { readonly alias: string; readonly initialRank: XpSummaryReadModel["rank"]; readonly staffTitle?: StaffRoleTitle }) {
  const services = useServices();
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<XpSummaryReadModel>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      setSummary(await services.reputation.getMySummary());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || summary || error || loading) return;
    void loadSummary();
  }, [error, loadSummary, loading, open, summary]);

  const rank = summary?.rank ?? initialRank;
  const nextRank = rank.nextRank;
  const rules = summary?.rules.length ? summary.rules : DEFAULT_XP_RULES;
  const staff = staffTitle ? STAFF_TITLES[staffTitle] : undefined;
  return <>
    <button type="button" className={styles.infoTrigger} onClick={() => setOpen(true)}>ⓘ {t("xp.howToEarn")}</button>
    <dialog ref={dialogRef} className={styles.sheet} aria-label={t("xp.dialogLabel")} onClose={() => setOpen(false)}>
      <div className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHeader}>
        <div className={styles.rankSummary}>
          {staffTitle
            ? <StaffAvatarFrame alias={alias} staffTitle={staffTitle} />
            : <RankAvatarFrame alias={alias} rank={rank} />}
          <div>
            <p>{t(staff ? "xp.staffRole" : "xp.currentRank")}</p>
            <h2>{staff ? `${getLocalizedStaffName(staff, locale)} · ${staff.tag}` : t("xp.levelSummary", { rank: getLocalizedRankName(rank, locale), level: rank.level })}</h2>
            <strong>{formatXp(rank.xp, locale)} XP</strong>
          </div>
        </div>
        <button type="button" className={styles.closeButton} aria-label={t("xp.close")} onClick={() => dialogRef.current?.close()}>×</button>
      </header>
      {!staff ? <div className={styles.progress}>
        <progress max={100} value={rank.progressPercent} aria-label={t("rank.progress")} />
        <span>{nextRank ? t("xp.toNext", { xp: formatXp(rank.xpToNextRank ?? 0, locale), rank: getLocalizedRankName(nextRank, locale) }) : t("xp.maximum")}</span>
      </div> : null}
      <section className={styles.sheetSection}><h3>{t("xp.recent")}</h3>
        {loading ? <Skeleton label={t("xp.loading")} lines={3} variant="list" /> : error ? <div className={styles.fallbackNotice} role="alert"><p>{t("xp.liveUnavailable")}</p><button type="button" onClick={() => void loadSummary()}>{t("xp.retry")}</button></div> : summary ? <><XpActivityList events={summary.recent} /><Link className={styles.historyLink} to="/profile/xp-history" onClick={() => dialogRef.current?.close()}>{t("xp.historyLink")} →</Link></> : null}
      </section>
      <section className={styles.sheetSection}><h3>{t("xp.rules")}</h3><ul className={styles.rules}>{rules.map((rule) => <li key={rule.eventType}><span>{t(ruleKeys[rule.eventType])}{rule.eventType === "verified_confirmation" && rule.rewardedLimit && rule.windowHours ? <small>{t("xp.rule.confirmationLimit", { limit: rule.rewardedLimit, hours: rule.windowHours })}</small> : null}</span><strong>+{rule.amount} XP</strong></li>)}</ul></section>
    </dialog>
  </>;
}
