import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { EmptyState, Skeleton } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { XpEventReadModel, XpHistoryFilter, XpSummaryReadModel } from "../../types";
import { formatXp, getLocalizedRankName } from "../user-rank";
import { XpActivityList } from "./XpActivityList";
import { formatEventTime, formatXpAmount, getEventContext, getXpEventLabelKey } from "./reputation-ui";
import styles from "./reputation.module.css";

export function XpHistoryRoute() {
  const services = useServices();
  const session = useSession();
  const { locale, t } = useI18n();
  const [summary, setSummary] = useState<XpSummaryReadModel>();
  const [filter, setFilter] = useState<XpHistoryFilter>("all");
  const [events, setEvents] = useState<readonly XpEventReadModel[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<XpEventReadModel>();
  const detailRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    let active = true;
    setLoading(true); setError(false); setEvents([]); setCursor(undefined);
    void Promise.all([services.reputation.getMySummary(), services.reputation.listMyEvents(filter)])
      .then(([nextSummary, page]) => { if (active) { setSummary(nextSummary); setEvents(page.items); setCursor(page.nextCursor); } })
      .catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filter, services, session.status]);

  useEffect(() => { if (selected && detailRef.current && !detailRef.current.open) detailRef.current.showModal?.(); }, [selected]);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try { const page = await services.reputation.listMyEvents(filter, cursor); setEvents((current) => [...current, ...page.items]); setCursor(page.nextCursor); }
    catch { setError(true); } finally { setLoading(false); }
  }

  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={6} variant="card" />;
  if (session.status !== "authenticated") return <EmptyState heading={t("profile.loginRequired")} description={t("settings.loginPlaceholder")} announce />;
  return <main className={styles.historyPage}>
    <header className={styles.historyHeader}><Link to="/profile" aria-label={t("profile.heading")}>←</Link><div><h1>{t("xp.historyTitle")}</h1><p>{t("xp.private")}</p></div></header>
    {summary ? <section className={styles.historySummary}><h2>{t("xp.levelSummary", { rank: getLocalizedRankName(summary.rank, locale), level: summary.rank.level })}</h2><strong>{formatXp(summary.rank.xp, locale)} XP</strong></section> : null}
    <nav className={styles.filters} aria-label={t("xp.historyTitle")}>{(["all", "earned", "adjusted"] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(`xp.filter.${value}`)}</button>)}</nav>
    {error ? <p className={styles.error} role="alert">{t("xp.error")}</p> : null}
    {loading && events.length === 0 ? <Skeleton label={t("xp.loading")} lines={6} variant="list" /> : <XpActivityList events={events} onSelect={setSelected} />}
    {cursor ? <button className={styles.loadMore} type="button" disabled={loading} onClick={() => void loadMore()}>{t("xp.loadMore")}</button> : null}
    <dialog ref={detailRef} className={styles.detailSheet} aria-label={t("xp.detail")} onClose={() => setSelected(undefined)}>{selected ? <><header><h2>{t(getXpEventLabelKey(selected.eventType))}</h2><button type="button" aria-label={t("xp.close")} onClick={() => detailRef.current?.close()}>×</button></header><strong className={styles.detailAmount} data-negative={selected.amount < 0 || undefined}>{formatXpAmount(selected.amount, locale)}</strong>{getEventContext(selected) ? <p><b>{t("xp.relatedContribution")}</b><br />{getEventContext(selected)}</p> : null}{selected.reasonText ? <p>{selected.reasonText}</p> : null}<time dateTime={selected.createdAt}>{formatEventTime(selected.createdAt, locale)}</time></> : null}</dialog>
  </main>;
}
