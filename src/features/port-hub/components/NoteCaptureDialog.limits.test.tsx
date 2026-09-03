import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { I18nProvider } from "../../../i18n";
import { NoteCaptureDialog, type NoteCapturePreview } from "./NoteCaptureDialog";

function renderDialog() {
  const onSubmit = vi.fn<(preview: NoteCapturePreview) => Promise<void>>();
  const result = render(
    <I18nProvider initialLocale="vi">
      <NoteCaptureDialog
        open
        portName="Busan New Port"
        terminal="Terminal 1"
        gate="Crew Gate"
        onClose={vi.fn<() => void>()}
        onSubmit={onSubmit}
      />
    </I18nProvider>,
  );
  return { ...result, onSubmit };
}

describe("NoteCaptureDialog field limits", () => {
  afterEach(cleanup);

  test("uses the central limits and only reveals guidance near the limit", async () => {
    const user = userEvent.setup();
    const { container } = renderDialog();

    const mainNote = container.querySelector<HTMLTextAreaElement>('textarea[maxlength="800"]');
    expect(mainNote).not.toBeNull();
    fireEvent.change(mainNote!, { target: { value: "a".repeat(180) } });
    expect(screen.queryByText("180 / 800")).toBeNull();
    fireEvent.change(mainNote!, { target: { value: "a".repeat(181) } });
    expect(screen.getByText("181 / 800")).toBeVisible();
    expect(screen.getByText("Nội dung ngắn gọn sẽ dễ đọc hơn.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Đi bờ & Taxi" }));
    await user.click(screen.getByRole("button", { name: "Cần tránh" }));
    const avoid = container.querySelector<HTMLTextAreaElement>('textarea[maxlength="180"]');
    expect(avoid).not.toBeNull();
    fireEvent.change(avoid!, { target: { value: "b".repeat(91) } });
    expect(screen.getByText("91 / 180")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Giá" }));
    expect(container.querySelector('input[maxlength="80"]')).not.toBeNull();
  });

  test("uses a compact textarea for place and keeps counters hidden for short input", async () => {
    const user = userEvent.setup();
    const { container } = renderDialog();

    await user.click(screen.getByRole("button", { name: /Thêm chi tiết nếu nhớ/ }));
    const place = container.querySelector<HTMLTextAreaElement>('#note-place');
    expect(place).not.toBeNull();
    expect(place).toHaveAttribute("maxlength", "180");
    fireEvent.change(place!, { target: { value: "Terminal 1 taxi desk" } });
    expect(screen.queryByText("19 / 180")).toBeNull();
  });
});
