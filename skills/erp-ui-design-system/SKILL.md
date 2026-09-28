---
name: erp-ui-design-system
description: Quy chuẩn thiết kế giao diện ERP (Bảng dữ liệu Data Table, bộ lọc tìm kiếm, phân trang, Form validation, trạng thái Badge, modal xác nhận).
---

# ERP UI Design System Skill

## 1. Nguyên Tắc Thiết Kế Giao Diện ERP (Enterprise Standard)
- **Tập trung vào dữ liệu:** Bố cục rõ ràng, tối ưu không gian hiển thị danh sách lớn, bảng dữ liệu (Data Table) là trung tâm.
- **Tương tác nhanh:** Có thanh tìm kiếm theo thời gian thực (Search Debounce), bộ lọc đa tiêu chí (theo ngày, trạng thái, kho).
- **Phản hồi rõ ràng:** Mọi thao tác quan trọng (nhập kho, hủy đơn hàng, duyệt nợ) phải có **Modal xác nhận** và hiển thị Toast thông báo thành công/thất bại.

---

## 2. Quy Chuẩn Màu Sắc Trạng Thái (Status Badges)
Mọi trạng thái đơn hàng, kho hoặc công nợ phải dùng chung mã màu trực quan:
- **Xanh lá cây (Success / Hoàn thành / Active):** Đã duyệt, Đã xuất kho, Hoạt động (`bg-emerald-100 text-emerald-800`).
- **Vàng cam (Warning / Đang xử lý / Pending):** Chờ duyệt, Đang vận chuyển, Sắp hết hạn (`bg-amber-100 text-amber-800`).
- **Đỏ (Danger / Lỗi / Cancelled):** Đã hủy đơn, Bị khóa tài khoản, Quá hạn nợ (`bg-rose-100 text-rose-800`).
- **Xanh dương (Info / Mới):** Đơn hàng mới, Phiếu tạm (`bg-blue-100 text-blue-800`).
- **Xám (Neutral / Lưu trữ):** Bản nháp, Đã đóng (`bg-slate-100 text-slate-800`).

---

## 3. Cấu Trúc Bảng Dữ Liệu Chuẩn (Data Table Component)
Một bảng quản lý (ví dụ: Danh sách hàng tồn kho, Danh sách đơn hàng) cần có các thành phần:

1. **Toolbar trên cùng:**
   - Ô Input tìm kiếm (có icon kính lúp).
   - Dropdown chọn trạng thái (Tất cả, Đang chờ, Đã duyệt).
   - Nút hành động chính (ví dụ: `+ Tạo đơn hàng mới` màu xanh nổi bật).
2. **Table Header:**
   - Cột cố định (Mã đơn, Tên khách hàng, Tổng tiền, Trạng thái, Ngày tạo, Thao tác).
   - Hỗ trợ bấm vào tiêu đề cột để sắp xếp (Sort Ascending/Descending).
3. **Table Body:**
   - Dòng xen kẽ màu nền nhẹ để dễ nhìn.
   - Text số tiền canh phải (`text-right`), canh giữa cho Badge trạng thái.
4. **Pagination Bar dưới cùng:**
   - Hiển thị: "Hiển thị 1 - 10 trên tổng số 125 kết quả".
   - Bộ chọn số dòng trên mỗi trang (10, 20, 50).
   - Các nút chuyển trang: `Trước`, `1`, `2`, `3`, `Sau`.

---

## 4. Form Validation Chuẩn
- Sử dụng **React Hook Form** kết hợp schema validation (như **Zod**) để kiểm soát dữ liệu:
  - Bắt buộc hiển thị thông báo lỗi màu đỏ ngay dưới ô input vi phạm.
  - Vô hiệu hóa (disable) nút Submit khi đang gửi dữ liệu (`isSubmitting = true`) để chống click đúp tạo 2 đơn trùng nhau.
