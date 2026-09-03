import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "../../i18n";
import { VerifiedConfirmationDialog } from "./VerifiedConfirmationDialog";

const mocks = vi.hoisted(() => ({
  uploadEvidence: vi.fn<() => Promise<string>>(),
  confirmNote: vi.fn<() => Promise<{ rewardedXp: number }>>(),
}));

vi.mock("../../app/providers", () => ({
  useServices: () => ({
    reputation: {
      uploadEvidence: mocks.uploadEvidence,
      confirmNote: mocks.confirmNote,
    },
  }),
}));

describe("VerifiedConfirmationDialog layout", () => {
  beforeEach(() => {
    localStorage.clear();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  });

  afterEach(cleanup);

  test.each([
    ["vi", "Tôi trực tiếp kiểm chứng", "Xác nhận này chỉ dành cho trải nghiệm thực tế của chính bạn."],
    ["en", "I verified it directly", "Use this confirmation only for your own real-world experience."],
  ] as const)("keeps the %s verification title and help in one flexible copy column", async (locale, title, help) => {
    const { container } = render(
      <I18nProvider initialLocale={locale}>
        <VerifiedConfirmationDialog noteId="note-1" open onClose={() => undefined} onSuccess={() => undefined} />
      </I18nProvider>,
    );

    const checkbox = await screen.findByRole("checkbox", { name: new RegExp(title) });
    const titleNode = await screen.findByText(title);
    const helpNode = await screen.findByText(help);
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(titleNode.parentElement).toBe(helpNode.parentElement);
    expect(titleNode.parentElement?.className).toContain("verificationCopy");
    expect(submit).toBeDisabled();

    fireEvent.click(checkbox);
    expect(submit).toBeEnabled();
  });

  test("uses a two-column option layout that cannot be narrowed by the help text", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/features/reputation/reputation.module.css"),
      "utf8",
    );

    expect(styles).toMatch(/\.verificationOption\s*\{[\s\S]*?grid-template-columns: auto minmax\(0, 1fr\);[\s\S]*?min-inline-size: 0;/u);
    expect(styles).toMatch(/\.verificationCopy\s*\{[\s\S]*?min-inline-size: 0;/u);
    expect(styles).toMatch(/\.verificationTitle,[\s\S]*?overflow-wrap: anywhere;/u);
    expect(styles).not.toContain('input[value="direct"]');
  });
});
