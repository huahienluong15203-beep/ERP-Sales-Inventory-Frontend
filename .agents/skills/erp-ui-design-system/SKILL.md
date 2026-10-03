---
name: erp-ui-design-system
description: Quy chuẩn thiết kế giao diện ERP Sales & Inventory theo phong cách hiện đại tựa App ETC, tone màu chủ đạo Cam Lazada - Trắng (Lazada Vibrant Orange & Crisp White), chuẩn Responsive 360px, Menu Pill, Stat Cards, Data Table và Form Controls.
---

# ERP UI Design System Skill

## 1. Nguyên Tắc Thiết Kế Giao Diện & Bảng Màu Chủ Đạo (Lazada Orange & Crisp White)
Hệ thống sử dụng ngôn ngữ thiết kế hiện đại, chuyên nghiệp theo cấu trúc tương tự **App ETC**, kết hợp nhận diện màu sắc **Cam Lazada rực rỡ và Trắng sạch sẽ (Lazada Vibrant Orange & Crisp White)**.

### Bảng Mã Màu Chủ Đạo (Brand Color Palette)
- **Primary Orange (Cam Lazada chủ đạo):**
  - `Primary Main`: `#F85606` (hoặc `#FF6000` / `#EE4D2D`) — Nút bấm chính, icon điểm nhấn, menu active gradient.
  - `Primary Gradient`: `linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)` — Nút Đăng nhập, Menu Pill khi Active.
  - `Primary Hover`: `#E04800` — Trạng thái tương tác nút bấm.
  - `Primary Surface / Soft`: `#FFF2EE` — Nền badge, callout, highlight nhẹ.
  - `Primary Border`: `#FFD8CC` — Đường viền nhấn cam mềm mại.
- **Crisp White & Neutral (Trắng & Nền sạch):**
  - `Surface White`: `#ffffff` — Nền sidebar, nền thẻ stat card, form đăng nhập, ô input.
  - `App Background`: `#F6F7F9` — Nền tổng thể ứng dụng hiện đại, tương phản hoàn hảo với card trắng.
  - `Border Subtle`: `#E5E7EB` — Viền xám mỏng nhẹ nhàng ngăn cách các khối.
  - `Text Main`: `#111827` — Tiêu đề, số liệu chính (độ đậm cao).
  - `Text Muted`: `#6B7280` — Nhãn in hoa nhỏ, mô tả phụ, đường dẫn breadcrumb.
- **Status Colors:**
  - `Success`: `#10B981` (Xanh lá) — Chấm online, hoàn thành, tồn khả dụng an toàn.
  - `Warning`: `#F59E0B` (Vàng hổ phách) — Chờ duyệt, cận hạn 30 ngày.
  - `Danger`: `#EF4444` (Đỏ) — Quá hạn nợ, nút đăng xuất, lỗi 403.
  - `Info`: `#0284C7` (Xanh dương) — Đơn mới, xuất kho.

### Cấu Trúc Giao Diện (Layout Hierarchy) theo chuẩn App ETC
1. **Sidebar bên trái (Nền trắng sang trọng):**
   - Logo thương hiệu ở trên cùng.
   - Thẻ `VAI TRÒ HỆ THỐNG`: Tiêu đề in hoa nhỏ, tên vai trò nổi bật kèm chấm tròn online xanh/cam.
   - Menu điều hướng dạng **Pill bo tròn**:
     - Khi active: Nền gradient cam Lazada, chữ trắng, icon trắng, shadow nhẹ.
     - Khi bình thường: Chữ xám đậm, icon xám, hover êm dịu.
   - Nút `[Đăng Xuất]` nằm cố định góc dưới cùng bên trái với viền đỏ cam nhạt.
2. **Header bên trên:**
   - Icon thu phóng sidebar.
   - Tiêu đề trang + Dòng mô tả nhỏ hoạt động bên dưới.
   - Bên phải: Đồng hồ đồng bộ + Nút Làm mới, Avatar viết tắt 2 chữ cái (`AD`, `TK`, `BH`) kèm tên đầy đủ và username.
3. **Khu vực làm việc (Content Area):**
   - Hàng Thẻ Thống Kê (Stat Cards) nền trắng, số liệu to bản, icon trong badge bo góc.
   - Khu vực tiến độ đơn hàng với thanh progress bar thanh lịch.
   - Biểu đồ tròn (Donut chart) đo lường tỷ lệ hoàn thành.
   - Tuyệt đối không hiển thị các khối "kiểm thử" thô sơ trên giao diện chính thức.
4. **Trang Đăng Nhập (Login Page):**
   - Centered Card bo góc 20px, shadow mềm sâu.
   - Label in hoa: `TÊN ĐĂNG NHẬP`, `MẬT KHẨU`.
   - Input có icon bên trái, icon mắt ẩn hiện mật khẩu bên phải.
   - Nút Submit gradient cam Lazada có vòng xoay loading spinner.
   - Dòng hỗ trợ: "Quên mật khẩu? Vui lòng liên hệ Quản trị viên để được hỗ trợ".

---

## 2. Quy Chuẩn Responsive Mobile 360px
1. **Touch Target:** Chiều cao tối thiểu của nút bấm và menu items là **44px**.
2. **Mobile Drawer:** Sidebar tự động chuyển thành ngăn kéo trượt mượt mà có backdrop che mờ trên màn hình <= 768px.
3. **Không vỡ khung:** Tất cả các bảng, cards tự động wrap hoặc scroll ngang an toàn mà không làm tràn viewport.
