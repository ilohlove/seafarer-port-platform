import { useEffect, useState } from "react";

import { useServices } from "../../app/providers";
import type { SearchSuggestion } from "../../components";

export interface PortSearchSuggestion extends SearchSuggestion {
  readonly slug: string;
}

interface PortSuggestionState {
  readonly suggestions: readonly PortSearchSuggestion[];
  readonly loading: boolean;
}

interface PortSuggestionOptions {
  readonly enabled?: boolean;
  readonly minimumLength?: number;
  readonly debounceMs?: number;
}

function secondaryText(
  city: string | undefined,
  country: string,
  unLocode: string | undefined,
): string {
  return [city, country, unLocode]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" · ");
}

export function usePortSuggestions(
  query: string,
  {
    enabled = true,
    minimumLength = 2,
    debounceMs = 180,
  }: PortSuggestionOptions = {},
): PortSuggestionState {
  const services = useServices();
  const [state, setState] = useState<PortSuggestionState>({
    suggestions: [],
    loading: false,
  });

  useEffect(() => {
    const normalized = query.trim();
    if (!enabled || normalized.length < minimumLength) {
      setState({ suggestions: [], loading: false });
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true }));
    const timer = globalThis.setTimeout(() => {
      void services.ports
        .search({ query: normalized, limit: 6 }, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) {
            return;
          }
          setState({
            loading: false,
            suggestions: result.items.map(({ port }) => ({
              id: port.id,
              slug: port.slug,
              value: port.name,
              primary: port.name,
              secondary: secondaryText(
                port.city,
                port.country.name,
                port.unLocode,
              ),
            })),
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setState({ suggestions: [], loading: false });
          }
        });
    }, debounceMs);

    return () => {
      globalThis.clearTimeout(timer);
      controller.abort();
    };
  }, [debounceMs, enabled, minimumLength, query, services]);

  return state;
}
