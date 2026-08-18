import type { MouseEventHandler, ReactNode } from 'react';

import styles from './ui.module.css';

export type ActionEmphasis = 'primary' | 'secondary' | 'danger';

interface ActionBarItemBase {
  id: string;
  label: string;
  icon?: ReactNode;
  emphasis?: ActionEmphasis;
}

export type ActionBarItem =
  | (ActionBarItemBase & {
      href: string;
      onClick?: MouseEventHandler<HTMLAnchorElement>;
      disabled?: boolean;
      pressed?: never;
    })
  | (ActionBarItemBase & {
      href?: never;
      onClick: MouseEventHandler<HTMLButtonElement>;
      disabled?: false;
      pressed?: boolean;
    })
  | (ActionBarItemBase & {
      href?: never;
      onClick?: never;
      disabled: true;
      pressed?: boolean;
    });

export interface ActionBarProps {
  label: string;
  actions: readonly ActionBarItem[];
  sticky?: boolean;
}

const emphasisClassNames: Record<ActionEmphasis, string> = {
  primary: styles.actionPrimary,
  secondary: styles.actionSecondary,
  danger: styles.actionDanger,
};

export function ActionBar({ label, actions, sticky = false }: ActionBarProps) {
  return (
    <nav
      className={styles.actionBar}
      data-sticky={sticky || undefined}
      aria-label={label}
    >
      <ul className={styles.actionList}>
        {actions.map((action) => {
          const className = `${styles.actionItem} ${
            emphasisClassNames[action.emphasis ?? 'secondary']
          }`;
          const content = (
            <>
              {action.icon ? (
                <span className={styles.actionIcon} aria-hidden="true">
                  {action.icon}
                </span>
              ) : null}
              <span>{action.label}</span>
            </>
          );

          return (
            <li key={action.id}>
              {typeof action.href === 'string' ? (
                <a
                  className={className}
                  href={action.href}
                  aria-disabled={action.disabled || undefined}
                  tabIndex={action.disabled ? -1 : undefined}
                  onClick={(event) => {
                    if (action.disabled) {
                      event.preventDefault();
                      return;
                    }
                    action.onClick?.(event);
                  }}
                >
                  {content}
                </a>
              ) : (
                <button
                  className={className}
                  type="button"
                  disabled={action.disabled}
                  aria-pressed={action.pressed}
                  onClick={action.onClick}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
