import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { I18nProvider } from "../../../i18n";
import { resolveUserRank } from "../../user-rank";
import type { PortNoteCardModel } from "../port-notes-view-model";
import { PortNoteExplorer } from "./PortNoteExplorer";
import { RecentCommunityNotes } from "./RecentCommunityNotes";
import { TopSeafarerNotes } from "./TopSeafarerNotes";

const hiddenContext = "busan-context-new-port";
const note: PortNoteCardModel = {
  id: "note-identity-test",
  topic: "eSIM",
  topicKey: "esim",
  title: "Connection note",
  summary: "Connection summary",
  authorLabel: "long_seafarer_username_for_wrapping",
  context: hiddenContext,
  confirmations: "1 confirmation",
  usefulness: "2 useful",
  confirmationCount: 1,
  usefulnessCount: 2,
  trust: { status: "needsConfirmation", label: "Needs confirmation" },
  authorRank: resolveUserRank(100),
};

describe("Port Note author identity", () => {
  afterEach(cleanup);

  test.each([
    ["explorer", <PortNoteExplorer key="explorer" notes={[note]} onPlaceholder={() => undefined} onWriteNote={() => undefined} />],
    ["recent notes", <RecentCommunityNotes key="recent" notes={[note]} onPlaceholder={() => undefined} />],
    ["top notes", <TopSeafarerNotes key="top" notes={[note]} onPlaceholder={() => undefined} />],
  ])("hides internal context in %s", (_name, component) => {
    render(<I18nProvider initialLocale="en">{component}</I18nProvider>);

    expect(screen.getAllByText(note.authorLabel).length).toBeGreaterThan(0);
    expect(screen.queryByText(hiddenContext)).toBeNull();
  });

  test("uses the approved 64px compact size for Rank and Staff artwork everywhere", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/user-rank/user-rank.module.css"),
      "utf8",
    );
    expect(styles).toMatch(/\.avatarFrame\[data-size="compact"\][\s\S]*?inline-size:4rem;[\s\S]*?block-size:4rem;/u);
  });

  test("aligns the featured notes section with the page content edges", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/port-notes.module.css"),
      "utf8",
    );
    expect(styles).toMatch(/\.topicNotesPanel\s*\{[\s\S]*?padding-inline: 0;/u);
  });

  test("keeps the Note actions image-led on mobile and balanced on desktop", () => {
    const component = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/components/TopicNotesPanel.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/port-notes.module.css"),
      "utf8",
    );
    const confirmIndex = component.indexOf('data-note-action="confirm"');
    const feedbackIndex = component.indexOf('data-note-action="feedback"');
    const changedIndex = component.indexOf('data-note-action="changed"');

    expect(confirmIndex).toBeGreaterThan(-1);
    expect(feedbackIndex).toBeGreaterThan(confirmIndex);
    expect(changedIndex).toBeGreaterThan(feedbackIndex);
    expect(component).toContain('<NoteActionIcon kind="confirm" />');
    expect(component).toContain('<NoteActionIcon kind="feedback" />');
    expect(component).toContain('<NoteActionIcon kind="changed" />');
    expect(component).toContain("<NoteTrustIcon />");
    expect(component).not.toContain("feedbackChevron");
    expect(styles).toMatch(/\.noteTrustActions\s*\{[\s\S]*?border: 1px solid color-mix\(in srgb, var\(--color-service-border\) 72%, transparent\);[\s\S]*?background:/u);
    expect(styles).toMatch(/\.noteActionStack\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*?inline-size: 100%;/u);
    expect(styles).toMatch(/\.noteActionStack button\s*\{[\s\S]*?min-block-size: 3\.125rem;[\s\S]*?flex-direction: row;/u);
    expect(styles).toMatch(/\.noteActionStack \.changedAction\s*\{[\s\S]*?grid-column: 1 \/ -1;/u);
    expect(styles).toMatch(/\.noteActionStack \.confirmAction\s*\{[\s\S]*?background: color-mix\(in srgb, var\(--color-sea\) 6%, var\(--color-surface\)\);/u);
    expect(component).toContain('data-action-count="3"');
    expect(component).toContain("confirmationDisabled");
    expect(component).toContain('t("portNotes.topicPanel.confirmedAction")');
    expect(component).not.toContain("<TrustStatus");
    expect(styles).toMatch(/@media \(min-width: 48rem\)[\s\S]*?\.noteTrustActions\s*\{[\s\S]*?grid-template-columns: minmax\(13rem, 0\.72fr\) minmax\(0, 2\.8fr\);[\s\S]*?\.noteActionStack\s*\{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/u);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.noteActionStack button\s*\{[\s\S]*?transition: none;/u);
    expect(styles).not.toMatch(/\n\.feedbackToggle\s*\{/u);
  });
});
