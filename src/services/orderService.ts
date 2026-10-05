/**
 * Service quản lý Tạo Đơn Hàng & Đơn Nháp (Story S3-09 / SCRUM-14)
 * Phân hệ: EP-04 Đặt hàng & Duyệt ngoại lệ (order, cart, approval)
 */

import type { OrderDraft, OrderItem, OrderItemUnitOption } from '../types/order';
import type { CustomerGroupId } from '../types/agency';

const DRAFTS_STORAGE_KEY = 'erp_order_drafts_v1';
const ACTIVE_DRAFT_KEY = 'erp_order_current_active_draft';
const CONFIRMED_ORDERS_KEY = 'erp_confirmed_orders_v1';

/**
 * Định nghĩa sản phẩm mẫu có sẵn đơn vị tính quy đổi và giá chuẩn
 */
export interface OrderProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  basePrice: number; // Giá bán lẻ niêm yết theo đơn vị cơ sở
  availableUnits: {
    unitName: string;
    conversionFactor: number;
    isBaseUnit: boolean;
  }[];
  stockAvailable: number; // Tồn khả dụng (ĐVT cơ sở)
}

export const CATALOG_ORDERABLE_PRODUCTS: OrderProductCatalogItem[] = [
  {
    id: 'prod-bia-01',
    sku: 'BIA-SG-330',
    name: 'Bia Saigon Special 330ml (Lon)',
    category: 'Đồ uống có cồn',
    baseUnit: 'Lon',
    basePrice: 15500,
    stockAvailable: 2400,
    availableUnits: [
      { unitName: 'Thùng (24 lon)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Lốc (6 lon)', conversionFactor: 6, isBaseUnit: false },
      { unitName: 'Lon', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-bia-02',
    sku: 'BIA-HN-330',
    name: 'Bia Hà Nội Lon 330ml (Lon)',
    category: 'Đồ uống có cồn',
    baseUnit: 'Lon',
    basePrice: 14500,
    stockAvailable: 3600,
    availableUnits: [
      { unitName: 'Thùng (24 lon)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Lốc (6 lon)', conversionFactor: 6, isBaseUnit: false },
      { unitName: 'Lon', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-bia-03',
    sku: 'BIA-KEN-330',
    name: 'Bia Heineken Silver 330ml (Lon)',
    category: 'Đồ uống có cồn',
    baseUnit: 'Lon',
    basePrice: 20500,
    stockAvailable: 1800,
    availableUnits: [
      { unitName: 'Thùng (24 lon)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Lốc (6 lon)', conversionFactor: 6, isBaseUnit: false },
      { unitName: 'Lon', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-bia-04',
    sku: 'BIA-HN-CHAI',
    name: 'Bia Hà Nội Nhãn Vàng 450ml (Chai)',
    category: 'Đồ uống có cồn',
    baseUnit: 'Chai',
    basePrice: 12000,
    stockAvailable: 1500,
    availableUnits: [
      { unitName: 'Két (20 chai)', conversionFactor: 20, isBaseUnit: false },
      { unitName: 'Chai', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-ngk-01',
    sku: 'COCA-320',
    name: 'Nước Ngọt Coca-Cola Original 320ml (Lon)',
    category: 'Nước giải khát',
    baseUnit: 'Lon',
    basePrice: 10000,
    stockAvailable: 4800,
    availableUnits: [
      { unitName: 'Thùng (24 lon)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Lốc (6 lon)', conversionFactor: 6, isBaseUnit: false },
      { unitName: 'Lon', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-ngk-02',
    sku: 'PEPSI-320',
    name: 'Nước Ngọt Pepsi Không Calo 320ml (Lon)',
    category: 'Nước giải khát',
    baseUnit: 'Lon',
    basePrice: 9800,
    stockAvailable: 3200,
    availableUnits: [
      { unitName: 'Thùng (24 lon)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Lốc (6 lon)', conversionFactor: 6, isBaseUnit: false },
      { unitName: 'Lon', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-ngk-03',
    sku: 'TRA-XANH-455',
    name: 'Trà Xanh Không Độ 455ml (Chai)',
    category: 'Nước giải khát',
    baseUnit: 'Chai',
    basePrice: 8500,
    stockAvailable: 2800,
    availableUnits: [
      { unitName: 'Thùng (24 chai)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Lốc (6 chai)', conversionFactor: 6, isBaseUnit: false },
      { unitName: 'Chai', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-ngk-04',
    sku: 'LAVIE-500',
    name: 'Nước Khoáng La Vie 500ml (Chai)',
    category: 'Nước giải khát',
    baseUnit: 'Chai',
    basePrice: 5000,
    stockAvailable: 6000,
    availableUnits: [
      { unitName: 'Thùng (24 chai)', conversionFactor: 24, isBaseUnit: false },
      { unitName: 'Chai', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-bk-01',
    sku: 'DANISA-454',
    name: 'Bánh Quy Bơ Danisa 454g (Hộp)',
    category: 'Bánh kẹo & Tiện lợi',
    baseUnit: 'Hộp',
    basePrice: 125000,
    stockAvailable: 800,
    availableUnits: [
      { unitName: 'Thùng (12 hộp)', conversionFactor: 12, isBaseUnit: false },
      { unitName: 'Hộp', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-bk-02',
    sku: 'CHOCO-12',
    name: 'Bánh Chocopie Orion Hộp 12 Cái (Hộp)',
    category: 'Bánh kẹo & Tiện lợi',
    baseUnit: 'Hộp',
    basePrice: 56000,
    stockAvailable: 1200,
    availableUnits: [
      { unitName: 'Thùng (8 hộp)', conversionFactor: 8, isBaseUnit: false },
      { unitName: 'Hộp', conversionFactor: 1, isBaseUnit: true }
    ]
  },
  {
    id: 'prod-gv-01',
    sku: 'NAMNGU-900',
    name: 'Nước Mắm Nam Ngư Đệ Nhị 900ml (Chai)',
    category: 'Gia vị & Chế biến',
    baseUnit: 'Chai',
    basePrice: 26000,
    stockAvailable: 2100,
    availableUnits: [
      { unitName: 'Thùng (15 chai)', conversionFactor: 15, isBaseUnit: false },
      { unitName: 'Chai', conversionFactor: 1, isBaseUnit: true }
    ]
  }
];

/**
 * Tính đơn giá theo nhóm khách hàng (Bảng giá S2-10)
 * TIER_1: Giảm 15%
 * TIER_2: Giảm 8%
 * RETAIL_SHOWROOM: Giữ nguyên 100%
 */
export function getPriceMultiplierForCustomerGroup(customerGroup?: CustomerGroupId): number {
  switch (customerGroup) {
    case 'TIER_1':
      return 0.85; // Chiết khấu thương mại 15%
    case 'TIER_2':
      return 0.92; // Chiết khấu thương mại 8%
    case 'RETAIL_SHOWROOM':
    default:
      return 1.0;
  }
}

/**
 * Tính các tùy chọn đơn vị tính kèm giá bán đã nhân hệ số cho 1 sản phẩm
 */
export function buildItemUnitOptions(
  product: OrderProductCatalogItem,
  customerGroup?: CustomerGroupId
): OrderItemUnitOption[] {
  const multiplier = getPriceMultiplierForCustomerGroup(customerGroup);
  const baseUnitPrice = Math.round(product.basePrice * multiplier);

  return product.availableUnits.map((u) => ({
    unitName: u.unitName,
    conversionFactor: u.conversionFactor,
    isBaseUnit: u.isBaseUnit,
    unitPrice: Math.round(baseUnitPrice * u.conversionFactor)
  }));
}

/**
 * Tính toán chiết khấu sản lượng theo chính sách Best-Deal (S3-01)
 * Bậc sản lượng (quy đổi ra ĐVT cơ sở):
 * >= 100: 8%
 * >= 50: 5%
 * >= 20: 3%
 * < 20: 0%
 */
export function calculateVolumeDiscount(
  baseQuantity: number,
  rawAmount: number
): { percent: number; amount: number; note: string } {
  if (baseQuantity >= 100) {
    const percent = 8;
    const amount = Math.round((rawAmount * percent) / 100);
    return {
      percent,
      amount,
      note: 'Ưu đãi sản lượng lớn: Giảm 8% (>= 100 đơn vị cơ sở)'
    };
  } else if (baseQuantity >= 50) {
    const percent = 5;
    const amount = Math.round((rawAmount * percent) / 100);
    return {
      percent,
      amount,
      note: 'Ưu đãi sản lượng khá: Giảm 5% (>= 50 đơn vị cơ sở)'
    };
  } else if (baseQuantity >= 20) {
    const percent = 3;
    const amount = Math.round((rawAmount * percent) / 100);
    return {
      percent,
      amount,
      note: 'Ưu đãi sản lượng khởi điểm: Giảm 3% (>= 20 đơn vị cơ sở)'
    };
  }
  return { percent: 0, amount: 0, note: '' };
}

/**
 * Tính toán lại dòng hàng khi thay đổi số lượng hoặc đơn vị tính
 */
export function recalculateOrderItem(
  item: OrderItem,
  newQuantity?: number,
  newUnitName?: string
): OrderItem {
  const quantity = newQuantity !== undefined ? Math.max(1, newQuantity) : item.quantity;
  let selectedUnit = item.selectedUnit;
  let conversionFactor = item.conversionFactor;
  let unitPrice = item.unitPrice;

  if (newUnitName && newUnitName !== item.selectedUnit) {
    const matchedUnit = item.availableUnits.find((u) => u.unitName === newUnitName);
    if (matchedUnit) {
      selectedUnit = matchedUnit.unitName;
      conversionFactor = matchedUnit.conversionFactor;
      unitPrice = matchedUnit.unitPrice;
    }
  }

  const baseQuantity = quantity * conversionFactor;
  const rawAmount = quantity * unitPrice;
  const discount = calculateVolumeDiscount(baseQuantity, rawAmount);
  const finalAmount = rawAmount - discount.amount;

  return {
    ...item,
    quantity,
    selectedUnit,
    conversionFactor,
    unitPrice,
    baseQuantity,
    rawAmount,
    discountPercent: discount.percent,
    discountAmount: discount.amount,
    finalAmount,
    appliedDiscountNote: discount.note
  };
}

/**
 * Tạo mới 1 dòng OrderItem từ sản phẩm được chọn
 */
export function createOrderItemFromCatalog(
  product: OrderProductCatalogItem,
  customerGroup?: CustomerGroupId,
  initialQuantity = 1
): OrderItem {
  const availableUnits = buildItemUnitOptions(product, customerGroup);
  // Ưu tiên chọn đơn vị đóng gói lớn nhất (vd: Thùng) nếu có, hoặc ĐVT cơ sở
  const defaultUnit = availableUnits[0] || {
    unitName: product.baseUnit,
    conversionFactor: 1,
    isBaseUnit: true,
    unitPrice: Math.round(product.basePrice * getPriceMultiplierForCustomerGroup(customerGroup))
  };

  const initialItem: OrderItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    baseUnit: product.baseUnit,
    selectedUnit: defaultUnit.unitName,
    conversionFactor: defaultUnit.conversionFactor,
    quantity: initialQuantity,
    baseQuantity: initialQuantity * defaultUnit.conversionFactor,
    unitPrice: defaultUnit.unitPrice,
    rawAmount: initialQuantity * defaultUnit.unitPrice,
    discountPercent: 0,
    discountAmount: 0,
    finalAmount: initialQuantity * defaultUnit.unitPrice,
    availableUnits
  };

  return recalculateOrderItem(initialItem, initialQuantity, defaultUnit.unitName);
}

/**
 * Tính tổng kết tài chính cho toàn bộ đơn hàng
 */
export function calculateOrderTotals(items: OrderItem[]): {
  totalItemsCount: number;
  totalQuantity: number;
  subtotalAmount: number;
  discountAmount: number;
  totalPayable: number;
} {
  const totalItemsCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalAmount = items.reduce((sum, item) => sum + item.rawAmount, 0);
  const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const totalPayable = subtotalAmount - discountAmount;

  return {
    totalItemsCount,
    totalQuantity,
    subtotalAmount,
    discountAmount,
    totalPayable
  };
}

// ======================== QUẢN LÝ ĐƠN NHÁP (LOCAL PERSISTENCE) ========================

/**
 * Lấy danh sách toàn bộ các đơn nháp đã lưu
 */
export function getSavedDrafts(): OrderDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OrderDraft[];
  } catch (err) {
    console.error('Lỗi đọc đơn nháp:', err);
    return [];
  }
}

/**
 * Lưu đơn nháp vào LocalStorage (hỗ trợ tạo mới hoặc cập nhật đơn dở)
 */
export function saveDraft(draft: OrderDraft): OrderDraft {
  const drafts = getSavedDrafts();
  const existingIdx = drafts.findIndex((d) => d.id === draft.id);

  const updatedDraft: OrderDraft = {
    ...draft,
    status: 'DRAFT',
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    drafts[existingIdx] = updatedDraft;
  } else {
    drafts.unshift(updatedDraft);
  }

  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  return updatedDraft;
}

/**
 * Xóa một đơn nháp
 */
export function deleteDraft(draftId: string): boolean {
  const drafts = getSavedDrafts();
  const filtered = drafts.filter((d) => d.id !== draftId);
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));

  // Nếu đang active chính đơn này thì dọn dẹp active draft
  const activeDraft = getActiveDraft();
  if (activeDraft && activeDraft.id === draftId) {
    clearActiveDraft();
  }
  return true;
}

/**
 * Lấy đơn nháp đang thao tác dở (Auto-save)
 */
export function getActiveDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
}

/**
 * Tự động lưu tiến trình đơn đang gõ dở
 */
export function setActiveDraft(draft: OrderDraft): void {
  try {
    localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('Lỗi auto-save active draft:', err);
  }
}

/**
 * Xóa trạng thái đơn đang gõ dở
 */
export function clearActiveDraft(): void {
  localStorage.removeItem(ACTIVE_DRAFT_KEY);
}

/**
 * Chốt đơn hàng chính thức
 */
export function confirmOrder(order: OrderDraft): {
  success: boolean;
  message: string;
  orderNumber: string;
} {
  const orderNumber = `DH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const confirmedOrder: OrderDraft = {
    ...order,
    status: 'CONFIRMED',
    orderNumber,
    updatedAt: new Date().toISOString()
  };

  // Lưu vào danh sách đơn hàng đã chốt
  try {
    const raw = localStorage.getItem(CONFIRMED_ORDERS_KEY);
    const list: OrderDraft[] = raw ? JSON.parse(raw) : [];
    list.unshift(confirmedOrder);
    localStorage.setItem(CONFIRMED_ORDERS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Lỗi lưu đơn chốt:', err);
  }

  // Xóa khỏi danh sách đơn nháp nếu trước đó là nháp
  deleteDraft(order.id);
  clearActiveDraft();

  return {
    success: true,
    message: `Đã tạo thành công đơn hàng [${orderNumber}] cho đại lý ${order.agencyName}!`,
    orderNumber
  };
}

/**
 * Định dạng tiền tệ VND
 */
export function formatCurrencyVND(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

/**
 * Định dạng số lượng
 */
export function formatQuantity(val: number): string {
  return new Intl.NumberFormat('vi-VN').format(val);
}
