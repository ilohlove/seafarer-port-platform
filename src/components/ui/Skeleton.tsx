import styles from './ui.module.css';

export type SkeletonVariant = 'text' | 'card' | 'list';

export interface SkeletonProps {
  label: string;
  lines?: number;
  variant?: SkeletonVariant;
}

export function Skeleton({
  label,
  lines = 3,
  variant = 'text',
}: SkeletonProps) {
  const safeLineCount = Math.min(10, Math.max(1, Math.floor(lines)));

  return (
    <output
      className={styles.skeleton}
      data-variant={variant}
      aria-busy="true"
    >
      <span className={styles.srOnly}>{label}</span>
      <div className={styles.skeletonBody} aria-hidden="true">
        {Array.from({ length: safeLineCount }, (_, index) => (
          <span
            className={styles.skeletonLine}
            data-last={index === safeLineCount - 1 || undefined}
            key={index}
          />
        ))}
      </div>
    </output>
  );
}
