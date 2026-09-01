import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { I18nProvider } from "../../i18n";
import { RANK_ARTWORK, RANK_AVATAR_GEOMETRY, STAFF_ARTWORK, STAFF_AVATAR_GEOMETRY, SUPPORTER_ARTWORK } from "./identity-artwork";
import { RankAvatarFrame, RankCard, RankPopover, StaffAvatarFrame, SupporterBadge, UserIdentity } from "./UserRankIdentity";
import { STAFF_TITLES, USER_RANKS, resolveUserRank } from "./user-rank";

describe("CrewPort identity components", () => {
  afterEach(cleanup);

  test("keeps avatar initials behind all ten unique rank frames", () => {
    const { container } = render(<I18nProvider initialLocale="vi"><div>{USER_RANKS.map((definition) => <UserIdentity alias="CaptainSea" key={definition.level} rank={resolveUserRank(definition.minXp)} />)}</div></I18nProvider>);
    expect(container.querySelectorAll('[data-frame-kind="rank"]')).toHaveLength(10);
    expect(container.querySelectorAll('[data-rank-username="true"]')).toHaveLength(10);
    expect(new Set(Array.from(container.querySelectorAll('[data-rank-username="true"]')).map((node) => node.getAttribute("data-rank-level"))).size).toBe(10);
    expect(new Set(Array.from(container.querySelectorAll("[data-identity-icon]")).map((node) => node.getAttribute("data-identity-icon"))).size).toBe(10);
    expect(screen.getAllByText("C")).toHaveLength(10);
    const artwork = Array.from(container.querySelectorAll('img[src*="rank-lv"]'));
    expect(artwork).toHaveLength(10);
    expect(artwork.every((image) => image.getAttribute("alt") === "")).toBe(true);
    expect(artwork.every((image) => image.getAttribute("srcset")?.includes("320w"))).toBe(true);
    expect(container).not.toHaveTextContent(/Lv\./);
    for (const rank of USER_RANKS) expect(container).not.toHaveTextContent(rank.shortTag);
  });

  test.each(Object.keys(STAFF_TITLES) as (keyof typeof STAFF_TITLES)[])("renders %s staff identity without Level or XP", (staffTitle) => {
    const { container } = render(<I18nProvider initialLocale="vi"><UserIdentity alias="CrewPort staff" staffTitle={staffTitle} rank={resolveUserRank(18_420)} /></I18nProvider>);
    expect(screen.getByText(STAFF_TITLES[staffTitle].name)).toBeVisible();
    expect(screen.queryByText(/Lv\./)).toBeNull();
    expect(screen.queryByText(/XP/)).toBeNull();
    expect(container.querySelector(`[data-staff-title="${staffTitle}"]`)).toBeVisible();
  });

  test("renders supporter recognition beside a member rank", async () => {
    render(<I18nProvider initialLocale="en"><UserIdentity alias="CaptainSea" rank={resolveUserRank(100)} supporterTier="gold" /></I18nProvider>);
    expect(await screen.findByText("Deck Explorer")).toBeVisible();
    expect(screen.getByText("CaptainSea")).toHaveAttribute("data-rank-level", "1");
    expect(screen.queryByText(/Lv\.|DECK EXPLORER/)).toBeNull();
    expect(screen.getByText("GOLD")).toBeVisible();
  });

  test("localizes member rank titles and next-rank progress without translating usernames", async () => {
    const rank = resolveUserRank(18_420);
    const vi = render(<I18nProvider initialLocale="vi"><UserIdentity alias="CaptainSea" rank={rank} compact={false} showProgress /></I18nProvider>);
    expect(screen.getByText("CaptainSea")).toBeVisible();
    expect(screen.getByText("Tiên phong đại dương")).toBeVisible();
    expect(screen.getByText("6.580 XP để đạt Người giữ hải đăng")).toBeVisible();
    vi.unmount();

    render(<I18nProvider initialLocale="en"><RankCard alias="CaptainSea" rank={resolveUserRank(3_000)} /></I18nProvider>);
    expect(await screen.findByText("Signal Hunter")).toBeVisible();
    expect(screen.getByText("CaptainSea")).toHaveAttribute("data-rank-level", "5");
    expect(screen.queryByText("Thợ săn tín hiệu")).toBeNull();
  });

  test("opens rank details by click and closes with Escape", async () => {
    render(<I18nProvider initialLocale="en"><RankPopover alias="CaptainSea" rank={resolveUserRank(18_420)} /></I18nProvider>);
    const trigger = await screen.findByRole("button", { name: /Ocean Vanguard/ });
    expect(trigger).toHaveTextContent("CaptainSea");
    expect(trigger).not.toHaveTextContent(/Lv\./);
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: /Ocean Vanguard rank details/ })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("exposes all staff and supporter icons as decorative SVG", () => {
    const { container } = render(<div>{Object.keys(STAFF_TITLES).map((title) => <StaffAvatarFrame key={title} alias={title} staffTitle={title as keyof typeof STAFF_TITLES} />)}<SupporterBadge tier="bronze"/><SupporterBadge tier="silver"/><SupporterBadge tier="gold"/></div>);
    expect(container.querySelectorAll("svg[aria-hidden=true]")).toHaveLength(7);
  });

  test("publishes complete normalized artwork geometry", () => {
    expect(Object.keys(RANK_ARTWORK)).toHaveLength(10);
    expect(Object.keys(STAFF_ARTWORK)).toHaveLength(4);
    expect(Object.keys(SUPPORTER_ARTWORK)).toHaveLength(3);
    expect(Object.values(RANK_ARTWORK).every(({ geometry }) => geometry === RANK_AVATAR_GEOMETRY)).toBe(true);
    expect(RANK_AVATAR_GEOMETRY).toEqual({ canvas: 320, centerX: 160, centerY: 148, diameter: 196 });
    expect(Object.values(STAFF_ARTWORK).every(({ geometry }) => geometry === STAFF_AVATAR_GEOMETRY)).toBe(true);
    expect(STAFF_AVATAR_GEOMETRY.diameter).toBe(176);
  });

  test("selects responsive artwork by bandwidth mode and emits no WebP request in Ultra Lite", () => {
    const rank = resolveUserRank(18_420);
    const standard = render(<RankAvatarFrame alias="CaptainSea" avatarUrl="avatar.webp" rank={rank} bandwidthMode="standard" />);
    expect(standard.container.querySelector('[data-identity-artwork="frame"]')).toHaveAttribute("srcset", expect.stringContaining("320w"));
    standard.unmount();

    const saver = render(<RankAvatarFrame alias="CaptainSea" avatarUrl="avatar.webp" rank={rank} bandwidthMode="dataSaver" />);
    expect(saver.container.querySelector('[data-identity-artwork="frame"]')).not.toHaveAttribute("srcset");
    expect(saver.container.querySelector('[data-identity-artwork="frame"]')?.getAttribute("src")).toContain("160");
    saver.unmount();

    const ultra = render(<RankAvatarFrame alias="CaptainSea" avatarUrl="avatar.webp" rank={rank} bandwidthMode="ultraLite" />);
    expect(ultra.container.querySelectorAll("img")).toHaveLength(0);
    expect(ultra.container.querySelector('[data-artwork="false"] svg')).toBeInTheDocument();
  });
});
