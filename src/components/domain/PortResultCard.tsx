import type { MouseEventHandler } from 'react';

import { TrustStatus, type TrustStatusPresentation } from './TrustStatus';
import styles from './domain.module.css';

interface PortResultCardBaseProps {
  name: string;
  country: string;
  actionLabel: string;
  trust: TrustStatusPresentation;
  city?: string;
  unLocode?: string;
  terminalContext?: string;
  summary?: string;
}

export type PortResultCardProps = PortResultCardBaseProps &
  (
    | {
        href: string;
        onClick?: MouseEventHandler<HTMLAnchorElement>;
        onSelect?: never;
        expanded?: never;
        controls?: never;
      }
    | {
        href?: never;
        onClick?: never;
        onSelect: MouseEventHandler<HTMLButtonElement>;
        expanded?: boolean;
        controls?: string;
      }
  );

export function PortResultCard(props: PortResultCardProps) {
  const {
    name,
    country,
    city,
    actionLabel,
    trust,
    unLocode,
    terminalContext,
    summary,
  } = props;
  const accessibleActionLabel = `${actionLabel}: ${name}`;

  return (
    <article className={styles.portCard}>
      <div className={styles.portCardHeading}>
        <div>
          <h2 className={styles.cardTitle}>
            {props.href ? (
              <a
                href={props.href}
                aria-label={accessibleActionLabel}
                onClick={props.onClick}
              >
                {name}
              </a>
            ) : (
              <button
                type="button"
                aria-label={accessibleActionLabel}
                aria-controls={props.controls}
                aria-expanded={props.expanded}
                onClick={props.onSelect}
              >
                {name}
              </button>
            )}
          </h2>
          <p className={styles.portLocation}>
            {[city, country].filter(Boolean).join(', ')}
            {unLocode ? <span className={styles.locode}> · {unLocode}</span> : null}
          </p>
        </div>
        <TrustStatus {...trust} compact />
      </div>
      {terminalContext ? (
        <p className={styles.terminalContext}>{terminalContext}</p>
      ) : null}
      {summary ? <p className={styles.cardSummary}>{summary}</p> : null}
      <span className={styles.cardAction} aria-hidden="true">
        {actionLabel} <span aria-hidden="true">→</span>
      </span>
    </article>
  );
}
