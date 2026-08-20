import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "../types";
import { viDictionary, type Dictionary, type TranslationKey } from "./vi";

export type I18nStatus = "ready" | "loading" | "error";
export type TranslationVariables = Readonly<Record<string, string | number>>;

export interface I18nContextValue {
  readonly locale: Locale;
  readonly status: I18nStatus;
  readonly setLocale: (locale: Locale) => Promise<void>;
  readonly t: (
    key: TranslationKey,
    variables?: TranslationVariables,
  ) => string;
  readonly formatMoney: (amount: number, currency: string) => string;
  readonly formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export interface I18nProviderProps {
  readonly children: ReactNode;
  readonly initialLocale?: Locale;
}

function interpolate(
  message: string,
  variables: TranslationVariables | undefined,
): string {
  if (!variables) {
    return message;
  }

  return Object.entries(variables).reduce(
    (result, [name, value]) =>
      result.split(`{{${name}}}`).join(String(value)),
    message,
  );
}

function intlLocale(locale: Locale): string {
  return locale === "vi" ? "vi-VN" : "en-US";
}

export function I18nProvider({
  children,
  initialLocale = "vi",
}: I18nProviderProps) {
  const [locale, setActiveLocale] = useState<Locale>("vi");
  const [dictionary, setDictionary] = useState<Dictionary>(viDictionary);
  const [status, setStatus] = useState<I18nStatus>("ready");
  const requestSequence = useRef(0);

  const setLocale = useCallback(async (nextLocale: Locale) => {
    const requestId = ++requestSequence.current;
    if (nextLocale === "vi") {
      setDictionary(viDictionary);
      setActiveLocale("vi");
      setStatus("ready");
      return;
    }

    setStatus("loading");
    try {
      const { enDictionary } = await import("./en");
      if (requestId !== requestSequence.current) {
        return;
      }
      setDictionary(enDictionary);
      setActiveLocale("en");
      setStatus("ready");
    } catch (error: unknown) {
      if (requestId === requestSequence.current) {
        setStatus("error");
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    void setLocale(initialLocale).catch(() => {
      // Status is set to error; consumers decide how to present recovery.
    });
  }, [initialLocale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, variables?: TranslationVariables) =>
      interpolate(dictionary[key], variables),
    [dictionary],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      status,
      setLocale,
      t,
      formatMoney: (amount, currency) =>
        `${new Intl.NumberFormat(intlLocale(locale), {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount)} ${currency}`,
      formatDate: (dateValue, options) =>
        new Intl.DateTimeFormat(intlLocale(locale), options).format(
          new Date(dateValue),
        ),
    }),
    [locale, setLocale, status, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
