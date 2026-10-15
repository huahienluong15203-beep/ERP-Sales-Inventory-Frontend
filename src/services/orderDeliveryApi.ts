/**
 * S6-08: API Xác nhận giao hàng, tải ảnh biên bản có chữ ký (POD) & giao không thành công
 */

import { authFetch, API_BASE_URL } from './api';

export interface OrderLineDeliveryInput {
  lineId: number;
  deliveredQuantity: number;
  shortageReason?: string;
}

export interface OrderDeliveryConfirmInput {
  receiverName: string;
  deliveredAt?: string;
  note?: string;
  lineDeliveries?: OrderLineDeliveryInput[];
}

/**
 * 1. Tải ảnh biên bản giao hàng có chữ ký (JPG / PNG, tối đa 5MB)
 * POST /api/orders/{id}/delivery-proof
 */
export async function uploadDeliveryProof(orderId: number, file: File | Blob, fileName = 'bien-ban-giao-hang.jpg'): Promise<any> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', file, fileName);
  }

  const res = await authFetch(`${API_BASE_URL}/api/orders/${orderId}/delivery-proof`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể tải lên ảnh biên bản giao hàng');
  }

  return await res.json();
}

/**
 * 2. Xác nhận giao hàng thành công (Đã xuất -> Đã giao)
 * POST /api/orders/{id}/confirm-delivery
 */
export async function confirmOrderDelivery(
  orderId: number,
  data: OrderDeliveryConfirmInput
): Promise<any> {
  const cleanName = (data.receiverName || '').trim();
  if (!cleanName) {
    throw new Error('Bắt buộc nhập tên người nhận hàng');
  }

  const payload: any = {
    receiverName: cleanName,
    note: data.note?.trim() || undefined
  };

  if (data.deliveredAt) {
    payload.deliveredAt = data.deliveredAt;
  }
  if (data.lineDeliveries && data.lineDeliveries.length > 0) {
    payload.lineDeliveries = data.lineDeliveries;
  }

  const res = await authFetch(`${API_BASE_URL}/api/orders/${orderId}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    // Nếu có lỗi cụ thể
    if (err?.code === 'DELIVERY_PROOF_REQUIRED' || err?.message?.includes('biên bản')) {
      throw new Error('Bắt buộc phải tải ảnh biên bản có chữ ký trước khi xác nhận giao thành công');
    }
    throw new Error(err?.message || err?.error || 'Không thể xác nhận giao hàng');
  }

  return await res.json();
}

/**
 * 3. Ghi nhận giao không thành công
 * POST /api/orders/{id}/delivery-failed
 */
export async function failOrderDelivery(orderId: number, reason: string): Promise<any> {
  const cleanReason = (reason || '').trim();
  if (!cleanReason) {
    throw new Error('Bắt buộc chọn hoặc nhập lý do giao không thành công');
  }

  const res = await authFetch(`${API_BASE_URL}/api/orders/${orderId}/delivery-failed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: cleanReason })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || 'Không thể ghi nhận giao không thành công');
  }

  return await res.json();
}

/**
 * 4. Tải dữ liệu ảnh biên bản giao hàng về để hiển thị an toàn qua Blob URL
 * GET /api/orders/{id}/delivery-proof
 */
export async function fetchDeliveryProofBlobUrl(orderId: number): Promise<string> {
  const res = await authFetch(`${API_BASE_URL}/api/orders/${orderId}/delivery-proof`);
  if (!res.ok) {
    throw new Error('Không thể tải ảnh biên bản hoặc đơn hàng chưa có ảnh');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
