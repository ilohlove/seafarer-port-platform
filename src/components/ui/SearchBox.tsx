import {
  useCallback,
  useId,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type Ref,
} from 'react';

import styles from './ui.module.css';

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
  id?: string;
  name?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
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
  id,
  name = 'port-search',
  disabled = false,
  inputRef,
}: SearchBoxProps) {
  const generatedId = useId();
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-help`;
  const query = value.trim();
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
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && query) {
      onSubmit(query);
    }
  }

  function handleClear() {
    onChange('');
    onClear?.();
    internalInputRef.current?.focus();
  }

  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- React 19 warns for the newer <search> element.
    <div role="search">
      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <label className={styles.searchLabel} htmlFor={inputId}>
          {label}
        </label>
        <div className={styles.searchControls}>
          <div className={styles.searchInputWrap}>
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
              onChange={handleChange}
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
