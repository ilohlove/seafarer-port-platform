import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("F3 Port Hub visual prototype", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/ports/busan");
    delete document.documentElement.dataset.bandwidthMode;
  });

  test("renders the selected port and a text-first Quick Brief", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Port of Busan", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Busan New Port").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Quick Brief" }),
    ).toBeVisible();
    expect(screen.getByTestId("port-media")).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  test("shows every critical decision with explicit trust text", async () => {
    render(<App />);
    const heading = await screen.findByRole("heading", {
      name: "Dải quyết định quan trọng",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();

    for (const label of [
      "Shore Leave",
      "Giấy tờ",
      "Di chuyển",
      "Tiền tệ",
      "Ngôn ngữ",
      "Khẩn cấp",
    ]) {
      expect(within(section!).getByRole("heading", { name: label })).toBeVisible();
    }
    expect(within(section!).getAllByText("Cần xác nhận").length).toBeGreaterThan(0);
    expect(within(section!).getByText("119")).toBeVisible();
    expect(within(section!).getByText("Nguồn chính thức")).toBeVisible();
  });

  test("renders the required overview cards without star-rating language", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Thông tin theo quyết định" });

    for (const title of [
      "Shore Access",
      "Kết nối",
      "ATM & Đổi tiền",
      "Y tế & Khẩn cấp",
      "Seafarers’ Center",
      "Phương án di chuyển",
      "Tri thức cộng đồng",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }

    const communityCard = screen
      .getByRole("heading", { name: "Tri thức cộng đồng" })
      .closest("article");
    expect(communityCard).not.toBeNull();
    expect(communityCard).toHaveTextContent("Báo cáo có cấu trúc: 1");
    expect(communityCard).not.toHaveTextContent(/★|[1-5]\s*star/i);
  });

  test("keeps Return to Ship focused on logistics, not a countdown", async () => {
    const user = userEvent.setup();
    render(<App />);

    const panel = await screen.findByRole("complementary", {
      name: "Quay lại tàu",
    });
    expect(within(panel).getByText("All aboard")).toBeVisible();
    expect(within(panel).getByText("Nên quay lại")).toBeVisible();
    expect(within(panel).getByText("Gợi ý mẫu 75 phút")).toBeVisible();
    expect(within(panel).getByText("Crew Gate")).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Mở Shore Leave Planner" }),
    );
    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Shore Leave Planner thuộc F4",
    );

    await user.click(within(panel).getByText("Emergency Mode"));
    expect(within(panel).getByText("119")).toBeVisible();
    expect(panel).toHaveTextContent("không chẩn đoán hoặc tư vấn thuốc");
    expect(panel).not.toHaveTextContent(/liều dùng|hãy uống|khuyên dùng thuốc/i);
  });

  test("removes decorative media in Data Saver and Ultra Lite", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: "Port of Busan" });
    expect(screen.getByTestId("port-media")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Tiết kiệm dữ liệu" }),
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("dataSaver");
    });
    expect(screen.queryByTestId("port-media")).toBeNull();
    expect(document.querySelector("img")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Siêu nhẹ" }));
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("ultraLite");
    });
    expect(screen.queryByTestId("port-media")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });

  test("keeps future tabs as keyboard-ready placeholders", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Port of Busan" });

    const accessTab = screen.getByRole("tab", { name: "Lên bờ" });
    expect(accessTab).toHaveAttribute("aria-selected", "false");
    await user.click(accessTab);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Lên bờ là placeholder trực quan",
    );
    expect(window.location.pathname).toBe("/ports/busan");
  });

  test("surfaces conflicting reports without hiding them", async () => {
    window.history.replaceState({}, "", "/ports/port-klang");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Port Klang", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Báo cáo mâu thuẫn").length).toBeGreaterThan(0);
  });

  test("shows a helpful state for an unknown port slug", async () => {
    window.history.replaceState({}, "", "/ports/unknown-port");
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Không tìm thấy dữ liệu cảng",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Foundation" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
