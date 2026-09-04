import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "../../i18n";
import type { VerificationPeriod, VerifiedConfirmationSubmission } from "../../types";
import { VerifiedConfirmationDialog } from "./VerifiedConfirmationDialog";

const mocks = vi.hoisted(() => ({
  uploadEvidence: vi.fn<() => Promise<string>>(),
  confirmNote: vi.fn<(submission: VerifiedConfirmationSubmission) => Promise<{ rewardedXp: number; communityConfirmationCount: number }>>(),
}));

vi.mock("../../app/providers", () => ({
  useServices: () => ({
    reputation: {
      uploadEvidence: mocks.uploadEvidence,
      confirmNote: mocks.confirmNote,
    },
  }),
}));

describe("VerifiedConfirmationDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.uploadEvidence.mockReset();
    mocks.confirmNote.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  afterEach(cleanup);

  test.each([
    ["vi", "Chỉ xác nhận khi bạn đã trực tiếp kiểm chứng thông tin này.", "Nếu bạn chỉ nghe từ người khác hoặc nguồn khác, hãy dùng Báo thay đổi."],
    ["en", "Confirm only when you have personally verified this information.", "If you only heard it from someone else or another source, use Report changed."],
  ] as const)("uses concise %s guidance without a source-selection step", async (locale, guidance, feedbackHelp) => {
    const { container } = render(
      <I18nProvider initialLocale={locale}>
        <VerifiedConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={() => undefined} />
      </I18nProvider>,
    );

    await screen.findByText(guidance);
    await screen.findByText(feedbackHelp);
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(submit).toBeEnabled();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/Tôi trực tiếp kiểm chứng|I verified it directly/u)).toBeNull();
  });

  test("submits text only once and never exposes or uploads confirmation evidence", async () => {
    let resolveConfirmation!: (value: { rewardedXp: number; communityConfirmationCount: number }) => void;
    mocks.confirmNote.mockReturnValue(new Promise((resolve) => { resolveConfirmation = resolve; }));
    const onSuccess = vi.fn<(result: { rewardedXp: number; communityConfirmationCount: number }, period: VerificationPeriod) => void>();
    render(
      <I18nProvider initialLocale="vi">
        <VerifiedConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={onSuccess} />
      </I18nProvider>,
    );

    expect(screen.queryByLabelText(/Ảnh bằng chứng/u)).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    const submit = screen.getByRole("button", { name: "Xác nhận vẫn đúng" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(mocks.confirmNote).toHaveBeenCalledTimes(1);
    expect(mocks.uploadEvidence).not.toHaveBeenCalled();
    expect(mocks.confirmNote.mock.calls[0]?.[0]).not.toHaveProperty("evidencePath");

    resolveConfirmation({ rewardedXp: 10, communityConfirmationCount: 2 });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(
      { rewardedXp: 10, communityConfirmationCount: 2 },
      "last7Days",
    ));
  });

  test("reuses the operation UUID when the same confirmation is retried", async () => {
    mocks.confirmNote
      .mockRejectedValueOnce(new Error("satellite timeout"))
      .mockResolvedValueOnce({ rewardedXp: 10, communityConfirmationCount: 1 });
    render(
      <I18nProvider initialLocale="en">
        <VerifiedConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={() => undefined} />
      </I18nProvider>,
    );

    const submit = screen.getByRole("button", { name: "Xác nhận vẫn đúng" });
    fireEvent.click(submit);
    await screen.findByRole("alert");
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.confirmNote).toHaveBeenCalledTimes(2));

    const firstKey = mocks.confirmNote.mock.calls[0]?.[0].idempotencyKey;
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/u);
    expect(mocks.confirmNote.mock.calls[1]?.[0].idempotencyKey).toBe(firstKey);
  });

  test("starts a new operation UUID when confirmation input changes", async () => {
    mocks.confirmNote.mockRejectedValue(new Error("offline"));
    render(
      <I18nProvider initialLocale="vi">
        <VerifiedConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={() => undefined} />
      </I18nProvider>,
    );

    const submit = screen.getByRole("button", { name: "Xác nhận vẫn đúng" });
    fireEvent.click(submit);
    await screen.findByRole("alert");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Thông tin bổ sung" } });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.confirmNote).toHaveBeenCalledTimes(2));
    expect(mocks.confirmNote.mock.calls[1]?.[0].idempotencyKey)
      .not.toBe(mocks.confirmNote.mock.calls[0]?.[0].idempotencyKey);
  });
});
