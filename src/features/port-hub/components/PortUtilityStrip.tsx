import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { PortUtilityItemModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface PortUtilityStripProps {
  readonly items: readonly PortUtilityItemModel[];
  readonly onSelect: (item: PortUtilityItemModel) => void;
}

export function PortUtilityStrip({
  items,
  onSelect,
}: PortUtilityStripProps) {
  const { t } = useI18n();

  return (
    <section
      className={styles.utilityStrip}
      aria-label={t("portNotes.utility.label")}
    >
      {items.map((item) => (
        <button
          className={styles.utilityCard}
          type="button"
          data-utility-id={item.id}
          key={item.id}
          onClick={() => onSelect(item)}
        >
          <span className={styles.utilitySymbol} aria-hidden="true">
            {item.symbol}
          </span>
          <span className={styles.utilityBody}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
            <TrustStatus {...item.trust} compact />
          </span>
          <span className={styles.utilityArrow} aria-hidden="true">
            →
          </span>
        </button>
      ))}
    </section>
  );
}
