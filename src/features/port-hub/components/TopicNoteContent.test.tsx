import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { enDictionary } from "../../../i18n/en";
import { viDictionary } from "../../../i18n/vi";
import { noteDetailIconKind } from "./TopicNotesPanel";

describe("Topic Note content presentation", () => {
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
    expect(component).toContain("<dl className={styles.topicNoteDetails}>");
    expect(component).toContain("<dt>{detailLabel(key, t)}</dt>");
    expect(component).toContain("<dd>{value}</dd>");
    expect(component).toContain("<NoteDetailIcon detailKey={key} />");
    expect(component).not.toMatch(/<img[^>]+noteDetail/u);
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
  });
});
