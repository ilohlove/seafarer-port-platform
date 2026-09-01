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

  test("scopes the approved 64px badge size to member Rank artwork", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/port-notes.module.css"),
      "utf8",
    );
    expect(styles).toContain('.noteAuthorIdentity :global([data-frame-kind="rank"][data-size="compact"])');
    expect(styles).toMatch(/\.noteAuthorIdentity[\s\S]*?inline-size: 4rem;[\s\S]*?block-size: 4rem;/u);
    expect(styles).not.toContain('.noteAuthorIdentity :global([data-frame-kind="staff"]');
  });

  test("aligns the featured notes section with the page content edges", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/port-hub/port-notes.module.css"),
      "utf8",
    );
    expect(styles).toMatch(/\.topicNotesPanel\s*\{[\s\S]*?padding-inline: 0;/u);
  });
});
