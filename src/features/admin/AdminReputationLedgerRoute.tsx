import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EmptyState, Skeleton } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { AdminXpLedgerEntry, XpLaunchResult, XpSystemStatus } from "../../types";
import { formatXp } from "../user-rank";
import { formatEventTime, formatXpAmount, getXpEventLabelKey } from "../reputation/reputation-ui";
import styles from "./admin-reputation.module.css";

export function AdminReputationLedgerRoute() {
  const services = useServices();
  const session = useSession();
  const { locale, t } = useI18n();
  const [items, setItems] = useState<readonly AdminXpLedgerEntry[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [status, setStatus] = useState<XpSystemStatus>();
  const [launchResult, setLaunchResult] = useState<XpLaunchResult>();
  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState(false);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    if (session.status !== "authenticated" || session.profile?.role !== "admin") return;
    let active = true;
    setLoading(true);
    void Promise.all([services.reputation.listAdminLedger(), services.reputation.getSystemStatus()])
      .then(([page, nextStatus]) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setStatus(nextStatus);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setStatusError(true);
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [services, session]);

  async function more() {
    if (!cursor) return;
    setLoading(true);
    try {
      const page = await services.reputation.listAdminLedger(undefined, cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function launch() {
    setLaunching(true);
    setStatusError(false);
    try {
      const result = await services.reputation.launchSystem();
      setLaunchResult(result);
      setStatus({ launchAt: result.launchAt });
      setConfirmLaunch(false);
    } catch {
      setStatusError(true);
    } finally {
      setLaunching(false);
    }
  }

  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={6} variant="card" />;
  if (session.status !== "authenticated" || session.profile?.role !== "admin") return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.reputation.description")} announce />;

  const launchTime = status?.launchAt
    ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.launchAt))
    : undefined;

  return <main className={styles.page}>
    <header><div><p>CrewPort · Admin</p><h1>{t("admin.reputation.heading")}</h1><span>{t("admin.reputation.description")}</span></div><Link to="/admin/notes">{t("admin.notes.heading")}</Link></header>
    <section className={styles.launchPanel} aria-labelledby="xp-launch-heading">
      <div><h2 id="xp-launch-heading">{t("admin.reputation.launchHeading")}</h2><p>{launchTime ? t("admin.reputation.launchedAt", { time: launchTime }) : t("admin.reputation.notLaunched")}</p></div>
      {status && !status.launchAt && !confirmLaunch ? <button className={styles.primary} type="button" onClick={() => setConfirmLaunch(true)}>{t("admin.reputation.launch")}</button> : null}
      {status && !status.launchAt && confirmLaunch ? <div className={styles.launchConfirmation}><p>{t("admin.reputation.launchWarning")}</p><div><button className={styles.danger} type="button" disabled={launching} onClick={() => void launch()}>{launching ? t("admin.reputation.launching") : t("admin.reputation.launchConfirm")}</button><button className={styles.secondary} type="button" disabled={launching} onClick={() => setConfirmLaunch(false)}>{t("admin.reputation.launchCancel")}</button></div></div> : null}
      {launchResult && !launchResult.alreadyLaunched ? <output className={styles.notice} aria-live="polite">{t("admin.reputation.launchSuccess", { notes: launchResult.notes, confirmed: launchResult.communityConfirmed, contributors: launchResult.foundingContributors })}</output> : null}
      {statusError ? <p className={styles.error} role="alert">{t("admin.reputation.statusError")}</p> : null}
    </section>
    {error ? <p role="alert" className={styles.error}>{t("admin.reputation.error")}</p> : null}
    <div className={styles.ledger}>{items.map((item) => <article key={item.id}><div><strong>{item.userLabel}</strong><span>{formatXp(item.currentXp, locale)} XP</span></div><div><strong data-negative={item.amount < 0 || undefined}>{formatXpAmount(item.amount, locale)}</strong><span>{t(getXpEventLabelKey(item.eventType))}</span><time dateTime={item.createdAt}>{formatEventTime(item.createdAt, locale)}</time></div><Link to={`/admin/users/${item.userId}/reputation?sourceType=${encodeURIComponent(item.sourceType)}&sourceId=${encodeURIComponent(item.sourceId)}`}>{t("admin.reputation.open")}</Link></article>)}</div>
    {loading ? <Skeleton label={t("state.loading")} lines={3} variant="list" /> : null}
    {cursor ? <button className={styles.primary} type="button" onClick={() => void more()}>{t("xp.loadMore")}</button> : null}
  </main>;
}
