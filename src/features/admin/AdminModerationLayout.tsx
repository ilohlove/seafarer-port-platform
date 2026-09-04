import type { ReactNode } from "react";
import { NavLink } from "react-router";

import { useI18n } from "../../i18n";
import styles from "./admin-moderation.module.css";

export type ModerationSection = "notes" | "feedback" | "corrections";

export function AdminModerationLayout({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main className={styles.shell}>
      <header className={styles.shellHeader}>
        <p>CrewPort</p>
        <h1>{t("admin.moderation.heading")}</h1>
      </header>
      <nav className={styles.tabs} aria-label={t("admin.moderation.sections")}>
        <NavLink to="/admin/moderation/notes">{t("admin.moderation.notes")}</NavLink>
        <NavLink to="/admin/moderation/feedback">{t("admin.moderation.feedback")}</NavLink>
        <NavLink to="/admin/moderation/corrections">{t("admin.moderation.corrections")}</NavLink>
      </nav>
      {children}
    </main>
  );
}
