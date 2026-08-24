import { useEffect, useState } from "react";

import { TrustStatus } from "../../../components";
import { useI18n } from "../../../i18n";
import type { PortHeroMediaReadModel } from "../../../types";
import type {
  PortSnapshotModel,
  SnapshotFactModel,
  SnapshotFactTarget,
} from "../port-notes-view-model";
import styles from "../port-notes.module.css";

export interface PortSnapshotProps {
  readonly model: PortSnapshotModel;
  readonly facts: readonly SnapshotFactModel[];
  readonly onFactSelect: (target: SnapshotFactTarget) => void;
  readonly onPlaceholder: (feature: string) => void;
  readonly showMedia: boolean;
  readonly media?: PortHeroMediaReadModel;
}

function SnapshotMedia({
  media,
}: {
  readonly media?: PortHeroMediaReadModel;
}) {
  const [failedMediaId, setFailedMediaId] = useState<string>();
  const mediaFailed = failedMediaId === media?.id;
  const variants = media
    ? [...media.variants].sort((left, right) => left.width - right.width)
    : [];
  const fallback = variants.at(-1);

  useEffect(() => {
    setFailedMediaId(undefined);
  }, [media?.id]);

  return (
    <div
      className={styles.snapshotMedia}
      data-image={media && fallback && !mediaFailed ? "true" : "false"}
      data-testid="port-notes-media"
      aria-hidden="true"
    >
      {media && fallback && !mediaFailed ? (
        <img
          className={styles.snapshotMediaImage}
          src={fallback.src}
          srcSet={variants
            .map((variant) => `${variant.src} ${variant.width}w`)
            .join(", ")}
          sizes="(max-width: 47.99rem) 100vw, 80rem"
          width={fallback.width}
          height={fallback.height}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
          style={{ objectPosition: media.objectPosition }}
          onError={() => setFailedMediaId(media.id)}
        />
      ) : null}
    </div>
  );
}

function SnapshotFactIcon({ icon }: Pick<SnapshotFactModel, "icon">) {
  const paths = {
    "shore-leave": (
      <>
        <circle cx="12" cy="5" r="2.2" />
        <path d="m8 21 1-6-2-3 2-3h6l2 3-2 3 1 6M9 9l-3 5M15 9l3 5" />
      </>
    ),
    internet: (
      <>
        <path d="M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9.5 17a4 4 0 0 1 5 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    taxi: (
      <>
        <path d="M5 17h14l-1-7H6zM7 10 8.5 6h7l1.5 4M8 17v2M16 17v2" />
        <circle cx="8" cy="14" r="1" />
        <circle cx="16" cy="14" r="1" />
      </>
    ),
    community: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 15c3 0 5 1.8 6 4" />
      </>
    ),
  } as const;

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[icon]}
    </svg>
  );
}

function SnapshotFactContent({ fact }: { readonly fact: SnapshotFactModel }) {
  return (
    <>
      <span className={styles.snapshotFactIcon}>
        <SnapshotFactIcon icon={fact.icon} />
      </span>
      <span className={styles.snapshotFactBody}>
        <span>{fact.label}</span>
        <strong>{fact.value}</strong>
        {fact.detail ? <small>{fact.detail}</small> : null}
        <TrustStatus {...fact.trust} compact />
      </span>
      {fact.target ? (
        <span className={styles.snapshotFactArrow} aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  );
}

export function PortSnapshot({
  model,
  facts,
  onFactSelect,
  onPlaceholder,
  showMedia,
  media,
}: PortSnapshotProps) {
  const { t } = useI18n();

  return (
    <section
      className={styles.snapshot}
      data-media={showMedia ? "visible" : "omitted"}
      aria-labelledby="port-snapshot-heading"
    >
      {showMedia ? <SnapshotMedia media={media} /> : null}
      <div className={styles.snapshotBody}>
        <div className={styles.snapshotHeadingRow}>
          <div>
            <h1 id="port-snapshot-heading">{model.name}</h1>
            <p className={styles.location}>{model.location}</p>
          </div>
          <button
            className={styles.secondaryButton}
            type="button"
            aria-label={t("portNotes.snapshot.save")}
            onClick={() => onPlaceholder(t("portNotes.snapshot.save"))}
          >
            <span className={styles.saveLong}>
              + {t("portNotes.snapshot.save")}
            </span>
            <span className={styles.saveShort}>
              + {t("portNotes.snapshot.saveShort")}
            </span>
          </button>
        </div>

        <div className={styles.terminalContext}>
          <span className={styles.contextLabel}>
            {t("portNotes.snapshot.selectedTerminal")}
          </span>
          <strong>{model.terminal}</strong>
          <span>
            <span className={styles.gateLabel}>
              {t("portNotes.snapshot.gateLabel")}
            </span>{" "}
            {model.gate}
          </span>
        </div>

        <section
          className={styles.snapshotFacts}
          aria-label={t("portNotes.utility.label")}
        >
          {facts.map((fact) => (
            <article
              className={styles.snapshotFact}
              data-snapshot-fact-id={fact.id}
              key={fact.id}
            >
              {fact.target ? (
                <button type="button" onClick={() => onFactSelect(fact.target!)}>
                  <SnapshotFactContent fact={fact} />
                </button>
              ) : (
                <div className={styles.snapshotFactStatic}>
                  <SnapshotFactContent fact={fact} />
                </div>
              )}
            </article>
          ))}
        </section>

        {media ? (
          <footer className={styles.snapshotCredit}>
            <span>{t("portNotes.snapshot.photoCredit")}:</span>{" "}
            <a
              href={media.attribution.sourcePageUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("portNotes.snapshot.photoSource", {
                creator: media.attribution.creator,
              })}
            >
              {media.attribution.creator}
            </a>
            <span aria-hidden="true"> · </span>
            <a
              href={media.attribution.licenseUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("portNotes.snapshot.photoLicense", {
                license: media.attribution.licenseName,
              })}
            >
              {media.attribution.licenseName}
            </a>
            <span aria-hidden="true"> · </span>
            <span>{t("portNotes.snapshot.photoChanges")}</span>
          </footer>
        ) : null}
      </div>
    </section>
  );
}
