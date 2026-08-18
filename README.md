# Seafarer Port Knowledge Platform — Frontend Prototype

Milestone hiện tại: **Seafarer Port Notes pivot**. Repository giữ nguyên Foundation ở `/`, dùng domain/read-model F1.5 và refactor route `/ports/:portSlug` thành giao diện ghi chú cộng đồng, đơn giản cho thuyền viên bận rộn.

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
- `PortNote` là lớp note có topic, visibility, payload typed, moderation state, confirmation/usefulness và trust; Port Notes vẫn là read model, không phải bảng vật lý đơn.
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

## Seafarer Port Notes pivot

Port Notes and the shared application shell use a responsive content width up to `96rem`; Ultra Lite keeps the main workspace text-first and single-column.

Mở trực tiếp một trong các route mẫu:

- `/ports/busan`
- `/ports/singapore`
- `/ports/port-klang`

Port Notes là giao diện mobile-first community-first theo thứ tự: Port Snapshot, Best Internet/eSIM Deal, need-based action tiles, Top Notes from Seafarers, topic previews và Data Trust. Snapshot hiển thị port, terminal/gate, shore leave, Internet, transport, số notes và pending confirmations. Quick Notes nằm ở right rail trên desktop và chuyển xuống sau hero trên mobile. Top notes có topic, nội dung ngắn, terminal/gate context, confirmation/usefulness và trust status; không dùng rating sao.

Các action tile chính là Compare eSIM, Physical SIM Notes, Taxi / Grab / Uber, Food & Supplies, Places to Visit, Seaman Club và Write a Note. Chúng là navigation intent/placeholder khi backend chưa tồn tại; prototype không mua eSIM, booking, payment, marketplace hoặc đăng public contact cá nhân chưa moderation.

Desktop từ `64rem` dùng sidebar `220px`, hero Snapshot + Quick Notes right rail và nội dung linh hoạt; dưới `64rem` dùng compact navigation, action tiles hai cột và notes/topic cards một cột hoặc hai cột tùy chiều rộng. Standard có minh họa CSS nhẹ; Data Saver ẩn media trang trí, Ultra Lite giữ Snapshot/Deal/Top Notes/Write Note và bỏ shadow/ký hiệu không thiết yếu.

Search, save port, xem note, confirm, action tiles và topic actions có phản hồi placeholder rõ ràng. Route có loading, retry/error và not-found state; Port Klang dùng để kiểm tra notes mâu thuẫn theo terminal. Emergency/Return shortcuts chỉ hiển thị logistics, liên hệ và cảnh báo xác nhận.

## Mock scenarios

| Scenario | Cảng | Mục đích |
|---|---|---|
| Trusted | Singapore | Dữ liệu đầy đủ, nguồn chính thức/cộng đồng xác nhận |
| Needs confirmation | Busan | Thiếu dữ liệu và cần thêm xác nhận |
| Conflict | Port Klang | Báo cáo mâu thuẫn và cảnh báo theo terminal |

Tên cảng vẫn là sample của prototype; Decision D-506 chưa chuyển sang `LOCKED`.

Ngưỡng `MIN_COMMUNITY_CONFIRMATIONS = 2` chỉ là giả định hiển thị có tên, có reason code và có test trong prototype; nó không khóa policy trust của sản phẩm. Notes hiện là mock public notes đã approved; write/moderation backend chưa có. Terminal/gate access vẫn dùng `TerminalPlaceAccess` thay vì nhồi vào `Place`.

## Performance budget

Production build Port Notes hiện tại:

- Initial entry: `93,659 B gzip`, gồm HTML + CSS + JS trong 3 request.
- Initial JavaScript: `88,617 B gzip`.
- Lazy Port Notes: `6,463 B gzip`; mock Busan `2,709 B`, Singapore `3,457 B`, Port Klang `2,956 B`, cộng shared chunks tải theo nhu cầu.
- Hard gate: initial `<500,000 B gzip`; mục tiêu nội bộ `<200 KB gzip`.

`scripts/check-bundle.mjs` đọc Vite manifest và cộng static entry graph. Milestone sau có thể khai báo thêm dynamic entry bắt buộc trước khi first screen hữu dụng bằng `BUNDLE_FIRST_SCREEN_DYNAMIC_ENTRIES`.

## Phạm vi chưa triển khai

Branch pivot không triển khai Home/Search Results F2, backend/auth, real note submission/moderation, eSIM purchase, booking, payment, marketplace, full social feed/chat, map SDK, image gallery hoặc medical advice. Các hành động tương lai trả trạng thái placeholder thay vì giả vờ chức năng đã tồn tại.
