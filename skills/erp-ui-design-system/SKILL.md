---
name: erp-ui-design-system
description: Quy chuẩn thiết kế giao diện ERP Sales & Inventory theo tone màu chủ đạo Xanh lá - Trắng (Fresh Emerald & Crisp White), chuẩn Responsive 360px, Data Table, Status Badges và Form Controls.
---

# ERP UI Design System Skill

## 1. Nguyên Tắc Thiết Kế Giao Diện & Bảng Màu Chủ Đạo (Theme Green & White)
Hệ thống sử dụng ngôn ngữ thiết kế hiện đại, thân thiện, lấy tone màu **Xanh lá tươi mát kết hợp Trắng tinh tế (Fresh Emerald & Crisp White)** làm nhận diện thương hiệu cốt lõi, điểm xuyết màu vàng ấm (Warm Amber) cho các thành phần tạo điểm nhấn.

### Bảng Mã Màu Chủ Đạo (Brand Color Palette)
- **Primary Green (Xanh lá chủ đạo):**
  - `Primary Main`: `#059669` (Emerald 600) — Màu thương hiệu chính cho nút bấm, icon, điểm nhấn active.
  - `Primary Light / Hover`: `#10b981` (Emerald 500) — Trạng thái hover, badge nổi bật.
  - `Primary Dark`: `#047857` (Emerald 700) — Tiêu đề, viền đậm, header bảng.
  - `Primary Surface / Soft`: `#ecfdf5` (Emerald 50) — Nền thẻ active, pill background, callout.
  - `Primary Border`: `#a7f3d0` (Emerald 200) — Đường viền nhẹ nhàng.
- **Crisp White & Neutral (Trắng & Nền sáng):**
  - `Surface White`: `#ffffff` — Nền thẻ card chính, modal, ô nhập liệu.
  - `App Background`: `#f8fafc` hoặc `#f0fdf4` — Nền tổng thể ứng dụng dịu mắt.
  - `Text Main`: `#0f172a` (Slate 900) — Chữ tiêu đề và nội dung chính độ tương phản cao.
  - `Text Muted`: `#475569` (Slate 600) — Chữ mô tả phụ, nhãn hướng dẫn.
- **Accent Yellow (Vàng cam ấm điểm xuyết):**
  - `Accent Gold`: `#f59e0b` (Amber 500) / `#fbbf24` (Amber 400) — Dành cho nút phụ nổi bật, icon đánh giá, badge đặc biệt.

### Phong Cách Thị Giác (Visual Aesthetics)
- **Bo góc mềm mại (Rounded Corners):** Các card, container và nút bấm sử dụng bo góc từ `12px` đến `24px`, mang lại cảm giác thân thiện, hiện đại.
- **Đổ bóng êm dịu (Soft Elevation):** Sử dụng bóng mờ màu xanh ngọc nhẹ (`0 10px 25px -5px rgba(5, 150, 105, 0.15)`), tránh bóng xám gắt.
- **Khối cong chuyển tiếp:** Kết hợp các mảng màu xanh lá và trắng dạng sóng/khối bo cong mượt mà ở các banner và khung header.

---

## 2. Quy Chuẩn Màu Sắc Trạng Thái (Status Badges)
Mọi trạng thái đơn hàng, kho hoặc công nợ phải tuân thủ chuẩn màu:
- **Xanh lá cây (Success / Hoàn thành / Active):** Đã duyệt, Đã xuất kho, Hoạt động (`bg-emerald-100 text-emerald-800 border-emerald-200`).
- **Vàng cam (Warning / Đang xử lý / Pending):** Chờ duyệt, Đang vận chuyển, Sắp hết hạn (`bg-amber-100 text-amber-800 border-amber-200`).
- **Đỏ hồng (Danger / Lỗi / Cancelled):** Đã hủy đơn, Bị khóa tài khoản, Quá hạn nợ (`bg-rose-100 text-rose-800 border-rose-200`).
- **Xanh dương ngọc (Info / Mới):** Đơn hàng mới, Phiếu tạm (`bg-teal-100 text-teal-800 border-teal-200`).
- **Xám bạc (Neutral / Lưu trữ):** Bản nháp, Đã đóng (`bg-slate-100 text-slate-800 border-slate-200`).

---

## 3. Quy Chuẩn Responsive Mobile 360px
Mọi màn hình (Bàn làm việc, Tạo đơn, Đăng nhập, Báo lỗi) bắt buộc:
1. **Touch Target:** Mọi nút bấm, link menu đạt kích thước tối thiểu **44px x 44px**.
2. **Không tràn màn hình:** Tuyệt đối không xuất hiện thanh cuộn ngang (`overflow-x: hidden`).
3. **Off-canvas Drawer:** Sidebar trên mobile ẩn đi và bật ra dạng ngăn kéo trượt êm từ cạnh trái khi bấm nút Hamburger, có backdrop mờ che nền.

---

## 4. Cấu Trúc Bảng Dữ Liệu Chuẩn (Data Table Component)
Một bảng quản lý nghiệp vụ ERP chuẩn gồm 4 khối:
1. **Toolbar trên cùng:** Ô tìm kiếm có icon, dropdown bộ lọc trạng thái, nút hành động chính màu Xanh lá (`#059669`).
2. **Table Header:** Nền xanh lá nhạt (`#ecfdf5`) hoặc xám nhạt (`#f8fafc`), chữ đậm rõ nét.
3. **Table Body:** Hàng xen kẽ màu nền trắng - xanh nhạt dịu mắt, hover chuyển màu mượt mà.
4. **Pagination Bar:** Hiển thị số bản ghi và các nút chuyển trang dạng pill tròn.

---

## 5. Form Validation & Nút Bấm
- Sử dụng **React Hook Form** / State kiểm soát dữ liệu:
  - Hiển thị thông báo lỗi màu đỏ ngay dưới ô input vi phạm.
  - Vô hiệu hóa (disable) nút Submit khi đang gửi dữ liệu (`isSubmitting = true`) kèm icon xoay spinner để chống click đúp.
