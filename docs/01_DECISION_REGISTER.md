# DECISION REGISTER v1.0

## Trạng thái
- `LOCKED`: đã chốt, không đổi nếu không có quyết định mới.
- `DEFERRED`: hoãn sau MVP hoặc sau prototype.
- `OPEN`: chưa chốt.

## Product và phạm vi
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-001 | MVP tập trung thuyền viên Việt Nam, 20–30 cảng | LOCKED |
| D-002 | VI/EN trong MVP, tiếng Trung sau | LOCKED |
| D-003 | Search-first, text-first, không map embed mặc định | LOCKED |
| D-004 | Port Hub là read model tổng hợp, không phải bảng đơn | LOCKED |
| D-005 | IMO/AIS không thuộc MVP | LOCKED |
| D-006 | Discussion Hub là Phase 2 | LOCKED |
| D-007 | Marketplace/booking/payment không thuộc MVP | LOCKED |
| D-008 | Partner Portal đầy đủ hoãn sau | DEFERRED |

## UX
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-101 | Mobile First + Bandwidth First | LOCKED |
| D-102 | Không dùng rating sao tổng thể cho Port | LOCKED |
| D-103 | Trust Status thay timestamp thô ở vị trí chính | LOCKED |
| D-104 | Data Saver và Ultra Lite | LOCKED |
| D-105 | Port Hub tabs: Overview, Access, Internet, Services, Community | LOCKED |
| D-106 | Tối đa ba place phù hợp nhất/category trên Port Hub | LOCKED |
| D-107 | Offline Port Pack cấp 1 | LOCKED |

## Data
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-201 | Hybrid DB/cache + background refresh/search | LOCKED |
| D-202 | Không search Internet trực tiếp trong từng user request | LOCKED |
| D-203 | Crawler phải diff/version/moderate, không overwrite trực tiếp | LOCKED |
| D-204 | Refresh theo Knowledge Item | LOCKED |
| D-205 | 14 domain và 7 Master Entity | LOCKED |
| D-206 | Port Hub không lưu vật lý nguyên khối | LOCKED |
| D-207 | Giá lưu amount + currency + observed_at + source | LOCKED |

## Community, trust và abuse
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-301 | Review công khai ẩn danh nhưng lưu user nội bộ | LOCKED |
| D-302 | Trusted Contributor dựa lịch sử, không xác minh danh tính | LOCKED |
| D-303 | Tất cả đóng góp qua moderation | LOCKED |
| D-304 | 8 nguyên tắc anti-abuse | LOCKED |
| D-305 | Giữ review đã duyệt khi user xóa tài khoản, ẩn danh tác giả | LOCKED |

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

## Frontend
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-501 | Dựng prototype vertical slice trước production frontend | LOCKED |
| D-502 | Prototype dùng mock data typed và service abstraction | LOCKED |
| D-503 | Review gate sau từng milestone | LOCKED |
| D-504 | Final tech stack | OPEN |
| D-505 | Visual style/brand/color/font cuối | OPEN |
| D-506 | Danh sách sample ports | OPEN |

## Architecture sau prototype
| ID | Quyết định | Trạng thái |
|---|---|---|
| D-601 | ERD chi tiết | OPEN |
| D-602 | API Contract | OPEN |
| D-603 | Search engine/cache/queue/storage stack | OPEN |
| D-604 | Crawler source licensing/compliance | OPEN |
| D-605 | Production hosting/DevOps | OPEN |
