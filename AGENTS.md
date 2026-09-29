# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# ERP SALES & INVENTORY (TTCS_T926_K13C4_N3) — QUY CHUẨN DỰ ÁN
*Tổng hợp từ `GIT FLOW.docx`, `GIT CONVENTION.docx` và `HeThongQLKhoHang.xlsx`*

## 5. Tổng Quan Dự Án, Đội Ngũ & 7 Vai Trò (Roles & RBAC)
- **Quy mô**: 350 SP | 76 Stories | 8 Sprints (1 tuần/sprint, 42–45 SP/sprint) | PostgreSQL, JWT RBAC, Object Storage, Server PDF, UTC+7, VND.
- **Nhóm 3 (10 thành viên)**: Tech Lead: Hứa Hiền Lương | PO: Nguyễn Thiên | BE: Lê Hồng Phong, Trần Vũ Minh, Lưu Thanh Nguyên, Nguyễn Văn Minh | FE: Nguyễn Duy Niên, Lê Đắc Lộc, Vũ Ngọc Phong | QA: Ngô Phương Mai, Ngô Thị Ánh Ngọc.
- **7 Vai trò**: `Customer` (Đại lý - R*/W*), `Sales Rep` (Kinh doanh - W*/R*), `Sales Manager` (Quản lý KD - F), `Warehouse` (Kho - W), `WH Manager` (Quản lý kho - F), `Accountant` (Kế toán - F), `Admin` (Quản trị - F). (*Chỉ truy cập dữ liệu trong phạm vi phụ trách).
- **BẢO MẬT BẮT BUỘC**: Giá vốn & Biên lợi nhuận gộp CHỈ Quản lý kinh doanh và Admin xem; BẮT BUỘC lọc/che giấu (mask/strip) ở **tầng Server-side API**, tuyệt đối không chỉ ẩn ở UI.

## 6. 9 Phân Hệ Nghiệp Vụ (Epics & Git Scopes)
- **EP-01** Tài khoản & Phân quyền (`auth`, `rbac`, `profile`) | **EP-02** Sản phẩm & Bảng giá (`product`, `pricing`)
- **EP-03** Đại lý & Hạn mức nợ (`customer`, `debt-limit`) | **EP-04** Đặt hàng & Duyệt ngoại lệ (`order`, `cart`, `approval`)
- **EP-05** Kho & Tồn theo lô/hạn (`inventory`, `warehouse`, `batch`) | **EP-06** Xuất kho FEFO & Giao hàng (`shipping`, `fefo`, `delivery`)
- **EP-07** Hoá đơn & Công nợ (`invoice`, `payment`, `debt`) | **EP-08** Trả hàng & Điều chỉnh kho (`return`, `adjustment`)
- **EP-09** Báo cáo & Dashboard (`report`, `dashboard`)

## 7. Quy Trình Phân Nhánh Git Flow (5 Golden Rules)
1. **Protected Branches**: Cấm commit trực tiếp lên `main` và `develop`. Mọi thay đổi phải qua PR được duyệt.
2. **Squash and Merge**: Mọi nhánh tính năng rẽ từ `develop` mới nhất và merge vào `develop` bằng Squash and Merge.
3. **Rebase trước khi PR**: Bắt buộc chạy `git pull --rebase origin develop` và xử lý conflict tại local trước khi mở PR.
4. **Cấm phá hủy lịch sử**: Không dùng `git push --force` trên các nhánh chung (chỉ dùng `--force-with-lease` trên nhánh cá nhân).
5. **Đạt chuẩn DoD**: Code chỉ được coi là hoàn tất khi deploy Staging, pass 100% test case và được Tester/PO nghiệm thu.
- **Quy ước đặt tên nhánh**: `<prefix>/<scope>-<JIRA-KEY>-<short-description>` (vd: `feature/order-S3-01-cart-auto-pricing`).
  - Prefix: `feature/`, `bugfix/`, `hotfix/`, `release/`, `refactor/`, `chore/`. Dùng kebab-case, chữ thường, từ 3–5 từ, cấm tên mơ hồ.
- **Vòng đời 7 bước**: Nhận Jira (In Progress) -> Checkout nhánh -> Code & Test (Service coverage >= 60%) -> Rebase develop & test local -> Mở PR kèm template -> Code review (>=1 Peer + Tech Lead duyệt Core, phản hồi <=4h) -> Squash & Merge -> Deploy Staging -> QA nghiệm thu -> Jira Done.
- **Release & Hotfix**: 17:00 Thứ 5 Code Freeze -> `release/vX.Y.Z-sprint-N` -> QA regression -> Thứ 6 PO nghiệm thu -> Merge `main` & `develop` -> Tag `vX.Y.Z`. Hotfix tách từ `main` -> test -> PR vào `main` -> merge `develop` -> Tag bản vá.

## 8. Quy Chuẩn Commit Message & Pull Request
- **Commit chuẩn**: `<type>(<scope>): [<JIRA-KEY>] <subject>` (Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`, `ci`).
- **Jira Smart Commits**: `#resolve`/`#close`/`#done`, `#time <duration>`, `#comment <text>` (vd: `feat(order): [S3-01] calculate real-time pricing #time 4h`).
- **PR Template & Phê duyệt**: Bắt buộc có tóm tắt thay đổi, hướng dẫn test, ảnh/log test pass và checklist DoD. Build CI (lint, build, test) phải XANH 100%.

## 9. Nguyên Tắc Nghiệp Vụ Cốt Lõi & Kiến Trúc Bất Biến
- **Giao dịch bất khả phân (Atomic Transaction)**: Trừ tồn kho, giữ chỗ (`reserved stock`), hoàn tồn và ghi công nợ BẮT BUỘC nằm trong 1 Database Transaction; rollback toàn bộ ngay khi có lỗi.
- **Chống bán âm & Tranh chấp (Pessimistic Lock)**: Khi chốt đơn bắt buộc khóa dòng `SELECT ... FOR UPDATE`. `Tồn khả dụng = Tồn thực tế - Tồn giữ chỗ`. Chặn ngay lập tức nếu `Số lượng đặt > Tồn khả dụng`.
- **Quy tắc Đơn Vị Tính Cơ Sở (Base Unit Rule)**: Mọi bản ghi thẻ kho, tồn kho, công nợ BẮT BUỘC lưu theo Đơn vị cơ sở (lon, gói, cái). Đơn vị quy đổi (thùng, lốc) chỉ là lớp trình bày ở UI/phiếu in.
- **Thẻ kho bất biến (Immutable Stock Ledger)**: Cấm sửa trực tiếp số lượng tồn; mọi biến động kho đều phải có chứng từ và sinh bản ghi thẻ kho tức thời.
- **Xuất kho FEFO**: Hệ thống tự động gợi ý xuất lô hạn sử dụng gần nhất trước; cảnh báo đỏ với các lô hàng còn dưới 30 ngày hết hạn.
- **Kiểm soát hạn mức công nợ**: Tự động chặn đơn và chuyển Quản lý kinh doanh duyệt ngoại lệ nếu vượt hạn mức tín dụng hoặc có nợ quá hạn.
- **Phân tách trách nhiệm (SoD)**: Phiếu điều chỉnh tồn kho (hỏng/mất) người lập != người duyệt; chỉ có hiệu lực khi Quản lý kho (`WH Manager`) phê duyệt.

## 10. Tiêu Chuẩn NFR, DoR, DoD & Chỉ Dẫn Cho AI Agent
- **NFR (Phi chức năng)**: Thêm dòng hàng < 500ms (5.000 SKU); tải danh sách đơn < 1.5s; dashboard < 2s; Responsive chuẩn từ màn hình 360px; Ngôn ngữ 100% tiếng Việt; Ghi nhật ký kiểm toán (audit log) đầy đủ cho kho và công nợ.
- **DoR (Đưa vào Sprint)**: Viết đúng mẫu `Là [Vai trò], tôi muốn [Hành động], để [Giá trị]`, AC rõ ràng kiểm chứng được, kích thước <= 8 SP (nếu lớn hơn phải chẻ nhỏ thành API và UI riêng tại Sprint Planning).
- **DoD (Nghiệm thu Story)**: Pass 100% AC, >=1 Reviewer duyệt (Core có Tech Lead), Unit test tầng service độ phủ nhánh mới >= 60%, CI pass 100%, deploy Staging thành công, bảo mật server-side RBAC, responsive 360px, không lỗi Major/Blocker, PO (Nguyễn Thiên) ký nghiệm thu trên Staging.
- **Chỉ dẫn cho AI Agent**: Luôn tra đúng Epic/Scope để đặt tên nhánh và commit; Luôn dùng DB Transaction và Pessimistic Lock khi động vào kho/nợ; Luôn quy đổi Base Unit; Tuyệt đối không để lộ giá vốn ra API công khai; Tuân thủ phong cách can thiệp tối giản (Surgical Changes).
