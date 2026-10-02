import React, { useState, useMemo } from 'react';
import type { CategoryNode, CategoryProductItem } from '../../../types/product';
import {
  getCategoryTree,
  saveCategoryTree,
  moveCategoryNode,
  addCategoryNode,
  updateCategoryNode,
  deleteCategoryNode,
  transferProductToCategory,
  getTotalDescendantRevenue,
  getTotalDescendantProducts
} from '../../../services/categoryService';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Search,
  AlertTriangle,
  CheckCircle2,
  Info,
  Package,
  Layers,
  Sparkles,
  X,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  ChevronLeft
} from '../../../components/common/Icons';

interface CategoryTreeViewProps {
  onSelectCategory?: (categoryName: string) => void;
}

export const CategoryTreeView: React.FC<CategoryTreeViewProps> = ({ onSelectCategory }) => {
  const [tree, setTree] = useState<CategoryNode[]>(() => getCategoryTree());
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Nhóm đang được chọn để xem chi tiết sản phẩm và doanh số
  const [selectedNodeId, setSelectedNodeId] = useState<string>('seg-beer-can');

  // Trạng thái kéo thả (Drag & Drop)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'inside' | 'before' | 'after' | null>(null);

  // Modal Thêm / Sửa nhóm hàng
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Modal Chuyển sản phẩm sang nhóm khác (S2-06)
  const [isMoveProductModalOpen, setIsMoveProductModalOpen] = useState(false);
  const [productToMove, setProductToMove] = useState<CategoryProductItem | null>(null);
  const [sourceNodeForMove, setSourceNodeForMove] = useState<string>('');
  const [targetCatIdForMove, setTargetCatIdForMove] = useState<string>('');

  // Danh sách phẳng tất cả các nhóm hàng để chọn đích chuyển
  const flatCategoryList = useMemo(() => {
    const list: { id: string; name: string; level: number; code: string; productCount: number }[] = [];
    function traverse(nodes: CategoryNode[]) {
      for (const node of nodes) {
        list.push({ id: node.id, name: node.name, level: node.level, code: node.code, productCount: node.productCount });
        if (node.children) traverse(node.children);
      }
    }
    traverse(tree);
    return list;
  }, [tree]);

  // Tính tổng doanh thu toàn bộ hệ thống để làm mốc tính % doanh số
  const grandTotalRevenue = useMemo(() => {
    return tree.reduce((acc, rootNode) => acc + getTotalDescendantRevenue(rootNode), 0);
  }, [tree]);

  // Tổng số sản phẩm toàn hệ thống
  const grandTotalProducts = useMemo(() => {
    return tree.reduce((acc, rootNode) => acc + getTotalDescendantProducts(rootNode), 0);
  }, [tree]);

  // Đóng mở (Expand / Collapse) node
  const toggleExpand = (nodeId: string) => {
    function toggleInNodes(nodes: CategoryNode[]): CategoryNode[] {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children && node.children.length > 0) {
          return { ...node, children: toggleInNodes(node.children) };
        }
        return node;
      });
    }
    const updated = toggleInNodes(tree);
    setTree(updated);
    saveCategoryTree(updated);
  };

  // Mở rộng tất cả / Thu gọn tất cả
  const handleExpandCollapseAll = (expand: boolean) => {
    function setExpandState(nodes: CategoryNode[]): CategoryNode[] {
      return nodes.map((node) => ({
        ...node,
        expanded: expand,
        children: node.children ? setExpandState(node.children) : []
      }));
    }
    const updated = setExpandState(tree);
    setTree(updated);
    saveCategoryTree(updated);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodeId || draggedNodeId === nodeId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    let pos: 'inside' | 'before' | 'after';
    if (offsetY < height * 0.25) {
      pos = 'before';
    } else if (offsetY > height * 0.75) {
      pos = 'after';
    } else {
      pos = 'inside';
    }

    setDropTargetId(nodeId);
    setDropPosition(pos);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedNodeId || !dropPosition || draggedNodeId === targetId) {
      setDraggedNodeId(null);
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    const result = moveCategoryNode(tree, draggedNodeId, targetId, dropPosition);
    if (result.success && result.newTree) {
      setTree(result.newTree);
      setAlert({ type: 'success', message: result.message });
    } else {
      setAlert({ type: 'error', message: result.message });
    }

    setDraggedNodeId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  // Mở modal thêm nhóm con
  const handleOpenAddModal = (parentId: string | null = null) => {
    setModalMode('create');
    setTargetParentId(parentId);
    setEditingNodeId(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setIsModalOpen(true);
  };

  // Mở modal sửa nhóm
  const handleOpenEditModal = (node: CategoryNode) => {
    setModalMode('edit');
    setEditingNodeId(node.id);
    setTargetParentId(node.parentId || null);
    setFormName(node.name);
    setFormCode(node.code);
    setFormDescription(node.description || '');
    setIsModalOpen(true);
  };

  // Xóa nhóm hàng: Tuân thủ S2-06 ("Nhóm còn sản phẩm thì không xoá được")
  const handleDeleteNode = (node: CategoryNode) => {
    const totalProd = getTotalDescendantProducts(node);
    if (totalProd > 0) {
      setAlert({
        type: 'error',
        message: `Nhóm hàng [${node.name}] hiện đang có ${totalProd} sản phẩm/SKU liên kết. Theo quy tắc nghiệp vụ S2-06: "Nhóm còn sản phẩm thì BẮT BUỘC KHÔNG ĐƯỢC XOÁ"! Vui lòng chuyển sản phẩm sang nhóm khác trước.`
      });
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xoá nhóm hàng [${node.name}]?`)) {
      const result = deleteCategoryNode(tree, node.id);
      if (result.success && result.newTree) {
        setTree(result.newTree);
        setAlert({ type: 'success', message: result.message });
        if (selectedNodeId === node.id) {
          setSelectedNodeId('');
        }
      } else {
        setAlert({ type: 'error', message: result.message });
      }
    }
  };

  // Lưu modal thêm / sửa
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      const result = addCategoryNode(tree, targetParentId, formName, formCode, formDescription);
      if (result.success && result.newTree) {
        setTree(result.newTree);
        setAlert({ type: 'success', message: result.message });
        setIsModalOpen(false);
      } else {
        setAlert({ type: 'error', message: result.message });
      }
    } else if (editingNodeId) {
      const result = updateCategoryNode(tree, editingNodeId, formName, formCode, formDescription);
      if (result.success && result.newTree) {
        setTree(result.newTree);
        setAlert({ type: 'success', message: result.message });
        setIsModalOpen(false);
      } else {
        setAlert({ type: 'error', message: result.message });
      }
    }
  };

  // Mở modal chuyển sản phẩm (S2-06)
  const handleOpenMoveProduct = (prod: CategoryProductItem, sourceId: string) => {
    setProductToMove(prod);
    setSourceNodeForMove(sourceId);
    setTargetCatIdForMove('');
    setIsMoveProductModalOpen(true);
  };

  // Thực hiện chuyển sản phẩm sang nhóm khác
  const handleExecuteMoveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productToMove || !sourceNodeForMove || !targetCatIdForMove) {
      alert('Vui lòng chọn nhóm đích nhận sản phẩm!');
      return;
    }

    const result = transferProductToCategory(tree, productToMove.id, sourceNodeForMove, targetCatIdForMove);
    if (result.success && result.newTree) {
      setTree(result.newTree);
      setAlert({ type: 'success', message: result.message });
      setIsMoveProductModalOpen(false);
      setSelectedNodeId(targetCatIdForMove); // Chuyển view sang nhóm mới để xem
    } else {
      setAlert({ type: 'error', message: result.message });
    }
  };

  // Tìm node đang được chọn
  const activeSelectedNode = useMemo(() => {
    function findNode(nodes: CategoryNode[]): CategoryNode | null {
      for (const n of nodes) {
        if (n.id === selectedNodeId) return n;
        if (n.children) {
          const res = findNode(n.children);
          if (res) return res;
        }
      }
      return null;
    }
    return findNode(tree);
  }, [tree, selectedNodeId]);

  // Render đệ quy từng node trong cây
  const renderTreeNode = (node: CategoryNode) => {
    const isExpanded = node.expanded ?? true;
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isDragging = draggedNodeId === node.id;
    const isTarget = dropTargetId === node.id;
    const isSelected = selectedNodeId === node.id;

    // Doanh số tổng hợp (Rollup revenue) của node này và toàn bộ con cháu
    const rollupRevenue = getTotalDescendantRevenue(node);
    const totalProdCount = getTotalDescendantProducts(node);
    const revenueShare = grandTotalRevenue > 0 ? ((rollupRevenue / grandTotalRevenue) * 100).toFixed(1) : '0';

    const levelBadge =
      node.level === 1
        ? { text: 'Ngành hàng (C1)', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' }
        : node.level === 2
        ? { text: 'Nhóm hàng (C2)', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' }
        : { text: 'Phân nhóm (C3)', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' };

    return (
      <div key={node.id} className="relative select-none">
        {/* Đường chỉ báo Drop Before */}
        {isTarget && dropPosition === 'before' && (
          <div className="h-1 bg-blue-500 rounded-full my-1 shadow-sm animate-pulse" />
        )}

        {/* Khung Node */}
        <div
          draggable={true}
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onClick={() => setSelectedNodeId(node.id)}
          className={`group flex items-center justify-between py-2 px-3 my-1 rounded-xl transition cursor-pointer border ${
            isDragging
              ? 'opacity-40 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-400'
              : isTarget && dropPosition === 'inside'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 shadow-sm ring-2 ring-blue-300/50'
              : isSelected
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs ring-1 ring-blue-400/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
          style={{ marginLeft: `${(node.level - 1) * 20}px` }}
        >
          {/* Bên trái: Grip + Expand + Icon + Tên + Badge Level */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Grip handle kéo thả */}
            <div
              className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 p-0.5 cursor-grab"
              title="Kéo thả nhóm hàng để chuyển cấp hoặc sắp xếp"
            >
              <GripVertical size={15} />
            </div>

            {/* Toggle mở rộng / thu gọn */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              >
                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            {/* Folder Icon */}
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                node.level === 1
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  : node.level === 2
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}
            >
              {isExpanded && hasChildren ? <FolderOpen size={16} /> : <Folder size={16} />}
            </div>

            {/* Tên & Mã */}
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                {node.name}
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded hidden md:inline">
                {node.code}
              </span>
            </div>

            {/* Badge Phân cấp C1 / C2 / C3 */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 hidden lg:inline-block ${levelBadge.bg}`}
            >
              {levelBadge.text}
            </span>
          </div>

          {/* Ở giữa / Bên phải: DOANH SỐ THEO NGÀNH HÀNG (S2-06) + Số lượng SKU */}
          <div className="flex items-center gap-3 shrink-0 ml-2">
            {/* Doanh số theo ngành hàng (Rollup revenue) */}
            <div className="text-right">
              <div className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                {rollupRevenue.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                <span>{revenueShare}% doanh số</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-600 dark:text-slate-400">{totalProdCount} SKU</span>
              </div>
            </div>

            {/* Tác vụ nhanh: Thêm con, Sửa, Xóa */}
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddModal(node.id);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg text-xs"
                title="Thêm nhóm con cấp dưới"
              >
                <Plus size={14} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(node);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                title="Sửa thông tin nhóm"
              >
                <Edit size={14} />
              </button>

              {/* Nút Xóa có kiểm tra S2-06: Nhóm còn sản phẩm thì không xóa được */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(node);
                }}
                className={`p-1.5 rounded-lg transition ${
                  totalProdCount > 0
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed hover:text-amber-500'
                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                }`}
                title={
                  totalProdCount > 0
                    ? `Không thể xoá: Nhóm còn ${totalProdCount} sản phẩm (S2-06)`
                    : 'Xoá nhóm hàng này'
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Đường chỉ báo Drop After */}
        {isTarget && dropPosition === 'after' && (
          <div className="h-1 bg-blue-500 rounded-full my-1 shadow-sm animate-pulse" />
        )}

        {/* Render con */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {node.children!.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
            alert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span className="font-medium">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="font-semibold underline ml-2">
            Đóng
          </button>
        </div>
      )}

      {/* 4 Thẻ KPI Doanh số theo Ngành hàng (S2-06) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng doanh thu toàn bộ ngành hàng */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng doanh số toàn bộ ngành</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {grandTotalRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" />
            <span>Tổng hợp từ tất cả các cấp nhóm hàng</span>
          </div>
        </div>

        {/* Số lượng Ngành hàng Cấp 1 */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ngành hàng gốc (Cấp 1)</span>
            <Folder size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {tree.length} Ngành
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Đồ uống, Thực phẩm, Sữa...</div>
        </div>

        {/* Tổng số nhóm hàng 3 cấp */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng nhóm hàng (Tối thiểu 3 cấp)</span>
            <Layers size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {flatCategoryList.length} Nhóm
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cấu trúc cây phân cấp S2-06</div>
        </div>

        {/* Tổng số sản phẩm SKU */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng SKU đã phân loại</span>
            <Package size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
            {grandTotalProducts} SKU
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Chuyển sản phẩm linh hoạt</div>
        </div>
      </div>

      {/* Khu vực chính: 2 Cột (Cây phân cấp bên trái & Danh sách sản phẩm chuyển giao bên phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột 1: Cây nhóm hàng đa cấp (7 Cột) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Thanh công cụ Cây */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                Cây phân cấp Nhóm hàng (Kéo thả & Xem doanh số)
              </h3>
              <p className="text-xs text-slate-400">
                Nhấp vào nhóm bất kỳ để xem và chuyển các sản phẩm SKU trực thuộc
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleExpandCollapseAll(true)}
                className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
              >
                Mở hết
              </button>
              <button
                type="button"
                onClick={() => handleExpandCollapseAll(false)}
                className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
              >
                Thu hết
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal(null)}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                <Plus size={13} />
                Thêm Ngành hàng (C1)
              </button>
            </div>
          </div>

          {/* Vùng Cây nhóm hàng */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs min-h-[420px]">
            <div className="space-y-1">
              {tree.map((rootNode) => renderTreeNode(rootNode))}
            </div>
          </div>
        </div>

        {/* Cột 2: Bảng chi tiết Doanh số & Chuyển sản phẩm (S2-06: 5 Cột) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {activeSelectedNode ? (
              <>
                {/* Header chi tiết nhóm đang chọn */}
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      Cấp {activeSelectedNode.level}: {activeSelectedNode.code}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Doanh số: {getTotalDescendantRevenue(activeSelectedNode).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {activeSelectedNode.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeSelectedNode.description || 'Chưa có mô tả cho nhóm hàng này'}
                  </p>
                </div>

                {/* Danh sách sản phẩm (SKU) thuộc nhóm để chuyển nhóm (S2-06) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Package size={14} className="text-blue-600" />
                      Sản phẩm trực thuộc ({activeSelectedNode.products?.length || 0} SKU)
                    </span>
                  </div>

                  {(!activeSelectedNode.products || activeSelectedNode.products.length === 0) ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                      Nhóm này chưa có sản phẩm trực tiếp.
                      {activeSelectedNode.children && activeSelectedNode.children.length > 0 && (
                        <p className="mt-1 text-slate-500">
                          (Doanh số được tổng hợp từ các nhóm con cấp dưới)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeSelectedNode.products.map((prod) => (
                        <div
                          key={prod.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                {prod.sku}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Doanh số: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{prod.revenue.toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>

                          {/* Nút Chuyển nhóm cho sản phẩm này (S2-06) */}
                          <button
                            type="button"
                            onClick={() => handleOpenMoveProduct(prod, activeSelectedNode.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg transition shrink-0"
                            title="Chuyển sản phẩm này sang nhóm hàng khác (S2-06)"
                          >
                            Chuyển nhóm
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cảnh báo quy tắc S2-06 */}
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Info size={14} className="shrink-0" />
                    <span>Quy tắc bảo vệ nhóm hàng (S2-06)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Nhóm còn sản phẩm thì <strong>BẮT BUỘC KHÔNG ĐƯỢC XOÁ</strong>. Để xoá nhóm này, bạn cần bấm nút <em>"Chuyển nhóm"</em> ở trên để di chuyển hết toàn bộ SKU sang nhóm khác.
                  </p>
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                Chọn một nhóm hàng từ cây bên trái để xem chi tiết doanh số và sản phẩm
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chuyển sản phẩm sang nhóm khác (S2-06: "Chuyển sản phẩm giữa các nhóm được") */}
      {isMoveProductModalOpen && productToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package size={18} className="text-indigo-600" />
                Chuyển sản phẩm sang nhóm khác (S2-06)
              </h3>
              <button
                onClick={() => setIsMoveProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteMoveProduct} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                <div className="text-slate-500">Sản phẩm đang chọn:</div>
                <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">{productToMove.sku}</div>
                <div className="font-medium text-slate-900 dark:text-white">{productToMove.name}</div>
                <div className="text-emerald-600 font-mono font-semibold">
                  Doanh số kèm theo: {productToMove.revenue.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chọn nhóm hàng đích cần chuyển tới <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={targetCatIdForMove}
                  onChange={(e) => setTargetCatIdForMove(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn nhóm hàng nhận sản phẩm --</option>
                  {flatCategoryList
                    .filter((item) => item.id !== sourceNodeForMove)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {'— '.repeat(item.level - 1)} {item.name} ({item.code})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Khi chuyển, doanh số của sản phẩm sẽ được tự động cộng vào nhóm đích và trừ khỏi nhóm nguồn.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMoveProductModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Xác nhận chuyển nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa nhóm hàng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Folder size={18} className="text-blue-600" />
                {modalMode === 'create'
                  ? targetParentId
                    ? 'Thêm nhóm con cấp dưới'
                    : 'Thêm ngành hàng gốc (Cấp 1)'
                  : 'Chỉnh sửa nhóm hàng'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên nhóm hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Bia các loại, Nước giải khát..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mã nhóm hàng (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="VD: NHOM-BIA, SEG-COLA..."
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả ngành hàng, phân nhóm..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  {modalMode === 'create' ? 'Tạo nhóm' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
