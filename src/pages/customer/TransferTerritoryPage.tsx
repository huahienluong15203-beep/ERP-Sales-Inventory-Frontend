import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '../../routes/Router';
import { useAuth } from '../../contexts/AuthContext';
import type { Agency, SalesRepOption, RegionOption } from '../../types/agency';
import {
  SALES_REP_OPTIONS,
  fetchAgencyFormOptions,
  fetchAgencies,
  transferAgencyTerritory
} from '../../services/agencyApi';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Building2,
  RefreshCw,
  CheckCircle2,
  MapPin,
  FileText,
  Search,
  ShieldAlert,
  Info
} from '../../components/common/Icons';
import { SearchSelect } from '../../components/common/SearchSelect';
import { Pagination } from '../../components/common/Pagination';

export const TransferTerritoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, user, showToast } = useAuth();

  // Quyền: chỉ Quản lý kinh doanh & Admin
  const canManageAssignments =
    currentRole === 'ROLE_ADMIN' || currentRole === 'ROLE_SALES_MANAGER';

  const [salesReps, setSalesReps] = useState<SalesRepOption[]>(SALES_REP_OPTIONS);
  const [fromRepId, setFromRepId] = useState(SALES_REP_OPTIONS[0]?.id || '');
  const [toRepId, setToRepId] = useState(SALES_REP_OPTIONS[1]?.id || '');
  const [selectedRegionId, setSelectedRegionId] = useState<string>(''); // Rỗng = Tất cả khu vực
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Đại lý sẽ bị chuyển giao (Preview từ Backend)
  const [affectedAgencies, setAffectedAgencies] = useState<Agency[]>([]);
  const [affectedTotal, setAffectedTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');

  // Phân trang danh sách xem trước (khoảng 30-50 địa bàn / trang)
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(30);

  // Tải danh mục NV kinh doanh và khu vực
  useEffect(() => {
    let ignore = false;
    fetchAgencyFormOptions(true)
      .then((options) => {
        if (ignore) return;
        setRegions(options.regions);
        if (options.salesReps.length > 0) {
          setSalesReps(options.salesReps);
          const firstId = options.salesReps[0]?.id || '';
          const secondId = options.salesReps.find((r) => r.id !== firstId)?.id || firstId;
          setFromRepId(firstId);
          setToRepId(secondId);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Không tải được danh sách khu vực và nhân viên kinh doanh.');
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleFromRepChange = (newFromId: string) => {
    setFromRepId(newFromId);
    if (toRepId === newFromId) {
      const alternative = salesReps.find((r) => r.id !== newFromId);
      if (alternative) {
        setToRepId(alternative.id);
      }
    }
  };

  // Tải trước danh sách đại lý thỏa mãn điều kiện chuyển giao
  useEffect(() => {
    if (!/^\d+$/.test(fromRepId)) {
      setAffectedAgencies([]);
      setAffectedTotal(0);
      return;
    }
    let ignore = false;
    setPage(0);
    setLoadingPreview(true);
    fetchAgencies({
      salesRepId: fromRepId,
      regionId: selectedRegionId || undefined,
      page: 0,
      size: 500
    })
      .then((res) => {
        if (ignore) return;
        setAffectedAgencies(res.content);
        setAffectedTotal(res.totalElements);
      })
      .catch(() => {
        if (!ignore) {
          setAffectedAgencies([]);
          setAffectedTotal(0);
        }
      })
      .finally(() => {
        if (!ignore) setLoadingPreview(false);
      });

    return () => {
      ignore = true;
    };
  }, [fromRepId, selectedRegionId]);

  const fromRep = useMemo(
    () => salesReps.find((r) => r.id === fromRepId) || SALES_REP_OPTIONS.find((r) => r.id === fromRepId),
    [salesReps, fromRepId]
  );
  const toRep = useMemo(
    () => salesReps.find((r) => r.id === toRepId) || SALES_REP_OPTIONS.find((r) => r.id === toRepId),
    [salesReps, toRepId]
  );
  const isSameRep = fromRepId === toRepId;

  // Lọc nhanh trong danh sách preview
  const filteredPreviewList = useMemo(() => {
    if (!previewSearch.trim()) return affectedAgencies;
    const q = previewSearch.trim().toLowerCase();
    return affectedAgencies.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.regionName && a.regionName.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q))
    );
  }, [affectedAgencies, previewSearch]);

  // Phân trang danh sách preview
  const totalFilteredElements = filteredPreviewList.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredElements / size));
  const paginatedList = useMemo(() => {
    const start = page * size;
    return filteredPreviewList.slice(start, start + size);
  }, [filteredPreviewList, page, size]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSameRep) {
      setError('Nhân viên nhận bàn giao phải khác nhân viên bàn giao!');
      return;
    }

    if (!reason.trim()) {
      setError('Bắt buộc phải nhập lý do chuyển giao địa bàn!');
      return;
    }

    if (affectedTotal === 0) {
      setError('Không có đại lý nào thỏa mãn điều kiện để chuyển giao.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await transferAgencyTerritory(
        {
          fromSalesRepId: fromRepId,
          toSalesRepId: toRepId,
          regionId: selectedRegionId || undefined,
          reason: reason.trim()
        },
        user ? { fullName: user.fullName, username: user.username, role: user.role } : undefined
      );

      if (res.success) {
        showToast(
          'Chuyển giao thành công',
          `Đã chuyển giao thành công ${affectedTotal} đại lý từ ${fromRep?.fullName} sang ${toRep?.fullName}!`,
          'success'
        );
        navigate('/customers');
      } else {
        setError(res.message);
      }
    } catch {
      setError('Lỗi kết nối đến máy chủ khi thực hiện chuyển giao hàng loạt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManageAssignments) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <ShieldAlert size={36} className="text-amber-500" />
        <h3 className="text-base font-bold text-gray-800">Quyền truy cập bị giới hạn</h3>
        <p className="text-xs text-gray-500 max-w-md">
          Chỉ Quản trị viên và Quản lý kinh doanh mới có quyền thực hiện chuyển giao địa bàn hàng loạt.
        </p>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
        >
          Quay lại danh sách đại lý
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 antialiased pb-20 animate-in fade-in duration-200">
      {/* 1. THANH QUAY LẠI & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 text-gray-700 hover:text-[#F85606] font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
            id="territory-transfer-back-btn"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách đại lý</span>
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Bán hàng / Hồ sơ đại lý / Chuyển giao địa bàn hàng loạt
          </span>
        </div>
      </div>

      {/* 2. BANNER TIÊU ĐỀ TRANG */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-[#F85606] rounded-2xl p-5 sm:p-6 text-white shadow-md shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25">
            <Users size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Chuyển Giao Địa Bàn Hàng Loạt</h1>
            <p className="text-xs sm:text-sm text-orange-100 mt-0.5">
              Bàn giao toàn bộ hoặc theo khu vực cho nhân viên mới khi nhân viên nghỉ việc hoặc luân chuyển công tác
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-xs text-xs font-semibold border border-white/20 flex items-center gap-1.5">
            <FileText size={14} />
            <span>Tự động ghi nhật ký TRANSFER</span>
          </span>
        </div>
      </div>

      {/* 3. THÔNG BÁO LỖI NẾU CÓ */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-3 shadow-2xs animate-in slide-in-from-top-2">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-red-800">Cảnh báo:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 4. BỐ CỤC 2 CỘT: CẤU HÌNH BÀN GIAO & XEM TRƯỚC ĐẠI LÝ BỊ ẢNH HƯỞNG */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* CỘT TRÁI (5 CỘT TRÊN MÀN LỚN): THIẾT LẬP CHUYỂN GIAO */}
          <div className="lg:col-span-5 space-y-4">
            {/* CARD 1: CẶP NHÂN VIÊN CHUYỂN GIAO */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-[#F85606]" />
                  <span>Cặp Nhân Viên Bàn Giao & Tiếp Nhận</span>
                </h2>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Người bàn giao (Nghỉ việc / chuyển đi) */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>1. Nhân Viên Bàn Giao</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      Sắp nghỉ / Luân chuyển
                    </span>
                  </div>
                  <SearchSelect
                    value={fromRepId}
                    onChange={(e) => handleFromRepChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-rose-200 focus:border-rose-400 outline-none font-bold text-gray-800 shadow-2xs"
                  >
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName} {rep.phone ? `(${rep.phone})` : ''}
                      </option>
                    ))}
                  </SearchSelect>
                  <p className="text-[11px] text-rose-600">
                    Toàn bộ đại lý đang thuộc phụ trách của nhân viên này sẽ được chuyển giao.
                  </p>
                </div>

                {/* Biểu tượng mũi tên chuyển tiếp */}
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-2xs border border-amber-200">
                    <ArrowRight size={16} />
                  </div>
                </div>

                {/* Người tiếp nhận (Người mới) */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>2. Nhân Viên Tiếp Nhận</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Chăm sóc mới
                    </span>
                  </div>
                  <SearchSelect
                    value={toRepId}
                    onChange={(e) => setToRepId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-emerald-200 focus:border-emerald-400 outline-none font-bold text-gray-800 shadow-2xs"
                  >
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id} disabled={rep.id === fromRepId}>
                        {rep.fullName} {rep.phone ? `(${rep.phone})` : ''}
                      </option>
                    ))}
                  </SearchSelect>
                  <p className="text-[11px] text-emerald-600">
                    Nhân viên kinh doanh mới sẽ chịu trách nhiệm chăm sóc và phụ trách tuyến sau khi duyệt.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: PHẠM VI KHU VỰC VÀ LÝ DO */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden p-4 sm:p-5 space-y-4">
              {/* Phạm vi khu vực */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#F85606]" />
                  <span>Phạm Vi Khu Vực Áp Dụng</span>
                </label>
                <SearchSelect
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-gray-200 focus:border-[#F85606] outline-none font-medium shadow-2xs"
                >
                  <option value="">-- Tất cả các khu vực (Chuyển giao toàn bộ đại lý) --</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SearchSelect>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Có thể chọn cụ thể 1 vùng thị trường để bàn giao từng phần theo giai đoạn.
                </span>
              </div>

              {/* Lý do chuyển giao */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText size={13} className="text-[#F85606]" />
                  <span>Lý Do Chuyển Giao <span className="text-red-500">*</span></span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Bàn giao lại đại lý do nhân viên nghỉ việc theo quyết định số 45/QĐ-NS ngày..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white rounded-xl border border-gray-200 focus:border-[#F85606] focus:ring-2 focus:ring-orange-100 outline-none shadow-2xs transition"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Mỗi đại lý được chuyển sẽ được tự động ghi 1 dòng nhật ký phân công loại <strong>TRANSFER</strong> phục vụ đối soát kiểm toán.
                </span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (7 CỘT TRÊN MÀN LỚN): XEM TRƯỚC TÁC ĐỘNG (IMPACT PREVIEW) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
              {/* Header Box xem trước */}
              <div className="px-5 py-4 bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white border-b border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#F85606] flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                      Danh Sách Đại Lý Sẽ Bị Chuyển Giao
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Đại lý trực thuộc <strong>{fromRep?.fullName}</strong>{' '}
                      {selectedRegionId ? 'trong khu vực được lọc' : 'trên toàn hệ thống'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#F85606] text-white font-bold text-xs shadow-xs">
                    {loadingPreview ? 'Đang tính toán...' : `${affectedTotal} đại lý`}
                  </span>
                </div>
              </div>

              {/* Ô tìm kiếm nhanh trong danh sách tác động */}
              {affectedAgencies.length > 5 && (
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => {
                        setPreviewSearch(e.target.value);
                        setPage(0);
                      }}
                      placeholder="Lọc nhanh theo mã, tên đại lý hoặc khu vực..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#F85606]"
                    />
                  </div>
                </div>
              )}

              {/* Nội dung danh sách (đã phân trang) */}
              <div className="p-4 flex-1 min-h-[350px] max-h-[680px] overflow-y-auto">
                {loadingPreview ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <RefreshCw size={24} className="animate-spin text-[#F85606]" />
                    <span className="text-xs font-medium">Đang tải danh sách đại lý của nhân viên...</span>
                  </div>
                ) : affectedAgencies.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <Building2 size={36} className="mx-auto text-gray-300" />
                    <p className="text-xs font-bold text-gray-700">
                      Không tìm thấy đại lý nào cần chuyển giao
                    </p>
                    <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                      Nhân viên <strong>{fromRep?.fullName}</strong> hiện không phụ trách đại lý nào{' '}
                      {selectedRegionId ? 'ở khu vực này' : 'trong hệ thống'}.
                    </p>
                  </div>
                ) : paginatedList.length === 0 ? (
                  <div className="py-20 text-center space-y-2">
                    <Search size={36} className="mx-auto text-gray-300" />
                    <p className="text-xs font-bold text-gray-700">
                      Không tìm thấy đại lý nào khớp với "{previewSearch}"
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSearch('');
                        setPage(0);
                      }}
                      className="px-3 py-1 bg-orange-50 text-[#F85606] rounded-lg text-xs font-semibold"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paginatedList.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/40 hover:border-orange-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {a.code}
                            </span>
                            <span className="font-bold text-gray-900 truncate">{a.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200/70 text-gray-700">
                              {a.customerGroupName || (a.customerGroup === 'TIER_1' ? 'Đại lý Cấp 1' : a.customerGroup === 'TIER_2' ? 'Đại lý Cấp 2' : 'Khách lẻ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-gray-400" />
                              <span>{a.regionName || 'Chưa có khu vực'}</span>
                            </span>
                            {a.address && (
                              <span className="truncate max-w-xs text-gray-400" title={a.address}>
                                {a.address}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                            {fromRep?.fullName}
                          </span>
                          <ArrowRight size={12} className="text-gray-400" />
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            {toRep?.fullName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Thanh phân trang đầy đủ */}
              {totalFilteredElements > 0 ? (
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalElements={totalFilteredElements}
                    size={size}
                    onPageChange={setPage}
                    onSizeChange={(newSize) => {
                      setSize(newSize);
                      setPage(0);
                    }}
                    sizeOptions={[20, 30, 50, 100]}
                    itemLabel="đại lý"
                    disabled={loadingPreview}
                  />
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between px-4">
                  <span>0 đại lý thỏa mãn điều kiện</span>
                  <span className="text-gray-400 italic">
                    Chỉ chuyển các đại lý hợp lệ của nhân viên bàn giao
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THANH NÚT HÀNH ĐỘNG CỐ ĐỊNH / CHÂN TRANG */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Info size={14} className="text-amber-500" />
            <span>
              Thao tác này sẽ cập nhật người phụ trách của <strong>{affectedTotal}</strong> đại lý ngay lập tức.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200 w-full sm:w-auto text-center"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || isSameRep || loadingPreview || affectedTotal === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 rounded-xl shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
              id="btn-confirm-transfer-territory"
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Đang thực hiện chuyển giao...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận Chuyển Giao ({affectedTotal} đại lý)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
