import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { PriceList, CustomerGroupType } from '../../types/pricing';
import {
  fetchPriceLists,
  fetchPriceListStats,
  changePriceListStatus
} from '../../services/pricingApi';
import type { PriceListStatsData } from '../../services/pricingApi';
import { useUrlPaging } from '../../hooks/useUrlParams';
import { useServerSearch } from '../../hooks/useServerSearch';
import { PriceListStats } from '../../components/pricing/PriceListStats';
import { PriceLookupWidget } from '../../components/pricing/PriceLookupWidget';
import { PriceListTable } from '../../components/pricing/PriceListTable';
import { PriceListDetailModal } from '../../components/pricing/PriceListDetailModal';
import { PriceListFormModal } from '../../components/pricing/PriceListFormModal';
import { CloneVersionModal } from '../../components/pricing/CloneVersionModal';
import { Icons } from '../../components/common/Icons';

export const PriceListPage: React.FC = () => {
  const { currentRole, user, showToast } = useAuth();

  // Kiểm tra quyền hạn theo quy định RBAC S2-10
  const canManage =
    !currentRole ||
    currentRole.includes('ADMIN') ||
    currentRole.includes('MANAGER') ||
    (user?.roles || []).some((r) => String(r).includes('ADMIN') || String(r).includes('MANAGER'));

  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<PriceListStatsData>({
    total: 0,
    active: 0,
    dealerLevel1: 0,
    dealerLevel2: 0,
    retail: 0,
    locked: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadedOnce, setLoadedOnce] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc + trang lưu trên URL, vd: /price-lists?group=DEALER_LEVEL_1&status=ACTIVE&page=2
  const { params: urlParams, setParams: setUrlParams, page, size, setPage, setSize, setFilters } = useUrlPaging({
    keyword: '',
    group: 'ALL',
    status: 'ALL'
  });
  const [keywordInput, setKeywordInput] = useState<string>(urlParams.keyword);
  const resetToFirstPage = useCallback(() => setPage(0), [setPage]);
  // Đợi ngừng gõ 0,4 giây mới gọi API tìm kiếm
  const { serverKeyword } = useServerSearch(keywordInput, resetToFirstPage, urlParams.keyword);
  useEffect(() => {
    setUrlParams({ keyword: serverKeyword });
  }, [serverKeyword, setUrlParams]);

  // Trạng thái các Modal
  const [detailModalItem, setDetailModalItem] = useState<PriceList | null>(null);
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PriceList | null>(null);
  const [cloneModalItem, setCloneModalItem] = useState<PriceList | null>(null);

  // Tải 1 trang bảng giá (Backend lọc + phân trang) và số liệu thẻ đầu trang
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, statData] = await Promise.all([
        fetchPriceLists({
          customerGroup: urlParams.group !== 'ALL' ? (urlParams.group as CustomerGroupType) : undefined,
          status: urlParams.status !== 'ALL' ? urlParams.status : undefined,
          keyword: serverKeyword || undefined,
          page,
          size
        }),
        fetchPriceListStats()
      ]);
      setPriceLists(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
      setStats(statData);
      // Trang hiện tại vượt quá số trang (vd: vừa lọc bớt) -> về trang cuối
      if (res.totalPages > 0 && page > res.totalPages - 1) {
        setPage(res.totalPages - 1);
      }
      return res.content;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bảng giá');
      return [];
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [urlParams.group, urlParams.status, serverKeyword, page, size, setPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xử lý bật/tắt trạng thái
  const handleToggleStatus = async (item: PriceList) => {
    if (!canManage) return;
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await changePriceListStatus(item.id, nextStatus);
      showToast?.(
        'Cập nhật thành công',
        `Bảng giá ${item.code} đã được chuyển sang ${nextStatus === 'ACTIVE' ? 'ĐANG ÁP DỤNG' : 'NGỪNG ÁP DỤNG'}`,
        'success'
      );
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi đổi trạng thái');
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (item: PriceList) => {
    if (item.hasOrders) {
      alert('Bảng giá đã phát sinh đơn hàng nên không thể sửa. Vui lòng tạo phiên bản mới.');
      return;
    }
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const handleOpenClone = (item: PriceList) => {
    setCloneModalItem(item);
  };

  const handleFormSuccess = (saved: PriceList) => {
    showToast?.(
      'Thành công',
      `Đã lưu thông tin bảng giá ${saved.code} thành công!`,
      'success'
    );
    loadData();
  };

  const handleCloneSuccess = (cloned: PriceList) => {
    showToast?.(
      'Tạo phiên bản mới thành công',
      `Bảng giá ${cloned.code} (v${cloned.version}) đã được khởi tạo và sẵn sàng áp dụng!`,
      'success'
    );
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Nút thao tác chính */}
      <div className="flex items-center justify-end gap-2.5  p-4 ">
        {/* Thanh tác vụ */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            title="Làm mới danh sách bảng giá"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-[#F85606] hover:border-orange-200 rounded-xl hover:bg-gray-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs min-h-[44px]"
          >
            <Icons.RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <a
            href="/pricing/discounts"
            className="min h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-300 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Icons.Percent size={16} className="text-indigo-600" />
            <span className="hidden sm:inline">Chiết khấu sản lượng</span>
            <span className="sm:hidden">CK Sản lượng</span>
          </a>

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="min h-[43px] inline-flex items-center gap-2 px-4 py-2.5 bg-[#F85606] hover:bg-[#E04D05] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Icons.Plus size={18} />
              <span>Khai báo bảng giá mới</span>
            </button>
          )}

        </div>
      </div>

      {/* Thông tin vai trò & phạm vi nghiệp vụ */}


      {/* KPI Thống kê bảng giá */}
      <PriceListStats stats={stats} />

      {/* Widget Tra cứu giá & Giá sàn tức thời (S2-10) */}
      <PriceLookupWidget />

      {/* Lỗi nếu có */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.ShieldAlert size={18} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="font-semibold underline hover:no-underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Bảng danh sách bảng giá */}
      {loading && !loadedOnce ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200">
          <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">
            Đang tải dữ liệu bảng giá...
          </p>
        </div>
      ) : (
        <PriceListTable
          priceLists={priceLists}
          canManage={canManage}
          onViewDetail={(item) => setDetailModalItem(item)}
          onEdit={handleOpenEdit}
          onCloneVersion={handleOpenClone}
          onToggleStatus={handleToggleStatus}
          keyword={keywordInput}
          onKeywordChange={setKeywordInput}
          selectedGroup={urlParams.group}
          onGroupChange={(value) => setFilters({ group: value })}
          selectedStatus={urlParams.status}
          onStatusChange={(value) => setFilters({ status: value })}
          page={page}
          size={size}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={setPage}
          onSizeChange={setSize}
          loading={loading}
        />
      )}

      {/* Modal Xem chi tiết dòng giá */}
      {detailModalItem && (
        <PriceListDetailModal
          key={`detail-${detailModalItem.id}`}
          priceList={detailModalItem}
          canManage={canManage}
          onClose={() => setDetailModalItem(null)}
          onRefresh={async () => {
            const data = await loadData();
            if (data && data.length > 0) {
              const updated = data.find((p) => p.id === detailModalItem.id);
              if (updated) setDetailModalItem(updated);
            }
          }}
          onOpenClone={handleOpenClone}
        />
      )}

      {/* Modal Thêm mới / Sửa bảng giá */}
      {formModalOpen && (
        <PriceListFormModal
          key={editingItem ? `edit-${editingItem.id}` : 'create-new'}
          initialData={editingItem}
          onClose={() => {
            setFormModalOpen(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Modal Tạo phiên bản mới (Clone Version) */}
      {cloneModalItem && (
        <CloneVersionModal
          key={`clone-${cloneModalItem.id}`}
          originalList={cloneModalItem}
          onClose={() => setCloneModalItem(null)}
          onSuccess={handleCloneSuccess}
        />
      )}
    </div>
  );
};
