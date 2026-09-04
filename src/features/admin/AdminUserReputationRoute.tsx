import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { EmptyState } from "../../components";
import { useServices, useSession } from "../../app/providers";
import { useI18n } from "../../i18n";
import { createIdempotencyKey } from "../../idempotency";
import type { ReputationActionPreview, ReputationActionType } from "../../types";
import { formatXp, getLocalizedRankName, resolveUserRank } from "../user-rank";
import styles from "./admin-reputation.module.css";

const actions: readonly ReputationActionType[] = ["invalid_contribution", "spam", "false_information", "confirmation_farming", "coordinated_farming", "serious_fraud"];
export function AdminUserReputationRoute() {
  const { userId = "" } = useParams(); const [query] = useSearchParams(); const services = useServices(); const session = useSession(); const { locale, t } = useI18n();
  const sourceType = query.get("sourceType") ?? "note"; const sourceId = query.get("sourceId") ?? "";
  const [action, setAction] = useState<ReputationActionType>("invalid_contribution"); const [reason, setReason] = useState(""); const [preview, setPreview] = useState<ReputationActionPreview>(); const [error, setError] = useState(false); const [notice, setNotice] = useState(false);
  if (session.status !== "authenticated" || session.profile?.role === "member") return <EmptyState heading={t("admin.notes.accessDenied")} description={t("admin.reputation.description")} announce />;
  async function loadPreview() { setError(false); try { setPreview(await services.reputation.previewReputationAction({ userId, action, sourceType, sourceId })); } catch { setError(true); } }
  async function apply() { if (!preview || reason.trim().length < 3) return; setError(false); try { await services.reputation.applyReputationAction({ userId, action, sourceType, sourceId, reason: reason.trim(), idempotencyKey: createIdempotencyKey() }); setNotice(true); setPreview(undefined); } catch { setError(true); } }
  const currentRank = preview ? resolveUserRank(preview.currentXp) : undefined; const afterRank = preview ? resolveUserRank(preview.afterXp) : undefined;
  return <main className={styles.page}><header><div><p>CrewPort · Reputation</p><h1>{t("admin.reputation.adjust")}</h1><span>{userId}</span></div><Link to="/admin/reputation/ledger">{t("admin.reputation.heading")}</Link></header><section className={styles.adjust}><label><span>{t("admin.reputation.action")}</span><select value={action} onChange={(event) => { setAction(event.currentTarget.value as ReputationActionType); setPreview(undefined); }}>{actions.filter((value) => session.profile?.role === "admin" || !["coordinated_farming", "serious_fraud"].includes(value)).map((value) => <option key={value} value={value}>{t(`admin.reputation.action.${value}`)}</option>)}</select></label><label><span>{t("admin.reputation.reason")}</span><textarea value={reason} onChange={(event) => setReason(event.currentTarget.value)} /></label><button className={styles.primary} type="button" onClick={() => void loadPreview()}>{t("admin.reputation.preview")}</button>{preview && currentRank && afterRank ? <div className={styles.preview}><section><span>{t("admin.reputation.current")}</span><strong>{formatXp(preview.currentXp, locale)} XP</strong><p>{getLocalizedRankName(currentRank, locale)} · Lv.{currentRank.level}</p></section><span aria-hidden="true">→</span><section><span>{t("admin.reputation.after")}</span><strong>{formatXp(preview.afterXp, locale)} XP</strong><p>{getLocalizedRankName(afterRank, locale)} · Lv.{afterRank.level}</p></section><dl><div><dt>{t("admin.reputation.reversal")}</dt><dd>−{preview.reversalXp} XP</dd></div><div><dt>{t("admin.reputation.penalty")}</dt><dd>−{preview.penaltyXp} XP</dd></div></dl><button className={styles.danger} type="button" disabled={reason.trim().length < 3} onClick={() => void apply()}>{t("admin.reputation.confirm")}</button></div> : null}{notice ? <output className={styles.notice}>{t("admin.reputation.success")}</output> : null}{error ? <p className={styles.error} role="alert">{t("admin.reputation.error")}</p> : null}</section></main>;
}
