import type { TopicPreviewModel } from "../port-notes-view-model";
import { useI18n } from "../../../i18n";
import styles from "../port-notes.module.css";

export interface TopicPreviewSectionsProps {
  readonly topics: readonly TopicPreviewModel[];
  readonly onPlaceholder: (feature: string) => void;
}

export function TopicPreviewSections({
  topics,
  onPlaceholder,
}: TopicPreviewSectionsProps) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="topic-previews-heading">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{t("portNotes.topics.eyebrow")}</p>
          <h2 id="topic-previews-heading">{t("portNotes.topics.fullHeading")}</h2>
        </div>
        <span className={styles.sectionCaption}>{t("portNotes.topics.caption")}</span>
      </div>
      <div className={styles.topicGrid}>
        {topics.map((topic) => (
          <article
            className={styles.topicCard}
            id={`topic-${topic.id}`}
            key={topic.id}
          >
            <div className={styles.topicHeading}>
              <span className={styles.topicSymbol} aria-hidden="true">
                {topic.symbol}
              </span>
              <h3>{topic.title}</h3>
            </div>
            <p className={styles.topicSummary}>{topic.bullets[0]}</p>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => onPlaceholder(topic.actionLabel)}
            >
              {topic.actionLabel} →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
