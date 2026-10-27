# =============================================================================
# Frontend ERP Sales & Inventory - React 19 + Vite
# Tầng 1 build ra file tĩnh (dist/), tầng 2 phục vụ bằng nginx (nhẹ, nhanh, không cần Node khi chạy).
# =============================================================================

# ---------- Tầng 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Cài thư viện trước (cache theo package-lock.json): chỉ sửa code thì không phải cài lại
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

# Địa chỉ API gắn vào lúc build. Để trống: giao diện tự gọi http://<tên máy đang mở web>:8080
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Chỉ đóng gói (vite build). Kiểm tra kiểu TypeScript chạy riêng bằng "npm run build" / CI
RUN npx vite build

# ---------- Tầng 2: chạy ----------
FROM nginx:1.27-alpine AS runtime

ENV TZ=Asia/Ho_Chi_Minh
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
