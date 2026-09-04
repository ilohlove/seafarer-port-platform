import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "../../i18n";
import type { NoteCorrectionSubmission, PortNoteRecord } from "../../types";
import { buildCorrectionChanges, CorrectionDialog } from "./CorrectionDialog";

const mocks = vi.hoisted(() => ({
  submitCorrection: vi.fn<(submission: NoteCorrectionSubmission) => Promise<void>>(),
  uploadEvidence: vi.fn<() => Promise<string>>(),
}));

vi.mock("../../app/providers", () => ({
  useServices: () => ({ reputation: mocks }),
}));

const note: PortNoteRecord = {
  id: "note-1",
  portKey: "KRPUS",
  topic: "shoreLeave",
  visibility: "public",
  moderationState: "approved",
  summary: "Chụp ảnh trước khi lên bờ",
  details: { "shoreLeave.avoid": "Đi siêu thị giờ cao điểm", context: "hidden" },
  contactIsPublicBusiness: false,
  publicAlias: "OceanMan",
  feedbackCount: 0,
  createdAt: "2026-09-01T00:00:00Z",
  accuracy: { state: "needsConfirmation", stillCorrect: 0, changed: 0, notSure: 0 },
};

describe("CorrectionDialog", () => {
  beforeEach(() => {
    mocks.submitCorrection.mockReset();
    mocks.submitCorrection.mockResolvedValue();
    mocks.uploadEvidence.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
  });

  afterEach(cleanup);

  test("builds only changed fields and represents blank existing details as removals", () => {
    expect(buildCorrectionChanges(note, "Nội dung mới", { "shoreLeave.avoid": "", "shoreLeave.price": "12 kW" }, ["shoreLeave.avoid", "shoreLeave.price"])).toEqual([
      { fieldKey: "summary", currentValue: note.summary, proposedValue: "Nội dung mới" },
      { fieldKey: "shoreLeave.avoid", currentValue: "Đi siêu thị giờ cao điểm", proposedValue: undefined },
      { fieldKey: "shoreLeave.price", currentValue: undefined, proposedValue: "12 kW" },
    ]);
  });

  test("prefills the note, offers only topic fields, and submits multiple changes", async () => {
    const user = userEvent.setup();
    render(<I18nProvider initialLocale="vi"><CorrectionDialog note={note} open onClose={() => undefined} onSuccess={() => undefined} /></I18nProvider>);

    const summary = await screen.findByLabelText("Điều anh em cần nhớ");
    expect(summary).toHaveValue(note.summary);
    expect(screen.getByLabelText("Cần tránh")).toHaveValue("Đi siêu thị giờ cao điểm");
    expect(screen.queryByRole("option", { name: "Quà nên mua" })).toBeNull();

    await user.clear(summary);
    await user.type(summary, "Điểm đón đã chuyển");
    await user.selectOptions(screen.getByLabelText("Bổ sung nội dung"), "shoreLeave.pickup");
    await user.type(screen.getByLabelText("Điểm đón"), "Cổng số 2");
    await user.click(screen.getByRole("button", { name: "Gửi báo thay đổi" }));

    expect(mocks.submitCorrection).toHaveBeenCalledWith(expect.objectContaining({
      noteId: "note-1",
      changes: [
        { fieldKey: "summary", currentValue: note.summary, proposedValue: "Điểm đón đã chuyển" },
        { fieldKey: "shoreLeave.pickup", currentValue: undefined, proposedValue: "Cổng số 2" },
      ],
    }));
  });

  test("reuses the same UUID when an unchanged correction is retried", async () => {
    const user = userEvent.setup();
    mocks.submitCorrection
      .mockRejectedValueOnce(new Error("satellite timeout"))
      .mockResolvedValueOnce();
    render(<I18nProvider initialLocale="en"><CorrectionDialog note={note} open onClose={() => undefined} onSuccess={() => undefined} /></I18nProvider>);

    const summary = await screen.findByLabelText("What crew should remember");
    await user.clear(summary);
    await user.type(summary, "Pickup point moved");
    await user.click(screen.getByRole("button", { name: "Submit change report" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Submit change report" }));

    expect(mocks.submitCorrection).toHaveBeenCalledTimes(2);
    const firstKey = mocks.submitCorrection.mock.calls[0]?.[0].idempotencyKey;
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/u);
    expect(mocks.submitCorrection.mock.calls[1]?.[0].idempotencyKey).toBe(firstKey);
  });
});
