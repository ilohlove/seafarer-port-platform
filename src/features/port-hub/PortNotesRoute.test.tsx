import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("Seafarer Port Notes route", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/ports/busan");
    delete document.documentElement.dataset.bandwidthMode;
  });

  test("renders Port Snapshot, selected terminal, and the best Internet deal near the top", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Busan New Port", level: 1 }),
    ).toBeVisible();
    expect(document.getElementById("main-content")).toHaveClass("wide-container");
    expect(
      screen.getByRole("heading", { name: "Busan New Port" }).closest("section"),
    ).toHaveAttribute("data-media", "visible");
    expect(screen.getAllByText("Busan New Port").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Best Internet / eSIM Deal" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Korea Local 10 GB" })).toBeVisible();
    expect(screen.getAllByText(/9,00/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Ghi chú nhanh" })).toBeVisible();
    const quickNotesHeading = screen.getByRole("heading", {
      name: "Cần biết ngay",
    });
    expect(quickNotesHeading).toBeVisible();
    expect(
      within(quickNotesHeading.closest("aside")!).getAllByRole("listitem"),
    ).toHaveLength(3);

    const topNotes = screen.getByRole("heading", { name: "Ghi chú nổi bật" });
    const mobileSearch = document.querySelector('[data-search-placement="mobile"]');
    expect(mobileSearch).not.toBeNull();
    expect(
      topNotes.compareDocumentPosition(mobileSearch!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("shows all need-based action tiles and an obvious Write a Note action", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });
    const actionsHeading = screen.getByRole("heading", {
      name: "Chọn nhanh",
    });
    const actionsSection = actionsHeading.closest("section");
    expect(actionsSection).not.toBeNull();

    for (const label of [
      "eSIM",
      "SIM vật lý",
      "Taxi / Grab",
      "Đồ ăn",
      "Chỗ đi",
      "Seaman Club",
      "Viết ghi chú",
      "Xem tất cả",
    ]) {
      expect(
        within(actionsSection!).getByRole("button", { name: new RegExp(label) }),
      ).toBeVisible();
    }

    expect(within(actionsSection!).getAllByRole("button")).toHaveLength(8);
    const writeNoteAction = within(actionsSection!).getByRole("button", {
      name: /Viết ghi chú/,
    });
    expect(writeNoteAction).toHaveAttribute("data-primary", "true");
    expect(writeNoteAction).toHaveAttribute("data-action-id", "write-note");

    await userEvent.setup().click(writeNoteAction);
    expect(screen.getByText(/placeholder trực quan/)).toBeVisible();
  });

  test("renders structured top notes without star ratings or premium upsell", async () => {
    render(<App />);
    const heading = await screen.findByRole("heading", {
      name: "Ghi chú nổi bật",
    });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(within(section!).getAllByRole("article").length).toBeGreaterThanOrEqual(3);
    expect(
      screen.getByRole("heading", { name: "Ghi chú cộng đồng gần đây" }),
    ).toBeVisible();
    expect(section).toHaveTextContent("Xác nhận bởi");
    expect(section).toHaveTextContent("Hữu ích cho");
    expect(section).not.toHaveTextContent(/★|star rating|premium/i);
    expect(screen.queryByText(/Premium|Gói trả phí/i)).toBeNull();
  });

  test("keeps notes and Write a Note usable in Data Saver and Ultra Lite", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: "Busan New Port" });
    expect(screen.getByTestId("port-notes-media")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Tiết kiệm dữ liệu" }));
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("dataSaver");
    });
    expect(
      screen.getByRole("heading", { name: "Busan New Port" }).closest("section"),
    ).toHaveAttribute("data-media", "omitted");
    expect(screen.queryByTestId("port-notes-media")).toBeNull();
    expect(screen.getByRole("button", { name: /Viết ghi chú/ })).toBeVisible();
    expect(document.querySelector("img")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Siêu nhẹ" }));
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("ultraLite");
    });
    expect(
      screen.getByRole("heading", { name: "Busan New Port" }).closest("section"),
    ).toHaveAttribute("data-media", "omitted");
    expect(screen.queryByTestId("port-notes-media")).toBeNull();
    expect(screen.getByRole("heading", { name: "Ghi chú nổi bật" })).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  test("keeps emergency content logistical and surfaces conflicting reports", async () => {
    window.history.replaceState({}, "", "/ports/port-klang");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Westports", level: 1 }),
    ).toBeVisible();
    expect(screen.getAllByText("Báo cáo mâu thuẫn").length).toBeGreaterThan(0);
    expect(screen.getByText(/không chẩn đoán hoặc tư vấn thuốc/)).toBeVisible();
    expect(screen.queryByText(/liều dùng|hãy uống|khuyên dùng thuốc/i)).toBeNull();
  });

  test("shows a helpful state for an unknown port slug", async () => {
    window.history.replaceState({}, "", "/ports/unknown-port");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy dữ liệu cảng" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Về Foundation" })).toHaveAttribute(
      "href",
      "/foundation",
    );
  });
});
