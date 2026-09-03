import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "../../../i18n";
import { enDictionary } from "../../../i18n/en";
import { viDictionary } from "../../../i18n/vi";
import { NoteConfirmationButton, noteDetailIconKind, TopicNoteContent } from "./TopicNotesPanel";

describe("Topic Note content presentation", () => {
  afterEach(cleanup);

  test.each([
    ["shoreLeave.avoid", "avoid"],
    ["shoreLeave.price", "price"],
    ["physicalSim.fairPrice", "price"],
    ["shoreLeave.pickup", "pickup"],
    ["general.location", "pickup"],
    ["shoreLeave.rideApp", "ride"],
    ["welfare.shuttle", "ride"],
    ["shoreLeave.agreeFare", "agreement"],
    ["esim.signal", "information"],
    ["future.unknown", "information"],
  ] as const)("maps %s to the %s inline icon", (detailKey, icon) => {
    expect(noteDetailIconKind(detailKey)).toBe(icon);
  });

  test.each([
    [false, "Xác nhận", "false"],
    [true, "✓ Đã xác nhận", "true"],
  ] as const)("renders one confirmation button for persisted state %s", (confirmed, label, pressed) => {
    const onClick = vi.fn<() => void>();
    render(
      <I18nProvider initialLocale="vi">
        <NoteConfirmationButton confirmed={confirmed} disabled={false} busy={false} onClick={onClick} />
      </I18nProvider>,
    );

    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveAttribute("aria-pressed", pressed);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("keeps representative structured labels localized in Vietnamese and English", () => {
    expect(viDictionary["portNotes.topicPanel.takeaway"]).toBe("Điều anh em cần nhớ");
    expect(viDictionary["portNotes.capture.chip.shoreLeave.pickup"]).toBe("Điểm đón");
    expect(viDictionary["portNotes.capture.chip.shoreLeave.rideApp"]).toBe("App gọi xe");
    expect(enDictionary["portNotes.topicPanel.takeaway"]).toBe("What crew should remember");
    expect(enDictionary["portNotes.capture.chip.shoreLeave.pickup"]).toBe("Pickup point");
    expect(enDictionary["portNotes.capture.chip.shoreLeave.rideApp"]).toBe("Ride-hailing app");
  });

  test("renders every populated detail with semantic labels and inline SVG", () => {
    const component = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/components/TopicNotesPanel.tsx"),
      "utf8",
    );

    expect(component).toContain("visibleDetails.map");
    expect(component).toContain("<dl id={detailsId} className={styles.topicNoteDetails}>");
    expect(component).toContain("const label = detailLabel(key, t)");
    expect(component).toContain("<dt>{label}</dt>");
    expect(component).toContain("<dd><ExpandableNoteText value={value} fieldKey={key} label={label} /></dd>");
    expect(component).toContain("<NoteDetailIcon detailKey={key} />");
    expect(component).not.toMatch(/<img[^>]+noteDetail/u);
  });

  test("does not offer disclosure when a note has no public details", () => {
    render(
      <I18nProvider initialLocale="vi">
        <TopicNoteContent summary="Nội dung chính" details={{ context: "internal-context", "shoreLeave.price": "   " }} />
      </I18nProvider>,
    );

    expect(screen.getByText("Nội dung chính")).toBeVisible();
    expect(screen.queryByRole("button", { name: /chi tiết/i })).toBeNull();
    expect(screen.queryByRole("definition")).toBeNull();
  });

  test("keeps multiple notes collapsed and expands each note independently with keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLocale="en">
        <TopicNoteContent summary="First note" details={{ "shoreLeave.price": "12 kW" }} />
        <TopicNoteContent summary="Second note" details={{ "shoreLeave.pickup": "Terminal 1", "shoreLeave.rideApp": "Local taxi" }} />
      </I18nProvider>,
    );

    const firstToggle = await screen.findByRole("button", { name: "View 1 details" });
    const secondToggle = await screen.findByRole("button", { name: "View 2 details" });
    expect(firstToggle).toHaveAttribute("aria-expanded", "false");
    expect(secondToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("12 kW")).toBeNull();
    expect(screen.queryByText("Terminal 1")).toBeNull();

    firstToggle.focus();
    await user.keyboard("{Enter}");

    expect(firstToggle).toHaveFocus();
    expect(firstToggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(firstToggle.getAttribute("aria-controls")!)).toBeVisible();
    expect(screen.getByText("12 kW")).toBeVisible();
    expect(screen.queryByText("Terminal 1")).toBeNull();
    expect(secondToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(firstToggle);
    expect(firstToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("12 kW")).toBeNull();
  });

  test("clamps long stored content without truncating it and expands main and detail text independently", async () => {
    const user = userEvent.setup();
    const longSummary = "S".repeat(200);
    const legacyLongPrice = "P".repeat(120);
    render(
      <I18nProvider initialLocale="vi">
        <TopicNoteContent summary={longSummary} details={{ "shoreLeave.price": legacyLongPrice }} />
      </I18nProvider>,
    );

    const summaryMore = screen.getByRole("button", { name: "Xem thêm: Điều anh em cần nhớ" });
    const summaryText = screen.getByText(longSummary);
    expect(summaryText).not.toHaveAttribute("data-expanded");
    await user.click(summaryMore);
    expect(summaryText).toHaveAttribute("data-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Xem 1 chi tiết" }));
    const storedValue = screen.getByText(legacyLongPrice);
    const detailMore = screen.getByRole("button", { name: "Xem thêm: Giá" });
    expect(storedValue).toHaveTextContent(legacyLongPrice);
    await user.click(detailMore);
    expect(storedValue).toHaveAttribute("data-expanded", "true");
    expect(screen.getByRole("button", { name: "Thu gọn: Giá" })).toBeVisible();
  });

  test("uses mobile-first rows, a desktop value grid, and text-only Ultra Lite", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/port-notes.module.css"),
      "utf8",
    );

    expect(styles).toMatch(/\.topicNoteDetails > div\s*\{[\s\S]*?"icon label"[\s\S]*?"icon value"/u);
    expect(styles).toMatch(/\.topicNoteDetails > div\s*\{[\s\S]*?min-block-size: 3\.5rem;[\s\S]*?padding-block: 0\.35rem;/u);
    expect(styles).toMatch(/@media \(min-width: 48rem\)[\s\S]*?grid-template-areas: "icon label separator value"/u);
    expect(styles).toMatch(/@media \(min-width: 48rem\)[\s\S]*?\.topicNoteDetails > div\s*\{[\s\S]*?min-block-size: 3\.75rem;/u);
    expect(styles).toMatch(/data-bandwidth-mode="dataSaver"[\s\S]*?\.topicNoteCard[\s\S]*?box-shadow: none;/u);
    expect(styles).toMatch(/data-bandwidth-mode="ultraLite"[\s\S]*?\.noteSummaryIcon, \.noteDetailIcon, \.noteDetailSeparator[\s\S]*?display: none;/u);
    expect(styles).toMatch(/data-bandwidth-mode="ultraLite"[\s\S]*?grid-template-areas: "label value"/u);
    expect(styles).toMatch(/\.noteDetailsToggle\s*\{[\s\S]*?min-block-size: 2\.75rem;[\s\S]*?justify-content: space-between;/u);
    expect(styles).toMatch(/data-bandwidth-mode="ultraLite"[\s\S]*?\.noteDetailsToggle[\s\S]*?background: transparent;/u);
  });
});
