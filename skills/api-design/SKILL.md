---
name: api-design
description: Quy chuẩn thiết kế RESTful API, định dạng phản hồi chuẩn ApiResponse, mã lỗi HTTP và cơ chế xác thực JWT cho Frontend và Backend.
---

# API Design Skill

## 1. Chuẩn Hóa Cấu Trúc Phản Hồi (ApiResponse)
Mọi API trả về từ Backend đến Frontend bắt buộc phải đồng nhất theo cấu trúc sau:

### Phản hồi thành công:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thao tác thành công",
  "data": { ... }
}
```

### Phản hồi thất bại:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Số lượng tồn kho không đủ để giữ chỗ cho đơn hàng này",
  "errors": null
}
```

---

## 2. Quy Chuẩn Đặt Tên Endpoint (RESTful Conventions)
- Sử dụng danh từ số nhiều, chữ thường, nối bằng dấu gạch ngang (`kebab-case`).
- Bắt đầu bằng tiền tố phiên bản: `/api/v1/...`

### Bảng Endpoint Mẫu:
| Phương thức | Endpoint | Ý nghĩa |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Đăng nhập hệ thống, sinh JWT |
| `GET` | `/api/v1/navigation/user-context` | Lấy profile và menu động theo quyền |
| `GET` | `/api/v1/products` | Lấy danh sách sản phẩm (có phân trang) |
| `GET` | `/api/v1/products/{id}` | Lấy chi tiết 1 sản phẩm |
| `POST` | `/api/v1/products` | Tạo mới sản phẩm |
| `POST` | `/api/v1/orders` | Tạo đơn hàng mới |
| `PUT` | `/api/v1/orders/{id}/status` | Cập nhật trạng thái đơn hàng |
| `GET` | `/api/v1/inventory/lots` | Lấy danh sách lô kho theo hạn sử dụng (FEFO) |

---

## 3. Quy Chuẩn Mã HTTP Status
- `200 OK`: Truy vấn hoặc cập nhật thành công.
- `201 Created`: Tạo mới bản ghi thành công (POST).
- `400 Bad Request`: Sai dữ liệu đầu vào hoặc vi phạm ràng buộc nghiệp vụ (vd: thiếu tồn kho, quá hạn mức công nợ).
- `401 Unauthorized`: Chưa đăng nhập hoặc Token JWT hết hạn / không hợp lệ.
- `403 Forbidden`: Đã đăng nhập nhưng không đủ quyền hạn (vd: Nhân viên kho cố truy cập báo cáo doanh thu).
- `404 Not Found`: Không tìm thấy bản ghi được yêu cầu.
- `500 Internal Server Error`: Lỗi phát sinh từ máy chủ.

---

## 4. Xác Thực Header & Phân Trang
- **Header xác thực:** Mọi request bảo mật bắt buộc gửi:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Phân trang chuẩn:**
  `GET /api/v1/products?page=0&size=10&sort=createdAt,desc`
