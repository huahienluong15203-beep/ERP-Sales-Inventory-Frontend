import React, { useState } from 'react';
import type { ProductCategoryNode, Product } from '../../../types/product';
import { CategoryService } from '../../../services/categoryService';
import { Icons } from '../../../components/common/Icons';

interface CategoryTreeViewProps {
  categories: ProductCategoryNode[];
  selectedCategoryId: string | null;
  onSelectCategory: (category: ProductCategoryNode | null) => void;
  onCategoriesChange: () => void;
  products: Product[];
  onMoveProductToCategory?: (productId: string, targetCategory: ProductCategoryNode) => Promise<void> | void;
}

export const CategoryTreeView: React.FC<CategoryTreeViewProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCategoriesChange,
  products,
  onMoveProductToCategory
}) => {
  // Trạng thái mở rộng (expand/collapse) của từng node - Mặc định mở rộng để thấy cấu trúc 3 cấp
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'cat-beverage': true,
    'cat-beer': true,
    'cat-soft-drinks': true,
    'cat-dairy': true,
    'cat-liquid-milk': true,
    'cat-cultured-dairy': true,
    'cat-condiments': true,
    'cat-sauces': true,
    'cat-cooking-essentials': true,
    'cat-dry-food': true,
    'cat-instant-staples': true,
    'cat-canned-food': true,
    'cat-snacks': true,
    'cat-bakery': true,
    'cat-crisps-candies': true
  });

  // Trạng thái kéo thả
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [isDragOverRootZone, setIsDragOverRootZone] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Thêm / Sửa Nhóm Hàng
  const [modalMode, setModalMode] = useState<'create_root' | 'create_child' | 'edit' | null>(null);
  const [targetCategory, setTargetCategory] = useState<ProductCategoryNode | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catCodeInput, setCatCodeInput] = useState('');

  // Toggle đóng mở nhánh cây
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Đếm số lượng sản phẩm thuộc nhóm hàng (bao gồm cả con cháu)
  const getProductCount = (category: ProductCategoryNode): number => {
    const descendantNames = CategoryService.getCategoryAndDescendantNames(categories, category.id);
    return products.filter((p) => descendantNames.includes(p.category) || p.categoryId === category.id).length;
  };

  // Bắt đầu kéo nhóm hàng
  const handleDragStart = (e: React.DragEvent, node: ProductCategoryNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    e.dataTransfer.setData('text/category-id', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Kết thúc kéo
  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setIsDragOverRootZone(false);
  };

  // Drag over một node (hỗ trợ cả kéo nhóm hàng và kéo sản phẩm từ bảng)
  const handleDragOverNode = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNodeId !== targetId) {
      setDragOverNodeId(targetId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // Drop vào một node: Chuyển sản phẩm vào nhóm này HOẶC chuyển nhóm con
  const handleDropOnNode = (e: React.DragEvent, targetNode: ProductCategoryNode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNodeId(null);

    // TRƯỜNG HỢP 1: THẢ SẢN PHẨM VÀO NHÓM HÀNG ĐÍCH
    const productId = e.dataTransfer.getData('text/product-id');
    if (productId && onMoveProductToCategory) {
      onMoveProductToCategory(productId, targetNode);
      return;
    }

    // TRƯỜNG HỢP 2: KÉO THẢ NHÓM HÀNG (RE-PARENT)
    if (!draggedNodeId || draggedNodeId === targetNode.id) return;

    try {
      CategoryService.moveCategory(draggedNodeId, targetNode.id);
      // Tự động mở node cha ra sau khi thả con vào
      setExpandedNodes((prev) => ({ ...prev, [targetNode.id]: true }));
      onCategoriesChange();
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể di chuyển nhóm hàng!');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setDraggedNodeId(null);
    }
  };

  // Drop vào vùng gốc (đưa thành node cấp 1)
  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRootZone(false);

    if (!draggedNodeId) return;

    try {
      CategoryService.moveCategory(draggedNodeId, null);
      onCategoriesChange();
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể di chuyển nhóm hàng!');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setDraggedNodeId(null);
    }
  };

  // Mở modal thêm nhóm con
  const openCreateChildModal = (parent: ProductCategoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetCategory(parent);
    setCatNameInput('');
    setCatCodeInput('');
    setModalMode('create_child');
  };

  // Mở modal sửa nhóm
  const openEditModal = (cat: ProductCategoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetCategory(cat);
    setCatNameInput(cat.name);
    setCatCodeInput(cat.code);
    setModalMode('edit');
  };

  // XÓA NHÓM HÀNG: QUY TẮC BẮT BUỘC - NHÓM CÒN SẢN PHẨM THÌ KHÔNG ĐƯỢC XÓA!
  const handleDeleteCategory = (cat: ProductCategoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const count = getProductCount(cat);

    // CHẶN XÓA NẾU NHÓM CÒN SẢN PHẨM
    if (count > 0) {
      setErrorMessage(
        `⚠️ KHÔNG THỂ XÓA: Nhóm hàng "${cat.name}" đang chứa ${count} sản phẩm SKU. Quy tắc hệ thống: Nhóm còn sản phẩm thì không thể xóa! Vui lòng chuyển sản phẩm sang nhóm khác trước.`
      );
      setTimeout(() => setErrorMessage(null), 5500);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm hàng trống "${cat.name}" không?`)) {
      try {
        CategoryService.deleteCategory(cat.id, products);
        if (selectedCategoryId === cat.id) {
          onSelectCategory(null);
        }
        onCategoriesChange();
      } catch (err: any) {
        setErrorMessage(err.message || 'Không thể xóa nhóm hàng!');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  // Lưu Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;

    if (modalMode === 'create_root') {
      CategoryService.addCategory(catNameInput, catCodeInput, null);
    } else if (modalMode === 'create_child' && targetCategory) {
      CategoryService.addCategory(catNameInput, catCodeInput, targetCategory.id);
      setExpandedNodes((prev) => ({ ...prev, [targetCategory.id]: true }));
    } else if (modalMode === 'edit' && targetCategory) {
      CategoryService.updateCategory(targetCategory.id, catNameInput, catCodeInput);
    }

    setModalMode(null);
    setTargetCategory(null);
    onCategoriesChange();
  };

  // Render đệ quy từng node trong cây
  const renderNode = (node: ProductCategoryNode, depth: number = 0) => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = Boolean(expandedNodes[node.id]);
    const isSelected = selectedCategoryId === node.id;
    const isDragging = draggedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id;
    const count = getProductCount(node);

    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          draggable={true}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOverNode(e, node.id)}
          onDragLeave={() => {
            if (dragOverNodeId === node.id) setDragOverNodeId(null);
          }}
          onDrop={(e) => handleDropOnNode(e, node)}
          onClick={() => onSelectCategory(isSelected ? null : node)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            paddingLeft: `${10 + depth * 18}px`,
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: isDragOver
              ? '#EFF6FF'
              : isSelected
              ? '#FFF7ED'
              : 'transparent',
            border: isDragOver
              ? '1.5px dashed #2563EB'
              : isSelected
              ? '1px solid #FDBA74'
              : '1px solid transparent',
            color: isSelected ? '#C2410C' : '#334155',
            opacity: isDragging ? 0.45 : 1,
            transition: 'all 0.15s ease',
            userSelect: 'none',
            position: 'relative'
          }}
          className="tree-node-item"
        >
          {/* Cột trái: Nút toggle expand, icon kéo thả, icon thư mục, tên nhóm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            {/* Grip handle kéo thả */}
            <span
              title="Kéo & thả để sắp xếp hoặc chuyển cấp nhóm hàng"
              style={{
                color: '#94A3B8',
                cursor: 'grab',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <Icons.GripVertical size={14} />
            </span>

            {/* Mũi tên thu gọn / mở rộng */}
            <button
              type="button"
              onClick={(e) => toggleExpand(node.id, e)}
              style={{
                width: '18px',
                height: '18px',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: hasChildren ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: hasChildren ? '#64748B' : 'transparent',
                transition: 'transform 0.15s ease'
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <Icons.ChevronDown size={14} />
                ) : (
                  <Icons.ChevronRight size={14} />
                )
              ) : (
                <span style={{ width: '14px' }} />
              )}
            </button>

            {/* Icon Thư mục */}
            <span style={{ color: isSelected ? '#EA580C' : '#F59E0B', display: 'inline-flex' }}>
              {isExpanded && hasChildren ? <Icons.FolderOpen size={16} /> : <Icons.Folder size={16} />}
            </span>

            {/* Tên nhóm hàng */}
            <span
              title={`${node.name} (${node.code})`}
              style={{
                fontSize: depth === 0 ? '13px' : '12.5px',
                fontWeight: depth === 0 ? 700 : isSelected ? 600 : 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: isSelected ? '#9A3412' : '#1E293B'
              }}
            >
              {node.name}
            </span>

            {/* Badge cấp độ: Cấp 1, Cấp 2, Cấp 3 */}
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: depth === 0 ? '#EEF2FF' : depth === 1 ? '#F1F5F9' : '#FEF3C7',
                color: depth === 0 ? '#4338CA' : depth === 1 ? '#475569' : '#B45309',
                border: depth === 0 ? '1px solid #C7D2FE' : depth === 1 ? '1px solid #E2E8F0' : '1px solid #FDE68A',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              Cấp {depth + 1}
            </span>
          </div>

          {/* Cột phải: Badge số lượng SKU & Nút tác vụ nhanh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
            {/* Badge số lượng SKU */}
            <span
              title={`Có ${count} sản phẩm SKU`}
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: isSelected ? '#FFEDD5' : '#F1F5F9',
                color: isSelected ? '#C2410C' : '#64748B',
                fontWeight: 600
              }}
            >
              {count}
            </span>

            {/* Action buttons (hiện khi hover hoặc hover vào cây) */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {/* Nút thêm nhóm con */}
              <button
                type="button"
                onClick={(e) => openCreateChildModal(node, e)}
                title={`Thêm nhóm con cho "${node.name}"`}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icons.Plus size={12} />
              </button>

              {/* Nút sửa */}
              <button
                type="button"
                onClick={(e) => openEditModal(node, e)}
                title="Sửa tên & mã nhóm"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icons.Edit size={12} />
              </button>

              {/* Nút xóa - Chặn xóa nếu nhóm còn sản phẩm */}
              <button
                type="button"
                onClick={(e) => handleDeleteCategory(node, e)}
                title={count > 0 ? `Nhóm còn ${count} sản phẩm SKU - Không thể xóa!` : `Xóa nhóm hàng trống "${node.name}"`}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: count > 0 ? '#94A3B8' : '#EF4444',
                  cursor: count > 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: count > 0 ? 0.6 : 1
                }}
              >
                <Icons.Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Nhánh con đệ quy */}
        {hasChildren && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}
    >
      {/* Header cây nhóm hàng */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icons.FolderTree size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Cây Nhóm Hàng (Tối thiểu 3 cấp)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Cấu trúc phân cấp 3 tầng & Kéo thả
            </span>
          </div>
        </div>

        {/* Nút thêm nhóm gốc */}
        <button
          type="button"
          onClick={() => {
            setTargetCategory(null);
            setCatNameInput('');
            setCatCodeInput('');
            setModalMode('create_root');
          }}
          title="Tạo nhóm hàng gốc mới"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            color: '#334155',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Icons.Plus size={13} />
          <span>Thêm Gốc</span>
        </button>
      </div>

      {/* Thông báo lỗi kéo thả nếu có */}
      {errorMessage && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Icons.AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Nút lọc "Tất cả nhóm hàng" */}
      <div
        onClick={() => onSelectCategory(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: selectedCategoryId === null ? '#EEF2FF' : '#F8FAFC',
          border: selectedCategoryId === null ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
          color: selectedCategoryId === null ? '#4338CA' : '#475569',
          fontWeight: 700,
          fontSize: '12.5px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Layers size={16} />
          <span>Tất cả nhóm hàng</span>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: selectedCategoryId === null ? '#C7D2FE' : '#E2E8F0',
            color: selectedCategoryId === null ? '#312E81' : '#475569',
            fontWeight: 700
          }}
        >
          {products.length} SKU
        </span>
      </div>

      {/* Drop zone: Kéo thả vào đây để chuyển thành Nhóm Hàng Gốc (Root Level) */}
      {draggedNodeId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverRootZone(true);
          }}
          onDragLeave={() => setIsDragOverRootZone(false)}
          onDrop={handleDropOnRoot}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: isDragOverRootZone ? '2px dashed #2563EB' : '1.5px dashed #94A3B8',
            backgroundColor: isDragOverRootZone ? '#EFF6FF' : '#F8FAFC',
            color: isDragOverRootZone ? '#1D4ED8' : '#64748B',
            textAlign: 'center',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'copy',
            transition: 'all 0.15s ease'
          }}
        >
          ⬇️ Thả vào đây để chuyển thành <strong>Nhóm Hàng Gốc (Root)</strong>
        </div>
      )}

      {/* Danh sách các cây nhóm hàng */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 360px)',
          paddingRight: '4px'
        }}
      >
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '12px' }}>
            Chưa có nhóm hàng nào. Bấm "Thêm Gốc" để tạo nhóm.
          </div>
        ) : (
          categories.map((cat) => renderNode(cat, 0))
        )}
      </div>

      {/* Hướng dẫn kéo thả */}
      <div
        style={{
          marginTop: 'auto',
          padding: '8px 10px',
          borderRadius: '8px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #F1F5F9',
          fontSize: '11px',
          color: '#64748B',
          lineHeight: 1.4
        }}
      >
        💡 <strong>Mẹo kéo thả:</strong> Giữ chuột vào biểu tượng 6 chấm <Icons.GripVertical size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> rồi kéo thả vào nhóm khác để chuyển cấp cha - con nhanh chóng.
      </div>

      {/* Modal Thêm / Sửa Nhóm Hàng */}
      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 10001
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {modalMode === 'create_root' && 'Thêm Nhóm Hàng Gốc Mới'}
                {modalMode === 'create_child' && `Thêm Nhóm Con của "${targetCategory?.name}"`}
                {modalMode === 'edit' && `Sửa Nhóm: ${targetCategory?.name}`}
              </h4>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Tên nhóm hàng <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  placeholder="VD: Bia đóng lon, Sữa tươi tiệt trùng..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>
                  Mã nhóm hàng (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={catCodeInput}
                  onChange={(e) => setCatCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: BEER_CAN, FRESH_MILK..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#EA580C',
                    color: '#FFFFFF',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Lưu Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
