# CODEX PROMPT — FRONTEND PROTOTYPE v1.0

## Vai trò
Bạn là Principal Frontend Architect, Product UI Engineer và Performance Specialist. Nhiệm vụ là xây dựng prototype frontend mobile-first cho Seafarer Port Knowledge Platform dựa trên tài liệu nguồn trong thư mục `/docs`.

## Quy tắc bắt buộc trước khi code
1. Đọc toàn bộ các file sau nếu tồn tại:
   - `docs/00_MASTER_SPEC.md`
   - `docs/01_DECISION_REGISTER.md`
   - `docs/02_FRONTEND_PROTOTYPE_PROMPT.md`
   - `AGENTS.md`
2. Kiểm tra stack và cấu trúc repository hiện tại.
3. Không tự ý thay stack hoặc cài dependency nặng nếu chưa cần.
4. Không triển khai backend, crawler, database production, AI thật hoặc map embed.
5. Nếu yêu cầu và repository mâu thuẫn, ghi rõ mâu thuẫn trong báo cáo trước khi sửa code.
6. Sau mỗi milestone, dừng để review; không tự triển khai milestone tiếp theo.

## Mục tiêu prototype
Tạo vertical slice có thể chạy được, dùng mock data có cấu trúc, để Product Owner đánh giá:
- Thứ tự thông tin.
- Khả năng nắm thông tin cảng trong 30–60 giây.
- Trải nghiệm mobile.
- Chế độ Data Saver/Ultra Lite.
- Các trạng thái trust, empty, conflict và offline.

Prototype không phải sản phẩm production cuối.

## Nguyên tắc sản phẩm
- Search First.
- Knowledge First.
- Decision First.
- Trust First.
- Bandwidth First.
- Mobile First.
- Không nhúng bản đồ mặc định.
- Không autoplay/video/carousel.
- Không rating sao tổng thể cho Port, Restaurant, Medical hoặc Welfare.
- Không hiển thị timestamp cũ nổi bật; dùng trust status.

## Kiến trúc UI cần chuẩn bị
Tách rõ:
- `app/routes` hoặc routes tương đương.
- `features/search`
- `features/port-hub`
- `features/shore-planner`
- `features/connectivity`
- `features/community`
- `features/offline`
- `components/ui`
- `components/domain`
- `data/mock`
- `types`
- `services` hoặc repository interface cho mock data.

Không để component presentation gọi trực tiếp mock JSON. Tạo interface/service để sau này thay bằng API mà không viết lại UI.

## Các route/màn hình ưu tiên

### Milestone F0 — Audit và kế hoạch
- Kiểm tra repository.
- Đưa ra sơ đồ frontend architecture.
- Liệt kê dependency hiện có, dependency dự kiến và ảnh hưởng bundle.
- Đưa ra file tree dự kiến.
- Không code UI ở milestone này.
- Dừng để review.

### Milestone F1 — Foundation
- Design tokens tối thiểu: spacing, type scale, radius, border, status semantics.
- Responsive shell.
- Language switch placeholder VI/EN.
- Data Saver toggle.
- Ultra Lite mode.
- Mock data schema và typed interfaces.
- Reusable components tối thiểu:
  - SearchBox
  - PortResultCard
  - TrustStatus
  - CriticalInfoStrip
  - QuickBrief
  - ServiceCard
  - ActionBar
  - EmptyState
  - Skeleton
  - OfflineBanner
- Không thêm animation nặng.
- Dừng để review.

### Milestone F2 — Home và Search Results
Home:
- Search là trọng tâm.
- Continue/Recent/Favorites/Popular tối giản.
- Không hero image.
- Không banner quảng cáo.

Search Results:
- Tên cảng, quốc gia, terminal context.
- Trust status gọn.
- Hỗ trợ no-result và suggest-port empty state.
- Không dùng map.
- Dừng để review.

### Milestone F3 — Port Hub
Tabs:
- Overview
- Access
- Internet
- Services
- Community

Header:
- Port, country, terminal selector/context.
- CriticalInfoStrip nếu có.
- Quick Brief.
- ActionBar: Plan, Offline, Share, Report.

Overview:
- Decision summary.
- Weather placeholder nhỏ.
- Warning nếu có.
- Data health/trust chi tiết mở theo demand.

Access:
- Shore Leave.
- Documents.
- Terminal/Gate.
- Shuttle.
- Taxi range.
- Ride-hailing.
- Walking.
- Return to Ship.

Internet:
- Best option.
- Operator coverage.
- eSIM cards.
- Physical SIM.
- Wi-Fi.
- Hotspot.

Services:
- ATM/Currency.
- Shopping.
- Food.
- Medical.
- Welfare.
- Mỗi category tối đa ba card mặc định.

Community:
- Structured reviews.
- Quick confirmation.
- Suggest update.

Bắt buộc có data states: trusted, needs confirmation, conflicting, unknown.
Dừng để review.

### Milestone F4 — Shore Planner
Input dạng lựa chọn:
- Terminal/gate.
- Thời gian shore leave.
- Must-return time.
- Ngân sách.
- Số người.
- Walking limit.
- Nhu cầu.

Output:
- Timeline.
- Tổng thời gian.
- Cost range.
- Return buffer.
- Warning nếu không khả thi.
- Return to Ship Card.
- Không dùng AI thật; rule/mock calculation rõ ràng.
- Dừng để review.

### Milestone F5 — Multi-port eSIM Compare
- Chọn nhiều cảng/quốc gia.
- Data need, validity, hotspot, budget.
- Ba phương án:
  1. Cheapest.
  2. Simplest.
  3. Best coverage.
- Giải thích lý do, số lần cài eSIM, nước không được phủ.
- Không checkout hoặc bán trực tiếp.
- Dừng để review.

### Milestone F6 — Contribution và account states
- Login/Register UI cơ bản.
- Review form có cấu trúc.
- Quick confirmation.
- Suggest update.
- Report wrong info.
- Favorites/Offline Pack states.
- Không xây moderation backend.
- Dừng để review.

### Milestone F7 — Quality gate
- Keyboard navigation và focus states.
- Semantic HTML/ARIA phù hợp.
- Mobile widths phổ biến.
- Data Saver không tải ảnh.
- Ultra Lite chỉ text + icon tối thiểu.
- Bundle report.
- Lazy-load tab/content không cần thiết.
- Không có console errors.
- Dừng để review.

## Mock data
Tạo ít nhất ba Port scenario:
1. Port có dữ liệu đầy đủ/trusted.
2. Port thiếu nhiều dữ liệu/needs confirmation.
3. Port có conflicting reports và warning.

Dữ liệu phải được tách khỏi component và typed.

## Performance budget
- Initial transfer mục tiêu dưới 500 KB, không tính asset chỉ tải theo demand.
- Không image/font nặng nếu không cần.
- SVG/icon nhỏ.
- Lazy-load các tab không mở.
- Tránh dependency lớn cho chức năng đơn giản.
- Không gọi network giả lặp lại không cần thiết.

## Definition of Done mỗi milestone
- Code chạy được.
- Có README cập nhật cách chạy.
- Có ảnh chụp hoặc mô tả trạng thái chính.
- Có danh sách file thay đổi.
- Có kiểm tra responsive.
- Có ghi một dòng vào `PROJECT_LOG.md` theo quy tắc dự án.
- Không tự chuyển sang milestone tiếp theo.
