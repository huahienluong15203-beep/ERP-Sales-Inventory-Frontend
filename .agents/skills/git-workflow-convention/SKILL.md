---
name: git-workflow-convention
description: Quy chuẩn Git Flow đa tầng, chuỗi 13 bước phát triển tính năng mới và quy tắc đặt tên commit/nhánh cho đội ngũ ERP Sales & Inventory.
---

# Git Workflow & Convention Skill

## 1. Chuỗi 13 Bước Chuẩn Khi Làm Tính Năng Mới (Quy Tắc 2)
Trước khi code bất kỳ tính năng nào, lập trình viên phải thực hiện đúng 13 bước:
1. `git branch`: Kiểm tra xem máy đang ở nhánh nào. Đảm bảo đang ở `develop` (hoặc checkout develop).
2. `git fetch origin`: Cập nhật thông tin mới nhất từ GitHub remote.
3. `git pull origin develop`: Kéo mã nguồn mới nhất của develop về máy.
4. `git checkout -b feature/<tên-tính-năng>`: Tách nhánh tính năng mới (100% tiếng Anh).
5. `git branch`: Kiểm tra chắc chắn dấu `*` đang ở nhánh mới tạo.
6. `code`: Thực hiện viết code tính năng, viết Unit Test / Component.
7. `git status`: Xem danh sách các file đã chỉnh sửa.
8. `git add <đường_dẫn_file>` (hoặc `git add .`): Thêm file vào Staging.
9. `git status`: Đảm bảo các file cần commit đã chuyển sang màu xanh lá cây.
10. `git commit -m "<type>: <nội dung mô tả>"`: Lưu commit với thông điệp rõ ràng theo Conventional Commits.
11. `git status`: Đảm bảo Working Tree sạch sẽ (working tree clean).
12. `git pull origin develop`: KÉO CODE MỚI NHẤT CỦA DEVELOP VỀ trước khi đẩy (để phát hiện và giải quyết xung đột conflict ngay tại máy cá nhân).
13. `git push origin <tên-nhánh>`: Đẩy nhánh lên GitHub và mở Pull Request (PR) merge vào nhánh `develop`.

---

## 2. Quy Chuẩn Đặt Tên Nhánh (100% Tiếng Anh)
- Tính năng mới: `feature/<tên-tính-năng>` (VD: `feature/auth-core-rbac`, `feature/cart-checkout-ui`)
- Sửa lỗi: `bugfix/<tên-lỗi>` (VD: `bugfix/token-expiration-fix`)
- Tài liệu: `docs/<nội-dung>` (VD: `docs/add-project-guidelines`)
- Tối ưu mã nguồn: `refactor/<nội-dung>` (VD: `refactor/flatten-backend-structure`)
- Thử nghiệm / hotfix: `hotfix/<tên>`

---

## 3. Quy Chuẩn Commit Message
Định dạng: `<type>: <mô tả ngắn gọn bằng tiếng Anh hoặc tiếng Việt rõ ràng>`
- `feat`: Thêm tính năng mới (VD: `feat: implement jwt auth and rbac guard`)
- `fix`: Sửa lỗi phát sinh (VD: `fix: resolve token expire after 24h`)
- `refactor`: Tối ưu hóa / tái cấu trúc code mà không làm đổi tính năng
- `docs`: Thêm hoặc cập nhật tài liệu dự án
- `test`: Thêm hoặc sửa các bài kiểm thử (Unit Test, Integration Test)
- `chore`: Cập nhật cấu hình build, dependency pom.xml, package.json

---

## 4. Hướng Dẫn Xử Lý Khi Gặp Xung Đột (Merge Conflict tại Bước 12)
Nếu ở Bước 12 xuất hiện thông báo `CONFLICT (content): Merge conflict in...`:
1. **Xác định file:** Gõ `git status` để xem danh sách file có trạng thái `both modified:`.
2. **Mở file trong IDE:** Tìm các khối code nằm giữa `<<<<<<< HEAD` (code hiện tại của bạn) và `>>>>>>>` (code mới kéo về từ develop).
3. **Giải quyết xung đột:**
   - *Accept Current Change*: Giữ lại code của bạn.
   - *Accept Incoming Change*: Lấy code mới kéo từ develop về.
   - *Accept Both Changes*: Giữ cả hai đoạn code.
4. **Hoàn tất merge:**
   ```bash
   git add .
   git commit -m "fix: resolve merge conflict with develop"
   git push origin <tên_nhánh_của_bạn>
   ```
