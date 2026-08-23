import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../../app/App";

describe("CrewPort compact Port Notes route", () => {
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

  test("renders only the port snapshot and quick actions in the main port flow", async () => {
    render(<App />);

    const snapshotHeading = await screen.findByRole("heading", {
      name: "Busan New Port",
      level: 1,
    });
    const snapshot = snapshotHeading.closest("section")!;
    const actionsHeading = screen.getByRole("heading", { name: "Chọn nhanh" });
    const actions = actionsHeading.closest("section")!;

    const brand = screen.getByRole("link", {
      name: "CrewPort — Ghi chú cảng cho thuyền viên",
    });
    expect(brand).toHaveAttribute("href", "/");
    expect(brand.querySelector("img")).toHaveAttribute(
      "src",
      "/brand/crewport-anchor.png",
    );
    expect(brand.querySelector("img")).toHaveAttribute("alt", "");
    expect(brand).toHaveTextContent("CREWPORT");
    expect(screen.queryByText("CP")).toBeNull();
    expect(document.getElementById("main-content")).toHaveClass(
      "content-container",
    );
    expect(snapshot).toHaveAttribute("data-media", "visible");
    expect(screen.getByTestId("port-notes-media")).toBeVisible();
    expect(within(snapshot).queryByText(/Cẩm nang cảng/)).toBeNull();
    expect(within(snapshot).queryByText(/CrewPort · Ghi chú cảng/)).toBeNull();
    expect(within(snapshot).getByText("Khu bến đang chọn")).toBeVisible();
    expect(snapshot).toHaveTextContent("Crew Gate");
    expect(
      document.querySelector('img:not([src="/brand/crewport-anchor.png"])'),
    ).toBeNull();

    const snapshotFacts = screen.getByRole("region", {
      name: "Thông tin thiết yếu",
    });
    expect(within(snapshotFacts).getAllByRole("article")).toHaveLength(4);
    for (const label of [
      "Lên bờ",
      "Internet tốt nhất",
      "Taxi / Đi bờ",
      "Cộng đồng",
    ]) {
      expect(within(snapshotFacts).getByText(label)).toBeVisible();
    }

    expect(snapshotHeading.compareDocumentPosition(actionsHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(within(actions).getAllByRole("button")).toHaveLength(8);

    for (const removedHeading of [
      "Xác nhận gate và shuttle trước khi lên bờ",
      "Cần biết ngay",
      "Ghi chú nổi bật",
      "Cộng đồng CrewPort",
      "Thông tin Internet / eSIM",
      "Hỗ trợ / Trung tâm thuyền viên",
      "Chủ đề cần xem",
      "Tất cả chủ đề cảng",
      "Cần thêm thông tin?",
    ]) {
      expect(screen.queryByRole("heading", { name: removedHeading })).toBeNull();
    }

    const desktopNavigation = document.querySelector(
      '[data-navigation="desktop"]',
    );
    expect(desktopNavigation).toHaveAttribute(
      "aria-label",
      "Điều hướng ghi chú cảng",
    );
    expect(desktopNavigation?.querySelectorAll("a, button")).toHaveLength(5);
  });

  test("shows eight need-based actions and keeps Write a Note primary", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });
    const actionsSection = screen
      .getByRole("heading", { name: "Chọn nhanh" })
      .closest("section")!;

    const expectedActions = [
      ["eSIM", "quick-action-compare-esim"],
      ["SIM vật lý", "quick-action-physical-sim"],
      ["Đi bờ & Taxi", "quick-action-shore-leave"],
      ["Đồ ăn & Hoa quả", "quick-action-food-fruit"],
      ["Mua sắm & Quà", "quick-action-shopping-gifts"],
      ["Hỗ trợ thuyền viên", "quick-action-seaman-club"],
      ["Ghi chú khác", "quick-action-other-notes"],
      ["Viết ghi chú", "quick-action-write-note"],
    ] as const;

    for (const [label, id] of expectedActions) {
      expect(
        within(actionsSection).getByRole("button", {
          name: new RegExp(label.replace("/", "\\/")),
        }),
      ).toHaveAttribute("id", id);
    }

    const writeNoteAction = within(actionsSection).getByRole("button", {
      name: /Viết ghi chú/,
    });
    expect(writeNoteAction).toHaveAttribute("data-primary", "true");
    expect(writeNoteAction).toHaveAttribute("data-action-id", "write-note");

    await user.click(writeNoteAction);
    expect(
      screen.getByRole("dialog", { name: "Ghi nhanh trong 30 giây" }),
    ).toBeVisible();
  });

  test("shows only the selected Busan context without a context switcher", async () => {
    render(<App />);
    const heading = await screen.findByRole("heading", {
      name: "Busan New Port",
    });
    const snapshot = heading.closest("section")!;

    expect(screen.queryByRole("tab")).toBeNull();
    expect(within(snapshot).getByText("New Port berth cluster (demo)")).toBeVisible();
    expect(within(snapshot).getAllByText("Crew Gate").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Busan North Port" })).toBeNull();
  });

  test("keeps the selected port content in English after switching locale", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Ngôn ngữ" }),
      "en",
    );

    const snapshotFacts = await screen.findByRole("region", {
      name: "Essential port information",
    });
    expect(snapshotFacts).toHaveTextContent("Confirm with the ship or agent");
    expect(snapshotFacts).toHaveTextContent(
      "Go to the Crew Gate and agree the fare before leaving",
    );

    const writeNoteAction = await screen.findByRole("button", {
      name: /Write a Note/,
    });
    expect(writeNoteAction).toHaveTextContent(
      "Just visited Busan? Share what to confirm about the gate and shuttle.",
    );
    expect(document.body).not.toHaveTextContent("Bạn vừa ghé Busan");
    expect(document.body.textContent ?? "").not.toMatch(/[À-ỹĐđ]/);
  });

  test("searches from the desktop header and opens the Search route", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    const search = screen.getByRole("searchbox", { name: "Tìm cảng khác" });
    await user.type(search, "Singapore");
    await user.click(screen.getByRole("button", { name: "Tìm" }));

    expect(window.location.pathname).toBe("/search");
    expect(window.location.search).toBe("?q=Singapore");
    expect(
      await screen.findByRole("heading", { name: /cảng có thể tham khảo/ }),
    ).toBeVisible();
  });

  test("points secondary navigation to the quick-action cards", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    const menuButton = screen.getByRole("button", {
      name: "Mở liên kết phụ",
      hidden: true,
    });
    fireEvent.click(menuButton);
    const secondaryNavigation = screen.getByRole("navigation", {
      name: "Lối tắt eSIM và di chuyển",
      hidden: true,
    });
    expect(
      within(secondaryNavigation).getByRole("link", {
        name: "eSIM",
        hidden: true,
      }),
    ).toHaveAttribute("href", "/ports/busan#quick-action-compare-esim");
    expect(
      within(secondaryNavigation).getByRole("link", {
        name: "Di chuyển",
        hidden: true,
      }),
    ).toHaveAttribute("href", "/ports/busan#quick-action-shore-leave");

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("navigation", { name: "Lối tắt eSIM và di chuyển" }),
    ).toBeNull();
    expect(menuButton).toHaveFocus();
  });

  test("opens and closes the Taxi Hangul dialog from the snapshot", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });
    const taxiAction = within(
      screen.getByRole("region", { name: "Thông tin thiết yếu" }),
    ).getByRole("button", { name: /Taxi \/ Đi bờ/ });

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

  test("previews a structured public note and restores focus on close", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    const writeNoteAction = within(
      screen.getByRole("heading", { name: "Chọn nhanh" }).closest("section")!,
    ).getByRole("button", { name: /^Viết ghi chú/ });
    await user.click(writeNoteAction);
    const dialog = screen.getByRole("dialog", {
      name: "Ghi nhanh trong 30 giây",
    });
    expect(
      within(dialog).getByRole("button", { name: "Đóng form ghi chú" }),
    ).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "eSIM" }));
    await user.type(
      within(dialog).getByRole("textbox", { name: /Điều anh em cần nhớ/ }),
      "Mua gần gate, giá hợp lý.",
    );
    await user.click(
      within(dialog).getByRole("radio", { name: "Chia sẻ cộng đồng" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Xem trước ghi chú" }),
    );

    expect(screen.getByRole("dialog", { name: "Ghi nhanh trong 30 giây" })).toBeVisible();
    expect(screen.getByText("Bản mẫu chưa được lưu hoặc gửi.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Bản xem trước ghi chú" })).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Đóng xem trước" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(writeNoteAction).toHaveFocus());

    await user.click(writeNoteAction);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(writeNoteAction).toHaveFocus());
  });

  test("keeps the guided note flow compact and validates topic, content, and visibility", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    const writeNoteAction = within(
      screen.getByRole("heading", { name: "Chọn nhanh" }).closest("section")!,
    ).getByRole("button", { name: /^Viết ghi chú/ });
    await user.click(writeNoteAction);
    const dialog = screen.getByRole("dialog", { name: "Ghi nhanh trong 30 giây" });

    expect(within(dialog).getByRole("radio", { name: "Chia sẻ cộng đồng" })).not.toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Chỉ mình tôi" })).not.toBeChecked();
    expect(
      within(dialog).getByRole("button", { name: "+ Thêm chi tiết nếu nhớ" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByRole("textbox", { name: "Giá hoặc khoảng giá" })).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "eSIM" }));
    for (const suggestion of [
      "Giá",
      "Dung lượng",
      "Số ngày",
      "Hotspot",
      "Sóng ở cảng",
      "Website mua",
    ]) {
      expect(within(dialog).getByRole("button", { name: suggestion })).toBeVisible();
    }

    await user.click(within(dialog).getByRole("button", { name: "Giá" }));
    expect(within(dialog).getByRole("textbox", { name: "Giá" })).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Xem trước ghi chú" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Hãy chọn ai được xem ghi chú này.",
    );

    await user.click(within(dialog).getByRole("radio", { name: "Chia sẻ cộng đồng" }));
    await user.click(within(dialog).getByRole("button", { name: "Xem trước ghi chú" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Thêm nội dung vào ô ghi nhớ hoặc chọn một chi tiết tùy chọn.",
    );

    await user.type(within(dialog).getByRole("textbox", { name: "Giá" }), "9 USD");
    await user.click(within(dialog).getByRole("button", { name: "Xem trước ghi chú" }));
    expect(within(dialog).getByText("Bản mẫu chưa được lưu hoặc gửi.")).toBeVisible();
  });

  test("requires permission before a contact can enter a public preview", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    const writeNoteAction = within(
      screen.getByRole("heading", { name: "Chọn nhanh" }).closest("section")!,
    ).getByRole("button", { name: /^Viết ghi chú/ });
    await user.click(writeNoteAction);
    const dialog = screen.getByRole("dialog", { name: "Ghi nhanh trong 30 giây" });
    await user.click(within(dialog).getByRole("button", { name: "SIM vật lý" }));
    await user.click(within(dialog).getByRole("button", { name: "+ Thêm chi tiết nếu nhớ" }));
    await user.type(
      within(dialog).getByRole("textbox", { name: "Cách liên hệ hoặc mua" }),
      "Website công khai",
    );
    await user.click(within(dialog).getByRole("radio", { name: "Chia sẻ cộng đồng" }));
    await user.click(within(dialog).getByRole("button", { name: "Xem trước ghi chú" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Muốn chia sẻ liên hệ công khai, hãy xác nhận đây là kênh được phép chia sẻ.",
    );
    expect(within(dialog).queryByRole("heading", { name: "Bản xem trước ghi chú" })).toBeNull();

    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "Đây là kênh kinh doanh công khai hoặc được phép chia sẻ",
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Xem trước ghi chú" }));
    expect(within(dialog).getByText("Website công khai")).toBeVisible();
  });

  test("keeps navigation and prohibited content checks on the compact page", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Busan New Port" });

    const mobileNavigation = screen
      .getAllByRole("navigation", { name: "Điều hướng ghi chú cảng" })
      .find((navigation) => navigation.getAttribute("data-navigation") === "mobile");
    expect(mobileNavigation?.querySelectorAll("a, button")).toHaveLength(5);
    expect(
      within(mobileNavigation!).getByRole("link", { name: "Cộng đồng" }),
    ).toHaveAttribute("href", "/ports/busan#quick-action-write-note");
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
    expect(screen.queryByText(/Premium|Gói trả phí|★|star rating/i)).toBeNull();
  });

  test("keeps Snapshot and Write a Note usable in Data Saver and Ultra Lite", async () => {
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

    await user.selectOptions(bandwidthSelect, "ultraLite");
    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("ultraLite");
    });
    expect(screen.getByRole("region", { name: "Thông tin thiết yếu" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Viết ghi chú/ })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Ghi chú nổi bật" })).toBeNull();
    expect(
      document.querySelector('img:not([src="/brand/crewport-anchor.png"])'),
    ).toBeNull();
  });

  test("surfaces conflicting trust without rendering deeper safety content", async () => {
    window.history.replaceState({}, "", "/ports/port-klang");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Westports", level: 1 }),
    ).toBeVisible();
    expect(screen.getAllByText("Báo cáo mâu thuẫn").length).toBeGreaterThan(0);
    expect(screen.queryByText(/không chẩn đoán hoặc tư vấn thuốc/)).toBeNull();
    expect(screen.queryByText(/liều dùng|hãy uống|khuyên dùng thuốc/i)).toBeNull();
  });

  test("shows a helpful state for an unknown port slug", async () => {
    window.history.replaceState({}, "", "/ports/unknown-port");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Không tìm thấy dữ liệu cảng" }),
    ).toBeVisible();
    const emptyStateSearchLink = screen
      .getAllByRole("link", { name: "Tìm cảng" })
      .find((link) => link.getAttribute("href") === "/?q=unknown-port");
    expect(emptyStateSearchLink).toHaveAttribute("href", "/?q=unknown-port");
  });
});
