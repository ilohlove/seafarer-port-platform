import type { MouseEventHandler, ReactNode } from 'react';

import { TrustStatus, type TrustStatusPresentation } from './TrustStatus';
import styles from './domain.module.css';

export interface ServiceFact {
  id: string;
  label: string;
  value: ReactNode;
}

export type ServiceCardAction =
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

export interface ServiceCardProps {
  category: string;
  name: string;
  summary: string;
  facts?: readonly ServiceFact[];
  trust?: TrustStatusPresentation;
  reason?: {
    label: string;
    text: string;
  };
  action?: ServiceCardAction;
}

export function ServiceCard({
  category,
  name,
  summary,
  facts = [],
  trust,
  reason,
  action,
}: ServiceCardProps) {
  return (
    <article className={styles.serviceCard}>
      <p className={styles.cardEyebrow}>{category}</p>
      <h3 className={styles.cardTitle}>{name}</h3>
      {trust ? <TrustStatus {...trust} compact /> : null}
      <p className={styles.cardSummary}>{summary}</p>
      {facts.length > 0 ? (
        <dl className={styles.factList}>
          {facts.map((fact) => (
            <div key={fact.id}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {reason ? (
        <p className={styles.reason}>
          <strong>{reason.label}:</strong> {reason.text}
        </p>
      ) : null}
      {action ? (
        typeof action.href === 'string' ? (
          <a className={styles.cardButton} href={action.href} onClick={action.onClick}>
            {action.label}
          </a>
        ) : (
          <button className={styles.cardButton} type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </article>
  );
}
