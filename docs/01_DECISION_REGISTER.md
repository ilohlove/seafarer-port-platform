# DECISION REGISTER v1.1

## Trạng thái
- `LOCKED`: đã chốt, không đổi nếu không có quyết định mới.
- `DEFERRED`: hoãn sau MVP hoặc sau prototype.
- `OPEN`: chưa chốt.
- `SUPERSEDED`: được thay thế bởi quyết định mới hơn.

## Product và phạm vi
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-001 | MVP tập trung thuyền viên Việt Nam, 20–30 cảng | LOCKED |
| D-002 | VI/EN trong MVP, tiếng Trung sau | LOCKED |
| D-003 | Search-first, text-first, không map embed mặc định | LOCKED |
| D-004 | Port Hub/Port Notes là read model tổng hợp, không phải bảng đơn | LOCKED |
| D-005 | IMO/AIS không thuộc MVP | LOCKED |
| D-006 | Free-form Discussion Hub là Phase 2; Structured Port Notes là MVP core | LOCKED |
| D-007 | Marketplace/booking/payment không thuộc MVP | LOCKED |
| D-008 | Partner Portal đầy đủ hoãn sau | DEFERRED |
| D-009 | Product direction pivot: Seafarer Port Notes, community-first shore-leave notes | LOCKED |
| D-010 | eSIM/SIM là MVP hook nổi bật, không chỉ là một service card phụ | LOCKED |
| D-011 | Public notes và private notes-to-self là hai khái niệm riêng | LOCKED |
| D-012 | Contact người bán/taxi/order cá nhân phải có consent/moderation trước khi public | LOCKED |

## UX
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-101 | Mobile First + Bandwidth First | LOCKED |
| D-102 | Không dùng rating sao tổng thể cho Port hoặc notes | LOCKED |
| D-103 | Trust Status thay timestamp thô ở vị trí chính | LOCKED |
| D-104 | Data Saver và Ultra Lite | LOCKED |
| D-105 | Dashboard tabs Overview/Access/Internet/Services/Community là hướng cũ; Port Notes dùng Port Snapshot + need-based topics làm primary UI | SUPERSEDED |
| D-106 | Tối đa ba place phù hợp nhất/category trên Port Hub | LOCKED |
| D-107 | Offline Port Pack cấp 1 | LOCKED |
| D-108 | First screen ưu tiên Port Snapshot, Best Internet Deal, Action Tiles, Top Notes | LOCKED |
| D-109 | Write a Note phải là hành động chính dễ thấy | LOCKED |

## Data
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-201 | Hybrid DB/cache + background refresh/search | LOCKED |
| D-202 | Không search Internet trực tiếp trong từng user request | LOCKED |
| D-203 | Crawler phải diff/version/moderate, không overwrite trực tiếp | LOCKED |
| D-204 | Refresh theo Knowledge Item hoặc Note-derived Knowledge Item | LOCKED |
| D-205 | 14 domain và 7 Master Entity vẫn là nền; bổ sung PortNote layer cho cộng đồng | LOCKED |
| D-206 | Port Hub/Port Notes không lưu vật lý nguyên khối | LOCKED |
| D-207 | Giá lưu amount + currency + observed_at + source | LOCKED |
| D-208 | Notes phải gắn được với port, terminal, gate và topic | LOCKED |
| D-209 | Notes có cấu trúc theo topic, không dùng một form text chung cho tất cả | LOCKED |

## Community, trust và abuse
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-301 | Review/Note công khai ẩn danh nhưng lưu user nội bộ | LOCKED |
| D-302 | Trusted Contributor dựa lịch sử, không xác minh danh tính | LOCKED |
| D-303 | Tất cả đóng góp public qua moderation hoặc risk-based moderation | LOCKED |
| D-304 | 8 nguyên tắc anti-abuse | LOCKED |
| D-305 | Giữ review/note đã duyệt khi user xóa tài khoản, ẩn danh tác giả | LOCKED |
| D-306 | Top Notes xếp theo usefulness, confirmation, topic priority, terminal specificity và moderation state | LOCKED |
| D-307 | Free-form social feed không thuộc MVP | LOCKED |

## Knowledge Dictionary
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-401 | Shore Access v1.0 | LOCKED |
| D-402 | Connectivity v1.0 | LOCKED |
| D-403 | ATM & Currency Exchange v1.0 | LOCKED |
| D-404 | Shopping & Convenience v1.0 | LOCKED |
| D-405 | Food & Dining v1.0 | LOCKED |
| D-406 | Medical/Pharmacy/Emergency v1.0 | LOCKED |
| D-407 | Welfare & Support v1.0 | LOCKED |
| D-408 | Personal Services & Practical Supplies | DEFERRED |
| D-409 | Local Knowledge | DEFERRED |
| D-410 | Safety & Risk chi tiết | DEFERRED |
| D-411 | Community Port Notes v1.0 draft is the active pivot dictionary | LOCKED |

## Frontend
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-501 | Dựng prototype vertical slice trước production frontend | LOCKED |
| D-502 | Prototype dùng mock data typed và service abstraction | LOCKED |
| D-503 | Review gate sau từng milestone | LOCKED |
| D-504 | Final tech stack | OPEN |
| D-505 | Visual style/brand/color/font cuối | OPEN |
| D-506 | Danh sách sample ports | OPEN |
| D-507 | F3 dashboard branch chỉ là reference; active UI direction là Port Notes community-first | LOCKED |
| D-508 | UI mới không được hiển thị Premium/paid upsell trong MVP | LOCKED |

## Architecture sau prototype
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-601 | ERD chi tiết | OPEN |
| D-602 | API Contract | OPEN |
| D-603 | Search engine/cache/queue/storage stack | OPEN |
| D-604 | Crawler source licensing/compliance | OPEN |
| D-605 | Production hosting/DevOps | OPEN |
| D-606 | F6 auth/community persistence uses Supabase Auth + Postgres/RLS; Google-only in first slice | REVIEW |
| D-607 | Public profile identity uses optional CrewPort nickname; full name/email remain private | REVIEW |
