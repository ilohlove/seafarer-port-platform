import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "./App";

describe("F1 application foundation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    delete document.documentElement.dataset.bandwidthMode;
  });

  test("loads typed mock data through the repository boundary", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Nền tảng giao diện đã sẵn sàng để review",
      }),
    ).toBeInTheDocument();

    const portDisclosure = await screen.findByRole("button", {
      name: /Port of Singapore/,
    });
    expect(portDisclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { name: "Quick brief mẫu" })).toBeNull();

    await user.click(portDisclosure);
    expect(
      await screen.findByRole("heading", { name: "Quick brief mẫu" }),
    ).toBeInTheDocument();
    expect(portDisclosure).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Preview component chi tiết" }),
      ).toHaveFocus();
    });
    expect(document.querySelector("img")).toBeNull();
  });

  test("switches locale and persists bandwidth mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      await screen.findByRole("combobox", { name: /Ngôn ngữ/ }),
      "en",
    );

    expect(
      await screen.findByRole("heading", {
        name: "The interface foundation is ready for review",
      }),
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
