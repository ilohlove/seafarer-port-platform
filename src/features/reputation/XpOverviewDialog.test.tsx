import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { resolveUserRank } from "../user-rank/user-rank";
import { XpOverviewDialog } from "./XpOverviewDialog";

const mocks = vi.hoisted(() => ({ getMySummary: vi.fn<() => Promise<unknown>>() }));

vi.mock("../../app/providers", () => ({
  useServices: () => ({ reputation: { getMySummary: mocks.getMySummary } }),
  useBandwidthModeValue: () => "standard",
}));

vi.mock("../../i18n", () => ({
  useI18n: () => ({
    locale: "vi",
    t: (key: string) => key,
  }),
}));

describe("XP overview fallback", () => {
  beforeEach(() => mocks.getMySummary.mockReset());

  test("keeps approved XP rules visible and retries when live data fails", async () => {
    mocks.getMySummary.mockRejectedValueOnce(new Error("RPC unavailable"));
    render(<MemoryRouter><XpOverviewDialog alias="CaptainSea" initialRank={resolveUserRank(0)} /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /xp\.howToEarn/ }));
    expect(await screen.findByText("xp.liveUnavailable")).toBeInTheDocument();
    expect(screen.getByText("xp.rules")).toBeInTheDocument();
    expect(screen.getByText("+100 XP")).toBeInTheDocument();

    mocks.getMySummary.mockResolvedValueOnce({ rank: resolveUserRank(0), recent: [], rules: [] });
    fireEvent.click(screen.getByRole("button", { name: "xp.retry", hidden: true }));
    await waitFor(() => expect(screen.queryByText("xp.liveUnavailable")).not.toBeInTheDocument());
    expect(mocks.getMySummary).toHaveBeenCalledTimes(2);
  });
});
