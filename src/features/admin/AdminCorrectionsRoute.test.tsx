import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { I18nProvider } from "../../i18n";
import type { CorrectionQueueItem, CorrectionReviewAction } from "../../types";
import { AdminCorrectionsRoute } from "./AdminCorrectionsRoute";

const mocks = vi.hoisted(() => ({
  reviewCorrection: vi.fn<(action: CorrectionReviewAction) => Promise<void>>(),
  listCorrections: vi.fn<() => Promise<readonly CorrectionQueueItem[]>>(),
}));

vi.mock("../../app/providers", () => ({
  useSession: () => ({ status: "authenticated", profile: { role: "admin" } }),
  useServices: () => ({ reputation: { ...mocks, getEvidenceUrl: vi.fn<(path: string) => Promise<string>>() } }),
}));

const correction = {
  id: "correction-1",
  noteId: "note-1",
  topic: "shoreLeave" as const,
  action: "UPDATE" as const,
  changes: [
    { id: "11111111-1111-4111-8111-111111111111", fieldKey: "summary", currentValue: "Old", proposedValue: "New", status: "pending" as const },
    { id: "22222222-2222-4222-8222-222222222222", fieldKey: "shoreLeave.price", currentValue: "10", proposedValue: "12", status: "pending" as const },
  ],
  verificationPeriod: "last7Days" as const,
  status: "pending" as const,
  createdAt: "2026-09-04T00:00:00Z",
  noteSummary: "Old",
  portKey: "KRPUS",
  submitterAlias: "OceanMan",
};

describe("AdminCorrectionsRoute", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  test("lets Staff accept selected fields from one structured correction", async () => {
    mocks.listCorrections.mockResolvedValue([correction]);
    mocks.reviewCorrection.mockResolvedValue();
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider initialLocale="vi"><AdminCorrectionsRoute /></I18nProvider></MemoryRouter>);

    await screen.findByText("OceanMan", { exact: false });
    await user.click(screen.getByRole("checkbox", { name: /Chọn thay đổi này để chấp nhận: Giá/ }));
    await user.click(screen.getByRole("button", { name: "Chấp nhận mục đã chọn" }));

    expect(mocks.reviewCorrection).toHaveBeenCalledWith(expect.objectContaining({
      correctionId: "correction-1",
      decision: "accepted",
      acceptedChangeIds: ["11111111-1111-4111-8111-111111111111"],
    }));
  });
});
