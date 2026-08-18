# Seafarer Port Knowledge Platform — Frontend Prototype

Milestone hiện tại: **F1.5 — Domain Alignment before F2**. Repository có prototype Foundation chạy được và đã căn chỉnh domain/read-model theo terminal/gate access, emergency contacts và welfare provider/service để chuẩn bị cho Home/Search F2 và Port Hub F3.

## Chạy local

Yêu cầu Node.js `>=22.22.0`. Trên máy Windows hiện tại, dùng `npm.cmd` vì PowerShell chặn `npm.ps1`.

```powershell
npm.cmd install
npm.cmd run dev
```

Mở URL Vite in ra terminal, mặc định là `http://localhost:5173`.

Các lệnh kiểm tra:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run check:bundle
npm.cmd run check
```

`npm.cmd run preview` phục vụ production build sau khi chạy `build`.

## Kiến trúc F1

```text
App shell / providers / declarative router
                │
                ▼
      Feature controller + pure rules
                │
                ▼
         Repository contracts
                │
        ┌───────┴────────┐
        ▼                ▼
  Mock adapters    Storage adapters
        │
        ▼
  Typed mock fixtures
```

- Presentation components chỉ nhận typed props; architecture tests ngăn import `services` hoặc `data/mock`.
- `PortHubReadModel` tổng hợp knowledge items, không mô phỏng Port Hub như một entity vật lý.
- Search và trust mapping nằm trong pure service/use-case. Planner, eSIM compare, community writes và Offline Pack mới có typed contracts; adapter F1 trả lỗi `milestone-unavailable` thay vì khóa sớm business rules F4–F6.
- Preferences đi qua browser-storage adapter; Offline Pack dùng empty-state adapter, chưa có persistence, Service Worker hoặc PWA.
- VI và lightweight search index nằm trong entry; EN chỉ tải khi chuyển ngôn ngữ. Mỗi mock port detail được code-split và chỉ tải khi người review chủ động mở preview chi tiết.

## F1.5 domain alignment

F1.5 chưa triển khai UI sản phẩm mới. Mục tiêu là khóa đúng nền dữ liệu trước khi xây F2/F3:

- `TerminalPlaceAccess` tách cách đi, thời gian, taxi fare, walking safety và terminal/gate context khỏi `Place`.
- `EmergencyContact` là thực thể riêng, không bị mô hình hóa như `Place` hoặc service card y tế.
- `WelfareProvider` và `WelfareService` hỗ trợ cả physical centre, ship visit và remote support.
- `DataStatusTag` lưu các facet như `foreign-card-confirmed`, `pickup-confirmed`, `emergency-contact-official`, tách khỏi nhãn trust ngắn dùng trong UI.
- Mock scenarios hiện có cả trusted/full, needs confirmation/gap và terminal-specific conflict để review các trạng thái khó.

## Foundation preview

Route `/` là trang kiểm chứng F1/F1.5, không phải Home của F2. Trang thể hiện:

- Responsive shell, skip link, language switch và ba mode Standard/Data Saver/Ultra Lite.
- Search gọi `PortRepository` với Singapore, Busan và Port Klang; UI không đọc fixture trực tiếp.
- Mười component nền tảng: SearchBox, PortResultCard, TrustStatus, CriticalInfoStrip, QuickBrief, ServiceCard, ActionBar, EmptyState, Skeleton và OfflineBanner.
- Trust states official, community confirmed, needs confirmation, conflicting và unknown.
- Loading, empty, retry, offline và bandwidth-state primitives để các milestone sau tái sử dụng.

Responsive behavior được định nghĩa mobile-first: header/control xếp dọc và card một cột ở màn hình nhỏ; từ `48rem` chuyển sang header ngang và card grid. Đã kiểm tra Chromium ở `390×844` và `1280×900`, không có horizontal overflow. Ultra Lite bỏ shadow/decorative symbols, không có ảnh, custom font hay animation.

## Mock scenarios

| Scenario | Cảng | Mục đích |
|---|---|---|
| Trusted | Singapore | Dữ liệu đầy đủ, nguồn chính thức/cộng đồng xác nhận |
| Needs confirmation | Busan | Thiếu dữ liệu và cần thêm xác nhận |
| Conflict | Port Klang | Báo cáo mâu thuẫn và cảnh báo theo terminal |

Tên cảng vẫn là sample của prototype; Decision D-506 chưa chuyển sang `LOCKED`.

Ngưỡng `MIN_COMMUNITY_CONFIRMATIONS = 2` chỉ là giả định hiển thị có tên, có reason code và có test trong prototype; nó không khóa policy trust của sản phẩm. Terminal/gate access hiện đã có trong mock read model bằng `TerminalPlaceAccess`; lọc nội dung đầy đủ theo terminal vẫn thuộc review gate F3.

## Performance budget

Production build F1 gần nhất trước F1.5:

- First-screen initial: `88,138 B gzip`, gồm HTML + CSS + JS + lightweight port search index trong 3 request.
- First-screen JavaScript: `83,108 B gzip`.
- Optional chunks: EN `1,031 B`; chi tiết Singapore `2,238 B`, Busan `1,726 B`, Port Klang `1,934 B` gzip, cộng shared chunks tải theo nhu cầu.
- Hard gate: initial `<500,000 B gzip`; mục tiêu nội bộ `<200 KB gzip`.

`scripts/check-bundle.mjs` đọc Vite manifest và cộng static entry graph. Milestone sau có thể khai báo thêm dynamic entry bắt buộc trước khi first screen hữu dụng bằng `BUNDLE_FIRST_SCREEN_DYNAMIC_ENTRIES`.

## Phạm vi chưa triển khai

F1.5 không triển khai Home/Search Results F2, Port Hub F3, Shore Planner UI F4, eSIM Compare UI F5, account/contribution F6 hoặc quality gate F7. Các route tương lai hiện đi vào trạng thái “milestone sau” để không giả vờ chức năng đã tồn tại.
