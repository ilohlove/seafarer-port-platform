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

interface CaptureSuggestion {
  readonly id: string;
  readonly label: TranslationKey;
}

interface CaptureTopicOption {
  readonly id: CaptureTopic;
  readonly label: TranslationKey;
  readonly suggestions: readonly CaptureSuggestion[];
}

interface PreviewDetail {
  readonly label: string;
  readonly value: string;
}

export interface NoteCapturePreview {
  readonly topic: CaptureTopic;
  readonly visibility: Visibility;
  readonly takeaway: string;
  readonly details: readonly PreviewDetail[];
  readonly contact?: string;
}

const topicOptions: readonly CaptureTopicOption[] = [
  {
    id: "esim",
    label: "portNotes.capture.topic.esim",
    suggestions: [
      { id: "price", label: "portNotes.capture.chip.esim.price" },
      { id: "data", label: "portNotes.capture.chip.esim.data" },
      { id: "days", label: "portNotes.capture.chip.esim.days" },
      { id: "hotspot", label: "portNotes.capture.chip.esim.hotspot" },
      { id: "signal", label: "portNotes.capture.chip.esim.signal" },
      { id: "website", label: "portNotes.capture.chip.esim.website" },
    ],
  },
  {
    id: "physicalSim",
    label: "portNotes.capture.topic.physicalSim",
    suggestions: [
      { id: "seller", label: "portNotes.capture.chip.physicalSim.seller" },
      { id: "fairPrice", label: "portNotes.capture.chip.physicalSim.fairPrice" },
      { id: "passport", label: "portNotes.capture.chip.physicalSim.passport" },
      { id: "delivery", label: "portNotes.capture.chip.physicalSim.delivery" },
      { id: "contact", label: "portNotes.capture.chip.physicalSim.contact" },
    ],
  },
  {
    id: "shoreLeave",
    label: "portNotes.capture.topic.shoreLeave",
    suggestions: [
      { id: "pickup", label: "portNotes.capture.chip.shoreLeave.pickup" },
      { id: "rideApp", label: "portNotes.capture.chip.shoreLeave.rideApp" },
      { id: "price", label: "portNotes.capture.chip.shoreLeave.price" },
      { id: "agreeFare", label: "portNotes.capture.chip.shoreLeave.agreeFare" },
      { id: "avoid", label: "portNotes.capture.chip.shoreLeave.avoid" },
    ],
  },
  {
    id: "food",
    label: "portNotes.capture.topic.food",
    suggestions: [
      { id: "seller", label: "portNotes.capture.chip.food.seller" },
      { id: "where", label: "portNotes.capture.chip.food.where" },
      { id: "price", label: "portNotes.capture.chip.food.price" },
      { id: "shipDelivery", label: "portNotes.capture.chip.food.shipDelivery" },
      { id: "recommendation", label: "portNotes.capture.chip.food.recommendation" },
    ],
  },
  {
    id: "shopping",
    label: "portNotes.capture.topic.shopping",
    suggestions: [
      { id: "supermarket", label: "portNotes.capture.chip.shopping.supermarket" },
      { id: "cosmetics", label: "portNotes.capture.chip.shopping.cosmetics" },
      { id: "supplements", label: "portNotes.capture.chip.shopping.supplements" },
      { id: "gift", label: "portNotes.capture.chip.shopping.gift" },
      { id: "goodPrice", label: "portNotes.capture.chip.shopping.goodPrice" },
    ],
  },
  {
    id: "welfare",
    label: "portNotes.capture.topic.welfare",
    suggestions: [
      { id: "wifi", label: "portNotes.capture.chip.welfare.wifi" },
      { id: "shuttle", label: "portNotes.capture.chip.welfare.shuttle" },
      { id: "sim", label: "portNotes.capture.chip.welfare.sim" },
      { id: "currency", label: "portNotes.capture.chip.welfare.currency" },
      { id: "contact", label: "portNotes.capture.chip.welfare.contact" },
      { id: "hours", label: "portNotes.capture.chip.welfare.hours" },
    ],
  },
  {
    id: "general",
    label: "portNotes.capture.topic.general",
    suggestions: [
      { id: "try", label: "portNotes.capture.chip.general.try" },
      { id: "avoid", label: "portNotes.capture.chip.general.avoid" },
      { id: "cost", label: "portNotes.capture.chip.general.cost" },
      { id: "location", label: "portNotes.capture.chip.general.location" },
      { id: "contact", label: "portNotes.capture.chip.general.contact" },
    ],
  },
];

export interface NoteCaptureDialogProps {
  readonly open: boolean;
  readonly portName: string;
  readonly terminal: string;
  readonly gate: string;
  readonly onClose: () => void;
  readonly onSubmit?: (preview: NoteCapturePreview) => Promise<void>;
}

export function NoteCaptureDialog({
  open,
  portName,
  terminal,
  gate,
  onClose,
  onSubmit,
}: NoteCaptureDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
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
  const [activeSuggestions, setActiveSuggestions] = useState<readonly string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [preview, setPreview] = useState<NoteCapturePreview>();
  const [error, setError] = useState<TranslationKey>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setActiveSuggestions([]);
    setDetailsOpen(false);
    setPreview(undefined);
    setError(undefined);
    setIsSubmitting(false);
    closeButtonRef.current?.focus();

    return () => previousFocusRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (preview) {
      previewHeadingRef.current?.focus();
    }
  }, [preview]);

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

  function selectTopic(nextTopic: CaptureTopic) {
    setTopic(nextTopic);
    setActiveSuggestions([]);
    setFieldValues({});
    setError(undefined);
  }

  function toggleSuggestion(id: string) {
    setActiveSuggestions((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
    setError(undefined);
  }

  function submitPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic) {
      setError("portNotes.capture.missingTopic");
      return;
    }
    if (!visibility) {
      setError("portNotes.capture.missingVisibility");
      return;
    }

    const hasStructuredContent = [
      ...Object.values(fieldValues),
      price,
      place,
      contact,
      extra,
    ].some((value) => value.trim());
    if (!takeaway.trim() && !hasStructuredContent) {
      setError("portNotes.capture.missingContent");
      return;
    }
    const suggestionContact = activeSuggestions.includes("contact")
      ? fieldValues.contact?.trim() ?? ""
      : "";
    const contactValue = contact.trim() || suggestionContact;
    if (
      visibility === "public" &&
      contactValue &&
      !contactPermission
    ) {
      setError("portNotes.capture.contactPermissionRequired");
      return;
    }

    const selectedTopic = topicOptions.find((candidate) => candidate.id === topic);
    const details: PreviewDetail[] = [
      ...(selectedTopic?.suggestions ?? [])
        .filter((suggestion) => activeSuggestions.includes(suggestion.id))
        .map((suggestion) => ({
          label: t(suggestion.label),
          value: fieldValues[suggestion.id]?.trim() ?? "",
        })),
      { label: t("portNotes.capture.price"), value: price.trim() },
      { label: t("portNotes.capture.place"), value: place.trim() },
      { label: t("portNotes.capture.extra"), value: extra.trim() },
    ].filter((detail) => detail.value);

    setPreview({
      topic,
      visibility,
      takeaway: takeaway.trim(),
      details,
      contact:
        contactValue && (visibility === "private" || contactPermission)
          ? contactValue
          : undefined,
    });
    setError(undefined);
  }

  const selectedTopic = topicOptions.find((candidate) => candidate.id === topic);

  async function commitPreview() {
    if (!preview) {
      return;
    }
    if (!onSubmit) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    setError(undefined);
    try {
      await onSubmit(preview);
      onClose();
    } catch {
      setError("portNotes.capture.submitError");
    } finally {
      setIsSubmitting(false);
    }
  }

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

        {preview ? (
          <section className={styles.capturePreview} aria-labelledby="note-preview-heading">
            <p className={styles.sectionEyebrow}>{t("portNotes.capture.previewEyebrow")}</p>
            <h3
              id="note-preview-heading"
              ref={previewHeadingRef}
              tabIndex={-1}
            >
              {t("portNotes.capture.previewHeading")}
            </h3>
            <output className={styles.capturePreviewNotice}>
              {t("portNotes.capture.previewNotice")}
            </output>
            <p className={styles.capturePreviewTopic}>
              <strong>{t("portNotes.capture.topicLabel")}:</strong>{" "}
              {selectedTopic ? t(selectedTopic.label) : ""}
            </p>
            <div className={styles.capturePreviewBody}>
              <strong>{t("portNotes.capture.takeaway")}</strong>
              {preview.takeaway ? (
                <p>{preview.takeaway}</p>
              ) : (
                <p className={styles.capturePreviewMuted}>
                  {t("portNotes.capture.previewNoTakeaway")}
                </p>
              )}
            </div>
            {preview.details.length > 0 ? (
              <dl className={styles.capturePreviewDetails}>
                {preview.details.map((detail) => (
                  <div key={`${detail.label}-${detail.value}`}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {preview.contact ? (
              <div className={styles.capturePreviewContact}>
                <strong>{t("portNotes.capture.contact")}</strong>
                <p>{preview.contact}</p>
              </div>
            ) : null}
            <p className={styles.capturePreviewVisibility}>
              {preview.visibility === "public"
                ? t("portNotes.capture.public")
                : t("portNotes.capture.private")}
            </p>
            <div className={styles.capturePreviewActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setPreview(undefined)}
              >
                {t("portNotes.capture.edit")}
              </button>
              <button
                className={styles.textButton}
                type="button"
                onClick={onClose}
              >
                {t("portNotes.capture.closePreview")}
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                disabled={isSubmitting}
                onClick={() => void commitPreview()}
              >
                {isSubmitting
                  ? t("portNotes.capture.submitting")
                  : preview.visibility === "private"
                    ? t("portNotes.capture.savePrivate")
                    : t("portNotes.capture.submit")}
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={submitPreview}>
            <fieldset className={styles.captureFieldset}>
              <legend>{t("portNotes.capture.topicLabel")}</legend>
              <div className={styles.captureTopicPicker}>
                <div
                  className={
                    selectedTopic
                      ? `${styles.captureTopicDesktop} ${styles.captureTopicDesktopSelected}`
                      : styles.captureTopicDesktop
                  }
                >
                  <div className={styles.captureTopicGrid}>
                    {topicOptions.map((candidate) => (
                      <button
                        className={topic === candidate.id ? styles.captureTopicActive : undefined}
                        type="button"
                        aria-pressed={topic === candidate.id}
                        key={candidate.id}
                        onClick={() => selectTopic(candidate.id)}
                      >
                        {t(candidate.label)}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedTopic ? (
                  <button
                    className={styles.captureTopicSummary}
                    type="button"
                    onClick={() => setTopic(undefined)}
                  >
                    <span>
                      {t("portNotes.capture.topicSummary", {
                        topic: t(selectedTopic.label),
                      })}
                    </span>
                    <span>{t("portNotes.capture.changeTopic")}</span>
                  </button>
                ) : null}
              </div>
            </fieldset>

            <div className={styles.captureFields}>
              <label className={styles.captureTakeawayLabel}>
                {t("portNotes.capture.takeaway")}
                <textarea
                  value={takeaway}
                  onChange={(event) => setTakeaway(event.currentTarget.value)}
                  placeholder={t("portNotes.capture.takeawayPlaceholder")}
                  rows={4}
                />
                <small>{t("portNotes.capture.takeawayHelp")}</small>
              </label>

              {selectedTopic ? (
                <fieldset className={styles.captureSuggestions}>
                  <legend>{t("portNotes.capture.suggestionsLabel")}</legend>
                  <div className={styles.captureChipList}>
                    {selectedTopic.suggestions.map((suggestion) => {
                      const active = activeSuggestions.includes(suggestion.id);
                      return (
                        <button
                          className={active ? styles.captureChipActive : undefined}
                          type="button"
                          aria-pressed={active}
                          key={suggestion.id}
                          onClick={() => toggleSuggestion(suggestion.id)}
                        >
                          {t(suggestion.label)}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTopic.suggestions
                    .filter((suggestion) => activeSuggestions.includes(suggestion.id))
                    .map((suggestion) => (
      <label className={styles.captureSuggestionField} key={suggestion.id}>
                        {t(suggestion.label)}
                        <input
                          id={`note-suggestion-${suggestion.id}`}
                          type="text"
                          value={fieldValues[suggestion.id] ?? ""}
                          onChange={(event) =>
                            updateField(suggestion.id, event.currentTarget.value)
                          }
                          placeholder={t("portNotes.capture.suggestionPlaceholder")}
                        />
                      </label>
                    ))}
                  {activeSuggestions.includes("contact") && fieldValues.contact?.trim() ? (
                    <label className={styles.captureCheckbox}>
                      <input
                        type="checkbox"
                        checked={contactPermission}
                        onChange={(event) => setContactPermission(event.currentTarget.checked)}
                      />
                      <span>{t("portNotes.capture.contactPermission")}</span>
                    </label>
                  ) : null}
                </fieldset>
              ) : null}

              <div className={styles.captureDetailsSection}>
                <button
                  className={styles.captureDetailsToggle}
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-controls="note-extra-details"
                  onClick={() => setDetailsOpen((current) => !current)}
                >
                  <span>{t("portNotes.capture.detailsToggle")}</span>
                  <span aria-hidden="true">{detailsOpen ? "−" : "+"}</span>
                </button>
                {detailsOpen ? (
                  <div id="note-extra-details" className={styles.captureDetails}>
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
                ) : null}
              </div>
            </div>

            <fieldset className={styles.captureFieldset}>
              <legend>{t("portNotes.capture.visibilityLabel")}</legend>
              <div className={styles.visibilityOptions}>
                <label aria-label={t("portNotes.capture.public")}>
                  <input
                    type="radio"
                    name="note-visibility"
                    checked={visibility === "public"}
                    onChange={() => {
                      setVisibility("public");
                      setError(undefined);
                    }}
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
                    onChange={() => {
                      setVisibility("private");
                      setError(undefined);
                    }}
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
        )}
      </dialog>
    </div>
  );
}
