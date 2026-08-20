import type { KeyboardEvent } from "react";

import { useI18n } from "../../../i18n";
import type { PortContextTabModel } from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface PortContextTabsProps {
  readonly contexts: readonly PortContextTabModel[];
  readonly onSelect: (contextId: string) => void;
}

export function PortContextTabs({
  contexts,
  onSelect,
}: PortContextTabsProps) {
  const { t } = useI18n();

  if (contexts.length < 2) {
    return null;
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % contexts.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + contexts.length) % contexts.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = contexts.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }
    event.preventDefault();
    const next = contexts[nextIndex];
    if (!next) {
      return;
    }
    onSelect(next.id);
    const buttons = event.currentTarget.parentElement?.querySelectorAll("button");
    buttons?.[nextIndex]?.focus();
  }

  return (
    <section
      className={styles.contextSelector}
      aria-labelledby="port-context-heading"
    >
      <div className={styles.contextSelectorHeader}>
        <h2 id="port-context-heading">{t("portNotes.context.heading")}</h2>
        <span>{t("portNotes.context.demo")}</span>
      </div>
      <div
        className={styles.contextTabs}
        role="tablist"
        aria-label={t("portNotes.context.label")}
      >
        {contexts.map((context, index) => (
          <button
            id={`port-context-tab-${context.id}`}
            type="button"
            role="tab"
            aria-selected={context.active}
            aria-controls="port-context-panel"
            tabIndex={context.active ? 0 : -1}
            data-active={context.active || undefined}
            key={context.id}
            onClick={() => onSelect(context.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {context.label}
          </button>
        ))}
      </div>
    </section>
  );
}
