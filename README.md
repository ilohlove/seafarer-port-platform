# Seafarer Port Knowledge Platform — Frontend Prototype

Milestone hiện tại: **F3 — Port Hub Visual Prototype**. Repository giữ nguyên Foundation ở `/`, dùng domain/read-model F1.5 và bổ sung dashboard Port Hub theo terminal tại `/ports/:portSlug`. F2 Home/Search không nằm trong branch này.

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

## F3 Port Hub visual prototype

Mở trực tiếp một trong các route mẫu:

- `/ports/busan`
- `/ports/singapore`
- `/ports/port-klang`

Port Hub là dashboard mobile-first phục vụ quyết định lên bờ, gồm port/terminal identity, Quick Brief, sáu decision strips, tám overview cards, Data Trust và Return to Ship. Trust status luôn đi cùng dữ kiện; emergency chỉ hiển thị logistics và liên hệ chính thức, không đưa ra tư vấn y tế.

Desktop từ `64rem` dùng sidebar `220px`, nội dung linh hoạt và panel Return to Ship `280–304px`. Màn hình dưới `48rem` dùng compact top navigation, card một cột và đưa Return to Ship xuống sau nội dung chính. Standard có minh họa CSS nhẹ; Data Saver và Ultra Lite không tải media, còn Ultra Lite bỏ thêm shadow và ký hiệu trang trí.

Các nút Search, đổi terminal, lưu cảng, tab ngoài Overview và Shore Leave Planner là placeholder có phản hồi rõ ràng. Chúng không giả lập F2, F4 hoặc backend chưa tồn tại. Route có loading, retry/error và not-found state; Port Klang dùng để kiểm tra dữ liệu mâu thuẫn theo terminal.

## Mock scenarios

| Scenario | Cảng | Mục đích |
|---|---|---|
| Trusted | Singapore | Dữ liệu đầy đủ, nguồn chính thức/cộng đồng xác nhận |
| Needs confirmation | Busan | Thiếu dữ liệu và cần thêm xác nhận |
| Conflict | Port Klang | Báo cáo mâu thuẫn và cảnh báo theo terminal |

Tên cảng vẫn là sample của prototype; Decision D-506 chưa chuyển sang `LOCKED`.

Ngưỡng `MIN_COMMUNITY_CONFIRMATIONS = 2` chỉ là giả định hiển thị có tên, có reason code và có test trong prototype; nó không khóa policy trust của sản phẩm. Terminal/gate access hiện đã có trong mock read model bằng `TerminalPlaceAccess`; lọc nội dung đầy đủ theo terminal vẫn thuộc review gate F3.

## Performance budget

Production build F3 hiện tại:

- Initial entry: `91,421 B gzip`, gồm HTML + CSS + JS trong 3 request.
- Initial JavaScript: `86,379 B gzip`.
- Lazy Port Hub: `6,214 B gzip`; mock Busan `2,115 B`, Singapore `2,930 B`, Port Klang `2,541 B`, cộng shared chunks tải theo nhu cầu.
- Hard gate: initial `<500,000 B gzip`; mục tiêu nội bộ `<200 KB gzip`.

`scripts/check-bundle.mjs` đọc Vite manifest và cộng static entry graph. Milestone sau có thể khai báo thêm dynamic entry bắt buộc trước khi first screen hữu dụng bằng `BUNDLE_FIRST_SCREEN_DYNAMIC_ENTRIES`.

## Phạm vi chưa triển khai

Branch F3 không triển khai Home/Search Results F2, Shore Planner UI F4, eSIM Compare UI F5, account/contribution F6, backend, auth, payment, map SDK hoặc image gallery. Các hành động tương lai trả trạng thái placeholder thay vì giả vờ chức năng đã tồn tại.
