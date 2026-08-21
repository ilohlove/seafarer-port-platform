import { useI18n } from "../../../i18n";
import type { TopicShortcutModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export function TopicShortcutPanel({
  shortcuts,
}: {
  readonly shortcuts: readonly TopicShortcutModel[];
}) {
  const { t } = useI18n();

  return (
    <section
      className={styles.topicShortcutPanel}
      aria-labelledby="topic-shortcuts-heading"
    >
      <div className={styles.railHeader}>
        <h2 id="topic-shortcuts-heading">
          {t("portNotes.topics.heading")}
        </h2>
        <a href="#topic-previews-heading">{t("portNotes.topics.viewAll")}</a>
      </div>
      <nav
        className={styles.topicShortcutGrid}
        aria-label={t("portNotes.topics.shortcutsLabel")}
      >
        {shortcuts.map((shortcut) => (
          <a href={`#${shortcut.targetId}`} key={shortcut.id}>
            <strong>{shortcut.title}</strong>
            <span>{shortcut.summary}</span>
            <span aria-hidden="true">→</span>
          </a>
        ))}
      </nav>
    </section>
  );
}
