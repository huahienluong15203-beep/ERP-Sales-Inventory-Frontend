---
name: code-review
description: Quy chuẩn rà soát mã nguồn (Code Review), kiểm tra tính tuân thủ kiến trúc phân lớp, Clean Code, bảo mật và an toàn dữ liệu.
---

# Code Review Skill

## Checklist Rà Soát 5 Tiêu Chí Bắt Buộc Trước Khi Duyệt Pull Request (PR)

### 1. Tính Tuân Thủ Kiến Trúc Phân Lớp (Architecture)
- **Backend (Spring Boot):**
  - Logic nghiệp vụ bắt buộc nằm ở `Service Layer`. Tuyệt đối không viết logic tính toán/truy vấn DB trong `Controller`.
  - Các thao tác cập nhật nhiều bảng (như trừ tồn kho + tạo đơn hàng) bắt buộc phải bọc trong `@Transactional`.
- **Frontend (React):**
  - Logic gọi API bắt buộc tách riêng vào thư mục `services/` hoặc `api/`. Không gọi fetch/axios trực tiếp trong component UI.

---

### 2. An Toàn Kiểu Dữ Liệu & Validation
- **Backend:** Request Body trong Controller phải được bọc `@Valid` kèm DTO cụ thể. Không nhận trực tiếp Entity từ client.
- **Frontend:** Cấm tuyệt đối lạm dụng kiểu `any` trong TypeScript. Phải định nghĩa đầy đủ interface / type tương ứng với Backend DTO.

---

### 3. Xử Lý Ngoại Lệ & Lỗi (Error Handling)
- Bắt lỗi ngoại lệ đầy đủ và trả về đúng mã HTTP (400, 401, 403, 404, 500) kèm thông điệp rõ ràng cho người dùng.
- Không để lộ thông tin nhạy cảm của server hoặc database trong StackTrace trả về phía client.

---

### 4. Bảo Mật Hệ Thống (Security)
- Mật khẩu người dùng bắt buộc mã hóa bằng BCrypt (`PasswordEncoder`).
- Các endpoint phân quyền nghiệp vụ phải có `@PreAuthorize("hasRole(...)")` hoặc cấu hình chuẩn trong `SecurityConfig`.
- Tuyệt đối không commit password database, secret key JWT vào repository công khai.

---

### 5. Clean Code & Quy Chuẩn Chung
- Đã xóa toàn bộ các lệnh in debug tạm thời (`console.log`, `System.out.println`) trước khi mở PR.
- Tên biến, tên hàm, tên class đặt chuẩn tiếng Anh, có ý nghĩa rõ ràng (camelCase cho biến/hàm, PascalCase cho class/component).
- Đã chạy thử kiểm thử đơn vị hoặc test luồng thực tế thành công trên máy cá nhân.
