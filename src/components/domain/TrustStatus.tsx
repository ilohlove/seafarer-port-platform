import styles from './domain.module.css';

export type TrustStatusVariant =
  | 'officialSource'
  | 'communityConfirmed'
  | 'needsConfirmation'
  | 'conflictingReports'
  | 'unknown';

export interface TrustStatusPresentation {
  label: string;
  status: TrustStatusVariant;
  detail?: string;
}

export interface TrustStatusProps extends TrustStatusPresentation {
  compact?: boolean;
}

const statusClassNames: Record<TrustStatusVariant, string> = {
  officialSource: styles.trustOfficial,
  communityConfirmed: styles.trustCommunity,
  needsConfirmation: styles.trustNeedsConfirmation,
  conflictingReports: styles.trustConflicting,
  unknown: styles.trustUnknown,
};

const statusSymbols: Record<TrustStatusVariant, string> = {
  officialSource: '✓',
  communityConfirmed: '✓',
  needsConfirmation: '?',
  conflictingReports: '!',
  unknown: '–',
};

export function TrustStatus({
  status,
  label,
  detail,
  compact = false,
}: TrustStatusProps) {
  return (
    <span className={styles.trustStatus} data-compact={compact || undefined}>
      <span className={`${styles.trustBadge} ${statusClassNames[status]}`}>
        <span className={styles.trustSymbol} aria-hidden="true">
          {statusSymbols[status]}
        </span>
        <span>{label}</span>
      </span>
      {!compact && detail ? <span className={styles.trustDetail}>{detail}</span> : null}
    </span>
  );
}
