# SEAFARER PORT KNOWLEDGE PLATFORM — MASTER SPECIFICATION v1.0

## 0. Mục đích tài liệu

Tài liệu này là nguồn sự thật chính thức (single source of truth) cho dự án. Mọi thiết kế, code, dữ liệu, API và quyết định sản phẩm phải bám theo tài liệu này. Khi có xung đột giữa prompt ngắn và tài liệu này, tài liệu này được ưu tiên, trừ khi Product Owner ghi rõ thay đổi phạm vi.

## 1. Tầm nhìn và sứ mệnh

### Tầm nhìn
Xây dựng nền tảng tri thức cảng toàn cầu dành cho thuyền viên, cung cấp thông tin ngắn gọn, chính xác, thực dụng và có thể sử dụng trong điều kiện Internet chậm, đắt hoặc không ổn định.

### Sứ mệnh
Giúp thuyền viên hiểu cảng sắp đến trong 30–60 giây mà không phải tìm kiếm, đối chiếu và tổng hợp thông tin từ nhiều website khác nhau.

### Giá trị khác biệt
- Tri thức theo từng cảng, terminal, gate và bối cảnh thực tế.
- Dữ liệu nền đã được crawl/chuẩn hóa kết hợp review và xác nhận của thuyền viên.
- Thông tin ưu tiên cho quyết định lên bờ, kết nối, mua sắm, ăn uống, y tế và quay lại tàu.
- Text-first, map-on-demand, image-on-demand, bandwidth-first.

## 2. Người dùng và lộ trình thị trường

### MVP
- Đối tượng chính: thuyền viên Việt Nam.
- Ngôn ngữ: tiếng Việt và tiếng Anh.
- Thử nghiệm: 20–30 cảng thuyền viên Việt Nam thường đến.
- Người dùng tự chọn cảng/terminal; chưa tra cứu tự động theo IMO/AIS.

### Mở rộng sau MVP
- Tiếng Trung và thuyền viên Trung Quốc.
- Thuyền viên quốc tế.
- Shipping Agent, Seafarers’ Center, Port Partner, Crewing/Ship Management.
- Partner Portal, Discussion Hub, Maritime Intelligence và API đối tác.

## 3. Product Principles đã chốt

1. **Knowledge First** — chỉ ưu tiên thông tin giúp thuyền viên ra quyết định.
2. **Decision First** — thông tin thiết yếu phải nắm được trong 30–60 giây.
3. **Community Verified** — kinh nghiệm thực tế của thuyền viên là nguồn giá trị cốt lõi.
4. **Bandwidth First** — text trước; ảnh, bản đồ và dữ liệu nặng chỉ tải theo yêu cầu.
5. **Structured Knowledge** — review/thảo luận phải có khả năng chuyển thành dữ liệu có cấu trúc.
6. **Trust Over Quantity** — ưu tiên nguồn, độ tin cậy và xác nhận; không chạy theo số lượng nội dung.
7. **Extensible Architecture** — MVP hẹp nhưng kiến trúc phải mở rộng được.
8. **Trust First** — hiển thị mức độ đáng tin thay vì đẩy timestamp thô lên giao diện chính.
9. **Data Health First** — hệ thống phải biết cảng nào thiếu, cũ, mâu thuẫn hoặc cần kiểm tra lại.
10. **Search First** — người dùng đi từ tìm kiếm đến Port Hub nhanh nhất.
11. **Mobile First** — giao diện thuyền viên ưu tiên điện thoại.
12. **No hidden business meaning** — xếp hạng và nhãn phải giải thích được.

## 4. Phạm vi MVP

### 4.1. Chức năng công khai
- Home tối giản, search-first.
- Tìm theo tên cảng, alias, quốc gia, thành phố, terminal và UN/LOCODE nếu có.
- Kết quả tìm kiếm có xác nhận quốc gia để tránh nhầm cảng.
- Port Hub dạng text-first, không nhúng bản đồ mặc định.
- Port Hub gồm các nhóm: Overview, Access, Internet, Services, Community.
- Quick Port Brief/Decision Summary.
- Data Trust Status và Data Health.
- Cảnh báo quan trọng nếu có.
- Tối đa ba địa điểm phù hợp nhất trong mỗi danh mục; “Xem tất cả” khi cần.

### 4.2. Chức năng Member
- Lưu cảng.
- Lịch sử xem/tìm kiếm.
- Offline Port Pack cấp 1.
- Shore Leave Planner bằng lựa chọn có cấu trúc, không bắt buộc nhập văn bản tự do.
- Return to Ship Card.
- Tạo hành trình nhiều cảng và so sánh eSIM.
- Gửi review, xác nhận nhanh, đề xuất sửa và báo thông tin sai.

### 4.3. Community và moderation
- Review hiển thị ẩn danh/biệt danh; hệ thống vẫn lưu user nội bộ.
- Tất cả nội dung đóng góp đi qua kiểm tra và hàng chờ moderation.
- Trusted Contributor là trạng thái uy tín, không phải xác minh danh tính.
- Discussion Hub là Phase 2; dữ liệu phải chuẩn bị để topic gắn được với Port, Terminal, Place, eSIM hoặc Knowledge Item.

### 4.4. Không thuộc MVP
- IMO/AIS và tự nhận diện cảng sắp đến.
- Bản đồ nhúng/bản đồ offline hoàn chỉnh.
- Booking, đặt taxi, đặt tour, thanh toán hoặc marketplace.
- Bán eSIM trực tiếp.
- Forum/feed/chat/mạng xã hội đầy đủ.
- Chẩn đoán y tế, kê thuốc, lưu hồ sơ sức khỏe.
- Tiếp nhận hồ sơ tranh chấp, bệnh án, nợ lương hoặc tố cáo nhạy cảm.
- Dashboard Partner hoàn chỉnh.
- Maritime Intelligence Hub.

## 5. Vai trò và RBAC

### Anonymous Visitor
- Tìm kiếm và xem toàn bộ dữ liệu công khai.
- Xem review đã duyệt.
- Dùng search history cục bộ.

### Member
- Tất cả quyền của Anonymous.
- Lưu cảng, tạo hành trình, Shore Planner, Port Pack.
- Gửi review, xác nhận, đề xuất sửa, báo sai.

### Trusted Contributor
- Không phải role phân quyền độc lập; là cấp uy tín.
- Quota cao hơn, ưu tiên duyệt, trọng số xác nhận cao hơn.
- Không tự sửa trực tiếp dữ liệu nhạy cảm.

### Moderator
- Duyệt/từ chối/cách ly nội dung.
- Xử lý dữ liệu mâu thuẫn, merge duplicate, spam, report.
- Duyệt dữ liệu nhạy cảm: Shore Leave, Gate, Required Documents, Return Procedure, Emergency Contact.
- Có audit trail.

### Admin
- Toàn quyền cấu hình hệ thống, taxonomy, RBAC, dữ liệu, moderation và audit.
- Có thể mở Discussion Space trong tương lai.

### Partner — Future
- Chỉ có trang giới thiệu/đăng ký quan tâm trong MVP.

## 6. Tám nguyên tắc chống spam, bot và DoS đã chốt

1. Chỉ tài khoản xác minh email mới được đóng góp.
2. Tất cả review/đề xuất phải qua hàng chờ moderation.
3. Rate limit theo user, IP, thiết bị, endpoint và bối cảnh nghiệp vụ; không dựa riêng vào IP vì thuyền viên có thể dùng chung NAT.
4. Tài khoản mới có quota thấp; quota tăng theo uy tín.
5. Mọi thao tác ghi có idempotency key để chống gửi lặp do bot hoặc mạng vệ tinh retry.
6. Review/ảnh và tác vụ nặng đi qua queue/worker, không xử lý nặng trực tiếp trong request.
7. Hệ thống có chế độ Restricted Write và Read-only khi bị tấn công.
8. Dữ liệu giá bất thường không tự động xóa; cách ly và chuyển moderation.

Bổ sung bắt buộc:
- CAPTCHA theo risk, không bắt mọi lần.
- Content fingerprint, duplicate detection, device/IP reputation có thời hạn lưu phù hợp.
- Upload ảnh kiểm tra MIME/magic bytes, resize, nén, xóa metadata, perceptual hash.
- Audit log append-only cho Moderator/Admin.

## 7. Chiến lược dữ liệu Hybrid

### 7.1. Nguồn phục vụ chính
- Người dùng đọc dữ liệu từ Knowledge Database + Cache.
- Không search Internet trực tiếp và chặn người dùng chờ ở mỗi request.

### 7.2. Nguồn cập nhật
- Seed database đã crawl.
- Nguồn chính thức/API/crawler.
- Community review/confirmation.
- Moderator/manual input.
- AI chỉ trích xuất, chuẩn hóa, dịch, tóm tắt và phát hiện mâu thuẫn.

### 7.3. Luồng cập nhật
Source/Crawler → Raw Data → Normalize → Diff → Knowledge Item Queue → Auto-check → Moderator nếu cần → Versioned Knowledge DB → Cache/Search Index.

Không cho crawler overwrite trực tiếp dữ liệu đã công bố.

### 7.4. Đơn vị refresh
- Refresh theo Knowledge Item, không refresh toàn bộ Port nguyên khối.
- Ưu tiên theo lượt xem, mức P0/P1, xung đột, dữ liệu đến hạn, cảng phổ biến.

### 7.5. Fallback khi thiếu dữ liệu
- Trả dữ liệu đang có cùng trust status.
- Tạo background refresh/search job.
- Nếu hoàn toàn không có: hiển thị empty state và cho phép đề xuất bổ sung.
- Không bịa kết quả bằng AI.

## 8. Domain Model đã chốt

### 14 domain
1. Geography
2. Port Infrastructure
3. Shore Access
4. Connectivity
5. Place
6. Transportation
7. Knowledge
8. Community
9. User
10. Content
11. Administration
12. AI
13. Source
14. Change History

### 7 Master Entity
1. Port
2. Terminal
3. Place
4. Knowledge Item
5. Review
6. Connectivity Product/eSIM
7. User

Port Hub là read model/view tổng hợp, không phải một bảng vật lý duy nhất.

## 9. Knowledge Lifecycle

DRAFT → SUBMITTED → AUTOMATED_CHECK → AI_NORMALIZED → PENDING_MODERATION → VERIFIED → PUBLISHED → NEEDS_REVIEW → ARCHIVED.

Mọi Knowledge Item quan trọng cần:
- source
- scope (country/port/terminal/gate/place)
- version
- valid_from/valid_to
- trust_status
- moderation_status
- confirmation_count
- conflict state
- audit history

## 10. UX và Information Architecture

### 10.1. Home
- Logo, language, profile.
- Search box là trọng tâm.
- Continue/Recent/Favorites/Popular ở mức nhẹ.
- Không hero image, video, carousel, popup hoặc banner nặng.

### 10.2. Port Hub
Tabs đề xuất:
- Overview
- Access
- Internet
- Services
- Community

Trên đầu:
- Port/terminal context.
- Critical Information Strip nếu có.
- Quick Brief/Decision Summary.
- Action Bar: Plan, Offline, Share, Report.

### 10.3. Trust presentation
- Không đẩy “Updated 2 years ago” lên vị trí chính.
- Dùng nhãn: Official source, Community confirmed, Needs confirmation, Conflicting reports, Unknown.
- Timestamp, nguồn và số xác nhận nằm trong Data Details.

### 10.4. Bandwidth modes
- Data Saver: không tự tải ảnh/thumbnail không cần thiết.
- Ultra Lite: text + SVG/icon tối thiểu; không animation, map, gallery.
- Không nhúng bản đồ; chỉ Copy address/Open external map.

### 10.5. KPI UX/hiệu năng mục tiêu
- Thông tin chính tìm được trong dưới 30–60 giây.
- Không quá ba thao tác để đến nội dung chính.
- Initial transfer target dưới 500 KB, không tính ảnh tải theo yêu cầu.
- Giảm số HTTP request và ưu tiên nội dung P0.
- Hoạt động hữu dụng trên high-latency/unstable network.

## 11. Knowledge Blueprint đã chốt

### 11.1. Shore Access — P0
Gồm:
- Shore Leave Status
- Required Documents
- Terminal Access
- Port Gate
- Shuttle/Crew Bus
- Taxi Access
- Ride-hailing
- Walking Route
- Return Procedure/Return to Ship Card
- Access Warning
- Community Confirmation
- Data Trust Status

Nguyên tắc:
- Gắn terminal/gate khi có thể.
- Taxi hiển thị khoảng giá.
- Dữ liệu Shore Leave, Gate, Documents, Return Procedure phải qua Moderator.
- AI chỉ tóm tắt dữ liệu có nguồn.
- Không nhúng map mặc định.

### 11.2. Connectivity — P0/P1
Gồm:
- Connectivity Overview
- Mobile Operator
- eSIM Plan
- Physical SIM
- Wi-Fi Location
- Coverage at Terminal/Berth/Gate/Cabin/Anchorage
- Hotspot/Tethering
- Price & Currency
- Activation Requirement
- Multi-port Compatibility
- Community Review
- Data Trust Status

Nguyên tắc:
- Database/cache là nguồn phục vụ chính.
- So sánh theo giá, coverage, hotspot, activation và hành trình.
- Multi-port recommendation có ba phương án: rẻ nhất, đơn giản nhất, phủ sóng tốt nhất.
- Không bán eSIM trực tiếp trong MVP.

### 11.3. ATM & Currency Exchange
- DCC và hỗ trợ thẻ quốc tế là P0.
- Tách reference rate, posted rate và effective community rate.
- Cho báo số tiền thực nhận và biên lai tùy chọn; file gốc không lưu lâu.
- Sắp xếp Best overall + filter Nearest/Lowest fee/Open now.
- Không kết luận ATM hay đổi tiền luôn tốt hơn; phải so sánh theo phí, thời gian và bối cảnh.

### 11.4. Shopping & Convenience
- Dùng Place + subtype tables; không dùng EAV/JSON tự do cho toàn bộ nghiệp vụ.
- Mỗi place lưu một lần; terminal_place_access lưu khác biệt theo terminal/gate.
- Seafarer Essential Basket 6–8 mặt hàng chuẩn.
- Lọc theo thời gian shore leave và tự loại nơi không đủ buffer.
- Mỗi danh mục chỉ hiển thị tối đa ba địa điểm phù hợp nhất.
- Không lưu toàn bộ inventory/SKU trong MVP.

### 11.5. Food & Dining
- Seafarer Meal Basket khoảng sáu loại bữa ăn/đồ uống chuẩn.
- Không dùng rating sao tổng thể.
- Xếp theo tổng thời gian đi–ăn–quay lại, tốc độ phục vụ, mở cửa, giá, thanh toán và nhu cầu ăn uống.
- Chuẩn bị dietary filters: halal, vegetarian, no-pork.
- Halal/dị ứng phải thể hiện đúng mức xác minh.
- Food safety report phải cách ly và moderation.
- Delivery to Gate là P2.

### 11.6. Medical, Pharmacy & Emergency
- Emergency Contact là entity riêng, không gộp vào Place.
- Emergency Mode offline bắt buộc trong Port Pack.
- Không tiếp nhận đơn thuốc, bệnh án, xét nghiệm trong MVP.
- Review chỉ về access, hours, language, payment, waiting time.
- Không xếp hạng “bệnh viện tốt nhất”, không rating sao.
- AI không chẩn đoán, kê thuốc hoặc kết luận lâm sàng.
- Dữ liệu khẩn cấp đi qua critical-data moderation + audit log.

### 11.7. Seafarers’ Center, Welfare & Support
- Dùng WelfareProvider + WelfareService + optional Place.
- Provider có thể có physical center, mobile service, ship visit hoặc remote support.
- Pickup, return transport, Wi-Fi, contact, opening hours là P0 khi có dịch vụ.
- Trung tâm mở không đồng nghĩa shuttle chạy; trạng thái lưu riêng.
- MVP chỉ hiển thị đầu mối quyền lợi đã xác minh; không nhận hồ sơ vụ việc/chat riêng/tài liệu tranh chấp.
- Dữ liệu welfare thiết yếu phải lưu được trong Port Pack.

## 12. Discussion Hub — Phase 2

Mô hình đề xuất:
Question/Discussion → Replies → Moderator/Resolved → Summary → Convert to Knowledge Item.

Discussion phải gắn được với Port, Terminal, Place, eSIM hoặc Knowledge Item. Admin/Moderator có thể mở Discussion Space. Không xây feed/mạng xã hội tổng quát.

## 13. Frontend Prototype Baseline

### Mục tiêu
Dựng vertical-slice prototype để kiểm chứng UX và thứ tự thông tin, không phải production frontend hoàn chỉnh.

### Màn hình ưu tiên
1. Home/Search.
2. Search Results.
3. Port Hub — Overview/Access/Internet/Services/Community.
4. Shore Leave Planner.
5. Multi-port eSIM Compare.
6. Review/Quick Confirmation/Suggest Update.
7. Login/Profile/Favorites/Offline Pack states.
8. Moderator queue ở mức wireframe hoặc skeleton.

### Sample data
Dùng mock data có cấu trúc cho 2–3 cảng đại diện, ví dụ Busan, Singapore và một cảng có dữ liệu thiếu/xung đột.

### Trạng thái bắt buộc
- Loading skeleton.
- Empty state.
- Needs confirmation.
- Conflicting reports.
- Offline/Data Saver/Ultra Lite.
- Error/Retry.
- Login required.

### Không làm trong prototype
- Crawler thật.
- Database production.
- AI thật.
- Google Maps embed.
- Payment/booking.
- Complex animations.

## 14. Quyền riêng tư và bảo mật

- Không công khai vị trí tàu thời gian thực, lịch trình cá nhân hoặc danh sách crew.
- Không lưu passport/seaman book nếu không bắt buộc.
- Review công khai ẩn danh nhưng có user nội bộ để chống abuse.
- Khi xóa tài khoản, giữ đóng góp đã duyệt nhưng ẩn danh tác giả.
- Sensitive evidence chỉ lưu tạm, redact và xóa theo retention policy.
- Logs không chứa API key, token hoặc dữ liệu nhạy cảm.

## 15. Các mục hoãn để thảo luận sau

- Personal Services & Practical Supplies: Laundry, Barber, Electronics, PPE/Tool, Printing, Postal, Money Transfer.
- Local Knowledge: khí hậu, ngôn ngữ, phong tục, ngày nghỉ, lễ hội.
- Safety & Risk chi tiết.
- Discussion Hub chi tiết.
- Admin/Moderator complete UX.
- Final tech stack, ERD, API Contract, search engine, cache/queue/storage.
- Danh sách 20–30 cảng thử nghiệm.
- Tên thương hiệu, logo và visual direction cuối.

## 16. Quy tắc thay đổi phạm vi

- Mọi thay đổi lớn phải ghi vào Decision Register.
- Không tự thêm tính năng ngoài MVP chỉ vì “có thể hữu ích”.
- Mỗi milestone phải có review gate.
- Prototype frontend được phép dùng mock data nhưng không được hardcode business logic vào component trình bày.
