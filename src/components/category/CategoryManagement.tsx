import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { ProductCategory, CategoryProduct, CategoryRollup } from '../../types/category';
import { useAuth } from '../../contexts/AuthContext';
import {
  CATEGORY_MAX_LEVEL,
  CATEGORY_PRODUCTS_MAX_PAGE_SIZE,
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoryProducts,
  moveProductsToCategory,
  updateCategory,
  type CategoryWithCount
} from '../../services/categoryApi';

// Chỉ ADMIN và SALES_MANAGER được ghi (backend @PreAuthorize). Các vai trò khác chỉ xem.
const WRITE_ROLES = new Set(['ADMIN', 'SALES_MANAGER']);
const normalizeRole = (r: unknown) => String(r || '').toUpperCase().replace(/^ROLE_/, '');

const NO_SALES_DATA_NOTE = 'Chưa có dữ liệu doanh số (sẽ có khi có đơn hàng)';

const levelLabel = (level: number) =>
  level === 1 ? 'Ngành hàng' : level === 2 ? 'Nhóm hàng' : level === 3 ? 'Phân nhóm' : `Nhóm cấp ${level}`;

export const CategoryManagement: React.FC = () => {
  const { user } = useAuth();
  const canManage = useMemo(
    () => (user?.roles || []).some((r) => WRITE_ROLES.has(normalizeRole(r))),
    [user]
  );

  // Danh sách nhóm hàng (từ server)
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Sản phẩm của nhóm đang chọn (từ server)
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState<number>(0);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsReloadKey, setProductsReloadKey] = useState<number>(0);

  // Đang gửi yêu cầu ghi (tạo/sửa/xoá/chuyển)
  const [saving, setSaving] = useState<boolean>(false);

  // Nhóm đang chọn trong cây
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Trạng thái mở rộng các node cây
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());

  // Tùy chọn xem: 'BRANCH' = toàn bộ nhánh ngành hàng, 'DIRECT' = chỉ sản phẩm gắn trực tiếp
  const [viewScope, setViewScope] = useState<'BRANCH' | 'DIRECT'>('BRANCH');

  // Tìm kiếm sản phẩm trong danh sách
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal chuyển sản phẩm sang nhóm khác
  const [movingProduct, setMovingProduct] = useState<CategoryProduct | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  // Modal cảnh báo không thể xoá nhóm vì còn sản phẩm / nhóm con
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState<{
    category: ProductCategory;
    productCount: number;
    reason: string;
  } | null>(null);

  // Modal xác nhận xoá nhóm trống (hợp lệ)
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<ProductCategory | null>(null);

  // Modal thêm / sửa nhóm hàng
  const [editingCategory, setEditingCategory] = useState<{
    isNew: boolean;
    parentId: string | null;
    parentName?: string;
    level: number;
    id?: string;
    code: string;
    name: string;
    description: string;
  } | null>(null);

  // Thông báo phản hồi ngắn (Toast)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  // Tải cây nhóm hàng từ server
  const loadCategories = useCallback(async (opts: { initial?: boolean } = {}) => {
    setLoadingTree(true);
    setTreeError(null);
    try {
      const list = await fetchCategories();
      setCategories(list);
      if (opts.initial) {
        // Mặc định mở các nhóm cấp 1, 2 và chọn ngành hàng đầu tiên
        setExpandedNodeIds(new Set(list.filter((c) => c.level <= 2).map((c) => c.id)));
      }
      setSelectedCategoryId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        const firstRoot = list.find((c) => c.parentId === null) || list[0];
        return firstRoot ? firstRoot.id : '';
      });
    } catch (err) {
      setTreeError(errMsg(err, 'Không thể tải cây nhóm hàng.'));
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    loadCategories({ initial: true });
  }, [loadCategories]);

  // Tải sản phẩm của nhóm đang chọn theo phạm vi xem
  useEffect(() => {
    if (!selectedCategoryId) {
      setProducts([]);
      setProductsTotal(0);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    setProductsError(null);
    fetchCategoryProducts(selectedCategoryId, {
      includeSubgroups: viewScope === 'BRANCH',
      page: 0,
      size: CATEGORY_PRODUCTS_MAX_PAGE_SIZE
    })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.content);
        setProductsTotal(res.totalElements);
      })
      .catch((err) => {
        if (cancelled) return;
        setProducts([]);
        setProductsTotal(0);
        setProductsError(errMsg(err, 'Không thể tải danh sách sản phẩm.'));
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, viewScope, productsReloadKey]);

  const refreshAll = async () => {
    await loadCategories();
    setProductsReloadKey((k) => k + 1);
  };

  // Tìm tất cả ID của nhóm con (đệ quy) thuộc một nhóm
  const getSubtreeCategoryIds = useMemo(() => {
    return (catId: string): string[] => {
      const result: string[] = [catId];
      const findChildren = (parentId: string) => {
        const children = categories.filter((c) => c.parentId === parentId);
        for (const child of children) {
          result.push(child.id);
          findChildren(child.id);
        }
      };
      findChildren(catId);
      return result;
    };
  }, [categories]);

  // Số SKU tổng hợp (Rollup) theo cây — doanh số/sản lượng chưa có dữ liệu nên bằng 0
  const rollupsByCategoryId = useMemo(() => {
    const map: Record<string, CategoryRollup> = {};
    const countById: Record<string, number> = {};
    categories.forEach((c) => {
      countById[c.id] = c.productCount || 0;
    });

    categories.forEach((cat) => {
      const subtreeIds = getSubtreeCategoryIds(cat.id);
      map[cat.id] = {
        categoryId: cat.id,
        directProductCount: countById[cat.id] || 0,
        totalProductCount: subtreeIds.reduce((sum, id) => sum + (countById[id] || 0), 0),
        directRevenue: 0,
        totalRevenue: 0,
        directQuantity: 0,
        totalQuantity: 0
      };
    });

    return map;
  }, [categories, getSubtreeCategoryIds]);

  // Nhóm đang chọn hiện tại
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId) || null;
  }, [categories, selectedCategoryId]);

  // Đường dẫn Breadcrumb của nhóm đang chọn
  const categoryBreadcrumbs = useMemo(() => {
    if (!selectedCategory) return [];
    const crumbs: ProductCategory[] = [];
    let curr: ProductCategory | undefined = selectedCategory;
    while (curr) {
      crumbs.unshift(curr);
      curr = categories.find((c) => c.id === curr?.parentId);
    }
    return crumbs;
  }, [selectedCategory, categories]);

  // Danh sách sản phẩm hiển thị (lọc tìm kiếm phía client trên trang đã tải)
  const displayedProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // Toggle mở/đóng node cây
  const toggleExpand = (catId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // Mở rộng hoặc thu gọn tất cả các node
  const expandAll = () => {
    setExpandedNodeIds(new Set(categories.map((c) => c.id)));
  };
  const collapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  // Yêu cầu xoá nhóm hàng (backend chặn nếu còn nhóm con hoặc sản phẩm — kiểm tra trước ở FE)
  const handleDeleteCategoryClick = (cat: ProductCategory) => {
    if (!canManage) return;
    const rollup = rollupsByCategoryId[cat.id];
    const totalCount = rollup?.totalProductCount || 0;
    const childCount = categories.filter((c) => c.parentId === cat.id).length;

    if (totalCount > 0) {
      setDeleteBlockedInfo({
        category: cat,
        productCount: totalCount,
        reason: `Nhóm "${cat.name}" hiện đang chứa ${totalCount} sản phẩm (bao gồm cả các nhóm con trực thuộc). Quy chuẩn quản trị nghiêm cấm xoá nhóm hàng khi còn sản phẩm.`
      });
      return;
    }

    if (childCount > 0) {
      setDeleteBlockedInfo({
        category: cat,
        productCount: 0,
        reason: `Nhóm "${cat.name}" còn ${childCount} nhóm con trực thuộc. Vui lòng xoá các nhóm con trước khi xoá nhóm này.`
      });
      return;
    }

    setConfirmDeleteCategory(cat);
  };

  // Thực hiện xoá nhóm qua API
  const executeDeleteCategory = async () => {
    if (!confirmDeleteCategory || !canManage || saving) return;
    const catToDelete = confirmDeleteCategory;
    setSaving(true);
    try {
      await deleteCategory(catToDelete.id);
      if (catToDelete.id === selectedCategoryId) {
        setSelectedCategoryId(catToDelete.parentId || '');
      }
      setConfirmDeleteCategory(null);
      showToast(`Đã xoá nhóm "${catToDelete.name}" thành công!`, 'success');
      await loadCategories();
    } catch (err) {
      setConfirmDeleteCategory(null);
      showToast(errMsg(err, 'Không thể xoá nhóm hàng.'), 'error');
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  // Bắt đầu mở modal chuyển nhóm cho sản phẩm
  const handleOpenMoveModal = (prod: CategoryProduct) => {
    if (!canManage) return;
    setMovingProduct(prod);
    setTargetCategoryId(prod.categoryId);
  };

  // Thực hiện chuyển sản phẩm sang nhóm đích qua API
  const handleExecuteMoveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingProduct || !targetCategoryId || !canManage || saving) return;

    if (targetCategoryId === movingProduct.categoryId) {
      showToast('Sản phẩm đã ở nhóm này rồi, vui lòng chọn nhóm khác!', 'info');
      return;
    }

    const oldCat = categories.find((c) => c.id === movingProduct.categoryId);
    setSaving(true);
    try {
      const result = await moveProductsToCategory(targetCategoryId, [movingProduct.id]);
      const prodName = movingProduct.name;
      setMovingProduct(null);
      showToast(
        `Đã chuyển sản phẩm "${prodName}" từ nhóm "${oldCat?.name || 'Cũ'}" sang nhóm "${result.categoryName}" thành công!`,
        'success'
      );
      await refreshAll();
    } catch (err) {
      showToast(errMsg(err, 'Không thể chuyển sản phẩm.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Lưu thêm mới hoặc sửa nhóm hàng qua API
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !canManage || saving) return;

    const trimmedName = editingCategory.name.trim();
    const trimmedCode = editingCategory.code.trim().toUpperCase();

    if (!trimmedName || (editingCategory.isNew && !trimmedCode)) {
      showToast('Vui lòng nhập đầy đủ mã nhóm và tên nhóm hàng!', 'error');
      return;
    }

    if (editingCategory.isNew) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(trimmedCode)) {
        showToast('Mã nhóm dài 2–30 ký tự, chỉ gồm chữ, số, "-" hoặc "_".', 'error');
        return;
      }
      if (categories.some((c) => c.code.toUpperCase() === trimmedCode)) {
        showToast(`Mã nhóm hàng "${trimmedCode}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác!`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingCategory.isNew) {
        const created = await createCategory({
          code: trimmedCode,
          name: trimmedName,
          description: editingCategory.description,
          parentId: editingCategory.parentId
        });
        if (editingCategory.parentId) {
          setExpandedNodeIds((prev) => new Set([...prev, editingCategory.parentId as string]));
        }
        setSelectedCategoryId(created.id);
        showToast(`Đã tạo mới nhóm hàng "${created.name}" (Cấp ${created.level}) thành công!`, 'success');
      } else if (editingCategory.id) {
        const updated = await updateCategory(editingCategory.id, {
          name: trimmedName,
          description: editingCategory.description
        });
        showToast(`Đã cập nhật thông tin nhóm hàng "${updated.name}" thành công!`, 'success');
      }
      setEditingCategory(null);
      await loadCategories();
    } catch (err) {
      showToast(errMsg(err, 'Không thể lưu nhóm hàng.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Mở modal thêm nhóm con
  const handleOpenAddChild = (parentCat: ProductCategory) => {
    if (!canManage) return;
    if (parentCat.level >= CATEGORY_MAX_LEVEL) {
      showToast(`Cây nhóm hàng tối đa ${CATEGORY_MAX_LEVEL} cấp, không thể thêm nhóm con.`, 'info');
      return;
    }
    setEditingCategory({
      isNew: true,
      parentId: parentCat.id,
      parentName: parentCat.name,
      level: parentCat.level + 1,
      code: '',
      name: '',
      description: ''
    });
  };

  // Mở modal sửa thông tin nhóm
  const handleOpenEdit = (cat: ProductCategory) => {
    if (!canManage) return;
    setEditingCategory({
      isNew: false,
      parentId: cat.parentId,
      parentName: categories.find((c) => c.id === cat.parentId)?.name,
      level: cat.level,
      id: cat.id,
      code: cat.code,
      name: cat.name,
      description: cat.description || ''
    });
  };

  // Hàm render đệ quy cây nhóm hàng với thụt lề và đường nối trực quan
  const renderCategoryTree = (parentId: string | null = null, depth = 0) => {
    const currentLevelNodes = categories.filter((c) => c.parentId === parentId);
    if (currentLevelNodes.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-3 sm:ml-4 pl-2 border-l border-slate-200' : ''}`}>
        {currentLevelNodes.map((cat) => {
          const hasChildren = categories.some((c) => c.parentId === cat.id);
          const isExpanded = expandedNodeIds.has(cat.id);
          const isSelected = selectedCategoryId === cat.id;
          const rollup = rollupsByCategoryId[cat.id] || {
            directProductCount: 0,
            totalProductCount: 0
          };
          const childCount = categories.filter((c) => c.parentId === cat.id).length;
          const deleteBlocked = rollup.totalProductCount > 0 || childCount > 0;
          const canAddChild = cat.level < CATEGORY_MAX_LEVEL;

          return (
            <div key={cat.id} className="group">
              <div
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-xs select-none ${
                  isSelected
                    ? 'bg-orange-50 border border-orange-200 text-orange-950 font-semibold shadow-xs'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {/* Phần bên trái: Nút expand + Icon + Tên nhóm + Badge Cấp */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(cat.id);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                      title={isExpanded ? 'Thu gọn nhóm' : 'Mở rộng nhóm'}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="w-5.5 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>
                  )}

                  {/* Icon phân biệt cấp độ */}
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold ${
                      cat.level === 1
                        ? 'bg-orange-600 text-white shadow-xs'
                        : cat.level === 2
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    title={`Cấp ${cat.level}: ${levelLabel(cat.level)}`}
                  >
                    L{cat.level}
                  </span>

                  <span className="truncate text-slate-800 font-medium" title={cat.name}>
                    {cat.name}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    ({cat.code})
                  </span>
                </div>

                {/* Phần bên phải: Số lượng sản phẩm cộng dồn + Nút thao tác nhanh */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Số SKU tổng hợp của nhánh (doanh số chưa có dữ liệu) */}
                  <div className="text-right">
                    <span
                      className={`text-[11px] font-bold font-mono block ${
                        isSelected ? 'text-orange-600' : 'text-slate-700'
                      }`}
                      title="Số mã hàng cộng dồn của toàn bộ ngành/nhóm"
                    >
                      {rollup.totalProductCount} SKU
                    </span>
                    <span className="text-[10px] text-slate-400" title="Số mã gắn trực tiếp">
                      {rollup.directProductCount} trực tiếp
                    </span>
                  </div>

                  {/* Menu thao tác nhanh (chỉ ADMIN / SALES_MANAGER) */}
                  {canManage && (
                  <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Nút thêm nhóm con (tối đa CATEGORY_MAX_LEVEL cấp) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddChild(cat);
                      }}
                      disabled={!canAddChild}
                      className="p-1 hover:bg-slate-200 text-slate-600 hover:text-orange-600 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={canAddChild ? 'Thêm nhóm con cấp dưới' : `Đã đạt tối đa ${CATEGORY_MAX_LEVEL} cấp`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>

                    {/* Sửa thông tin nhóm */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(cat);
                      }}
                      className="p-1 hover:bg-slate-200 text-slate-600 hover:text-blue-600 rounded cursor-pointer"
                      title="Chỉnh sửa nhóm hàng"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Xoá nhóm (Quy tắc: còn sản phẩm thì chặn) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategoryClick(cat);
                      }}
                      className={`p-1 rounded cursor-pointer ${
                        deleteBlocked
                          ? 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                          : 'text-red-500 hover:bg-red-100'
                      }`}
                      title={
                        rollup.totalProductCount > 0
                          ? `Không thể xoá: Nhóm còn ${rollup.totalProductCount} sản phẩm`
                          : childCount > 0
                          ? `Không thể xoá: Nhóm còn ${childCount} nhóm con`
                          : 'Xoá nhóm hàng trống'
                      }
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  )}
                </div>
              </div>

              {/* Nhánh con nếu đang mở rộng */}
              {hasChildren && isExpanded && renderCategoryTree(cat.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Rollup của nhóm đang được chọn
  const activeRollup = selectedCategory ? rollupsByCategoryId[selectedCategory.id] : null;

  const activeChildCount = selectedCategory
    ? categories.filter((c) => c.parentId === selectedCategory.id).length
    : 0;
  const activeDeleteBlocked = (activeRollup?.totalProductCount || 0) > 0 || activeChildCount > 0;

  return (
    <div className="space-y-5">
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-medium animate-bounce transition-all ${
            toastMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : toastMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-current" />
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header chỉ dẫn vai trò Quản lý kinh doanh */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Quản Lý Nhóm Hàng Nhiều Cấp & Phân Tích Doanh Số Ngành Hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Theo dõi doanh số theo ngành hàng, phân nhóm sản phẩm, điều chuyển mã hàng và bảo toàn toàn vẹn dữ liệu danh mục.
          </p>
          {!canManage && (
            <p className="text-[11px] text-amber-700 mt-1">
              Bạn đang ở chế độ chỉ xem. Chỉ Quản trị viên và Quản lý kinh doanh được thêm/sửa/xoá nhóm và chuyển sản phẩm.
            </p>
          )}
        </div>

        {/* Nút thêm Ngành hàng cấp 1 mới */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshAll()}
            disabled={loadingTree}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu từ máy chủ"
          >
            {loadingTree ? 'Đang tải...' : 'Tải lại'}
          </button>
          {canManage && (
          <button
            type="button"
            onClick={() =>
              setEditingCategory({
                isNew: true,
                parentId: null,
                level: 1,
                code: '',
                name: '',
                description: ''
              })
            }
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Tạo Ngành Hàng Mới (Cấp 1)</span>
          </button>
          )}
        </div>
      </div>

      {/* Bố cục 2 cột: Cột trái Cây Nhóm Hàng | Cột phải Doanh Số & Chi Tiết Sản Phẩm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI: CÂY NHÓM HÀNG NHIỀU CẤP (LG: 5 CỘT) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Cây Cấu Trúc Nhóm Hàng
              </h2>
              <span className="text-[11px] text-slate-400">
                Hiển thị số mã hàng cộng dồn trên từng nhánh
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="px-2 py-1 text-[11px] rounded-lg text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                title="Mở rộng toàn bộ cây"
              >
                Mở hết
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2 py-1 text-[11px] rounded-lg text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                title="Thu gọn toàn bộ cây"
              >
                Thu gọn
              </button>
            </div>
          </div>

          {/* Hướng dẫn quy tắc nhanh */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Quy tắc quản trị nhóm hàng:
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-700">
              <li>Mỗi nhóm hiển thị số mã hàng cộng dồn của toàn nhánh (Rollup). {NO_SALES_DATA_NOTE}.</li>
              <li><strong>Nhóm còn sản phẩm hoặc nhóm con thì KHÔNG xoá được</strong>.</li>
              <li>Cây tối đa {CATEGORY_MAX_LEVEL} cấp; mã nhóm và nhóm cha không đổi được sau khi tạo.</li>
              <li>Chuyển sản phẩm giữa các nhóm bằng nút <em>"Chuyển nhóm"</em> ở bảng bên phải.</li>
            </ul>
          </div>

          {/* Vùng hiển thị Cây */}
          <div className="max-h-[640px] overflow-y-auto pr-1">
            {loadingTree && categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải cây nhóm hàng...</div>
            ) : treeError ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <div>{treeError}</div>
                <button
                  type="button"
                  onClick={() => loadCategories()}
                  className="px-3 py-1 rounded-lg bg-white border border-red-200 font-bold hover:bg-red-100 cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có nhóm hàng nào.{canManage ? ' Bấm "Tạo Ngành Hàng Mới" để bắt đầu.' : ''}
              </div>
            ) : (
              renderCategoryTree(null, 0)
            )}
          </div>
        </div>

        {/* CỘT PHẢI: BÁO CÁO DOANH SỐ NGÀNH HÀNG & DANH SÁCH MÃ SẢN PHẨM (LG: 7 CỘT) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCategory ? (
            <>
              {/* Thẻ Breadcrumb và Thông Tin Chi Tiết Nhóm Đang Chọn */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Ngành hàng:</span>
                  {categoryBreadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <span className="text-slate-300">/</span>}
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(crumb.id)}
                        className={`font-medium hover:underline cursor-pointer ${
                          crumb.id === selectedCategory.id
                            ? 'text-orange-600 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    Cấp {selectedCategory.level} ({levelLabel(selectedCategory.level)})
                  </span>
                </div>

                {/* Tiêu đề nhóm */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <span>{selectedCategory.name}</span>
                      <span className="text-xs font-mono font-normal text-slate-400">
                        [{selectedCategory.code}]
                      </span>
                    </h2>
                    {selectedCategory.description && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedCategory.description}
                      </p>
                    )}
                  </div>

                  {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(selectedCategory)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                      title="Sửa tên và mô tả nhóm"
                    >
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddChild(selectedCategory)}
                      disabled={selectedCategory.level >= CATEGORY_MAX_LEVEL}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        selectedCategory.level >= CATEGORY_MAX_LEVEL
                          ? `Đã đạt tối đa ${CATEGORY_MAX_LEVEL} cấp`
                          : 'Thêm nhóm con dưới nhóm này'
                      }
                    >
                      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Thêm Nhóm Con</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategoryClick(selectedCategory)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        activeDeleteBlocked
                          ? 'border-slate-200 text-slate-400 hover:bg-slate-50'
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                      title={
                        activeDeleteBlocked
                          ? 'Chặn xoá vì nhóm đang có sản phẩm hoặc nhóm con'
                          : 'Xoá nhóm hàng này'
                      }
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xoá Nhóm</span>
                    </button>
                  </div>
                  )}
                </div>

                {/* 4 THẺ THỐNG KÊ DOANH SỐ THEO NGÀNH HÀNG (QUẢN LÝ KINH DOANH) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {/* Card 1: Doanh số toàn ngành/nhóm */}
                  <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 space-y-1">
                    <span className="text-[11px] font-medium text-orange-800 block">
                      Doanh Số Ngành Hàng
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-orange-600/50 font-mono block leading-tight">
                      —
                    </span>
                    <span className="text-[10px] text-orange-700/80 block">
                      {NO_SALES_DATA_NOTE}
                    </span>
                  </div>

                  {/* Card 2: Tổng sản lượng bán */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-medium text-slate-600 block">
                      Tổng Sản Lượng Bán
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-400 font-mono block leading-tight">
                      —
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Chưa có dữ liệu (ĐVT cơ sở)
                    </span>
                  </div>

                  {/* Card 3: Số lượng SKU */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-medium text-slate-600 block">
                      Số Lượng Mã Hàng
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-800 font-mono block leading-tight">
                      {activeRollup?.totalProductCount || 0} SKU
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {activeRollup?.directProductCount || 0} mã gắn trực tiếp
                    </span>
                  </div>

                  {/* Card 4: Tỷ trọng trong toàn hệ thống */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                    <span className="text-[11px] font-medium text-emerald-800 block">
                      Tỷ Trọng Doanh Số
                    </span>
                    <span className="text-sm sm:text-base font-bold text-emerald-700/50 font-mono block leading-tight">
                      —
                    </span>
                    <span className="text-[10px] text-emerald-600 block">
                      Chưa có dữ liệu doanh số
                    </span>
                  </div>
                </div>
              </div>

              {/* BẢNG DANH SÁCH MÃ SẢN PHẨM THUỘC NGÀNH HÀNG */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>Danh Sách Mã Hàng Trong Ngành</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {displayedProducts.length} sản phẩm
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {canManage ? 'Xem mã hàng trong nhóm và thực hiện chuyển nhóm hàng' : 'Xem mã hàng trong nhóm'}
                    </p>
                    {productsTotal > products.length && (
                      <p className="text-[11px] text-amber-700">
                        Đang hiển thị {products.length}/{productsTotal} sản phẩm đầu tiên.
                      </p>
                    )}
                  </div>

                  {/* Toggle phạm vi xem + Ô tìm kiếm */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-medium">
                      <button
                        type="button"
                        onClick={() => setViewScope('BRANCH')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          viewScope === 'BRANCH'
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Bao gồm cả sản phẩm ở các phân nhóm con"
                      >
                        Toàn bộ nhánh ({activeRollup?.totalProductCount || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewScope('DIRECT')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          viewScope === 'DIRECT'
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Chỉ sản phẩm gắn trực tiếp tại node này"
                      >
                        Gắn trực tiếp ({activeRollup?.directProductCount || 0})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-auto">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm SKU, tên sản phẩm..."
                        className="h-8 pl-8 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 w-full sm:w-44"
                      />
                      <svg
                        className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Bảng dữ liệu sản phẩm */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-2.5 px-3">Mã SKU</th>
                        <th className="py-2.5 px-3">Tên Sản Phẩm</th>
                        <th className="py-2.5 px-3">ĐVT Cơ Sở</th>
                        <th className="py-2.5 px-3">Nhóm Hiện Tại</th>
                        <th className="py-2.5 px-3 text-right">Sản Lượng Bán</th>
                        <th className="py-2.5 px-3 text-right">Doanh Số (VND)</th>
                        {canManage && <th className="py-2.5 px-3 text-center">Thao Tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingProducts ? (
                        <tr>
                          <td colSpan={canManage ? 7 : 6} className="text-center py-8 text-slate-400">
                            Đang tải danh sách sản phẩm...
                          </td>
                        </tr>
                      ) : productsError ? (
                        <tr>
                          <td colSpan={canManage ? 7 : 6} className="text-center py-8 text-red-600">
                            {productsError}{' '}
                            <button
                              type="button"
                              onClick={() => setProductsReloadKey((k) => k + 1)}
                              className="ml-1 underline font-bold cursor-pointer"
                            >
                              Thử lại
                            </button>
                          </td>
                        </tr>
                      ) : displayedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 7 : 6} className="text-center py-8 text-slate-400">
                            Không có sản phẩm nào trong nhóm hàng này hoặc không khớp từ khoá tìm kiếm.
                          </td>
                        </tr>
                      ) : (
                        displayedProducts.map((prod) => {
                          const directCategory = categories.find((c) => c.id === prod.categoryId);

                          return (
                            <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                {prod.sku}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {prod.name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono">
                                  {prod.baseUnit}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                  {directCategory?.name || 'Chưa phân nhóm'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-400" title={NO_SALES_DATA_NOTE}>
                                —
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400" title={NO_SALES_DATA_NOTE}>
                                —
                              </td>
                              {canManage && (
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenMoveModal(prod)}
                                  className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] border border-orange-200 transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Chuyển sản phẩm sang nhóm hàng khác"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                  </svg>
                                  <span>Chuyển Nhóm</span>
                                </button>
                              </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              {loadingTree ? 'Đang tải dữ liệu...' : 'Vui lòng chọn một nhóm hàng ở cây bên trái để xem chi tiết.'}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CHUYỂN SẢN PHẨM GIỮA CÁC NHÓM */}
      {canManage && movingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                Chuyển Nhóm Hàng Cho Sản Phẩm
              </h3>
              <button
                type="button"
                onClick={() => setMovingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMoveProduct} className="space-y-4 pt-4">
              {/* Thông tin sản phẩm đang chuyển */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã SKU:</span>
                  <span className="font-mono font-bold text-slate-800">{movingProduct.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên sản phẩm:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[220px] truncate">{movingProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhóm hiện tại:</span>
                  <span className="text-orange-700 font-medium">
                    {categories.find((c) => c.id === movingProduct.categoryId)?.name || 'Chưa rõ'}
                  </span>
                </div>
              </div>

              {/* Chọn nhóm hàng đích */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn Nhóm Hàng Đích Đến <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 bg-white"
                  required
                >
                  <option value="" disabled>-- Chọn nhóm hàng đích --</option>
                  {categories.map((c) => {
                    const indent = '—'.repeat(c.level - 1);
                    return (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={c.id === movingProduct.categoryId}
                      >
                        {indent} Cấp {c.level}: {c.name} ({c.code}) {c.id === movingProduct.categoryId ? '(Hiện tại)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sau khi chuyển, số mã hàng của nhóm cũ và nhóm mới sẽ được cập nhật từ máy chủ.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMovingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Huỷ Bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {saving ? 'Đang chuyển...' : 'Xác Nhận Chuyển Nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CẢNH BÁO CHẶN XOÁ NHÓM VÌ CÒN SẢN PHẨM */}
      {deleteBlockedInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-2xl p-6 relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-800">
                  {deleteBlockedInfo.productCount > 0 ? 'Không Thể Xoá Nhóm Hàng Còn Sản Phẩm!' : 'Không Thể Xoá Nhóm Hàng Còn Nhóm Con!'}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {deleteBlockedInfo.reason}
                </p>
                {deleteBlockedInfo.productCount > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 space-y-1">
                  <div className="font-semibold">Hành động khắc phục:</div>
                  <p>
                    Vui lòng sử dụng tính năng <strong>"Chuyển nhóm"</strong> để di chuyển toàn bộ{' '}
                    <span className="font-bold underline">{deleteBlockedInfo.productCount} sản phẩm</span> sang nhóm hàng khác trước khi thực hiện xoá nhóm.
                  </p>
                </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteBlockedInfo(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Tôi Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN XOÁ NHÓM TRỐNG (HỢP LỆ) */}
      {canManage && confirmDeleteCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Xác Nhận Xoá Nhóm Hàng Trống
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Nhóm <strong className="text-slate-800 font-bold">{confirmDeleteCategory.name}</strong> ({confirmDeleteCategory.code}) hiện không chứa bất kỳ sản phẩm nào. Bạn có chắc chắn muốn xoá nhóm này khỏi cây danh mục?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteCategory(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                Huỷ Bỏ
              </button>
              <button
                type="button"
                onClick={() => executeDeleteCategory()}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {saving ? 'Đang xoá...' : 'Xác Nhận Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: THÊM / SỬA NHÓM HÀNG */}
      {canManage && editingCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingCategory.isNew
                  ? `Thêm Nhóm Hàng Mới (Cấp ${editingCategory.level})`
                  : `Chỉnh Sửa Nhóm Hàng (Cấp ${editingCategory.level})`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 pt-4">
              {editingCategory.parentName && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex justify-between">
                  <span className="text-slate-500">Nhóm cha trực tiếp:</span>
                  <span className="font-semibold text-slate-800">{editingCategory.parentName}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã Nhóm Hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.code}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, code: e.target.value.toUpperCase() })
                  }
                  required={editingCategory.isNew}
                  disabled={!editingCategory.isNew}
                  maxLength={30}
                  placeholder="Ví dụ: NH-BIA-LON"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {editingCategory.isNew
                    ? '2–30 ký tự: chữ, số, "-" hoặc "_". Không đổi được sau khi tạo.'
                    : 'Mã nhóm và nhóm cha không thể thay đổi sau khi tạo.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Nhóm Hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  required
                  maxLength={100}
                  placeholder="Ví dụ: Bia Lon Thương Mại"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả Nhóm Hàng
                </label>
                <textarea
                  rows={3}
                  value={editingCategory.description}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  maxLength={500}
                  placeholder="Mô tả phạm vi sản phẩm và tính chất ngành hàng..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Huỷ Bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  {saving ? 'Đang lưu...' : editingCategory.isNew ? 'Lưu Nhóm Mới' : 'Cập Nhật Nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
