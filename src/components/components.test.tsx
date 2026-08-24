import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type Ref } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  ActionBar,
  CriticalInfoStrip,
  EmptyState,
  OfflineBanner,
  PortResultCard,
  QuickBrief,
  SearchBox,
  ServiceCard,
  Skeleton,
  TrustStatus,
  type SearchSuggestion,
} from '.';

function ControlledSearchBox({ inputRef }: { readonly inputRef: Ref<HTMLInputElement> }) {
  const [value, setValue] = useState('Singapore');

  return (
    <SearchBox
      value={value}
      onChange={setValue}
      onSubmit={() => undefined}
      label="Tìm cảng"
      placeholder="Tên cảng"
      submitLabel="Tìm"
      clearLabel="Xóa tìm kiếm"
      inputRef={inputRef}
    />
  );
}

describe('foundation components', () => {
  it('submits a normalized search query and exposes a clear control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string) => void>();
    const onSubmit = vi.fn<(value: string) => void>();

    render(
      <SearchBox
        value="  Singapore  "
        onChange={onChange}
        onSubmit={onSubmit}
        label="Tìm cảng"
        placeholder="Tên cảng"
        submitLabel="Tìm"
        clearLabel="Xóa tìm kiếm"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    expect(onSubmit).toHaveBeenCalledWith('Singapore');

    await user.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('returns focus to the controlled input after clearing it', async () => {
    const user = userEvent.setup();
    const inputRef = createRef<HTMLInputElement>();

    const view = render(<ControlledSearchBox inputRef={inputRef} />);
    const controlled = within(view.container);

    const clearButton = controlled.getByRole('button', {
      name: 'Xóa tìm kiếm',
    });
    clearButton.focus();
    expect(clearButton).toHaveFocus();

    await user.click(clearButton);

    expect(inputRef.current).toHaveValue('');
    expect(inputRef.current).toHaveFocus();
    expect(
      controlled.queryByRole('button', { name: 'Xóa tìm kiếm' }),
    ).not.toBeInTheDocument();
  });

  it('supports keyboard selection from port suggestions', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(suggestion: SearchSuggestion) => void>();

    render(
      <SearchBox
        value="Bu"
        onChange={() => undefined}
        onSubmit={() => undefined}
        label="Tìm cảng"
        placeholder="Tên cảng"
        submitLabel="Tìm"
        suggestions={[
          {
            id: 'port-busan',
            value: 'Busan',
            primary: 'Busan',
            secondary: 'South Korea · KRPUS',
          },
        ]}
        suggestionsLabel="Cảng phù hợp"
        onSuggestionSelect={onSelect}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Tìm cảng' });
    await user.click(input);
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'port-busan', value: 'Busan' }),
    );
  });

  it('renders a port result as a descriptive link with derived trust text', () => {
    render(
      <PortResultCard
        name="Singapore"
        country="Singapore"
        href="/ports/singapore"
        actionLabel="Mở cảng"
        terminalContext="Terminal PSA"
        trust={{ status: 'officialSource', label: 'Nguồn chính thức' }}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Mở cảng: Singapore' }),
    ).toHaveAttribute('href', '/ports/singapore');
    expect(screen.getByText('Nguồn chính thức')).toBeVisible();
    expect(screen.getByText('Terminal PSA')).toBeVisible();
  });

  it('keeps trust status understandable without relying on color', () => {
    render(
      <TrustStatus
        status="conflictingReports"
        label="Báo cáo mâu thuẫn"
        detail="Kiểm tra trước khi rời tàu"
      />,
    );

    expect(screen.getByText('Báo cáo mâu thuẫn')).toBeVisible();
    expect(screen.getByText('Kiểm tra trước khi rời tàu')).toBeVisible();
  });

  it('announces a critical information strip only when requested', () => {
    render(
      <CriticalInfoStrip title="Cảnh báo" severity="critical" announce>
        Cổng về tàu đóng sớm.
      </CriticalInfoStrip>,
    );

    expect(screen.getByRole('alert')).toHaveAccessibleName('Cảnh báo');
  });

  it('uses definition semantics for a quick brief', () => {
    render(
      <QuickBrief
        heading="Tóm tắt nhanh"
        items={[{ id: 'access', label: 'Lên bờ', value: 'Được phép' }]}
      />,
    );

    const list = screen.getByRole('definition').closest('dl');
    expect(list).not.toBeNull();
    expect(within(list!).getByText('Lên bờ')).toBeVisible();
    expect(within(list!).getByText('Được phép')).toBeVisible();
  });

  it('shows the explicit reason behind a service recommendation', () => {
    render(
      <ServiceCard
        category="Internet"
        name="Gói eSIM khu vực"
        summary="Dùng tại ba cảng"
        reason={{ label: 'Lý do đề xuất', text: 'Chỉ cần cài một lần' }}
      />,
    );

    expect(screen.getByText('Lý do đề xuất:')).toBeVisible();
    expect(screen.getByText(/Chỉ cần cài một lần/)).toBeVisible();
  });

  it('supports keyboard-ready action buttons', async () => {
    const user = userEvent.setup();
    const onPlan = vi.fn<() => void>();

    render(
      <ActionBar
        label="Hành động cảng"
        actions={[{ id: 'plan', label: 'Lập kế hoạch', onClick: onPlan }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Lập kế hoạch' }));
    expect(onPlan).toHaveBeenCalledOnce();
  });

  it('renders empty, loading, and connectivity states with status text', () => {
    render(
      <>
        <EmptyState heading="Chưa có dữ liệu" description="Hãy thử lại sau." />
        <Skeleton label="Đang tải dữ liệu cảng" variant="card" />
        <OfflineBanner
          mode="offline"
          title="Bạn đang ngoại tuyến"
          message="Đang hiển thị dữ liệu đã lưu."
        />
      </>,
    );

    expect(screen.getByRole('heading', { name: 'Chưa có dữ liệu' })).toBeVisible();
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getByText('Đang tải dữ liệu cảng')).toBeInTheDocument();
    expect(screen.getByText('Bạn đang ngoại tuyến')).toBeVisible();
  });
});
