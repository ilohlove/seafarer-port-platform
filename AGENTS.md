<!-- CODEX_PROJECT_LOG_START -->

## Project log

Sử dụng file `PROJECT_LOG.md` để ghi nhận tiến độ tổng hợp của dự án.

Chỉ thêm một dòng log khi hoàn thành một hạng mục công việc có ý nghĩa, đạt một mốc phát triển hoặc kết thúc một phiên làm việc.

Định dạng:

- [YYYY-MM-DD HH:mm] Nội dung cập nhật ngắn gọn.

Yêu cầu:

- Mỗi cập nhật chỉ viết trên một dòng.
- Mỗi dòng tối đa 25 từ.
- Tổng hợp các thay đổi nhỏ có cùng mục tiêu thành một nội dung duy nhất.
- Chỉ ghi kết quả hoặc chức năng có ý nghĩa đối với tiến độ dự án.
- Không ghi riêng từng file đã sửa, từng hàm đã thay đổi hoặc từng lỗi nhỏ đã xử lý.
- Không ghi các thao tác kỹ thuật thông thường như đổi tên biến, sửa định dạng, chỉnh import, sửa chính tả hoặc thay đổi CSS nhỏ.
- Không ghi lại quá trình thử nghiệm, phân tích hoặc các bước trung gian.
- Không ghi log liên tục trong khi đang sửa code.
- Chỉ ghi sau khi hoàn thành một nhiệm vụ, một nhóm nhiệm vụ hoặc kết thúc phiên làm việc.
- Nếu nhiều thay đổi nhỏ cùng phục vụ một chức năng, phải gộp thành một dòng tổng hợp.
- Không ghi chi tiết mã nguồn.
- Không ghi API key, token, mật khẩu hoặc thông tin nhạy cảm.
- Không sửa hoặc xóa các dòng log cũ.
- Không tạo nội dung trùng với các log trước đó.

Ví dụ nên ghi:

- [2026-07-27 16:30] Hoàn thiện chức năng quản lý dự án và tự động tạo file log.
- [2026-07-27 18:10] Hoàn thành giao diện nhập, xem trước và gửi báo cáo Discord.
- [2026-07-27 20:45] Cải thiện độ ổn định của lịch gửi báo cáo tự động.

Ví dụ không nên ghi:

- Sửa màu nút gửi.
- Đổi tên biến project_name.
- Thêm một hàm kiểm tra đường dẫn.
- Sửa lỗi import.
- Chỉnh khoảng cách giao diện.
- Cập nhật một câu thông báo.
- Thử nghiệm Discord Webhook.

Trước khi thêm log mới, hãy tự kiểm tra:

1. Nội dung này có phản ánh một kết quả hoặc mốc tiến độ đáng báo cáo không?
2. Có thể gộp nội dung này với các thay đổi khác trong cùng nhiệm vụ không?
3. Người quản lý dự án có cần biết chi tiết này không?

Nếu nội dung không phản ánh một mốc tiến độ đáng báo cáo thì không được ghi log.

<!-- CODEX_PROJECT_LOG_END -->

<!-- SEAFARER_PROJECT_OS_START -->

## Seafarer Port Platform project operating system

Trước khi phân tích, sửa code, tạo tài liệu hoặc review trong dự án này, phải đọc theo thứ tự:

1. `AGENTS.md`
2. `docs/00_MASTER_SPEC.md`
3. `docs/01_DECISION_REGISTER.md`
4. `docs/project-os/README.md`

Sau đó đọc file phù hợp với nhiệm vụ:

- Tạo/sửa tài liệu: `docs/project-os/SKILL_DOCUMENT_AUTHORING.md`
- Review, QA, test plan, release gate: `docs/project-os/SKILL_REVIEW_AND_QA.md`
- Chọn chuyên gia phối hợp: `docs/project-os/EXPERT_COUNCIL.md`
- Giao việc cho Codex: `docs/project-os/CODEX_EXECUTION_PROMPT.md`

Quy tắc bắt buộc:

- Không tạo file `.md` mới ngoài path được phép trong `SKILL_DOCUMENT_AUTHORING.md`.
- Không tạo file tên chung chung như `notes.md`, `plan.md`, `review.md`, `final.md`, `spec2.md`.
- Không sửa trực tiếp `main` trừ khi được yêu cầu rõ.
- Không nhảy milestone; F2 không được tự làm F3, F3 không được tự làm F4/F5.
- Không thêm dependency nặng, map SDK, image gallery, custom font hoặc UI framework nếu chưa có phân tích bundle impact.
- Luôn giữ Search First, Decision First, Trust First, Bandwidth First.
- Port Hub là read model, không phải một database entity.
- Dữ liệu có rủi ro phải thể hiện trust/source/moderation status.
- EmergencyContact và WelfareProvider không được ép thành Place.
- MVP không thu thập bệnh án, đơn thuốc, hộ chiếu, bảo hiểm, tranh chấp lao động hoặc tài liệu nhạy cảm.

<!-- SEAFARER_PROJECT_OS_END -->
