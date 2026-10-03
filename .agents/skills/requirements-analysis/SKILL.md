---
name: requirements-analysis
description: Hướng dẫn phân tích nghiệp vụ hệ thống ERP Sales & Inventory (kho FEFO, công nợ, đơn hàng, 7 vai trò người dùng) thành User Story và Acceptance Criteria.
---

# Requirements Analysis Skill

## 1. Nghiệp Vụ Cốt Lõi Dự Án ERP Sales & Inventory
Khi phân tích một yêu cầu nghiệp vụ, phải luôn rà soát các yếu tố sau:

### 1.1. Hệ Thống 7 Vai Trò Nghiệp Vụ (RBAC)
- `ROLE_ADMIN`: Quản trị toàn hệ thống, tạo tài khoản, gán quyền, xem toàn bộ báo cáo doanh thu & kho.
- `ROLE_SALES_REP`: Nhân viên kinh doanh - tạo đơn bán buôn/lẻ, theo dõi đơn hàng và công nợ khách hàng mình phụ trách.
- `ROLE_SALES_MANAGER`: Quản lý kinh doanh - duyệt đơn hàng có chiết khấu cao hoặc vượt hạn mức nợ, có quyền xem giá vốn (S1-05).
- `ROLE_WAREHOUSE`: Nhân viên kho - tạo phiếu nhập kho, xuất kho theo đơn hàng, kiểm đếm vị trí lô kệ.
- `ROLE_WH_MANAGER`: Quản lý kho - duyệt phiếu kiểm kê, duyệt chuyển kho, cân đối hạn mức tồn kho an toàn.
- `ROLE_ACCOUNTANT`: Kế toán công nợ - theo dõi hóa đơn, đối soát thu chi, xác nhận thanh toán công nợ đại lý.
- `ROLE_CUSTOMER`: Đại lý / Khách hàng thân thiết - tự tra cứu sản phẩm, đặt hàng, xem tiến độ giao hàng và hạn mức công nợ.

### 1.2. Quy Tắc Quản Trị Kho Hàng & Tồn Kho
- **Nguyên tắc xuất kho FEFO (First Expired, First Out):** Hàng có hạn sử dụng gần nhất bắt buộc phải được ưu tiên xuất trước. Trường hợp không có date thì áp dụng FIFO (nhập trước xuất trước).
- **Cơ chế Khóa Tồn Kho (Inventory Reservation):** Khi đơn hàng được tạo (trạng thái PENDING), số lượng hàng phải được giữ chỗ tạm thời (reserved) để tránh tình trạng bán vượt tồn (Overselling).
- **Cân Bằng Tồn Kho Tối Thiểu (Min-Stock Alert):** Hệ thống tự động cảnh báo khi tồn kho khả dụng dưới ngưỡng an toàn để thủ kho kịp tạo yêu cầu nhập hàng.

### 1.3. Quy Tắc Bán Hàng & Quản Trị Công Nợ
- **Kiểm Tra Hạn Mức Công Nợ (Credit Limit):** Đại lý có hạn mức nợ (ví dụ: tối đa 50 triệu hoặc nợ quá 30 ngày) thì hệ thống phải cảnh báo hoặc chặn tạo đơn mới, trừ khi có Quản lý kinh doanh duyệt bảo lãnh.

---

## 2. Tiêu Chuẩn Định Nghĩa Xong (Definition of Done - DoD)
Một User Story chỉ được xem là hoàn thành khi:
1. **Backend:** Có đầy đủ Entity, Repository, Service bọc `@Transactional` cho các luồng nhiều bảng, Controller có validation dữ liệu và phân quyền `@PreAuthorize`.
2. **Frontend:** Giao diện trực quan, có form nhập liệu rõ ràng, xử lý đầy đủ các trạng thái loading, lỗi (error message tiếng Việt) và thành công.
3. **Tester:** Viết kịch bản kiểm thử (Positive & Negative Test Cases) và kiểm thử thông luồng trên môi trường Staging.
