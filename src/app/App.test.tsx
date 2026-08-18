import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "./App";

describe("Application shell and demo routing", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    delete document.documentElement.dataset.bandwidthMode;
  });

  test("redirects root to the Busan Port Notes demo", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Busan New Port", level: 1 }),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/ports/busan");
    expect(screen.getByTestId("app-version")).toHaveTextContent("v0.1.0");
    expect(
      screen.getByRole("heading", { name: "Best Internet / eSIM Deal" }),
    ).toBeVisible();
  });

  test("switches locale and persists bandwidth mode", async () => {
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

    await user.click(screen.getByRole("button", { name: "Data Saver" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("dataSaver");
    });

    expect(window.localStorage.getItem("seafarer.preferences.v1")).toContain(
      '"bandwidthMode":"dataSaver"',
    );
  });

  test("reports preference storage failures and restores the prior mode", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    render(<App />);

    const standardButton = await screen.findByRole("button", {
      name: "Tiêu chuẩn",
    });
    await user.click(
      screen.getByRole("button", { name: "Tiết kiệm dữ liệu" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể áp dụng tùy chọn. Vui lòng thử lại.",
    );
    expect(standardButton).toHaveAttribute("aria-pressed", "true");
  });
});
