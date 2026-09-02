import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";

import type { XpHistoryFilter, XpHistoryPage, XpSummaryReadModel } from "../../types";
import { resolveUserRank } from "../user-rank";
import { XpHistoryRoute } from "./XpHistoryRoute";

const event = {
  id: "xp-1",
  eventType: "community_confirmed" as const,
  sourceType: "note",
  sourceId: "note-1",
  amount: 50,
  metadata: {},
  createdAt: "2026-09-02T00:00:00.000Z",
};

const mocks = vi.hoisted(() => {
  const reputation = {
    getMySummary: vi.fn<() => Promise<XpSummaryReadModel>>(),
    listMyEvents: vi.fn<(filter: XpHistoryFilter, cursor?: string) => Promise<XpHistoryPage>>(),
  };
  return { reputation, services: { reputation } };
});

vi.mock("../../app/providers", () => ({
  useServices: () => mocks.services,
  useSession: () => ({
    status: "authenticated",
    profile: {
      userId: "admin-1",
      email: "admin@example.com",
      fullName: "Harbor Chief",
      nickname: "HarborChief",
      role: "admin",
    },
  }),
  useBandwidthModeValue: () => "standard",
}));

vi.mock("../../i18n", () => ({
  useI18n: () => ({
    locale: "vi",
    t: (key: string) => key,
  }),
}));

describe("XP history route", () => {
  beforeEach(() => {
    mocks.reputation.getMySummary.mockResolvedValue({
      rank: resolveUserRank(18_420),
      recent: [event],
      rules: [],
    });
    mocks.reputation.listMyEvents.mockResolvedValue({ items: [event] });
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("keeps the closed detail dialog hidden and uses Staff identity instead of member rank", async () => {
    const { container } = render(<MemoryRouter><XpHistoryRoute /></MemoryRouter>);

    expect(await screen.findByText("Tư lệnh Hạm đội · ADMIN")).toBeVisible();
    expect(screen.getByText("18.420 XP")).toBeVisible();
    expect(container).not.toHaveTextContent(/Lv\./);
    expect(container.querySelector('[data-staff-title="admin"]')).toBeVisible();

    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /xp\.event\.community_confirmed/ }));
    await waitFor(() => expect(dialog).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "xp.close" }));
    await waitFor(() => expect(dialog).not.toBeVisible());
  });
});
