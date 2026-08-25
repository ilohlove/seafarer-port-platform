import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("CrewPort Community development state", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/community");
    delete document.documentElement.dataset.bandwidthMode;
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.theme;
  });

  test("locks the aggregate community area while keeping port notes available", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Cộng đồng CrewPort đang phát triển",
        level: 1,
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Ghi chú theo từng cảng vẫn hoạt động. Khu vực cộng đồng tổng hợp sẽ mở sau."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Tìm một cảng" })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(screen.queryByText("Korea Local 10 GB dùng ổn cho WhatsApp")).toBeNull();
    expect(document.body).not.toHaveTextContent(/Premium|Gói trả phí|★/i);
  });

  test("keeps the locked copy fully localized in English", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Cộng đồng CrewPort đang phát triển" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Ngôn ngữ" }),
      "en",
    );

    expect(
      await screen.findByRole("heading", {
        name: "CrewPort Community is under development",
      }),
    ).toBeVisible();
    expect(screen.getByText(/Port-by-port notes are still available/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Find a port" })).toHaveAttribute(
      "href",
      "/search",
    );
    expect(document.body.textContent ?? "").not.toMatch(/[À-ỹĐđ]/);
  });
});
