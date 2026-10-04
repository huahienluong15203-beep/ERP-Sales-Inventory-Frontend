import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { PriceList } from '../../types/pricing';
import {
  fetchPriceLists,
  changePriceListStatus
} from '../../services/pricingApi';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái các Modal
  const [detailModalItem, setDetailModalItem] = useState<PriceList | null>(null);
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PriceList | null>(null);
  const [cloneModalItem, setCloneModalItem] = useState<PriceList | null>(null);

  // Tải danh sách bảng giá từ API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPriceLists();
      setPriceLists(data);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bảng giá');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchPriceLists()
      .then((data) => {
        if (!ignore) {
          setPriceLists(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bảng giá');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

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
      {/* Tiêu đề trang & Nút thao tác chính */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-orange-50 text-[#F85606] border border-orange-200">
              EP-02: Sản phẩm & Bảng giá
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-[#F85606] border border-orange-200">
              SCRUM-55 (S2-10)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Icons.Tags className="text-[#F85606]" size={28} />
            Quản lý Bảng giá theo Nhóm Khách hàng
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Khai báo nhiều bảng giá song song theo nhóm khách hàng (Đại lý cấp 1, cấp 2, khách lẻ) và thời gian hiệu lực. Thiết lập giá sàn để kiểm soát ngoại lệ duyệt đơn bán hàng.
          </p>
        </div>

        {/* Thanh tác vụ */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            title="Tải lại danh sách"
            className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-[#F85606] rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
          >
            <Icons.RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F85606] hover:bg-[#E04D05] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Icons.Plus size={18} />
              <span>Khai báo bảng giá mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Thông tin vai trò & phạm vi nghiệp vụ */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-100/80 border border-gray-200 text-xs">
        <div className="flex items-center gap-2 text-gray-600">
          <Icons.ShieldCheck size={16} className="text-[#F85606]" />
          <span>
            Vai trò hiện tại: <strong>{currentRole}</strong>
          </span>
          <span className="text-gray-400">•</span>
          <span>
            {canManage
              ? 'Toàn quyền thiết lập bảng giá, mức giá sàn và nhân bản phiên bản'
              : 'Quyền tra cứu và áp dụng giá bán khi tạo đơn hàng'}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500">
          <span>Tiền tệ: <strong>VND</strong></span>
          <span>•</span>
          <span>Múi giờ: <strong>UTC+7</strong></span>
        </div>
      </div>

      {/* KPI Thống kê bảng giá */}
      <PriceListStats priceLists={priceLists} />

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
      {loading ? (
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
