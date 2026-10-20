import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  Award,
  Calendar,
  Lock,
  Unlock,
  Plus,
  Edit3,
  RefreshCw,
  User,
  MapPin,
  X,
  Users,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';
import {
  fetchSalesTargets,
  fetchMySalesProgress,
  createSalesTarget,
  updateSalesTarget
} from '../../services/salesTargetApi';
import { fetchActiveSalesReps } from '../../services/agencyApi';
import type {
  SalesTargetResponse,
  MySalesProgressResponse,
  SalesTargetType
} from '../../types/salesTarget';
import { SearchSelect } from '../../components/common/SearchSelect';

export const SalesTargetManagementPage: React.FC = () => {
  const { currentRole, user, showToast } = useAuth();

  // Kiểm tra vai trò quản trị / quản lý kinh doanh
  const isManagerOrAdmin =
    currentRole === 'ROLE_SALES_MANAGER' ||
    currentRole === 'ROLE_ADMIN' ||
    Boolean(user?.roles?.some((r) => ['ROLE_SALES_MANAGER', 'ROLE_ADMIN'].includes(r)));

  const currentPeriod = new Date().toISOString().slice(0, 7);

  // Kỳ chọn (tháng YYYY-MM)
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentPeriod);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Dữ liệu
  const [myProgress, setMyProgress] = useState<MySalesProgressResponse | null>(null);
  const [targets, setTargets] = useState<SalesTargetResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal tạo mới chỉ tiêu
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTargetType, setNewTargetType] = useState<SalesTargetType>('REP');
  const [newSalesRepId, setNewSalesRepId] = useState<string>('101');
  const [newRegion, setNewRegion] = useState<string>('Miền Bắc');
  const [newTargetAmountStr, setNewTargetAmountStr] = useState<string>('500000000');
  const [newNote, setNewNote] = useState<string>('');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Modal điều chỉnh chỉ tiêu (sửa chỉ tiêu cần lý do theo AC3)
  const [editingTarget, setEditingTarget] = useState<SalesTargetResponse | null>(null);
  const [editAmountStr, setEditAmountStr] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // Danh sách nhân viên kinh doanh
  const [salesRepOptions, setSalesRepOptions] = useState<Array<{ id: string; code: string; name: string }>>([
    { id: '101', code: 'NVKD-01', name: 'Nguyễn Văn Minh' },
    { id: '102', code: 'NVKD-02', name: 'Trần Thị Thu Thảo' },
    { id: '103', code: 'NVKD-03', name: 'Lê Hoàng Nam' },
    { id: '104', code: 'NVKD-04', name: 'Phạm Hồng Ánh' },
    { id: '105', code: 'NVKD-05', name: 'Vũ Đức Thành' }
  ]);

  // Tải danh sách nhân viên thực tế khi là Admin/Manager
  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchActiveSalesReps(true)
        .then((reps) => {
          if (reps && reps.length > 0) {
            setSalesRepOptions(
              reps.map((r) => ({
                id: String(r.id),
                code: r.code || `NV-${r.id}`,
                name: r.fullName
              }))
            );
            setNewSalesRepId(String(reps[0].id));
          }
        })
        .catch((err) => {
          console.warn('Lỗi khi tải danh sách NVKD:', err);
        });
    }
  }, [isManagerOrAdmin]);

  // Danh sách khu vực thị trường
  const regionOptions = ['Miền Bắc', 'Miền Trung', 'Miền Nam', 'Đồng bằng Sông Cửu Long', 'Tây Nguyên'];

  // Tải dữ liệu theo vai trò
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isManagerOrAdmin) {
        // Admin / Quản lý xem của nhân viên
        const list = await fetchSalesTargets(selectedPeriod, typeFilter);
        setTargets(list || []);
      } else {
        // Nhân viên chỉ xem của bản thân
        const prog = await fetchMySalesProgress(selectedPeriod);
        setMyProgress(prog);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu chỉ tiêu doanh số:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, typeFilter, isManagerOrAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê tổng hợp cho Admin / Quản lý
  const teamStats = useMemo(() => {
    const totalTarget = targets.reduce((acc, t) => acc + (t.targetAmount || 0), 0);
    const totalActual = targets.reduce((acc, t) => acc + (t.actualAmount || 0), 0);
    const countReps = targets.filter((t) => t.targetType === 'REP').length;
    const avgRate =
      targets.length > 0
        ? Math.round(targets.reduce((acc, t) => acc + (t.completionRate || 0), 0) / targets.length)
        : 0;
    return { totalTarget, totalActual, countReps, avgRate };
  }, [targets]);

  // Xử lý tạo mới chỉ tiêu
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newTargetAmountStr.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      showToast('Vui lòng nhập số tiền chỉ tiêu hợp lệ lớn hơn 0', 'error');
      return;
    }

    try {
      setSubmittingCreate(true);
      await createSalesTarget({
        period: selectedPeriod,
        targetType: newTargetType,
        salesRepId: newTargetType === 'REP' ? Number(newSalesRepId) : undefined,
        region: newTargetType === 'REGION' ? newRegion : undefined,
        targetAmount: amount,
        note: newNote.trim() || undefined
      });

      showToast('Thiết lập chỉ tiêu doanh số thành công!', 'success');
      setShowCreateModal(false);
      setNewNote('');
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi tạo chỉ tiêu', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Mở modal sửa chỉ tiêu (chỉ cho chỉnh các tháng đã qua hoặc tháng hiện tại)
  const openEditModal = (target: SalesTargetResponse) => {
    if (target.period > currentPeriod) {
      showToast('Chỉ được chỉnh sửa các tháng đã qua hoặc tháng hiện tại, không cho chỉnh những tháng chưa đến.', 'warning');
      return;
    }
    setEditingTarget(target);
    setEditAmountStr(target.targetAmount.toLocaleString('vi-VN'));
    setEditNote(target.note || '');
    setEditReason('');
  };

  // Xử lý lưu điều chỉnh chỉ tiêu
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;

    const amount = Number(editAmountStr.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      showToast('Vui lòng nhập số tiền chỉ tiêu hợp lệ lớn hơn 0', 'error');
      return;
    }
    if (!editReason.trim()) {
      showToast('Bắt buộc phải nhập lý do điều chỉnh chỉ tiêu', 'error');
      return;
    }

    try {
      setSubmittingEdit(true);
      await updateSalesTarget(editingTarget.id, {
        targetAmount: amount,
        note: editNote.trim(),
        reason: editReason.trim()
      });

      showToast('Điều chỉnh chỉ tiêu doanh số thành công!', 'success');
      setEditingTarget(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi cập nhật chỉ tiêu', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Định dạng màu thanh Progress Bar
  const getProgressColor = (rate: number) => {
    if (rate >= 100) return 'bg-emerald-500';
    if (rate >= 80) return 'bg-[#F85606]';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-4 antialiased pb-12">
      {/* 1. Thanh thao tác & Chọn kỳ (Đã loại bỏ toàn bộ tiêu đề/mô tả lặp lại được bôi xanh) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          {/* Chọn kỳ tháng */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl hover:border-orange-200 transition">
            <Calendar size={15} className="text-[#F85606]" />
            <span className="text-xs font-semibold text-gray-700">Kỳ tháng:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút thiết lập chỉ tiêu mới (Chỉ dành cho Admin / Quản lý kinh doanh) */}
          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs shadow-orange-500/20 active:scale-95"
            >
              <Plus size={14} />
              <span>Thiết lập chỉ tiêu</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-[#F85606] hover:bg-orange-50/50 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. GIAO DIỆN DÀNH CHO ADMIN / QUẢN LÝ: XEM VÀ QUẢN LÝ TIẾN ĐỘ CỦA NHÂN VIÊN */}
      {isManagerOrAdmin ? (
        <div className="space-y-4 animate-fade-in">
          {/* 4 Thẻ chỉ số tổng quan tiến độ toàn đội ngũ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-medium">Tổng chỉ tiêu đội ngũ</span>
                <Target size={16} className="text-[#F85606]" />
              </div>
              <div className="text-xl font-black font-mono text-gray-900">
                {formatCurrencyVND(teamStats.totalTarget)}
              </div>
              <span className="text-[11px] text-gray-400 block">Kỳ {selectedPeriod}</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-medium">Doanh số thực đạt</span>
                <DollarSign size={16} className="text-emerald-600" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-600">
                {formatCurrencyVND(teamStats.totalActual)}
              </div>
              <span className="text-[11px] text-gray-400 block">Đã ghi nhận trong kỳ</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-medium">Tiến độ trung bình</span>
                <TrendingUp size={16} className="text-orange-500" />
              </div>
              <div className="text-xl font-black font-mono text-orange-600">
                {teamStats.avgRate}%
              </div>
              <span className="text-[11px] text-gray-400 block">Mức hoàn thành đội ngũ</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-medium">Chỉ tiêu đã giao</span>
                <Users size={16} className="text-blue-500" />
              </div>
              <div className="text-xl font-black font-mono text-gray-900">
                {targets.length} <span className="text-xs font-normal text-gray-500">mục</span>
              </div>
              <span className="text-[11px] text-gray-400 block">{teamStats.countReps} nhân viên kinh doanh</span>
            </div>
          </div>

          {/* Lọc loại chỉ tiêu */}
          <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Phân loại:</span>
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'REP', label: 'Theo Nhân viên' },
              { key: 'REGION', label: 'Theo Khu vực' }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  typeFilter === f.key
                    ? 'bg-[#F85606] text-white shadow-2xs shadow-orange-500/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-[#F85606]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bảng danh sách chỉ tiêu của nhân viên & khu vực */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Đối tượng</th>
                    <th className="py-3 px-4 whitespace-nowrap">Khu vực / Tuyến</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Chỉ tiêu (VNĐ)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Thực đạt (VNĐ)</th>
                    <th className="py-3 px-4 min-w-[200px]">Tiến độ hoàn thành</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Trạng thái kỳ</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw size={20} className="animate-spin text-[#F85606]" />
                          <span>Đang tải danh sách chỉ tiêu của nhân viên...</span>
                        </div>
                      </td>
                    </tr>
                  ) : targets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-gray-400">
                        Chưa có chỉ tiêu nào được thiết lập cho kỳ này.
                      </td>
                    </tr>
                  ) : (
                    targets.map((tgt) => (
                      <tr key={tgt.id} className="hover:bg-orange-50/30 transition">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {tgt.targetType === 'REP' ? (
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-[#F85606] shrink-0" />
                              <div>
                                <span>{tgt.salesRepName}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">
                                  {tgt.salesRepCode}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-emerald-600 shrink-0" />
                              <span className="font-bold text-emerald-900">Toàn khu vực {tgt.region}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{tgt.region}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrencyVND(tgt.targetAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatCurrencyVND(tgt.actualAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="font-mono text-gray-700">{tgt.completionRate}%</span>
                              <span className="text-gray-400 font-normal">
                                Thiếu: {formatCurrencyVND(Math.max(0, tgt.targetAmount - tgt.actualAmount))}
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                                  tgt.completionRate
                                )}`}
                                style={{ width: `${Math.min(100, tgt.completionRate)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {tgt.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                              <Lock size={11} />
                              <span>Đã khoá</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Unlock size={11} />
                              <span>Đang chạy</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {tgt.period > currentPeriod ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed opacity-60"
                              title="Tháng chưa đến: Hệ thống không cho phép điều chỉnh chỉ tiêu của các tháng tương lai"
                            >
                              <Edit3 size={12} />
                              <span>Chưa đến kỳ</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(tgt)}
                              title={tgt.isLocked ? 'Điều chỉnh chỉ tiêu kỳ đã khoá (cần lý do)' : 'Chỉnh sửa chỉ tiêu'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#F85606] bg-orange-50 hover:bg-orange-100 border border-orange-200/80 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 size={12} />
                              <span>Điều chỉnh</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 3. GIAO DIỆN DÀNH CHO NHÂN VIÊN: CHỈ XEM ĐƯỢC CỦA BẢN THÂN */
        <div className="space-y-4 animate-fade-in">
          {loading ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-2xs text-center text-gray-400">
              <RefreshCw size={24} className="animate-spin text-[#F85606] mx-auto mb-2" />
              <p className="text-xs">Đang tải tiến độ doanh số của bạn...</p>
            </div>
          ) : myProgress && myProgress.targetAmount > 0 ? (
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs relative overflow-hidden space-y-5">
              {/* Hàng tiêu đề & Thời gian còn lại */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-[#F85606] uppercase tracking-wider block">
                    Tiến độ hoàn thành chỉ tiêu tháng {myProgress.period}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                    {myProgress.salesRepName || user?.fullName || 'Nhân viên kinh doanh'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200/80 text-[#F85606] px-3.5 py-1.5 rounded-xl self-start sm:self-auto text-xs font-bold">
                  <Calendar size={14} className="text-[#F85606]" />
                  <span>Còn <strong>{myProgress.daysRemainingInMonth} ngày</strong> để về đích</span>
                </div>
              </div>

              {/* 3 Thẻ chỉ số trực quan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Doanh số thực đạt */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                  <span className="text-xs font-semibold text-emerald-800 block">Doanh số thực đạt:</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono block">
                    {formatCurrencyVND(myProgress.actualAmount)}
                  </span>
                </div>

                {/* Mục tiêu cam kết */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                  <span className="text-xs font-semibold text-gray-600 block">Mục tiêu cam kết (KPI):</span>
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono block">
                    {formatCurrencyVND(myProgress.targetAmount)}
                  </span>
                </div>

                {/* Số tiền còn thiếu */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="text-xs font-semibold text-amber-800 block">Số tiền còn thiếu:</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono block">
                    {formatCurrencyVND(myProgress.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Thanh Progress Bar trực quan */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-700">Tỷ lệ hoàn thành mục tiêu:</span>
                  <span className="text-base font-black text-[#F85606] font-mono">
                    {myProgress.completionRate}%
                  </span>
                </div>
                <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-orange-500 to-[#F85606]"
                    style={{ width: `${Math.min(100, myProgress.completionRate)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 sm:p-14 rounded-3xl border border-gray-200/80 shadow-2xs text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-[#F85606] flex items-center justify-center mx-auto border border-orange-100 shadow-2xs">
                <Target size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-bold text-gray-900">
                  Chưa có chỉ tiêu doanh số cho kỳ {selectedPeriod}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Bạn chưa được giao chỉ tiêu doanh số trong kỳ này. Vui lòng liên hệ Quản lý kinh doanh để được thiết lập chỉ tiêu.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL THIẾT LẬP CHỈ TIÊU MỚI (CHỈ ADMIN / MANAGER) */}
      {isManagerOrAdmin && showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#F85606] to-orange-600 text-white">
              <div className="flex items-center gap-2">
                <Target size={18} />
                <h3 className="text-base font-bold text-white">Thiết lập Chỉ tiêu Doanh số Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {/* Phân loại chỉ tiêu */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Loại đối tượng áp dụng:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTargetType('REP')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      newTargetType === 'REP'
                        ? 'bg-[#F85606] text-white border-[#F85606] shadow-xs shadow-orange-500/20'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50/50'
                    }`}
                  >
                    Nhân viên kinh doanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTargetType('REGION')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      newTargetType === 'REGION'
                        ? 'bg-[#F85606] text-white border-[#F85606] shadow-xs shadow-orange-500/20'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50/50'
                    }`}
                  >
                    Toàn bộ Khu vực
                  </button>
                </div>
              </div>

              {/* Chọn nhân viên bằng SearchSelect */}
              {newTargetType === 'REP' ? (
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">
                    Nhân viên kinh doanh được giao chỉ tiêu:
                  </label>
                  <SearchSelect
                    value={newSalesRepId}
                    onChange={(e) => setNewSalesRepId(e.target.value)}
                    searchPlaceholder="Gõ để tìm nhân viên kinh doanh..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                  >
                    {salesRepOptions.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        [{rep.code}] {rep.name}
                      </option>
                    ))}
                  </SearchSelect>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Khu vực thị trường:</label>
                  <SearchSelect
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    searchPlaceholder="Gõ để tìm khu vực..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                  >
                    {regionOptions.map((reg) => (
                      <option key={reg} value={reg}>
                        Khu vực {reg}
                      </option>
                    ))}
                  </SearchSelect>
                </div>
              )}

              {/* Số tiền chỉ tiêu */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">
                  Số tiền chỉ tiêu (VNĐ):
                </label>
                <input
                  type="text"
                  required
                  value={newTargetAmountStr}
                  onChange={(e) => setNewTargetAmountStr(e.target.value)}
                  placeholder="Ví dụ: 500,000,000"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                />
                {Number(newTargetAmountStr.replace(/\D/g, '')) > 0 && (
                  <p className="text-[11px] text-gray-500 italic mt-0.5">
                    Bằng chữ: <strong>{numberToVietnameseWords(Number(newTargetAmountStr.replace(/\D/g, '')))}</strong>
                  </p>
                )}
              </div>

              {/* Ghi chú */}
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 block">Ghi chú / Mục tiêu trọng tâm:</label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ví dụ: Đẩy mạnh các dòng sản phẩm bia và nước ngọt dịp Tết..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs shadow-orange-500/20 disabled:opacity-50"
                >
                  {submittingCreate ? 'Đang lưu...' : 'Lưu chỉ tiêu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL ĐIỀU CHỈNH CHỈ TIÊU & YÊU CẦU LÝ DO (CHỈ ADMIN / MANAGER) */}
      {isManagerOrAdmin && editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#F85606] to-orange-600 text-white">
              <div className="flex items-center gap-2">
                <Edit3 size={18} />
                <h3 className="text-base font-bold text-white">Điều chỉnh Chỉ tiêu Doanh số</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              {editingTarget.isLocked && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                  <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Kỳ đã qua ({editingTarget.period}) đã được khoá!</strong> Bắt buộc phải nhập lý do điều chỉnh để ghi lại nhật ký kiểm toán hệ thống.
                  </p>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <span className="text-gray-500 block">Đối tượng:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {editingTarget.targetType === 'REP'
                    ? `${editingTarget.salesRepName} (${editingTarget.salesRepCode})`
                    : `Toàn khu vực ${editingTarget.region}`}
                </span>
                <span className="text-gray-500 block mt-1">
                  Chỉ tiêu hiện tại: <strong>{formatCurrencyVND(editingTarget.targetAmount)}</strong>
                </span>
              </div>

              {/* Số tiền mới */}
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Số tiền chỉ tiêu mới (VNĐ):</label>
                <input
                  type="text"
                  required
                  value={editAmountStr}
                  onChange={(e) => setEditAmountStr(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-bold font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                />
              </div>

              {/* Bắt buộc lý do theo AC3 */}
              <div className="space-y-1">
                <label className="font-bold text-rose-700 flex items-center gap-1">
                  <span>Lý do điều chỉnh (Bắt buộc theo quy định kiểm soát) *</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ví dụ: Điều chỉnh tăng 15% do mở rộng thêm 5 đại lý cấp 1 tại khu vực..."
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#F85606]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs shadow-orange-500/20 disabled:opacity-50"
                >
                  {submittingEdit ? 'Đang cập nhật...' : 'Xác nhận điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTargetManagementPage;
