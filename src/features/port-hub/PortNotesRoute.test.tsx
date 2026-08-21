import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("CrewPort Port Notes route", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/ports/busan");
    delete document.documentElement.dataset.bandwidthMode;
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.theme;
  });

  test("renders the CrewPort snapshot before mobile search", async () => {
    render(<App />);

    const snapshotHeading = await screen.findByRole("heading", {
      name: "Busan New Port",
      level: 1,
    });
    expect(screen.getAllByText("CrewPort").length).toBeGreaterThan(0);
    expect(document.getElementById("main-content")).toHaveClass("wide-container");
    expect(snapshotHeading.closest("section")).toHaveAttribute(
      "data-media",
      "visible",
    );
    expect(screen.getByTestId("port-notes-media")).toBeVisible();
    const snapshot = snapshotHeading.closest("section")!;
    expect(within(snapshot).getByText("Khu bến đang chọn")).toBeVisible();
    expect(snapshot).toHaveTextContent("Crew Gate");
    expect(document.querySelector("img")).toBeNull();

    const utilityStrip = screen.getByRole("region", {
      name: "Thông tin thiết yếu",
    });
    expect(within(utilityStrip).getAllByRole("button")).toHaveLength(4);
    for (const label of ["Internet / eSIM", "Shuttle / Đi lại", "Taxi", "Đồ ăn"]) {
      expect(
        within(utilityStrip).getByRole("button", { name: new RegExp(label) }),
      ).toBeVisible();
    }
    expect(
      screen.getByRole("heading", { name: "Thông tin Internet / eSIM" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Korea Local 10 GB" })).toBeVisible();
    expect(screen.getAllByText(/9,00 USD/).length).toBeGreaterThan(0);

    const quickNotesHeading = screen.getByRole("heading", {
      name: "Cần biết ngay",
    });
    expect(
      within(quickNotesHeading.closest("section")!).getAllByRole("listitem"),
    ).toHaveLength(4);

    const desktopNavigation = document.querySelector('[data-navigation="desktop"]');
    expect(desktopNavigation).toHaveAttribute(
      "aria-label",
      "Điều hướng ghi chú cảng",
    );
    expect(desktopNavigation?.querySelectorAll("nav a, nav button")).toHaveLength(7);

    const mobileSearch = document.querySelector('[data-search-placement="mobile"]');
    expect(mobileSearch).not.toBeNull();
    expect(
      snapshotHeading.compareDocumentPosition(mobileSearch!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const warning = screen.getByRole("note", {
      name: "Xác nhận gate và shuttle trước khi lên bờ",
    });
    expect(within(warning).getByText("Chờ xác nhận")).toBeVisible();

    const actionsHeading = screen.getByRole("heading", { name: "Chọn nhanh" });
    const notesHeading = screen.getByRole("heading", { name: "Ghi chú nổi bật" });
    expect(snapshot.parentElement?.contains(warning)).toBe(true);
    expect(warning.compareDocumentPosition(quickNotesHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(quickNotesHeading.compareDocumentPosition(actionsHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(actionsHeading.compareDocumentPosition(notesHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  test("shows seven need-based actions and keeps Write a Note primary", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });
    const actionsSection = screen
      .getByRole("heading", { name: "Chọn nhanh" })
      .closest("section");
    expect(actionsSection).not.toBeNull();

    for (const label of [
      "eSIM",
      "SIM vật lý",
      "Taxi / Grab",
      "Đồ ăn",
      "Hỗ trợ thuyền viên",
      "Chỗ đi",
      "Viết ghi chú",
    ]) {
      expect(
        within(actionsSection!).getByRole("button", {
          name: new RegExp(label.replace("/", "\\/")),
        }),
      ).toBeVisible();
    }

    expect(within(actionsSection!).getAllByRole("button")).toHaveLength(7);
    const writeNoteAction = within(actionsSection!).getByRole("button", {
      name: /Viết ghi chú/,
    });
    expect(writeNoteAction).toHaveAttribute("data-primary", "true");
    expect(writeNoteAction).toHaveAttribute("data-action-id", "write-note");

    await user.click(writeNoteAction);
    expect(screen.getByText(/mô phỏng giao diện/)).toBeVisible();
  });

  test("switches among four Busan demo contexts without mixing facts", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    const northPortTab = screen.getByRole("tab", { name: "North Port" });
    await user.click(northPortTab);
    expect(northPortTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Busan North Port", level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Không dùng hướng dẫn New Port cho North Port",
      }),
    ).toBeVisible();
    expect(screen.queryByText("New Port berth cluster (demo)")).toBeNull();
    expect(screen.queryByText("Quick Meal Stop (sample)")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Yeongdo" }));
    expect(
      screen.getByRole("heading", { name: "Busan Yeongdo", level: 1 }),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Gamcheon" }));
    expect(
      screen.getByRole("heading", { name: "Busan Gamcheon", level: 1 }),
    ).toBeVisible();
  });

  test("opens and closes the Taxi Hangul dialog", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });
    const utilityStrip = screen.getByRole("region", {
      name: "Thông tin thiết yếu",
    });
    const taxiAction = within(utilityStrip).getByRole("button", {
      name: /^Taxi/,
    });

    await user.click(taxiAction);
    const dialog = screen.getByRole("dialog", {
      name: "Câu tiếng Hàn cho taxi",
    });
    expect(within(dialog).getByText("부산신항 선원 출입구로 가 주세요.")).toBeVisible();
    expect(within(dialog).getByText("Chờ xác nhận")).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Đóng hướng dẫn taxi" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(taxiAction).toHaveFocus());

    await user.click(taxiAction);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("renders demo welfare services without a fake phone link", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });
    const welfareSection = screen
      .getByRole("heading", { name: "Hỗ trợ / Trung tâm thuyền viên" })
      .closest("section")!;
    expect(
      within(welfareSection).getByRole("heading", {
        name: "Busan New Port Seafarers Center (demo)",
      }),
    ).toBeVisible();
    const serviceBadges = within(welfareSection).getByLabelText(
      "Dịch vụ được ghi nhận",
    );
    for (const badge of ["Wi-Fi", "Xe đưa đón", "SIM", "KRW", "Hỗ trợ"]) {
      expect(within(serviceBadges).getByText(new RegExp(`${badge}$`))).toBeVisible();
    }
    expect(within(welfareSection).getByText("Chưa có số liên hệ đã xác nhận")).toBeVisible();
    expect(welfareSection.querySelector('a[href^="tel:"]')).toBeNull();
  });

  test("renders structured notes without star ratings or premium upsell", async () => {
    render(<App />);
    const heading = await screen.findByRole("heading", {
      name: "Ghi chú nổi bật",
    });
    const section = heading.closest("section")!;
    expect(within(section).getAllByRole("article").length).toBeGreaterThanOrEqual(3);
    expect(within(section).getAllByRole("article")[0]).toHaveAttribute(
      "data-featured",
      "true",
    );
    expect(section).toHaveTextContent(/\d+ xác nhận/);
    expect(section).toHaveTextContent(/\d+ hữu ích/);
    expect(
      screen.getByRole("heading", { name: "Cộng đồng CrewPort" }),
    ).toBeVisible();
    expect(
      screen.getByText("Thông tin được chia sẻ bởi cộng đồng thuyền viên."),
    ).toBeVisible();
    expect(screen.getByText(/Dữ liệu mẫu · hoạt động thật/)).toBeVisible();
    expect(
      screen.queryByText(
        /243 visitors|4\.8 score|86% verified|15,000\+ seafarers|1,284 seafarers|72 ports/i,
      ),
    ).toBeNull();
    expect(section).not.toHaveTextContent(/★|star rating|premium/i);
    expect(screen.queryByText(/Premium|Gói trả phí/i)).toBeNull();
  });

  test("uses Vietnamese Port Notes labels and keeps five mobile navigation items", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    expect(screen.getByRole("heading", { name: "Chủ đề cần xem" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tất cả chủ đề cảng" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cần thêm thông tin?" })).toBeVisible();
    const topicShortcuts = screen.getByRole("navigation", {
      name: "Lối tắt chủ đề cảng",
    });
    expect(within(topicShortcuts).getAllByRole("link")).toHaveLength(4);
    expect(
      screen.getAllByRole("complementary", { name: "Cộng đồng CrewPort" }),
    ).toHaveLength(1);

    for (const leftover of [
      /Topic previews/i,
      /Need More Help\?/i,
      /Data trust/i,
      /Emergency shortcut/i,
      /Return to Ship/i,
      /Return Card/i,
      /Choose what you need/i,
      /Compare eSIM/i,
    ]) {
      expect(screen.queryByText(leftover)).toBeNull();
    }

    const mobileNavigation = screen
      .getAllByRole("navigation", { name: "Điều hướng ghi chú cảng" })
      .find((navigation) => navigation.getAttribute("data-navigation") === "mobile");
    expect(mobileNavigation).toBeDefined();
    expect(mobileNavigation?.getAttribute("data-navigation")).toBe("mobile");
    expect(mobileNavigation?.querySelectorAll("a, button")).toHaveLength(5);
  });

  test("keeps notes and Write a Note usable in Data Saver and Ultra Lite", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: "Busan New Port" });
    expect(screen.getByTestId("port-notes-media")).toBeVisible();
    const bandwidthSelect = screen.getByRole("combobox", {
      name: "Chế độ dữ liệu",
    });

    await user.selectOptions(bandwidthSelect, "dataSaver");
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("dataSaver");
    });
    expect(
      screen.getByRole("heading", { name: "Busan New Port" }).closest("section"),
    ).toHaveAttribute("data-media", "omitted");
    expect(screen.queryByTestId("port-notes-media")).toBeNull();
    expect(screen.getByRole("button", { name: /Viết ghi chú/ })).toBeVisible();
    expect(document.querySelector("img")).toBeNull();

    await user.selectOptions(bandwidthSelect, "ultraLite");
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("ultraLite");
    });
    expect(screen.getByRole("heading", { name: "Ghi chú nổi bật" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cộng đồng CrewPort" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Thông tin thiết yếu" })).toBeVisible();
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
    expect(screen.getByRole("link", { name: "Về trang nền tảng" })).toHaveAttribute(
      "href",
      "/foundation",
    );
  });
});
