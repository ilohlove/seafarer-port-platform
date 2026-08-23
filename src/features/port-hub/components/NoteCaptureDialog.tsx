import { useEffect, useRef, useState } from "react";

import { useI18n, type TranslationKey } from "../../../i18n";
import styles from "../port-notes.module.css";

type CaptureTopic =
  | "esim"
  | "physicalSim"
  | "shoreLeave"
  | "food"
  | "shopping"
  | "welfare"
  | "general";

type Visibility = "public" | "private";

interface CaptureField {
  readonly id: string;
  readonly label: TranslationKey;
}

const topicOptions: readonly {
  readonly id: CaptureTopic;
  readonly label: TranslationKey;
  readonly fields: readonly CaptureField[];
}[] = [
  {
    id: "esim",
    label: "portNotes.capture.topic.esim",
    fields: [
      { id: "provider", label: "portNotes.capture.q.provider" },
      { id: "package", label: "portNotes.capture.q.package" },
      { id: "signal", label: "portNotes.capture.q.signal" },
    ],
  },
  {
    id: "physicalSim",
    label: "portNotes.capture.topic.physicalSim",
    fields: [
      { id: "seller", label: "portNotes.capture.q.seller" },
      { id: "buying", label: "portNotes.capture.q.buying" },
    ],
  },
  {
    id: "shoreLeave",
    label: "portNotes.capture.topic.shoreLeave",
    fields: [
      { id: "gate", label: "portNotes.capture.q.gate" },
      { id: "destination", label: "portNotes.capture.q.destination" },
      { id: "fare", label: "portNotes.capture.q.fare" },
    ],
  },
  {
    id: "food",
    label: "portNotes.capture.topic.food",
    fields: [
      { id: "item", label: "portNotes.capture.q.item" },
      { id: "payment", label: "portNotes.capture.q.payment" },
    ],
  },
  {
    id: "shopping",
    label: "portNotes.capture.topic.shopping",
    fields: [
      { id: "gift", label: "portNotes.capture.q.gift" },
      { id: "reason", label: "portNotes.capture.q.reason" },
    ],
  },
  {
    id: "welfare",
    label: "portNotes.capture.topic.welfare",
    fields: [
      { id: "service", label: "portNotes.capture.q.service" },
      { id: "schedule", label: "portNotes.capture.q.schedule" },
      { id: "supportContact", label: "portNotes.capture.q.supportContact" },
    ],
  },
  {
    id: "general",
    label: "portNotes.capture.topic.general",
    fields: [{ id: "warning", label: "portNotes.capture.q.warning" }],
  },
];

export interface NoteCapturePreview {
  readonly topic: CaptureTopic;
  readonly visibility: Visibility;
  readonly takeaway: string;
}

export interface NoteCaptureDialogProps {
  readonly open: boolean;
  readonly portName: string;
  readonly terminal: string;
  readonly gate: string;
  readonly onClose: () => void;
  readonly onPreview: (preview: NoteCapturePreview) => void;
}

export function NoteCaptureDialog({
  open,
  portName,
  terminal,
  gate,
  onClose,
  onPreview,
}: NoteCaptureDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [topic, setTopic] = useState<CaptureTopic>();
  const [visibility, setVisibility] = useState<Visibility>();
  const [takeaway, setTakeaway] = useState("");
  const [price, setPrice] = useState("");
  const [place, setPlace] = useState("");
  const [contact, setContact] = useState("");
  const [contactPermission, setContactPermission] = useState(false);
  const [extra, setExtra] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<TranslationKey>();

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTopic(undefined);
    setVisibility(undefined);
    setTakeaway("");
    setPrice("");
    setPlace("");
    setContact("");
    setContactPermission(false);
    setExtra("");
    setFieldValues({});
    setError(undefined);
    closeButtonRef.current?.focus();

    return () => previousFocusRef.current?.focus();
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled])",
      ) ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function updateField(id: string, value: string) {
    setFieldValues((current) => ({ ...current, [id]: value }));
  }

  function submitPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic || !visibility || (!takeaway.trim() && !Object.values(fieldValues).some(Boolean))) {
      setError("portNotes.capture.missing");
      return;
    }
    if (visibility === "public" && contact.trim() && !contactPermission) {
      setError("portNotes.capture.contactPermissionRequired");
      return;
    }
    onPreview({ topic, visibility, takeaway: takeaway.trim() });
  }

  const selectedTopic = topicOptions.find((candidate) => candidate.id === topic);

  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <dialog
        ref={dialogRef}
        open
        className={styles.noteCaptureDialog}
        aria-modal="true"
        aria-labelledby="note-capture-heading"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{t("portNotes.capture.eyebrow")}</p>
            <h2 id="note-capture-heading">{t("portNotes.capture.heading")}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className={styles.dialogClose}
            type="button"
            aria-label={t("portNotes.capture.close")}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className={styles.dialogContext}>
          {portName} · {terminal} · {t("portNotes.snapshot.gateLabel")} {gate}
        </p>

        <form onSubmit={submitPreview}>
          <fieldset className={styles.captureFieldset}>
            <legend>{t("portNotes.capture.topicLabel")}</legend>
            <div className={styles.captureTopicGrid}>
              {topicOptions.map((candidate) => (
                <button
                  className={topic === candidate.id ? styles.captureTopicActive : undefined}
                  type="button"
                  aria-pressed={topic === candidate.id}
                  key={candidate.id}
                  onClick={() => {
                    setTopic(candidate.id);
                    setError(undefined);
                  }}
                >
                  {t(candidate.label)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.captureFields}>
            <label>
              {t("portNotes.capture.takeaway")}
              <textarea
                value={takeaway}
                onChange={(event) => setTakeaway(event.currentTarget.value)}
                placeholder={t("portNotes.capture.takeawayPlaceholder")}
                rows={3}
              />
              <small>{t("portNotes.capture.takeawayHelp")}</small>
            </label>

            {selectedTopic ? (
              <div className={styles.captureQuestionGrid}>
              {selectedTopic.fields.map((field) => (
                <label key={field.id}>
                  {t(field.label)}
                    <input
                      id={`note-${field.id}`}
                      type="text"
                      value={fieldValues[field.id] ?? ""}
                      onChange={(event) => updateField(field.id, event.currentTarget.value)}
                    />
                  </label>
                ))}
              </div>
            ) : null}

            <div className={styles.captureQuestionGrid}>
              <label>
                {t("portNotes.capture.price")}
                <input
                  id="note-price"
                  type="text"
                  value={price}
                  onChange={(event) => setPrice(event.currentTarget.value)}
                  placeholder={t("portNotes.capture.pricePlaceholder")}
                />
              </label>
              <label>
                {t("portNotes.capture.place")}
                <input
                  id="note-place"
                  type="text"
                  value={place}
                  onChange={(event) => setPlace(event.currentTarget.value)}
                  placeholder={t("portNotes.capture.placePlaceholder")}
                />
              </label>
            </div>

            <label>
              {t("portNotes.capture.contact")}
              <input
                id="note-contact"
                type="text"
                value={contact}
                onChange={(event) => setContact(event.currentTarget.value)}
                placeholder={t("portNotes.capture.contactPlaceholder")}
              />
            </label>
            {contact ? (
              <label className={styles.captureCheckbox}>
                <input
                  type="checkbox"
                  checked={contactPermission}
                  onChange={(event) => setContactPermission(event.currentTarget.checked)}
                />
                <span>{t("portNotes.capture.contactPermission")}</span>
              </label>
            ) : null}

            <label>
              {t("portNotes.capture.extra")}
              <textarea
                id="note-extra"
                value={extra}
                onChange={(event) => setExtra(event.currentTarget.value)}
                placeholder={t("portNotes.capture.extraPlaceholder")}
                rows={3}
              />
            </label>
          </div>

          <fieldset className={styles.captureFieldset}>
            <legend>{t("portNotes.capture.visibilityLabel")}</legend>
            <div className={styles.visibilityOptions}>
              <label aria-label={t("portNotes.capture.public")}>
                <input
                  type="radio"
                  name="note-visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                <span>
                  <strong>{t("portNotes.capture.public")}</strong>
                  <small>{t("portNotes.capture.publicHelp")}</small>
                </span>
              </label>
              <label aria-label={t("portNotes.capture.private")}>
                <input
                  type="radio"
                  name="note-visibility"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                />
                <span>
                  <strong>{t("portNotes.capture.private")}</strong>
                  <small>{t("portNotes.capture.privateHelp")}</small>
                </span>
              </label>
            </div>
          </fieldset>

          {error ? <p className={styles.captureError} role="alert">{t(error)}</p> : null}
          <button className={styles.primaryButton} type="submit">
            {t("portNotes.capture.preview")}
          </button>
        </form>
      </dialog>
    </div>
  );
}
