import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { NoteFeedbackPage, NoteFeedbackRecord } from "../../../types";
import type { RequestOptions } from "../../../services/contracts/request-context";
import { ServiceError } from "../../../services/service-errors";
import { NoteFeedbackPanel } from "./NoteFeedbackPanel";

const mocks = vi.hoisted(() => {
  const listFeedback = vi.fn<(noteId: string, cursor?: string, limit?: number, options?: RequestOptions) => Promise<NoteFeedbackPage>>();
  const getFeedback = vi.fn<(feedbackId: string, options?: RequestOptions) => Promise<NoteFeedbackRecord>>();
  const submitFeedback = vi.fn<(noteId: string, body: string, key: string) => Promise<NoteFeedbackRecord>>();
  const updateFeedback = vi.fn<(feedbackId: string, body: string) => Promise<NoteFeedbackRecord>>();
  const deleteFeedback = vi.fn<(feedbackId: string) => Promise<void>>();
  return {
    listFeedback,
    getFeedback,
    submitFeedback,
    updateFeedback,
    deleteFeedback,
    session: {
      status: "authenticated",
      profile: { userId: "viewer-1", role: "member" },
    },
    services: {
      portNotes: {
        isConfigured: () => true,
        listFeedback,
        getFeedback,
        submitFeedback,
        updateFeedback,
        deleteFeedback,
      },
    },
  };
});

vi.mock("../../../app/providers", () => ({
  useServices: () => mocks.services,
  useSession: () => mocks.session,
}));

const messages: Readonly<Record<string, string>> = {
  "noteFeedback.count": "{{count}} feedback",
  "noteFeedback.latest": "Latest feedback",
  "noteFeedback.viewAll": "View all {{count}} feedback",
  "noteFeedback.loading": "Loading feedback",
  "noteFeedback.empty": "No approved feedback yet.",
  "noteFeedback.add": "Add your experience",
  "noteFeedback.placeholder": "Share feedback",
  "noteFeedback.submit": "Send feedback",
  "noteFeedback.more": "View more feedback",
  "noteFeedback.signIn": "Sign in",
  "noteFeedback.edit": "Edit",
  "noteFeedback.delete": "Delete",
  "noteFeedback.error": "Generic feedback error",
  "noteFeedback.cooldownError": "Too fast",
  "noteFeedback.rateLimitError": "Too many",
  "noteFeedback.duplicateError": "Already sent",
};

vi.mock("../../../i18n", () => ({
  useI18n: () => ({
    t: (key: string, variables?: Readonly<Record<string, string | number>>) =>
      Object.entries(variables ?? {}).reduce(
        (result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
        messages[key] ?? key,
      ),
    formatDate: (value: string) => value,
  }),
}));

vi.mock("../../user-rank", () => ({
  DEFAULT_USER_RANK: { level: 0, xp: 0 },
  UserRankIdentity: ({ alias }: { readonly alias: string }) => <span>{alias}</span>,
}));

function feedback(id: string, createdAt: string): NoteFeedbackRecord {
  return {
    id,
    noteId: "note-1",
    body: `Body ${id}`,
    status: "approved",
    publicAlias: `Crew ${id}`,
    usedForCorrection: false,
    createdAt,
    updatedAt: createdAt,
  };
}

const baseProps = {
  noteId: "note-1",
  panelId: "feedback-panel-1",
  initialCount: 3,
  onApprovedCountChange: vi.fn<(count: number) => void>(),
};

describe("Note feedback progressive disclosure", () => {
  beforeEach(() => {
    mocks.listFeedback.mockReset();
    mocks.getFeedback.mockReset();
    mocks.submitFeedback.mockReset();
    mocks.updateFeedback.mockReset();
    mocks.deleteFeedback.mockReset();
    mocks.getFeedback.mockRejectedValue(new Error("not requested"));
    mocks.session.status = "authenticated";
    mocks.session.profile.role = "member";
  });

  afterEach(cleanup);

  test("does not request feedback before the panel is opened", () => {
    const { container } = render(<NoteFeedbackPanel {...baseProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(mocks.listFeedback).not.toHaveBeenCalled();
  });

  test("loads two newest items first and pages at twenty without duplicates", async () => {
    const user = userEvent.setup();
    const newest = feedback("newest", "2026-09-03T02:00:00Z");
    const older = feedback("older", "2026-09-03T01:00:00Z");
    const oldest = feedback("oldest", "2026-09-02T01:00:00Z");
    mocks.listFeedback
      .mockResolvedValueOnce({ items: [newest, older], nextCursor: "cursor-2" })
      .mockResolvedValueOnce({ items: [older, oldest] });

    render(<NoteFeedbackPanel {...baseProps} open />);

    await waitFor(() => expect(mocks.listFeedback).toHaveBeenNthCalledWith(
      1,
      "note-1",
      undefined,
      2,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(await screen.findByText("Body newest")).toBeVisible();
    expect(screen.getByText("Body older")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "View all 3 feedback" }));
    await waitFor(() => expect(mocks.listFeedback).toHaveBeenNthCalledWith(2, "note-1", "cursor-2", 20));
    expect(await screen.findByText("Body oldest")).toBeVisible();
    expect(screen.getAllByText("Body older")).toHaveLength(1);
  });

  test("opens an empty note directly at the feedback form", async () => {
    mocks.listFeedback.mockResolvedValue({ items: [] });
    render(<NoteFeedbackPanel {...baseProps} initialCount={0} open />);

    const textarea = await screen.findByRole("textbox", { name: "Add your experience" });
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(screen.queryByText("No approved feedback yet.")).toBeNull();
  });

  test("keeps the panel open and inserts newly published feedback", async () => {
    const user = userEvent.setup();
    const published = feedback("published", "2026-09-03T03:00:00Z");
    mocks.listFeedback.mockResolvedValue({ items: [] });
    mocks.submitFeedback.mockResolvedValue(published);
    render(<NoteFeedbackPanel {...baseProps} initialCount={0} open />);

    const textarea = await screen.findByRole("textbox", { name: "Add your experience" });
    await user.type(textarea, "Fresh experience");
    await user.click(screen.getByRole("button", { name: "Send feedback" }));

    expect(await screen.findByText("Body published")).toBeVisible();
    expect(screen.getByLabelText("0 feedback")).toBeVisible();
    expect(mocks.submitFeedback).toHaveBeenCalledWith("note-1", "Fresh experience", expect.any(String));
  });

  test("reuses the client request id when a slow-network retry sends the same body", async () => {
    const user = userEvent.setup();
    mocks.listFeedback.mockResolvedValue({ items: [] });
    mocks.submitFeedback
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(feedback("retry", "2026-09-03T03:00:00Z"));
    render(<NoteFeedbackPanel {...baseProps} initialCount={0} open />);

    const textarea = await screen.findByRole("textbox", { name: "Add your experience" });
    await user.type(textarea, "  Taxi   still runs  ");
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByText("Generic feedback error")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Send feedback" }));

    await waitFor(() => expect(mocks.submitFeedback).toHaveBeenCalledTimes(2));
    expect(mocks.submitFeedback.mock.calls[1]?.[2]).toBe(mocks.submitFeedback.mock.calls[0]?.[2]);
    expect(mocks.submitFeedback.mock.calls[0]?.[2]).toMatch(/^[0-9a-f-]{36}$/u);
    expect(await screen.findByText("Body retry")).toBeVisible();
  });

  test.each([
    ["feedback-cooldown", "Too fast"],
    ["feedback-rate-limit", "Too many"],
    ["feedback-duplicate", "Already sent"],
  ])("shows the specific %s feedback error", async (code, message) => {
    const user = userEvent.setup();
    mocks.listFeedback.mockResolvedValue({ items: [] });
    mocks.submitFeedback.mockRejectedValue(new ServiceError(code, code));
    render(<NoteFeedbackPanel {...baseProps} initialCount={0} open />);

    await user.type(await screen.findByRole("textbox", { name: "Add your experience" }), "Feedback body");
    await user.click(screen.getByRole("button", { name: "Send feedback" }));

    expect(await screen.findByText(message)).toBeVisible();
  });

  test("submits with Enter and keeps Shift+Enter for a new line", async () => {
    const user = userEvent.setup();
    const published = feedback("keyboard", "2026-09-03T04:00:00Z");
    mocks.listFeedback.mockResolvedValue({ items: [] });
    mocks.submitFeedback.mockResolvedValue(published);
    render(<NoteFeedbackPanel {...baseProps} initialCount={0} open />);

    const textarea = await screen.findByRole("textbox", { name: "Add your experience" });
    await user.type(textarea, "Line one{Shift>}{Enter}{/Shift}Line two");
    expect(textarea).toHaveValue("Line one\nLine two");
    expect(mocks.submitFeedback).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(mocks.submitFeedback).toHaveBeenCalledWith(
      "note-1",
      "Line one\nLine two",
      expect.any(String),
    ));
    expect(await screen.findByText("Body keyboard")).toBeVisible();
  });

  test("does not submit Enter while an input method is composing text", async () => {
    mocks.listFeedback.mockResolvedValue({ items: [] });
    render(<NoteFeedbackPanel {...baseProps} initialCount={0} open />);

    const textarea = await screen.findByRole("textbox", { name: "Add your experience" });
    fireEvent.change(textarea, { target: { value: "Đang nhập tiếng Việt" } });
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });

    expect(mocks.submitFeedback).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Đang nhập tiếng Việt");
  });

  test.each([
    ["anonymous", "member", "viewer-1", false, false],
    ["authenticated", "member", "other-user", false, false],
    ["authenticated", "moderator", "other-user", false, true],
    ["authenticated", "member", "viewer-1", true, true],
    ["authenticated", "admin", "other-user", false, true],
  ] as const)("shows actions for status %s, role %s and author %s", async (status, role, authorId, canEdit, canDelete) => {
    mocks.session.status = status;
    mocks.session.profile.role = role;
    mocks.listFeedback.mockResolvedValue({
      items: [{ ...feedback("permissions", "2026-09-03T05:00:00Z"), authorId }],
    });
    render(<NoteFeedbackPanel {...baseProps} open />);

    await screen.findByText("Body permissions");
    expect(Boolean(screen.queryByRole("button", { name: "Edit" }))).toBe(canEdit);
    expect(Boolean(screen.queryByRole("button", { name: "Delete" }))).toBe(canDelete);
    expect(screen.queryByText("noteFeedback.proposeCorrection")).toBeNull();
    expect(screen.queryByText("noteFeedback.noXp")).toBeNull();
  });
});
