import React, { useState, useEffect, useMemo } from 'react';
import type { Product, ProductCategoryNode } from '../../types/product';
import { ProductService } from '../../services/productService';
import { CategoryService } from '../../services/categoryService';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_METADATA_MAP } from '../../types/user';
import { Icons } from '../../components/common/Icons';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductExcelImportModal } from './components/ProductExcelImportModal';
import { CategoryTreeView } from './components/CategoryTreeView';

export const ProductManagementPage: React.FC = () => {
  const { currentRole } = useAuth();
  const roleMeta = ROLE_METADATA_MAP[currentRole] || ROLE_METADATA_MAP['ROLE_SALES_MANAGER'];

  // Quyền hạn xem và sửa giá vốn: CHỈ Quản lý kinh doanh và Admin (Quy định bảo mật EP-02)
  const canViewCostPrice = currentRole === 'ROLE_SALES_MANAGER' || currentRole === 'ROLE_ADMIN';

  // Danh sách sản phẩm
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Cây nhóm hàng đa cấp
  const [categoryTree, setCategoryTree] = useState<ProductCategoryNode[]>([]);
  const [selectedTreeNode, setSelectedTreeNode] = useState<ProductCategoryNode | null>(null);
  const [isTreeSidebarOpen, setIsTreeSidebarOpen] = useState<boolean>(true);

  // Bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Trạng thái Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [movingProduct, setMovingProduct] = useState<Product | null>(null);
  const [selectedTargetCatId, setSelectedTargetCatId] = useState<string>('');

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tải cây nhóm hàng
  const loadCategoryTree = () => {
    const tree = CategoryService.getCategoryTree();
    setCategoryTree(tree);
  };

  // Tải danh sách sản phẩm
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await ProductService.getProducts();
      setProducts(data);
    } catch (e) {
      showToast('Lỗi khi tải danh mục sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategoryTree();
  }, []);

  // Danh sách nhóm hàng duy nhất
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).filter(Boolean);
  }, [products]);

  // Lọc sản phẩm theo cây nhóm hàng và các bộ lọc
  const filteredProducts = useMemo(() => {
    // Nếu có chọn nhóm trên cây, lấy tên của nó và tất cả các nhóm con cháu
    let allowedCategoryNames: string[] | null = null;
    if (selectedTreeNode) {
      allowedCategoryNames = CategoryService.getCategoryAndDescendantNames(
        categoryTree,
        selectedTreeNode.id
      );
    }

    return products.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      // Kiểm tra lọc cây nhóm hàng đa cấp
      const matchTreeCategory =
        !selectedTreeNode ||
        !allowedCategoryNames ||
        allowedCategoryNames.includes(p.category) ||
        p.categoryId === selectedTreeNode.id;

      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || p.status === selectedStatus;

      return matchQuery && matchTreeCategory && matchCategory && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, selectedTreeNode, categoryTree]);

  // Xử lý Lưu sản phẩm (Tạo mới hoặc Sửa)
  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      await ProductService.updateProduct(editingProduct.id, productData);
      showToast(`Đã cập nhật sản phẩm "${productData.name}" thành công!`);
    } else {
      await ProductService.createProduct(productData);
      showToast(`Đã khai báo SKU mới "${productData.sku}" thành công!`);
    }
    await loadProducts();
  };

  // Xử lý Xóa sản phẩm (Chỉ cho phép xóa nếu transactionCount = 0)
  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    try {
      await ProductService.deleteProduct(deleteConfirmProduct.id);
      showToast(`Đã xóa SKU "${deleteConfirmProduct.sku}" khỏi danh mục!`);
      setDeleteConfirmProduct(null);
      await loadProducts();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa sản phẩm', 'error');
    }
  };

  // Xử lý Chuyển trạng thái sang Ngừng kinh doanh (Khi sản phẩm đã phát sinh giao dịch)
  const handleDeactivateProduct = async () => {
    if (!deleteConfirmProduct) return;
    try {
      await ProductService.deactivateProduct(deleteConfirmProduct.id);
      showToast(`Đã chuyển sản phẩm "${deleteConfirmProduct.name}" (${deleteConfirmProduct.sku}) sang trạng thái Ngừng kinh doanh!`);
      setDeleteConfirmProduct(null);
      await loadProducts();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi ngừng kinh doanh sản phẩm', 'error');
    }
  };

  // Xử lý Chuyển sản phẩm sang nhóm hàng khác (Qua kéo thả hoặc chọn nhanh)
  const handleMoveProductToCategory = async (productId: string, targetCategory: ProductCategoryNode) => {
    try {
      const updated = await ProductService.moveProductToCategory(productId, targetCategory.id, targetCategory.name);
      showToast(`Đã chuyển sản phẩm "${updated.name}" sang nhóm "${targetCategory.name}" thành công!`);
      await loadProducts();
      loadCategoryTree();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi chuyển nhóm sản phẩm', 'error');
    }
  };

  // Xác nhận chuyển nhóm nhanh qua modal
  const handleQuickMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingProduct || !selectedTargetCatId) return;

    const targetNode = CategoryService.findNodeById(categoryTree, selectedTargetCatId);
    if (!targetNode) {
      showToast('Vui lòng chọn nhóm hàng đích hợp lệ!', 'error');
      return;
    }

    await handleMoveProductToCategory(movingProduct.id, targetNode);
    setMovingProduct(null);
    setSelectedTargetCatId('');
  };

  // Thống kê
  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const inactiveCount = products.filter((p) => p.status === 'INACTIVE').length;
  const convertedCount = products.filter((p) => p.unitConversions && p.unitConversions.length > 0).length;

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: toastMessage.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
            color: toastMessage.type === 'success' ? '#065F46' : '#DC2626',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            fontSize: '13.5px',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage.type === 'success' ? <Icons.CheckCircle2 size={18} /> : <Icons.AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Header Trang: Phân hệ EP-02 Sản Phẩm & Bảng Giá */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
          backgroundColor: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)',
              color: '#EA580C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #FDBA74'
            }}
          >
            <Icons.Package size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#FFF7ED',
                  color: '#EA580C',
                  border: '1px solid #FFEDD5'
                }}
              >
                EP-02 SẢN PHẨM & BẢNG GIÁ
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: roleMeta.badgeBg,
                  color: roleMeta.badgeColor
                }}
              >
                Vai trò: {roleMeta.label}
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
              Quản Lý Danh Mục Sản Phẩm (SKU)
            </h1>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>
              Đồng bộ mã SKU, đơn vị tính cơ sở và bảng quy đổi (Thùng, Lốc) toàn hệ thống bán hàng & kho
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Tải file mẫu */}
          <button
            type="button"
            onClick={() => ProductService.downloadExcelTemplate()}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Icons.Download size={15} />
            <span>File Mẫu Excel</span>
          </button>

          {/* Import Excel với Lưới Báo Lỗi Từng Dòng */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #10B981',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Icons.FileSpreadsheet size={16} />
            <span>Import Excel (Lưới Báo Lỗi)</span>
          </button>

          {/* Khai báo SKU mới */}
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsFormModalOpen(true);
            }}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Icons.Plus size={16} />
            <span>+ Khai Báo SKU Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ chỉ số tổng quan */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
            TỔNG SỐ SKU HỆ THỐNG
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{products.length} SKU</div>
          <div style={{ fontSize: '11.5px', color: '#10B981', marginTop: '4px' }}>100% đã định danh mã chuẩn</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
            ĐANG KINH DOANH (ACTIVE)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>{activeCount} SKU</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Khả dụng cho bán buôn & bán lẻ</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
            TẠM NGƯNG KINH DOANH
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706' }}>{inactiveCount} SKU</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Tạm dừng xuất hóa đơn</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>
            ĐÃ CÀI ĐẶT QUY ĐỔI ĐƠN VỊ
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EA580C' }}>{convertedCount} SKU</div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Chuẩn hóa Thùng / Lốc / Hộp</div>
        </div>
      </div>

      {/* 3. Khu vực Tìm Kiếm & Bộ Lọc */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', flex: 1, minWidth: '280px', maxWidth: '440px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#94A3B8' }}>
            <Icons.Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Mã SKU, Tên sản phẩm, Nhóm hàng..."
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '38px',
              paddingRight: '12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Nút bật/tắt Cây nhóm hàng */}
          <button
            type="button"
            onClick={() => setIsTreeSidebarOpen(!isTreeSidebarOpen)}
            style={{
              height: '38px',
              padding: '0 12px',
              borderRadius: '10px',
              border: isTreeSidebarOpen ? '1.5px solid #2563EB' : '1.5px solid #CBD5E1',
              backgroundColor: isTreeSidebarOpen ? '#EFF6FF' : '#FFFFFF',
              color: isTreeSidebarOpen ? '#1D4ED8' : '#475569',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icons.FolderTree size={16} />
            <span>{isTreeSidebarOpen ? 'Thu gọn Cây nhóm' : 'Hiện Cây nhóm hàng'}</span>
          </button>

          {/* Lọc Nhóm hàng */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              height: '38px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '12.5px',
              color: '#334155',
              backgroundColor: '#FFFFFF',
              outline: 'none'
            }}
          >
            <option value="ALL">Tất cả nhóm hàng ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Lọc Trạng thái */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              height: '38px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '12.5px',
              color: '#334155',
              backgroundColor: '#FFFFFF',
              outline: 'none'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang kinh doanh</option>
            <option value="INACTIVE">🟡 Tạm ngưng</option>
            <option value="OUT_OF_STOCK">🔴 Hết hàng</option>
          </select>

          {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedTreeNode) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSelectedTreeNode(null);
              }}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 4. KHU VỰC CHÍNH: BỐ CỤC 2 CỘT (CÂY NHÓM HÀNG ĐA CẤP BÊN TRÁI & BẢNG SKU BÊN PHẢI) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* CỘT 1: CÂY NHÓM HÀNG ĐA CẤP (TREE-VIEW) HỖ TRỢ KÉO THẢ */}
        {isTreeSidebarOpen && (
          <div style={{ width: '330px', flexShrink: 0 }}>
            <CategoryTreeView
              categories={categoryTree}
              selectedCategoryId={selectedTreeNode ? selectedTreeNode.id : null}
              onSelectCategory={(node) => setSelectedTreeNode(node)}
              onCategoriesChange={() => {
                loadCategoryTree();
                loadProducts();
              }}
              products={products}
              onMoveProductToCategory={handleMoveProductToCategory}
            />
          </div>
        )}

        {/* CỘT 2: BẢNG DANH MỤC SẢN PHẨM & CÀI ĐẶT QUY ĐỔI ĐƠN VỊ */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Banner thông báo khi đang lọc theo Cây Nhóm Hàng */}
          {selectedTreeNode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderRadius: '12px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.FolderOpen size={18} color="#2563EB" />
                <span>
                  Đang lọc theo nhóm: <strong>{selectedTreeNode.name}</strong> ({selectedTreeNode.code}) và tất cả nhóm con —{' '}
                  <strong>{filteredProducts.length}</strong> sản phẩm SKU
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTreeNode(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#2563EB',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                ✕ Bỏ lọc nhóm
              </button>
            </div>
          )}

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '14px 16px', width: '56px', textAlign: 'center' }}>ẢNH</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>MÃ SKU</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, minWidth: '180px' }}>TÊN SẢN PHẨM CHUẨN</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>NHÓM HÀNG</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>ĐVT CƠ SỞ</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700 }}>QUY CÁCH ĐÓNG GÓI</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, minWidth: '180px' }}>QUY ĐỔI ĐƠN VỊ</th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>
                      GIÁ VỐN {canViewCostPrice ? '(VNĐ)' : ''}
                    </th>
                    <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>TRẠNG THÁI</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', width: '130px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <Icons.RefreshCw size={18} className="animate-spin" />
                          <span>Đang tải danh mục sản phẩm...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
                        <Icons.Package size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Không tìm thấy sản phẩm nào khớp với điều kiện lọc.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const hasTransactions = Boolean(p.transactionCount && p.transactionCount > 0);
                      return (
                        <tr
                          key={p.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/product-id', p.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          title={`Kéo sản phẩm "${p.name}" thả vào nhóm bất kỳ trên cây bên trái để chuyển nhóm`}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background-color 0.15s ease',
                            cursor: 'grab'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                        >
                          {/* Ảnh thu nhỏ */}
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                overflow: 'hidden',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#F8FAFC'
                              }}
                            >
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Icons.Package size={20} color="#94A3B8" />
                              )}
                            </div>
                          </td>

                          {/* Mã SKU kèm badge số lượng giao dịch */}
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#F1F5F9',
                                  border: '1px solid #E2E8F0',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  color: '#0F172A'
                                }}
                              >
                                {p.sku}
                              </span>

                              {/* Badge phát sinh giao dịch */}
                              {hasTransactions ? (
                                <span
                                  title={`Đã phát sinh ${p.transactionCount} giao dịch kho & bán hàng (Quy định: Không được xóa, chỉ ngừng kinh doanh)`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#FEF3C7',
                                    color: '#B45309',
                                    fontWeight: 700
                                  }}
                                >
                                  ⚡ {p.transactionCount} GD
                                </span>
                              ) : (
                                <span
                                  title="Chưa phát sinh giao dịch (Có thể xóa vĩnh viễn)"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#F1F5F9',
                                    color: '#94A3B8',
                                    fontWeight: 600
                                  }}
                                >
                                  0 GD
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tên sản phẩm */}
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{p.name}</span>
                          </td>

                          {/* Nhóm hàng */}
                          <td style={{ padding: '10px 16px', color: '#475569' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                fontSize: '11.5px',
                                color: '#475569'
                              }}
                            >
                              {p.category}
                            </span>
                          </td>

                          {/* Đơn vị tính cơ sở (Base Unit) */}
                          <td style={{ padding: '10px 16px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FFF7ED',
                                color: '#EA580C',
                                fontWeight: 700,
                                fontSize: '12px'
                              }}
                              title="Đơn vị tính cơ sở dùng quản lý tồn kho và kế toán"
                            >
                              {p.baseUnit}
                            </span>
                          </td>

                          {/* Quy cách đóng gói */}
                          <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12.5px' }}>
                            {p.packagingSpec}
                          </td>

                          {/* BẢNG CÀI ĐẶT QUY ĐỔI ĐƠN VỊ (Tags trực quan) */}
                          <td style={{ padding: '10px 16px' }}>
                            {p.unitConversions && p.unitConversions.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {p.unitConversions.map((conv) => (
                                  <span
                                    key={conv.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      backgroundColor: conv.isDefaultSalesUnit ? '#EEF2FF' : '#F1F5F9',
                                      border: conv.isDefaultSalesUnit ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                                      color: conv.isDefaultSalesUnit ? '#4338CA' : '#334155',
                                      fontSize: '11.5px',
                                      fontWeight: 600
                                    }}
                                    title={`Hệ số: 1 ${conv.unitName} = ${conv.conversionFactor} ${p.baseUnit}${conv.sellingPrice ? ` - Giá bán: ${conv.sellingPrice.toLocaleString()} đ` : ''}`}
                                  >
                                    <span>1 {conv.unitName}</span>
                                    <span style={{ color: '#94A3B8' }}>=</span>
                                    <span style={{ fontWeight: 700 }}>
                                      {conv.conversionFactor} {p.baseUnit}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                                Chưa cấu hình
                              </span>
                            )}
                          </td>

                          {/* Giá vốn (BẢO MẬT: Chỉ Quản lý kinh doanh và Admin xem và sửa) */}
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            {canViewCostPrice ? (
                              <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', fontSize: '13px' }}>
                                {Number(p.costPrice || 0).toLocaleString('vi-VN')} đ
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#94A3B8',
                                  backgroundColor: '#F1F5F9',
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600
                                }}
                                title="Giá vốn chỉ được bảo mật cho Quản lý kinh doanh và Admin"
                              >
                                🔒 Bảo mật
                              </span>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            {p.status === 'ACTIVE' && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                                <span>Đang bán</span>
                              </span>
                            )}
                            {p.status === 'INACTIVE' && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: '#FEF3C7',
                                  color: '#B45309',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                                <span>Ngừng KD</span>
                              </span>
                            )}
                            {p.status === 'OUT_OF_STOCK' && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: '#FEE2E2',
                                  color: '#B91C1C',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                                <span>Hết hàng</span>
                              </span>
                            )}
                          </td>

                          {/* Thao tác Sửa / Chuyển nhóm / Xóa */}
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {/* Nút sửa thông tin */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsFormModalOpen(true);
                                }}
                                title="Sửa thông tin SKU và bảng quy đổi"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Icons.Edit size={14} />
                              </button>

                              {/* Nút chuyển nhóm hàng */}
                              <button
                                type="button"
                                onClick={() => {
                                  setMovingProduct(p);
                                  setSelectedTargetCatId(p.categoryId || '');
                                }}
                                title={`Chuyển sản phẩm "${p.name}" sang nhóm hàng khác`}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: '1px solid #BFDBFE',
                                  backgroundColor: '#EFF6FF',
                                  color: '#2563EB',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Icons.FolderTree size={14} />
                              </button>

                              {/* Nút xóa sản phẩm */}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmProduct(p)}
                                title={hasTransactions ? "Sản phẩm đã có giao dịch (Chỉ có thể ngừng kinh doanh)" : "Xóa SKU này"}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: hasTransactions ? '1px solid #FED7AA' : '1px solid #FEE2E2',
                                  backgroundColor: hasTransactions ? '#FFF7ED' : '#FEF2F2',
                                  color: hasTransactions ? '#EA580C' : '#EF4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Icons.Trash2 size={14} />
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

            {/* Footer bảng */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12.5px',
                color: '#64748B'
              }}
            >
              <span>
                Hiển thị <strong>{filteredProducts.length}</strong> / <strong>{products.length}</strong> sản phẩm SKU
              </span>
              <span>* Quy tắc hệ thống: Mọi giao dịch kho & công nợ luôn ghi nhận theo ĐVT cơ sở (Base Unit)</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: FORM KHAI BÁO SKU & BẢNG CÀI ĐẶT QUY ĐỔI ĐƠN VỊ */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        canViewCostPrice={canViewCostPrice}
        existingProducts={products}
      />

      {/* MODAL 2: LƯỚI DỮ LIỆU BÁO LỖI TỪNG DÒNG KHI IMPORT EXCEL */}
      <ProductExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingProducts={products}
        onImportSuccess={(count) => {
          showToast(`Đã import thành công ${count} sản phẩm SKU vào hệ thống!`);
          loadProducts();
        }}
      />

      {/* MODAL CHUYỂN SẢN PHẨM GIỮA CÁC NHÓM HÀNG */}
      {movingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icons.FolderTree size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Chuyển Nhóm Cho Sản Phẩm
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Di chuyển sản phẩm giữa các nhóm trong cây phân cấp
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMovingProduct(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <form onSubmit={handleQuickMoveSubmit}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '4px' }}>
                  Sản phẩm SKU: <strong style={{ color: '#0F172A' }}>{movingProduct.name}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Mã SKU: <code style={{ color: '#2563EB', fontWeight: 600 }}>{movingProduct.sku}</code> | Nhóm hiện tại: <strong style={{ color: '#059669' }}>{movingProduct.category}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  Chọn Nhóm Hàng Đích Đến <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={selectedTargetCatId}
                  onChange={(e) => setSelectedTargetCatId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13.5px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    outline: 'none',
                    fontWeight: 500
                  }}
                >
                  <option value="">-- Chọn nhóm hàng đích từ cây danh mục --</option>
                  {CategoryService.getFlatCategories(categoryTree).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px' }}>
                  💡 Gợi ý: Bạn cũng có thể kéo trực tiếp hàng sản phẩm từ bảng và thả vào nhóm bất kỳ trên cây thư mục bên trái.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMovingProduct(null)}
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={!selectedTargetCatId}
                  style={{
                    height: '42px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: selectedTargetCatId ? '#2563EB' : '#94A3B8',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: selectedTargetCatId ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Icons.FolderTree size={16} />
                  Xác Nhận Chuyển Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA / NGỪNG KINH DOANH SẢN PHẨM */}
      {deleteConfirmProduct && (() => {
        const hasTransactions = Boolean(
          deleteConfirmProduct.transactionCount && deleteConfirmProduct.transactionCount > 0
        );

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 9999
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
              }}
            >
              {hasTransactions ? (
                // TRƯỜNG HỢP 1: SẢN PHẨM ĐÃ PHÁT SINH GIAO DỊCH -> KHÔNG ĐƯỢC XÓA, CHỈ ĐƯỢC NGỪNG KINH DOANH
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        backgroundColor: '#FFF7ED',
                        color: '#EA580C',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                        border: '1px solid #FFEDD5'
                      }}
                    >
                      <Icons.AlertTriangle size={28} />
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#9A3412', margin: '0 0 6px' }}>
                      Không Thể Xóa: Đã Phát Sinh Giao Dịch!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                      Sản phẩm <strong>"{deleteConfirmProduct.name}"</strong> (Mã: <code>{deleteConfirmProduct.sku}</code>) đã phát sinh{' '}
                      <strong style={{ color: '#EA580C' }}>{deleteConfirmProduct.transactionCount} giao dịch thực tế</strong> trong hệ thống (xuất nhập kho / bán hàng).
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      color: '#92400E',
                      fontSize: '12px',
                      lineHeight: 1.45,
                      marginBottom: '20px'
                    }}
                  >
                    ⚠️ <strong>Quy định bắt buộc:</strong> Để bảo toàn tính toàn vẹn dữ liệu kế toán và lịch sử kho bãi, sản phẩm đã phát sinh giao dịch <strong>không thể xóa vĩnh viễn</strong>. Bạn chỉ có thể chuyển sang trạng thái <strong>"Ngừng kinh doanh"</strong> (INACTIVE).
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmProduct(null)}
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Đóng
                    </button>

                    <button
                      type="button"
                      onClick={handleDeactivateProduct}
                      style={{
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
                      }}
                    >
                      Chuyển Sang Ngừng KD
                    </button>
                  </div>
                </div>
              ) : (
                // TRƯỜNG HỢP 2: SẢN PHẨM CHƯA CÓ GIAO DỊCH (0 GIAO DỊCH) -> ĐƯỢC PHÉP XÓA
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '16px',
                        backgroundColor: '#FEE2E2',
                        color: '#EF4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px'
                      }}
                    >
                      <Icons.Trash2 size={24} />
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                      Xác Nhận Xóa SKU?
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.45 }}>
                      Sản phẩm <strong>"{deleteConfirmProduct.name}"</strong> (Mã: {deleteConfirmProduct.sku}) chưa phát sinh giao dịch nào. Bạn có chắc chắn muốn xóa vĩnh viễn khỏi danh mục không?
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmProduct(null)}
                      style={{
                        height: '40px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Hủy Bỏ
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteProduct}
                      style={{
                        height: '40px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Xóa Sản Phẩm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
