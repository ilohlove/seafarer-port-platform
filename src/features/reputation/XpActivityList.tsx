import { useI18n } from "../../i18n";
import type { XpEventReadModel } from "../../types";
import { formatEventTime, formatXpAmount, getEventContext, getXpEventLabelKey } from "./reputation-ui";
import styles from "./reputation.module.css";

export function XpActivityList({ events, onSelect }: { readonly events: readonly XpEventReadModel[]; readonly onSelect?: (event: XpEventReadModel) => void }) {
  const { locale, t } = useI18n();
  if (events.length === 0) return <p className={styles.empty}>{t("xp.empty")}</p>;
  return (
    <ul className={styles.activityList}>
      {events.map((event) => {
        const context = getEventContext(event);
        const content = <><span className={styles.amount} data-negative={event.amount < 0 || undefined}>{formatXpAmount(event.amount, locale)}</span><span className={styles.eventCopy}><strong>{t(getXpEventLabelKey(event.eventType))}</strong>{context ? <span>{context}</span> : null}<time dateTime={event.createdAt}>{formatEventTime(event.createdAt, locale)}</time></span></>;
        return <li key={event.id}>{onSelect ? <button type="button" className={styles.eventButton} onClick={() => onSelect(event)}>{content}<span aria-hidden="true">›</span></button> : <div className={styles.eventButton}>{content}</div>}</li>;
      })}
    </ul>
  );
}
