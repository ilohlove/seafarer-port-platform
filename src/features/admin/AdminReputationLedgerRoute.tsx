import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EmptyState, Skeleton } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import type { AdminXpLedgerEntry } from "../../types";
import { formatXp } from "../user-rank";
import { formatEventTime, formatXpAmount, getXpEventLabelKey } from "../reputation/reputation-ui";
import styles from "./admin-reputation.module.css";

export function AdminReputationLedgerRoute() {
  const services = useServices(); const session = useSession(); const { locale, t } = useI18n();
  const [items, setItems] = useState<readonly AdminXpLedgerEntry[]>([]); const [cursor, setCursor] = useState<string>(); const [loading, setLoading] = useState(false); const [error, setError] = useState(false);
  useEffect(() => { if (session.status !== "authenticated" || session.profile?.role !== "admin") return; let active = true; setLoading(true); void services.reputation.listAdminLedger().then((page) => { if (active) { setItems(page.items); setCursor(page.nextCursor); } }).catch(() => active && setError(true)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [services, session]);
  async function more() { if (!cursor) return; setLoading(true); try { const page = await services.reputation.listAdminLedger(undefined, cursor); setItems((current) => [...current, ...page.items]); setCursor(page.nextCursor); } catch { setError(true); } finally { setLoading(false); } }
  if (session.status === "loading") return <Skeleton label={t("state.loading")} lines={6} variant="card" />;
  if (session.status !== "authenticated" || session.profile?.role !== "admin") return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.reputation.description")} announce />;
  return <main className={styles.page}><header><div><p>CrewPort · Admin</p><h1>{t("admin.reputation.heading")}</h1><span>{t("admin.reputation.description")}</span></div><Link to="/admin/notes">{t("admin.notes.heading")}</Link></header>{error ? <p role="alert" className={styles.error}>{t("admin.reputation.error")}</p> : null}<div className={styles.ledger}>{items.map((item) => <article key={item.id}><div><strong>{item.userLabel}</strong><span>{formatXp(item.currentXp, locale)} XP</span></div><div><strong data-negative={item.amount < 0 || undefined}>{formatXpAmount(item.amount, locale)}</strong><span>{t(getXpEventLabelKey(item.eventType))}</span><time dateTime={item.createdAt}>{formatEventTime(item.createdAt, locale)}</time></div><Link to={`/admin/users/${item.userId}/reputation?sourceType=${encodeURIComponent(item.sourceType)}&sourceId=${encodeURIComponent(item.sourceId)}`}>{t("admin.reputation.open")}</Link></article>)}</div>{loading ? <Skeleton label={t("state.loading")} lines={3} variant="list" /> : null}{cursor ? <button className={styles.primary} type="button" onClick={() => void more()}>{t("xp.loadMore")}</button> : null}</main>;
}
