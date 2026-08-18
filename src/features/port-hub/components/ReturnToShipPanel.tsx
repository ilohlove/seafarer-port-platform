import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { ReturnToShipModel } from "../port-hub-view-model";
import styles from "../port-hub.module.css";

export interface ReturnToShipPanelProps {
  readonly model: ReturnToShipModel;
  readonly onPlannerPlaceholder: () => void;
  readonly plannerNotice?: string;
}

export function ReturnToShipPanel({
  model,
  onPlannerPlaceholder,
  plannerNotice,
}: ReturnToShipPanelProps) {
  const { t } = useI18n();

  return (
    <aside className={styles.returnPanel} aria-labelledby="return-heading">
      <div className={styles.returnHeading}>
        <div>
          <p className={styles.panelKicker}>{t("portHub.return.kicker")}</p>
          <h2 id="return-heading">{t("portHub.return.heading")}</h2>
        </div>
        <span className={styles.returnSymbol} aria-hidden="true">
          ↶
        </span>
      </div>

      <div className={styles.timeGrid}>
        <div>
          <span>{t("portHub.return.allAboard")}</span>
          <strong>{model.allAboard}</strong>
        </div>
        <div>
          <span>{t("portHub.return.recommended")}</span>
          <strong>{model.recommendedReturn}</strong>
        </div>
      </div>

      <dl className={styles.returnLogistics}>
        <div>
          <dt>{t("portHub.return.buffer")}</dt>
          <dd>{model.buffer}</dd>
        </div>
        <div>
          <dt>{t("portHub.return.gate")}</dt>
          <dd>{model.gate}</dd>
        </div>
        <div>
          <dt>{t("portHub.return.address")}</dt>
          <dd>{model.address}</dd>
        </div>
        <div>
          <dt>{t("portHub.return.contact")}</dt>
          <dd>{model.contact}</dd>
        </div>
      </dl>

      <p className={styles.returnGuidance}>{model.guidance}</p>

      <button
        className={styles.plannerButton}
        type="button"
        onClick={onPlannerPlaceholder}
      >
        {t("portHub.return.openPlanner")}
      </button>
      {plannerNotice ? (
        <output className={styles.inlineNotice}>{plannerNotice}</output>
      ) : null}

      <details className={styles.emergencyDetails}>
        <summary>{t("portHub.emergency.heading")}</summary>
        <p>{t("portHub.emergency.description")}</p>
        {model.emergencyContacts.length > 0 ? (
          <ul>
            {model.emergencyContacts.map((contact) => (
              <li key={contact.id}>
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.phone}</span>
                </div>
                <TrustStatus {...contact.trust} compact />
                {contact.instruction ? <p>{contact.instruction}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("portHub.emergency.noContact")}</p>
        )}
        <p>{t("portHub.emergency.portSecurity")}</p>
      </details>
    </aside>
  );
}
