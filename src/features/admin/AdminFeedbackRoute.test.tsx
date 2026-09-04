import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { I18nProvider } from "../../i18n";
import type { FeedbackModerationContext, FeedbackModerationItem, FeedbackModerationPage } from "../../types";
import { AdminFeedbackRoute } from "./AdminFeedbackRoute";

const mocks = vi.hoisted(() => {
  const list = vi.fn<() => Promise<FeedbackModerationPage>>();
  const context = vi.fn<() => Promise<FeedbackModerationContext>>();
  const moderate = vi.fn<() => Promise<void>>();
  return { list, context, moderate, services: { portNotes: { listFeedbackModerationQueue: list, getFeedbackModerationContext: context, moderateFeedback: moderate } } };
});

vi.mock("../../app/providers", () => ({
  useSession: () => ({ status: "authenticated", profile: { role: "admin", userId: "staff-1" } }),
  useServices: () => mocks.services,
}));

const item: FeedbackModerationItem = {
  id: "feedback-1", noteId: "note-1", body: "Giá taxi vẫn khoảng 20 USD, tôi đi hôm qua.", status: "pending",
  publicAlias: "OceanMan", authorId: "author-1", usedForCorrection: false,
  createdAt: "2026-09-04T01:00:00Z", updatedAt: "2026-09-04T01:00:00Z",
  noteSummary: "Taxi từ terminal ra Main Gate khoảng 15–20 USD.", portKey: "KRPUS", noteContextKey: "Terminal 3",
  noteTopic: "shoreLeave", noteTrustState: "needsConfirmation", priority: "P0", riskSignals: [],
};

const context: FeedbackModerationContext = {
  note: {
    id: "note-1", portKey: "KRPUS", contextKey: "Terminal 3", topic: "shoreLeave", visibility: "public",
    moderationState: "approved", summary: item.noteSummary, details: {}, contactIsPublicBusiness: false,
    publicAlias: "CaptainSea", feedbackCount: 1, createdAt: item.createdAt,
    accuracy: { state: "needsConfirmation", stillCorrect: 0, changed: 0, notSure: 0 },
  },
  feedback: [item],
};

function renderRoute(entry = "/admin/moderation/feedback") {
  return render(<MemoryRouter initialEntries={[entry]}><I18nProvider initialLocale="vi"><AdminFeedbackRoute /></I18nProvider></MemoryRouter>);
}

describe("Admin Feedback Moderation Center", () => {
  beforeEach(() => {
    mocks.list.mockReset().mockResolvedValue({ items: [item], nextCursor: "next-cursor" });
    mocks.context.mockReset().mockResolvedValue(context);
    mocks.moderate.mockReset().mockResolvedValue();
  });
  afterEach(cleanup);

  test("renders compact body-first cards without an always-open reason textarea", async () => {
    renderRoute("/admin/moderation/feedback?status=pending&priority=P0&sort=oldest");
    expect(await screen.findByText(/Giá taxi vẫn khoảng 20 USD/)).toBeVisible();
    expect(screen.getByText(/Taxi từ terminal ra Main Gate/)).toBeVisible();
    expect(screen.queryByRole("textbox", { name: /Lý do/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sửa" })).toBeNull();
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ state: "pending", priority: "P0", sort: "oldest", limit: 25 })));
  });

  test("uses the server cursor for the next page", async () => {
    const user = userEvent.setup(); renderRoute();
    await user.click(await screen.findByRole("button", { name: "Trang tiếp" }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "next-cursor", limit: 25 })));
  });

  test("approves with the existing moderation service and removes the item", async () => {
    const user = userEvent.setup(); renderRoute();
    await user.click(await screen.findByRole("button", { name: "Duyệt" }));
    await waitFor(() => expect(mocks.moderate).toHaveBeenCalledWith("feedback-1", "approved", undefined));
    expect(screen.queryByText(/Giá taxi vẫn khoảng 20 USD/)).toBeNull();
  });

  test("progressively asks for a reject reason", async () => {
    const user = userEvent.setup(); renderRoute();
    await screen.findByText(/Giá taxi vẫn khoảng 20 USD/);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Từ chối" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("radio", { name: "Không liên quan" }));
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận từ chối" }));
    expect(mocks.moderate).toHaveBeenCalledWith("feedback-1", "rejected", "Không liên quan");
  });

  test("loads context only on demand, highlights the target and builds a reload-safe link", async () => {
    const user = userEvent.setup(); renderRoute();
    await screen.findByText(/Giá taxi vẫn khoảng 20 USD/);
    expect(mocks.context).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Xem trong bài gốc" }));
    await waitFor(() => expect(mocks.context).toHaveBeenCalled());
    expect(screen.getByText("Đang kiểm duyệt").closest("article")).toHaveAttribute("data-focused", "true");
    expect(screen.getByRole("link", { name: /Mở trang đầy đủ/ })).toHaveAttribute("href", "/ports/krpus?topic=shoreLeave&note=note-1&feedback=feedback-1");
  });

  test("shows empty, loading failure and processed-by-another conflict states", async () => {
    mocks.list.mockResolvedValueOnce({ items: [] });
    const first = renderRoute();
    expect(await screen.findByText("Không có phản hồi trong trạng thái này.")).toBeVisible();
    first.unmount();
    mocks.list.mockResolvedValue({ items: [item] });
    mocks.moderate.mockRejectedValue(new Error("feedback_not_pending"));
    const user = userEvent.setup(); renderRoute();
    await user.click(await screen.findByRole("button", { name: "Duyệt" }));
    expect(await screen.findByText(/moderator khác/)).toBeVisible();
  });
});
