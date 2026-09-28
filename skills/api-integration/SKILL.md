---
name: api-integration
description: Hướng dẫn cấu hình Axios Interceptors, tự động gắn JWT Bearer Token, xử lý lỗi toàn cục và tự động chuyển hướng khi token hết hạn (401).
---

# API Integration Skill

## 1. Cấu Hình Axios Client Với Interceptors
Tạo instance Axios tập trung trong `src/services/apiClient.ts`:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout sau 10 giây
});

// 1. Request Interceptor: Tự động đính kèm Token nếu đã đăng nhập
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Bắt lỗi 401 (hết hạn token) hoặc lỗi hệ thống
apiClient.interceptors.response.use(
  (response) => response.data, // Trả trực tiếp dữ liệu body
  (error: AxiosError<{ message?: string }>) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        // Token không hợp lệ hoặc hết hạn -> xóa token và chuyển về trang đăng nhập
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }

      const errorMessage = error.response.data?.message || 'Có lỗi xảy ra từ máy chủ';
      return Promise.reject(new Error(errorMessage));
    }

    if (error.request) {
      return Promise.reject(new Error('Không thể kết nối đến máy chủ Backend'));
    }

    return Promise.reject(error);
  }
);
```

---

## 2. Viết Service Gọi API Cụ Thể (Ví Dụ Auth Service)

```typescript
// src/services/authService.ts
import { apiClient } from './apiClient';
import { LoginRequest, LoginResponse, ApiResponse, UserProfile } from '../types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return await apiClient.post('/api/auth/login', credentials);
  },

  getUserContext: async (role: string): Promise<ApiResponse<UserProfile>> => {
    return await apiClient.get(`/api/v1/navigation/user-context?role=${role}`);
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },
};
```

---

## 3. Quản Lý Trạng Thái Auth Bằng React Context

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
```
