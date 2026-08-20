import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "./App";

describe("Application shell and demo routing", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    delete document.documentElement.dataset.bandwidthMode;
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.theme;
  });

  test("redirects root to the Busan Port Notes demo", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Busan New Port", level: 1 }),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/ports/busan");
    expect(screen.getByTestId("app-version")).toHaveTextContent("v0.1.0");
    expect(screen.getAllByText("CrewPort").length).toBeGreaterThan(0);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(
      screen.getByRole("heading", { name: "Internet / eSIM phù hợp nhất" }),
    ).toBeVisible();
  });

  test("switches locale, appearance, and bandwidth independently", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      await screen.findByRole("combobox", { name: /Ngôn ngữ/ }),
      "en",
    );

    expect(
      await screen.findByRole("heading", { name: "Best Internet / eSIM Deal" }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Appearance" }),
      "dark",
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    expect(document.documentElement.dataset.bandwidthMode).toBe("standard");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Data mode" }),
      "dataSaver",
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("dataSaver");
    });

    expect(window.localStorage.getItem("seafarer.preferences.v1")).toContain(
      '"bandwidthMode":"dataSaver"',
    );
    expect(window.localStorage.getItem("seafarer.preferences.v1")).toContain(
      '"appearanceMode":"dark"',
    );
  });

  test("resolves system appearance and follows media changes", async () => {
    let changeListener: ((event: { matches: boolean }) => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: (
          type: string,
          listener: (event: { matches: boolean }) => void,
        ) => {
          if (type === "change") {
            changeListener = listener;
          }
        },
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      })),
    );
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Giao diện" }),
      "system",
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.appearanceMode).toBe("system");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    changeListener?.({ matches: false });
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  test("reports preference storage failures and restores the prior mode", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    render(<App />);

    const bandwidthSelect = await screen.findByRole("combobox", {
      name: "Chế độ dữ liệu",
    });
    await user.selectOptions(
      bandwidthSelect,
      "dataSaver",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể áp dụng tùy chọn. Vui lòng thử lại.",
    );
    expect(bandwidthSelect).toHaveValue("standard");
  });
});
