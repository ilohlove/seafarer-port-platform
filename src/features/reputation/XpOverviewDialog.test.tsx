import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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
  beforeEach(() => {
    mocks.getMySummary.mockReset();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });
  afterEach(cleanup);

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

  test.each([
    ["admin", "Tư lệnh Hạm đội · ADMIN"],
    ["moderator", "Cảng vụ · MODERATOR"],
  ] as const)("shows %s Staff identity and XP without exposing a member level or progress", (staffTitle, expectedTitle) => {
    mocks.getMySummary.mockResolvedValue({ rank: resolveUserRank(18_420), recent: [], rules: [] });
    const { container } = render(
      <MemoryRouter>
        <XpOverviewDialog
          alias="HarborChief"
          initialRank={resolveUserRank(18_420)}
          staffTitle={staffTitle}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /xp\.howToEarn/ }));

    expect(screen.getByText(expectedTitle)).toBeVisible();
    expect(screen.getByText("18.420 XP")).toBeVisible();
    expect(screen.getByText("xp.staffRole")).toBeVisible();
    expect(screen.queryByText("xp.currentRank")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Lv\./);
    expect(container.querySelector("progress")).toBeNull();
    expect(container.querySelector(`[data-staff-title="${staffTitle}"]`)).toBeVisible();
  });
});
