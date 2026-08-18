import type { MouseEventHandler } from 'react';

import styles from './ui.module.css';

export type ConnectivityBannerMode = 'offline' | 'dataSaver' | 'ultraLite';

export type OfflineBannerAction =
  | {
      label: string;
      href: string;
      onClick?: MouseEventHandler<HTMLAnchorElement>;
    }
  | {
      label: string;
      href?: never;
      onClick: MouseEventHandler<HTMLButtonElement>;
    };

export interface OfflineBannerProps {
  compact?: boolean;
  mode: ConnectivityBannerMode;
  title: string;
  message: string;
  action?: OfflineBannerAction;
  announce?: boolean;
}

const modeClassNames: Record<ConnectivityBannerMode, string> = {
  offline: styles.bannerOffline,
  dataSaver: styles.bannerDataSaver,
  ultraLite: styles.bannerUltraLite,
};

const modeSymbols: Record<ConnectivityBannerMode, string> = {
  offline: '×',
  dataSaver: '↓',
  ultraLite: 'T',
};

export function OfflineBanner({
  compact = false,
  mode,
  title,
  message,
  action,
  announce = true,
}: OfflineBannerProps) {
  return (
    <aside
      className={`${styles.connectivityBanner} ${modeClassNames[mode]} ${
        compact ? styles.bannerCompact : ""
      }`}
      role={announce ? 'status' : 'note'}
    >
      <span className={styles.bannerSymbol} aria-hidden="true">
        {modeSymbols[mode]}
      </span>
      <div className={styles.bannerContent}>
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {action ? (
        typeof action.href === 'string' ? (
          <a className={styles.bannerAction} href={action.href} onClick={action.onClick}>
            {action.label}
          </a>
        ) : (
          <button className={styles.bannerAction} type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </aside>
  );
}
