import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';

import styles from './ui.module.css';

export interface SearchSuggestion {
  readonly id: string;
  readonly value: string;
  readonly primary: string;
  readonly secondary?: string;
}

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  label: string;
  placeholder: string;
  submitLabel: string;
  clearLabel?: string;
  onClear?: () => void;
  helperText?: string;
  labelVisuallyHidden?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  suggestions?: readonly SearchSuggestion[];
  suggestionsLabel?: string;
  suggestionsLoading?: boolean;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  submitLabel,
  clearLabel,
  onClear,
  helperText,
  labelVisuallyHidden = false,
  id,
  name = 'port-search',
  disabled = false,
  inputRef,
  suggestions,
  suggestionsLabel,
  suggestionsLoading = false,
  onSuggestionSelect,
}: SearchBoxProps) {
  const generatedId = useId();
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-help`;
  const listboxId = `${inputId}-suggestions`;
  const query = value.trim();
  const suggestionsEnabled = suggestions !== undefined && Boolean(onSuggestionSelect);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
    setSuggestionsOpen(Boolean(query && suggestions && suggestions.length > 0));
  }, [query, suggestions]);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      internalInputRef.current = node;
      if (typeof inputRef === 'function') {
        inputRef(node);
      } else if (inputRef) {
        inputRef.current = node;
      }
    },
    [inputRef],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.currentTarget.value);
    if (suggestionsEnabled) {
      setSuggestionsOpen(Boolean(event.currentTarget.value.trim()));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeSuggestion = suggestions?.[activeSuggestionIndex];
    if (suggestionsOpen && activeSuggestion && onSuggestionSelect) {
      onSuggestionSelect(activeSuggestion);
      setSuggestionsOpen(false);
      return;
    }
    if (!disabled && query) {
      onSubmit(query);
    }
  }

  function handleClear() {
    onChange('');
    onClear?.();
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    internalInputRef.current?.focus();
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    onChange(suggestion.value);
    onSuggestionSelect?.(suggestion);
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsEnabled || !suggestions || suggestions.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  }

  function handleInputBlur() {
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  }

  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- React 19 warns for the newer <search> element.
    <div role="search">
      <form
        className={styles.searchForm}
        onSubmit={handleSubmit}
      >
        <label
          className={labelVisuallyHidden ? styles.srOnly : styles.searchLabel}
          htmlFor={inputId}
        >
          {label}
        </label>
        <div className={styles.searchControls}>
          <div className={styles.searchInputWrap}>
            <span className={styles.searchIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
            </span>
            <input
              className={styles.searchInput}
              id={inputId}
              name={name}
              type="search"
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              autoCapitalize="none"
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby={helperText ? helperId : undefined}
              aria-autocomplete={suggestionsEnabled ? 'list' : undefined}
              aria-busy={suggestionsEnabled ? suggestionsLoading : undefined}
              aria-controls={suggestionsEnabled ? listboxId : undefined}
              aria-expanded={suggestionsEnabled ? suggestionsOpen : undefined}
              aria-activedescendant={
                suggestionsOpen && activeSuggestionIndex >= 0
                  ? `${listboxId}-${activeSuggestionIndex}`
                  : undefined
              }
              role={suggestionsEnabled ? 'combobox' : undefined}
              onChange={handleChange}
              onFocus={() =>
                setSuggestionsOpen(Boolean(suggestions && suggestions.length > 0))
              }
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              ref={setInputRef}
            />
            {clearLabel && value ? (
              <button
                className={styles.clearButton}
                type="button"
                aria-label={clearLabel}
                disabled={disabled}
                onClick={handleClear}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            {suggestionsEnabled && suggestionsOpen && suggestions.length > 0 ? (
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Async suggestions use the WAI-ARIA combobox/listbox pattern, not a native select.
              <div role="listbox"
                className={styles.suggestionList}
                id={listboxId}
                aria-label={suggestionsLabel ?? label}
              >
                {suggestions.map((suggestion, index) => (
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Focus remains on the combobox while aria-activedescendant identifies this option.
                  <button role="option"
                    className={styles.suggestionItem}
                    data-active={activeSuggestionIndex === index}
                    id={`${listboxId}-${index}`}
                    key={suggestion.id}
                    type="button"
                    tabIndex={-1}
                    aria-selected={activeSuggestionIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    <strong>{suggestion.primary}</strong>
                    {suggestion.secondary ? <span>{suggestion.secondary}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className={styles.searchButton}
            type="submit"
            disabled={disabled || !query}
          >
            {submitLabel}
          </button>
        </div>
        {helperText ? (
          <p className={styles.helperText} id={helperId}>
            {helperText}
          </p>
        ) : null}
      </form>
    </div>
  );
}
