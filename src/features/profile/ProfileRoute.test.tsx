import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("CrewPort profile route", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/profile");
    delete document.documentElement.dataset.bandwidthMode;
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.theme;
  });

  test("requires a real configured Google session and never renders an upload field", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Đăng nhập để mở hồ sơ." })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Đăng nhập bằng Google" })).toHaveLength(2);
    expect(screen.queryByRole("textbox", { name: "Họ tên" })).toBeNull();
    expect(screen.queryByLabelText(/ảnh đại diện/i)).toBeNull();

    await user.click(screen.getAllByRole("button", { name: "Đăng nhập bằng Google" })[1]);
    expect(screen.getByText("Đăng nhập Google chưa được cấu hình cho bản triển khai này.")).toBeVisible();
  });
});
