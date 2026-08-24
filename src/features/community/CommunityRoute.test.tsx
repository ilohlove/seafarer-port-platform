import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("CrewPort Community note library", () => {
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

  test("renders a trust-aware note library with Community navigation active", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Cộng đồng CrewPort",
        level: 1,
      }),
    ).toBeVisible();
    expect(
      await screen.findByText("Korea Local 10 GB dùng ổn cho WhatsApp"),
    ).toBeVisible();
    expect(screen.getByText("6 xác nhận · 9 hữu ích")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Ghi chú hữu ích" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Cần anh em xác nhận" }),
    ).toBeVisible();
    expect(screen.getByText("Hỏi giá trước khi rời Crew Gate")).toBeVisible();
    expect(screen.getAllByText("Chờ xác nhận").length).toBeGreaterThan(0);

    for (const navigation of screen.getAllByRole("navigation", {
      name: "Điều hướng ghi chú cảng",
    })) {
      expect(navigation.querySelectorAll("a, button")).toHaveLength(5);
      expect(
        within(navigation).getByRole("link", { name: "Cộng đồng" }),
      ).toHaveAttribute("href", "/community");
      expect(
        within(navigation).getByRole("link", { name: "Cộng đồng" }),
      ).toHaveAttribute("aria-current", "page");
    }

    expect(document.body).not.toHaveTextContent(/Premium|Gói trả phí|★/i);
    expect(screen.queryByRole("textbox", { name: /bình luận/i })).toBeNull();
  });

  test("filters existing notes by port, topic, and keyword", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Korea Local 10 GB dùng ổn cho WhatsApp");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Lọc theo cảng" }),
      "port-singapore",
    );
    expect(
      screen.getByText("Singapore Local 10 GB là lựa chọn nhanh"),
    ).toBeVisible();
    expect(
      screen.queryByText("Korea Local 10 GB dùng ổn cho WhatsApp"),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Đồ ăn" }));
    expect(screen.getByText("Food Court gần gate cho chuyến đi ngắn")).toBeVisible();
    expect(
      screen.queryByText("Singapore Local 10 GB là lựa chọn nhanh"),
    ).toBeNull();

    await user.type(
      screen.getByRole("searchbox", { name: "Tìm trong ghi chú cộng đồng" }),
      "không-có-kết-quả",
    );
    expect(
      await screen.findByRole("heading", { name: "Chưa có ghi chú phù hợp" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(
      await screen.findByText("Korea Local 10 GB dùng ổn cho WhatsApp"),
    ).toBeVisible();
  });

  test("expands note details inline and keeps the port guide reachable", async () => {
    const user = userEvent.setup();
    render(<App />);
    const title = await screen.findByText(
      "Korea Local 10 GB dùng ổn cho WhatsApp",
    );
    expect(title).toBeVisible();

    const toggle = screen.getByRole("button", {
      name: "Mở chi tiết Korea Local 10 GB dùng ổn cho WhatsApp",
    });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Thông tin trong ghi chú")).toBeVisible();
    expect(screen.getByRole("link", { name: /Xem cẩm nang cảng/ })).toHaveAttribute(
      "href",
      "/ports/busan",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Đóng chi tiết Korea Local 10 GB dùng ổn cho WhatsApp",
      }),
    );
    expect(screen.queryByText("Thông tin trong ghi chú")).toBeNull();
  });

  test("chooses a port before reopening the 30-second note flow", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Korea Local 10 GB dùng ổn cho WhatsApp");

    await user.click(screen.getByRole("button", { name: "Viết ghi chú" }));
    expect(screen.getByText("Chọn cảng để viết ghi chú")).toBeVisible();
    const busanLink = screen.getByRole("link", { name: /Port of Busan/ });
    expect(busanLink).toHaveAttribute("href", "/ports/busan?writeNote=1");

    await user.click(busanLink);
    expect(window.location.pathname).toBe("/ports/busan");
    expect(window.location.search).toBe("?writeNote=1");
    expect(
      await screen.findByRole(
        "dialog",
        { name: "Ghi nhanh trong 30 giây" },
        { timeout: 2_500 },
      ),
    ).toBeVisible();
  });

  test("localizes the Community route fully when English is selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Cộng đồng CrewPort" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Ngôn ngữ" }),
      "en",
    );

    expect(
      await screen.findByRole("heading", { name: "CrewPort Community" }),
    ).toBeVisible();
    expect(
      screen.getByText("Korea Local 10 GB works well for WhatsApp"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Write a Note" })).toBeVisible();
    expect(document.body).not.toHaveTextContent("Ghi chú hữu ích");
    expect(document.body).not.toHaveTextContent("Cần anh em xác nhận");
    expect(document.body).not.toHaveTextContent("dùng ổn");
  });

  test("remains usable in Ultra Lite without loading decorative images", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Cộng đồng CrewPort" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Chế độ dữ liệu" }),
      "ultraLite",
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("ultraLite");
    });

    expect(screen.getByRole("button", { name: "Viết ghi chú" })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Tìm trong ghi chú cộng đồng" }),
    ).toBeVisible();
    expect(
      document.querySelector('img:not([src="/brand/crewport-anchor.png"])'),
    ).toBeNull();
  });
});
