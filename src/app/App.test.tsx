import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "./App";
import { MockPortRepository } from "../services/mock/mock-port-repository";

describe("Application shell and demo routing", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    delete document.documentElement.dataset.bandwidthMode;
    delete document.documentElement.dataset.appearanceMode;
    delete document.documentElement.dataset.theme;
  });

  test("opens CrewPort Home/Search at the root", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "Tìm nhanh trước khi lên bờ",
        level: 1,
      }),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/");
    expect(document.getElementById("main-content")).toHaveClass(
      "content-container",
    );
    expect(screen.queryByTestId("app-version")).toBeNull();
    const brand = screen.getByRole("link", {
      name: "CrewPort — Ghi chú cảng cho thuyền viên",
    });
    expect(brand.querySelector("img")).toHaveAttribute(
      "src",
      "/brand/crewport-anchor.png",
    );
    expect(brand).toHaveTextContent("CREWPORT");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      document.querySelector('[data-navigation="desktop"]')?.querySelectorAll("a, button"),
    ).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Đăng nhập bằng Google" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Tìm cảng/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Busan" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Busan New Port" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Pasir Panjang" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Westports" })).toBeVisible();
  });

  test("keeps a stored light appearance even though new users default to dark", async () => {
    window.localStorage.setItem(
      "seafarer.preferences.v1",
      JSON.stringify({
        locale: "vi",
        appearanceMode: "light",
        bandwidthMode: "standard",
        bandwidthModeWasUserSelected: false,
      }),
    );

    render(<App />);

    await screen.findByRole("heading", {
      name: "Tìm nhanh trước khi lên bờ",
    });
    expect(document.documentElement.dataset.appearanceMode).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  test("searches by port and opens a matching Port Notes result", async () => {
    const user = userEvent.setup();
    const searchSpy = vi.spyOn(MockPortRepository.prototype, "search");
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Busan" }));

    expect(window.location.pathname).toBe("/search");
    expect(window.location.search).toBe("?q=Busan");
    const resultLink = await screen.findByRole("link", {
      name: "Mở ghi chú cảng: Port of Busan",
    });
    expect(resultLink).toHaveAttribute("href", "/ports/busan");
    expect(screen.getByText("Busan · South Korea · KRPUS")).toBeVisible();
    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ query: "Busan", limit: 20 }),
      expect.anything(),
    );

    await user.click(resultLink);

    expect(window.location.pathname).toBe("/ports/busan");
    expect(
      await screen.findByRole("heading", { name: "Busan New Port", level: 1 }),
    ).toBeVisible();
  });

  test("keeps Search active and explains an empty result", async () => {
    window.history.replaceState({}, "", "/search?q=unknown-port");
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: 'Chưa có dữ liệu phù hợp với “unknown-port”',
      }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tìm cảng", level: 1 })).toBeVisible();
    expect(
      screen.getByText("Tìm theo tên cảng, terminal, gate hoặc UN/LOCODE."),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Ô tìm cảng" }),
    ).toHaveAttribute("placeholder", "VD: SGSIN, Busan, Crew Gate...");
    expect(screen.getByRole("button", { name: "Tìm cảng" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Xóa tìm kiếm" })).toBeVisible();
    expect(screen.queryByText("Tìm trước")).toBeNull();
    expect(screen.getByText("Tên cảng")).toBeVisible();
    expect(screen.getByText("UN/LOCODE")).toBeVisible();
    expect(
      screen
        .getAllByRole("link", { name: "Tìm cảng" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });

  test("shows terminal match context on the Search route", async () => {
    window.history.replaceState({}, "", "/search?q=Pasir%20Panjang");
    render(<App />);

    expect(
      await screen.findByText("Khớp terminal: Pasir Panjang Terminal"),
    ).toBeVisible();
    expect(screen.getByText("Terminal: Pasir Panjang Terminal")).toBeVisible();
  });

  test("switches locale, appearance, and bandwidth independently", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      await screen.findByRole("combobox", { name: /Ngôn ngữ/ }),
      "en",
    );

    expect(
      await screen.findByRole("heading", { name: "Find it fast before going ashore" }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en");

    await user.click(
      screen.getByRole("switch", { name: "Appearance: Dark" }),
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    await user.click(
      screen.getByRole("switch", { name: "Appearance: Light" }),
    );
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    expect(document.documentElement.dataset.bandwidthMode).toBe("standard");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Data mode" }),
      "dataSaver",
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.bandwidthMode).toBe("dataSaver");
    });

    expect(window.localStorage.getItem("seafarer.preferences.v1")).toContain(
      '"bandwidthMode":"dataSaver"',
    );
    expect(window.localStorage.getItem("seafarer.preferences.v1")).toContain(
      '"appearanceMode":"dark"',
    );
  });

  test("keeps persisted system appearance without showing a system control", async () => {
    let changeListener: ((event: { matches: boolean }) => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: (
          type: string,
          listener: (event: { matches: boolean }) => void,
        ) => {
          if (type === "change") {
            changeListener = listener;
          }
        },
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      })),
    );
    window.localStorage.setItem(
      "seafarer.preferences.v1",
      JSON.stringify({
        locale: "vi",
        appearanceMode: "system",
        bandwidthMode: "standard",
        bandwidthModeWasUserSelected: false,
      }),
    );
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.appearanceMode).toBe("system");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    expect(screen.queryByRole("button", { name: "Theo hệ thống" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Use system setting" })).toBeNull();

    changeListener?.({ matches: false });
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  test("groups mobile display settings and restores focus after Escape", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 1 });

    const settingsButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Mở tùy chọn hiển thị"]',
    );
    expect(settingsButton).not.toBeNull();
    fireEvent.click(settingsButton!);

    await waitFor(() => {
      expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    });
    const settingsPanel = await waitFor(() => {
      const panel = document.getElementById("mobile-display-settings");
      expect(panel).not.toBeNull();
      return panel as HTMLElement;
    });
    expect(
      within(settingsPanel!).getByRole("switch", {
        name: "Giao diện: Tối",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(settingsPanel!).getByRole("combobox", {
        name: "Ngôn ngữ",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(settingsPanel!).getByRole("combobox", {
        name: "Chế độ dữ liệu",
        hidden: true,
      }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(document.getElementById("mobile-display-settings")).toBeNull();
      expect(settingsButton).toHaveFocus();
    });
  });

  test("reports preference storage failures and restores the prior mode", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    render(<App />);

    const bandwidthSelect = await screen.findByRole("combobox", {
      name: "Chế độ dữ liệu",
    });
    await user.selectOptions(
      bandwidthSelect,
      "dataSaver",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể áp dụng tùy chọn. Vui lòng thử lại.",
    );
    expect(bandwidthSelect).toHaveValue("standard");
  });
});
