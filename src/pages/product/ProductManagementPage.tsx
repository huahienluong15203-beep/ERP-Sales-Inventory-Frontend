import React, { useState, useEffect, useCallback } from 'react';
import type { Product, ProductStatus } from '../../types/product';
import {
  productService,
  PRODUCT_CATEGORIES,
  canManageCostPrice,
  formatCurrencyVND
} from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';
import { Icons } from '../../components/common/Icons';
import { ProductFormModal } from './components/ProductFormModal';

export const ProductManagementPage: React.FC = () => {
  const { currentRole } = useAuth();
  const canSeeCost = canManageCostPrice(currentRole);

  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [blockedDeleteProduct, setBlockedDeleteProduct] = useState<Product | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productService.getProducts({
        keyword,
        category: selectedCategory,
        status: selectedStatus,
        pageSize: 100
      });
      setProducts(res.products);
    } finally {
      setIsLoading(false);
    }
  }, [keyword, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (p: Product) => {
    if (p.transactionCount > 0) {
      setBlockedDeleteProduct(p);
    } else {
      setConfirmDeleteProduct(p);
    }
  };

  const handleConfirmNormalDelete = async () => {
    if (!confirmDeleteProduct) return;
    const res = await productService.deleteProduct(confirmDeleteProduct.id);
    setConfirmDeleteProduct(null);
    showToast(res.message);
    if (res.success) {
      loadProducts();
    }
  };

  const handleSwitchToInactive = async () => {
    if (!blockedDeleteProduct) return;
    const res = await productService.deactivateProduct(blockedDeleteProduct.id);
    setBlockedDeleteProduct(null);
    showToast(res.message);
    loadProducts();
  };

  return (
    <div style={{ padding: '24px', width: '100%', boxSizing: 'border-box' }}>
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#111827',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 10000
          }}
        >
          <Icons.CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Phân hệ S2-05 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1F2937' }}>
              Danh mục Sản phẩm (S2-05)
            </h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#FFEDD5',
                color: '#C2410C'
              }}
            >
              Chuẩn hóa toàn công ty
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            Quản lý mã SKU duy nhất, quy cách đóng gói, đơn vị cơ sở và bảo mật giá vốn theo vai trò.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          style={{
            backgroundColor: '#F85606',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(248, 86, 6, 0.25)'
          }}
        >
          <Icons.Plus size={18} />
          <span>Thêm sản phẩm mới</span>
        </button>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
            <Icons.Search size={16} />
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo Mã SKU, tên hàng, quy cách..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ width: '200px' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#FFFFFF'
            }}
          >
            <option value="ALL">Tất cả nhóm hàng</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: '180px' }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ProductStatus | 'ALL')}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#FFFFFF'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="INACTIVE">Ngừng kinh doanh</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
          Tổng: <b>{products.length}</b> sản phẩm
        </div>
      </div>

      {/* Bảng danh sách sản phẩm full-width sạch sẽ */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: '980px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563' }}>
                <th style={{ padding: '12px 16px', width: '56px', textAlign: 'center', whiteSpace: 'nowrap' }}>ẢNH</th>
                <th style={{ padding: '12px 16px', width: '130px', whiteSpace: 'nowrap' }}>MÃ SKU</th>
                <th style={{ padding: '12px 16px', minWidth: '220px', whiteSpace: 'nowrap' }}>TÊN SẢN PHẨM</th>
                <th style={{ padding: '12px 16px', width: '160px', whiteSpace: 'nowrap' }}>NHÓM HÀNG</th>
                <th style={{ padding: '12px 16px', width: '90px', whiteSpace: 'nowrap' }}>ĐVT CƠ SỞ</th>
                <th style={{ padding: '12px 16px', width: '170px', whiteSpace: 'nowrap' }}>QUY CÁCH ĐÓNG GÓI</th>
                <th style={{ padding: '12px 16px', width: '130px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  GIÁ VỐN
                </th>
                <th style={{ padding: '12px 16px', width: '130px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  TRẠNG THÁI
                </th>
                <th style={{ padding: '12px 16px', width: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#9CA3AF' }}>
                    Đang tải dữ liệu sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Icons.Package size={32} color="#D1D5DB" />
                      <span>Không tìm thấy sản phẩm nào phù hợp</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isInactive = p.status === 'INACTIVE';
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: isInactive ? '#FAFAFA' : '#FFFFFF',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFF7ED';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isInactive ? '#FAFAFA' : '#FFFFFF';
                      }}
                    >
                      {/* 1. Ảnh với fallback an toàn */}
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            backgroundColor: '#F3F4F6',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: '1px solid #E5E7EB'
                          }}
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.sku}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('.fallback-icon')?.removeAttribute('style');
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : null}
                          <span
                            className="fallback-icon"
                            style={{ display: p.imageUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Icons.Package size={20} color="#EA580C" />
                          </span>
                        </div>
                      </td>

                      {/* 2. Mã SKU */}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: '#EA580C',
                            backgroundColor: '#FFF7ED',
                            padding: '3px 7px',
                            borderRadius: '5px',
                            fontSize: '12px'
                          }}
                        >
                          {p.sku}
                        </span>
                      </td>

                      {/* 3. Tên sản phẩm */}
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>
                        <div>{p.name}</div>
                        {p.transactionCount > 0 && (
                          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 400 }}>
                            Đã phát sinh {p.transactionCount} giao dịch
                          </span>
                        )}
                      </td>

                      {/* 4. Nhóm hàng */}
                      <td style={{ padding: '10px 16px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                        {p.category}
                      </td>

                      {/* 5. ĐVT cơ sở */}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                        >
                          {p.baseUnit}
                        </span>
                      </td>

                      {/* 6. Quy cách đóng gói */}
                      <td style={{ padding: '10px 16px', color: '#4B5563' }}>
                        {p.packagingSpec}
                      </td>

                      {/* 7. GIÁ VỐN */}
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {canSeeCost ? (
                          <span style={{ fontWeight: 700, color: '#C2410C' }}>
                            {formatCurrencyVND(p.costPrice)}
                          </span>
                        ) : (
                          <span
                            title="Bảo mật: Chỉ Quản lý kinh doanh & Admin được xem"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#9CA3AF',
                              fontSize: '12px',
                              letterSpacing: '2px',
                              cursor: 'help'
                            }}
                          >
                            <Icons.Lock size={13} color="#9CA3AF" />
                            ••••••
                          </span>
                        )}
                      </td>

                      {/* 8. Trạng thái */}
                      <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {p.status === 'ACTIVE' ? (
                          <span
                            style={{
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            Đang kinh doanh
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            Ngừng kinh doanh
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            title="Sửa thông tin"
                            onClick={() => handleOpenEdit(p)}
                            style={{
                              backgroundColor: '#F3F4F6',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px',
                              cursor: 'pointer',
                              color: '#374151'
                            }}
                          >
                            <Icons.Edit size={15} />
                          </button>

                          <button
                            type="button"
                            title={
                              p.transactionCount > 0
                                ? 'Đã có giao dịch: Không được xóa, chỉ được ngừng kinh doanh'
                                : 'Xóa sản phẩm'
                            }
                            onClick={() => handleDeleteClick(p)}
                            style={{
                              backgroundColor: p.transactionCount > 0 ? '#FEF2F2' : '#FEE2E2',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px',
                              cursor: 'pointer',
                              color: '#DC2626'
                            }}
                          >
                            <Icons.Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Khai báo / Chỉnh sửa */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          loadProducts();
        }}
        productToEdit={editingProduct}
      />

      {/* Modal CHẶN XÓA (Điều kiện 4) */}
      {blockedDeleteProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Icons.AlertTriangle size={24} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: '#111827' }}>
                  Không thể xóa sản phẩm đã có giao dịch!
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: 1.5 }}>
                  Sản phẩm <b>{blockedDeleteProduct.sku} - {blockedDeleteProduct.name}</b> đã phát sinh{' '}
                  <span style={{ color: '#DC2626', fontWeight: 700 }}>
                    {blockedDeleteProduct.transactionCount} giao dịch
                  </span>
                  . Theo quy định hệ thống (S2-05 Điều kiện 4), không được xóa khỏi danh mục để tránh mất mát dữ liệu
                  kế toán và kho. Bạn chỉ có thể chuyển sang <b>Ngừng kinh doanh</b>.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px'
              }}
            >
              <button
                type="button"
                onClick={() => setBlockedDeleteProduct(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSwitchToInactive}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#EA580C',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Chuyển sang Ngừng kinh doanh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal XÁC NHẬN XÓA (transactionCount === 0) */}
      {confirmDeleteProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#111827' }}>
              Xác nhận xóa sản phẩm
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: 1.5 }}>
              Sản phẩm <b>{confirmDeleteProduct.sku} - {confirmDeleteProduct.name}</b> chưa có giao dịch nào phát sinh.
              Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm này không?
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px'
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmNormalDelete}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
