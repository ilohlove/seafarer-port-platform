import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "../../i18n";
import { CancelConfirmationDialog } from "./CancelConfirmationDialog";

const mocks = vi.hoisted(() => ({
  revokeNoteConfirmation: vi.fn<(noteId: string, idempotencyKey: string) => Promise<{ revokedXp: number; communityConfirmationCount: number }>>(),
}));

vi.mock("../../app/providers", () => ({
  useServices: () => ({ reputation: { revokeNoteConfirmation: mocks.revokeNoteConfirmation } }),
}));

describe("CancelConfirmationDialog", () => {
  beforeEach(() => {
    mocks.revokeNoteConfirmation.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  afterEach(cleanup);

  test("keeps the confirmation when the secondary action is selected", () => {
    const onClose = vi.fn<() => void>();
    render(
      <I18nProvider initialLocale="vi">
        <CancelConfirmationDialog noteId="note-1" open onClose={onClose} onSuccess={() => undefined} />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Hủy xác nhận?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Giữ xác nhận" }));
    expect(mocks.revokeNoteConfirmation).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("submits one revocation during double click and reports the authoritative result", async () => {
    let resolveRevocation!: (value: { revokedXp: number; communityConfirmationCount: number }) => void;
    mocks.revokeNoteConfirmation.mockReturnValue(new Promise((resolve) => { resolveRevocation = resolve; }));
    const onSuccess = vi.fn<(result: { revokedXp: number; communityConfirmationCount: number }) => void>();
    render(
      <I18nProvider initialLocale="vi">
        <CancelConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={onSuccess} />
      </I18nProvider>,
    );

    const cancel = screen.getByRole("button", { name: "Hủy xác nhận" });
    fireEvent.click(cancel);
    fireEvent.click(cancel);
    expect(mocks.revokeNoteConfirmation).toHaveBeenCalledTimes(1);
    expect(cancel).toBeDisabled();

    resolveRevocation({ revokedXp: 10, communityConfirmationCount: 1 });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ revokedXp: 10, communityConfirmationCount: 1 }));
  });

  test("keeps the confirmed state available when the request fails", async () => {
    mocks.revokeNoteConfirmation.mockRejectedValue(new Error("offline"));
    render(
      <I18nProvider initialLocale="vi">
        <CancelConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={() => undefined} />
      </I18nProvider>,
    );

    const cancel = screen.getByRole("button", { name: "Hủy xác nhận" });
    fireEvent.click(cancel);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể hủy xác nhận");
    expect(cancel).toBeEnabled();
  });
});
