import { useId, type MouseEventHandler, type ReactNode } from 'react';

import styles from './domain.module.css';

export type CriticalInfoSeverity = 'critical' | 'warning' | 'info';

export type CriticalInfoAction =
  | {
      label: string;
      href: string;
      onClick?: never;
    }
  | {
      label: string;
      href?: never;
      onClick: MouseEventHandler<HTMLButtonElement>;
    };

export interface CriticalInfoStripProps {
  title: string;
  children: ReactNode;
  severity?: CriticalInfoSeverity;
  action?: CriticalInfoAction;
  announce?: boolean;
  headingLevel?: 2 | 3;
}

const severityClassNames: Record<CriticalInfoSeverity, string> = {
  critical: styles.criticalStrip,
  warning: styles.warningStrip,
  info: styles.informationStrip,
};

const severitySymbols: Record<CriticalInfoSeverity, string> = {
  critical: '!',
  warning: '!',
  info: 'i',
};

export function CriticalInfoStrip({
  title,
  children,
  severity = 'warning',
  action,
  announce = false,
  headingLevel = 2,
}: CriticalInfoStripProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <aside
      className={`${styles.infoStrip} ${severityClassNames[severity]}`}
      aria-labelledby={headingId}
      role={announce ? 'alert' : 'note'}
    >
      <span className={styles.infoStripSymbol} aria-hidden="true">
        {severitySymbols[severity]}
      </span>
      <div className={styles.infoStripContent}>
        <Heading className={styles.infoStripTitle} id={headingId}>
          {title}
        </Heading>
        <div className={styles.infoStripMessage}>{children}</div>
      </div>
      {action ? (
        typeof action.href === 'string' ? (
          <a className={styles.inlineAction} href={action.href}>
            {action.label}
          </a>
        ) : (
          <button className={styles.inlineAction} type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </aside>
  );
}
