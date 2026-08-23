import type { ReactNode } from "react";
import { Link } from "react-router";

import { useI18n } from "../../i18n";
import styles from "./site-navigation.module.css";

type NavigationIconName = "home" | "search" | "port" | "community" | "saved";

export interface SiteNavigationProps {
  readonly current: "home" | "search" | "port";
  readonly portSlug?: string;
  readonly onPlaceholder?: (feature: string) => void;
}

function NavigationIcon({ name }: { readonly name: NavigationIconName }) {
  const paths: Record<NavigationIconName, ReactNode> = {
    home: (
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    port: (
      <>
        <path d="M12 3v13" />
        <path d="m7 8 5 3 5-3" />
        <path d="M5 16c2 2 4 3 7 3s5-1 7-3" />
        <path d="M4 21h16" />
        <path d="M9 3h6" />
      </>
    ),
    community: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 15c3 0 5 1.8 6 4" />
      </>
    ),
    saved: (
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4z" />
    ),
  };

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function SiteNavigation({
  current,
  portSlug = "busan",
  onPlaceholder,
}: SiteNavigationProps) {
  const { t } = useI18n();
  const portHref = `/ports/${portSlug}`;
  const navigationLabel = t("portNotes.nav.label");
  const items = [
    {
      id: "home",
      label: t("portNotes.nav.home"),
      href: "/",
      icon: "home",
    },
    {
      id: "search",
      label: t("portNotes.nav.search"),
      href: "/search",
      icon: "search",
    },
    {
      id: "port",
      label: t("portNotes.nav.port"),
      href: portHref,
      icon: "port",
    },
    {
      id: "community",
      label: t("portNotes.nav.notes"),
      href: `${portHref}#quick-action-write-note`,
      icon: "community",
    },
  ] as const;

  function renderLink(item: (typeof items)[number]) {
    const isCurrent = item.id === current;
    const content = (
      <>
        <NavigationIcon name={item.icon} />
        <span>{item.label}</span>
      </>
    );
    const sharedProps = {
      className: isCurrent ? styles.current : undefined,
      "aria-current": isCurrent ? ("page" as const) : undefined,
    };

    return item.href.includes("#") ? (
      <a
        {...sharedProps}
        href={item.href}
        key={item.id}
      >
        {content}
      </a>
    ) : (
      <Link {...sharedProps} to={item.href} key={item.id}>
        {content}
      </Link>
    );
  }

  function renderSavedButton() {
    return (
      <button
        type="button"
        onClick={() => onPlaceholder?.(t("portNotes.nav.saved"))}
      >
        <NavigationIcon name="saved" />
        <span>{t("portNotes.nav.saved")}</span>
      </button>
    );
  }

  return (
    <>
      <nav
        className={styles.desktopNavigation}
        aria-label={navigationLabel}
        data-navigation="desktop"
      >
        {items.map(renderLink)}
        {renderSavedButton()}
      </nav>

      <nav
        className={styles.mobileNavigation}
        aria-label={navigationLabel}
        data-navigation="mobile"
      >
        {items.map(renderLink)}
        {renderSavedButton()}
      </nav>
    </>
  );
}
