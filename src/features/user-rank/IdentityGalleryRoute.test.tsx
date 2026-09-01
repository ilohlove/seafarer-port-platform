import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { I18nProvider } from "../../i18n";
import { DEMO_MEMBERS } from "./identity-demo-data";
import { IdentityGalleryRoute } from "./IdentityGalleryRoute";
import { USER_RANKS } from "./user-rank";

describe("IdentityGalleryRoute", () => {
  afterEach(cleanup);

  test("shows ten ranks, four no-level staff identities and three supporter tiers", async () => {
    render(<I18nProvider initialLocale="en"><IdentityGalleryRoute /></I18nProvider>);
    await screen.findAllByText("Port Newcomer");
    expect(screen.getByText("DEMO DATA · NOT PRODUCTION")).toBeVisible();

    const levelSection = screen.getByRole("heading", { name: /Contribution Rank/ }).closest("section")!;
    expect(levelSection.querySelectorAll("article[data-rank-level]")).toHaveLength(10);
    for (const [index, rank] of USER_RANKS.entries()) {
      const card = levelSection.querySelector(`article[data-rank-level="${rank.level}"]`) as HTMLElement;
      expect(card).toHaveTextContent(rank.name);
      expect(within(card).getByText(DEMO_MEMBERS[index].alias)).toHaveAttribute("data-rank-level", String(rank.level));
      expect(within(card).queryByText(rank.shortTag)).toBeNull();
      expect(card.querySelector(`[data-identity-icon="${rank.icon}"]`)).toBeInTheDocument();
      const xpRange = card.querySelector("[data-rank-xp-range]");
      expect(xpRange).toBeInTheDocument();
      const normalizedRange = xpRange!.textContent!.replace(/[.,]/g, "");
      expect(normalizedRange).toContain(String(rank.minXp));
      expect(normalizedRange).toContain(rank.maxXp === null ? "∞ XP" : `${rank.maxXp} XP`);
    }

    const compactSection = screen.getByRole("heading", { name: "Compact user cards" }).closest("section")!;
    const profileSection = screen.getByRole("heading", { name: "Profile rank cards" }).closest("section")!;
    expect(within(compactSection).getAllByRole("article")).toHaveLength(10);
    expect(compactSection).not.toHaveTextContent(/Lv\.|XP/);
    expect(within(profileSection).getAllByRole("article")).toHaveLength(10);
    expect(profileSection).toHaveTextContent("6,580 XP to Beacon Keeper");
    expect(levelSection).not.toHaveTextContent(/Lv\./);

    const staffSection = screen.getByRole("heading", { name: /Staff · unique identity/ }).closest("section")!;
    expect(within(staffSection).getAllByRole("article")).toHaveLength(4);
    expect(staffSection).not.toHaveTextContent(/Lv\.|XP/);

    const supporterSection = screen.getByRole("heading", { name: /Supporter badges/ }).closest("section")!;
    expect(within(supporterSection).getAllByRole("article")).toHaveLength(3);
    expect(within(supporterSection).getByText("Support does not change XP, permissions, or expertise.")).toBeVisible();
    expect(within(supporterSection).getByText("Deck Explorer")).toBeVisible();
    expect(within(supporterSection).getByText("Signal Hunter")).toBeVisible();
    expect(within(supporterSection).getByText("Beacon Keeper")).toBeVisible();
    expect(supporterSection).not.toHaveTextContent(/Lv\./);
  });

  test("uses Vietnamese rank titles when the active locale is Vietnamese", () => {
    render(<I18nProvider initialLocale="vi"><IdentityGalleryRoute /></I18nProvider>);
    expect(screen.getAllByText("Tân binh cập cảng").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thợ săn tín hiệu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Huyền thoại đại dương").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đô đốc Hạm đội").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tư lệnh Hạm đội").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cảng vụ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ban Vận hành CrewPort").length).toBeGreaterThan(0);
    expect(screen.queryByText("Fleet Commander")).toBeNull();
    expect(screen.queryByText(/Lv\./)).toBeNull();
  });
});
