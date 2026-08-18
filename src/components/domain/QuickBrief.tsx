import { useId, type ReactNode } from 'react';

import styles from './domain.module.css';

export interface QuickBriefItem {
  id: string;
  label: string;
  value: ReactNode;
  detail?: string;
}

export interface QuickBriefProps {
  heading: string;
  items: readonly QuickBriefItem[];
  description?: string;
  headingLevel?: 2 | 3;
}

export function QuickBrief({
  heading,
  items,
  description,
  headingLevel = 2,
}: QuickBriefProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section className={styles.quickBrief} aria-labelledby={headingId}>
      <div className={styles.sectionHeading}>
        <Heading id={headingId}>{heading}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      <dl className={styles.briefGrid}>
        {items.map((item) => (
          <div className={styles.briefItem} key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
            {item.detail ? <dd className={styles.briefDetail}>{item.detail}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
