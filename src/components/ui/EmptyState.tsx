import { useId, type MouseEventHandler, type ReactNode } from 'react';

import styles from './ui.module.css';

export type EmptyStateAction =
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

export interface EmptyStateProps {
  heading: string;
  description: ReactNode;
  action?: EmptyStateAction;
  symbol?: ReactNode;
  headingLevel?: 2 | 3;
  announce?: boolean;
}

export function EmptyState({
  heading,
  description,
  action,
  symbol,
  headingLevel = 2,
  announce = false,
}: EmptyStateProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section
      className={styles.emptyState}
      aria-labelledby={headingId}
      aria-live={announce ? 'polite' : undefined}
    >
      {symbol ? (
        <span className={styles.emptySymbol} aria-hidden="true">
          {symbol}
        </span>
      ) : null}
      <Heading id={headingId}>{heading}</Heading>
      <div className={styles.emptyDescription}>{description}</div>
      {action ? (
        typeof action.href === 'string' ? (
          <a className={styles.emptyAction} href={action.href} onClick={action.onClick}>
            {action.label}
          </a>
        ) : (
          <button className={styles.emptyAction} type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </section>
  );
}
