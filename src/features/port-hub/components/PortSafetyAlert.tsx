import { TrustStatus } from "../../../components";
import type { SafetyAlertModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export function PortSafetyAlert({ model }: { readonly model: SafetyAlertModel }) {
  return (
    <aside
      className={styles.safetyAlert}
      data-severity={model.severity}
      role={model.severity === "critical" ? "alert" : "note"}
      aria-labelledby={`safety-alert-${model.id}`}
    >
      <span className={styles.safetyAlertSymbol} aria-hidden="true">
        {model.severity === "critical" ? "!" : "i"}
      </span>
      <div className={styles.safetyAlertBody}>
        <h2 id={`safety-alert-${model.id}`}>{model.title}</h2>
        <p>{model.summary}</p>
        <TrustStatus {...model.trust} compact />
      </div>
    </aside>
  );
}
