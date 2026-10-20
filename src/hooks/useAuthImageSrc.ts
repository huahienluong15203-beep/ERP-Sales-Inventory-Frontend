import { useEffect, useState } from 'react';
import { API_BASE_URL, authFetch } from '../services/api';

/**
 * Ảnh lưu sau API có kiểm quyền (vd: /api/payments/{id}/image) không mở trực tiếp bằng <img src> được
 * vì thiếu token đăng nhập. Hook tải ảnh qua authFetch rồi trả Blob URL; đường dẫn http(s) / data URL giữ nguyên.
 */
export function useAuthImageSrc(url?: string | null): { src: string | null; loading: boolean; error: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setError(false);
    if (!url) {
      setSrc(null);
      setLoading(false);
      return;
    }
    if (!url.startsWith('/api/')) {
      setSrc(url);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    setLoading(true);
    authFetch(`${API_BASE_URL}${url}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { src, loading, error };
}
