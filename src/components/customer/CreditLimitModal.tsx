import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Agency, CreditLimitAuditLog } from '../../types/agency';
import { fetchCreditLimitLogs, updateCreditLimit } from '../../services/agencyApi';
import { useAuth } from '../../contexts/AuthContext';
import {
    CreditCard,
    CalendarClock,
    FileText,
    Clock,
    ShieldCheck,
    ShieldAlert,
    X,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Building2
} from '../common/Icons';

interface CreditLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    agency: Agency | null;
    onSuccess?: () => void;
}

export const CreditLimitModal: React.FC<CreditLimitModalProps> = ({
    isOpen,
    onClose,
    agency,
    onSuccess
}) => {
    const { user, currentRole } = useAuth();

    // AC 3: Kiểm tra phân quyền - Chỉ Kế toán, Quản lý KD và Admin mới có quyền sửa
    const canEdit =
        currentRole === 'ROLE_ACCOUNTANT' ||
        currentRole === 'ROLE_SALES_MANAGER' ||
        currentRole === 'ROLE_ADMIN';

    // Form State
    const [creditLimit, setCreditLimit] = useState<number>(0);
    const [maxDebtDays, setMaxDebtDays] = useState<number>(30);
    const [reason, setReason] = useState<string>('');

    // Trạng thái xử lý
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Nhật ký lịch sử thay đổi (Audit Log)
    const [logs, setLogs] = useState<CreditLimitAuditLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Tải danh sách nhật ký
    const loadLogs = useCallback(async () => {
        if (!agency) return;
        setLoadingLogs(true);
        try {
            const data = await fetchCreditLimitLogs(agency.id);
            setLogs(data);
        } catch {
            console.error('Không thể tải nhật ký hạn mức');
        } finally {
            setLoadingLogs(false);
        }
    }, [agency]);

    useEffect(() => {
        /* eslint-disable react-hooks/set-state-in-effect */
        if (isOpen && agency) {
            setCreditLimit(agency.creditLimit || 0);
            setMaxDebtDays(agency.maxDebtDays || 30);
            setReason('');
            setError(null);
            setNotice(null);
            loadLogs();
        }
    }, [isOpen, agency, loadLogs]);

    if (!isOpen || !agency) return null;

    // Xử lý gửi Form cập nhật
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate bắt buộc lý do (AC 2)
        if (!reason.trim()) {
            setError('Bắt buộc phải nhập Lý do điều chỉnh hạn mức để ghi vào nhật ký kiểm toán!');
            return;
        }

        if (creditLimit < 0) {
            setError('Hạn mức nợ không được là số âm!');
            return;
        }

        if (maxDebtDays <= 0) {
            setError('Số ngày nợ tối đa phải lớn hơn 0 ngày!');
            return;
        }

        setSubmitting(true);
        try {
            const res = await updateCreditLimit(
                {
                    agencyId: agency.id,
                    creditLimit,
                    maxDebtDays,
                    reason: reason.trim()
                },
                {
                    fullName: user?.fullName || 'Kế toán viên',
                    role: currentRole
                }
            );

            if (res.success) {
                setNotice({ type: 'success', message: res.message });
                setReason('');
                await loadLogs();
                onSuccess?.();
            } else {
                setError(res.message);
            }
        } catch {
            setError('Lỗi kết nối khi cập nhật hạn mức.');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-orange-50/60 via-white to-orange-50/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F85606]/10 text-[#F85606] flex items-center justify-center shadow-xs">
                            <CreditCard size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                Thiết Lập Hạn Mức Nợ & Ngày Nợ Cho Phép
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <Building2 size={13} className="text-gray-400" />
                                <span className="font-semibold text-gray-700">{agency.name}</span>
                                <span>•</span>
                                <span>Nợ hiện tại: <strong className="text-red-600 font-mono">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(agency.totalDebt)}</strong></span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* THÔNG BÁO THÀNH CÔNG */}
                {notice && (
                    <div className="mx-6 mt-4 p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <span className="font-medium">{notice.message}</span>
                        </div>
                        <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* NỘI DUNG CUỘN */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* CẢNH BÁO QUYỀN HẠN (AC 3) */}
                    {!canEdit ? (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                            <span>
                                <strong>Chế độ chỉ xem:</strong> Tài khoản của bạn không có quyền sửa. Chỉ <strong>Kế toán công nợ</strong> và <strong>Quản lý kinh doanh</strong> mới được điều chỉnh hạn mức.
                            </span>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                            <span>Mọi thay đổi hạn mức tiền và số ngày nợ đều được hệ thống ghi vết nhật ký kiểm toán minh bạch.</span>
                        </div>
                    )}

                    {/* FORM ĐIỀU CHỈNH HẠN MỨC */}
                    <form onSubmit={handleSubmit} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/40 space-y-4">
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard size={15} className="text-[#F85606]" />
                            <span>Thông Số Hạn Mức Tín Dụng Áp Dụng</span>
                        </h4>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                                <AlertTriangle size={15} className="text-red-600 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 1. Hạn mức tiền tối đa (AC 1) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Hạn Mức Nợ Tối Đa (VND) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    disabled={!canEdit || submitting}
                                    value={creditLimit}
                                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                                    step={1000000}
                                    min={0}
                                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none disabled:bg-gray-100"
                                />
                                <span className="text-[10px] text-gray-500 mt-0.5 block">
                                    Bằng chữ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(creditLimit)}
                                </span>
                            </div>

                            {/* 2. Số ngày nợ tối đa (AC 1) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <CalendarClock size={13} className="text-orange-500" />
                                    <span>Số Ngày Nợ Tối Đa Cho Phép <span className="text-red-500">*</span></span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        disabled={!canEdit || submitting}
                                        value={maxDebtDays}
                                        onChange={(e) => setMaxDebtDays(Number(e.target.value))}
                                        min={1}
                                        max={180}
                                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none pr-12 disabled:bg-gray-100"
                                    />
                                    <span className="absolute right-3 top-2 text-xs text-gray-400 font-semibold">ngày</span>
                                </div>
                                <span className="text-[10px] text-gray-400 mt-0.5 block">
                                    Đơn hàng quá số ngày này chưa thanh toán sẽ bị cảnh báo/chặn xuất kho
                                </span>
                            </div>
                        </div>

                        {/* 3. Lý do thay đổi bắt buộc (AC 2) */}
                        {canEdit && (
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <FileText size={13} className="text-blue-500" />
                                    <span>Lý Do Điều Chỉnh Hạn Mức <span className="text-red-500">*</span></span>
                                </label>
                                <textarea
                                    rows={2}
                                    disabled={submitting}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Nhập chi tiết lý do (VD: Tăng hạn mức quý 4 theo quyết định số 12/QĐ; hoặc Giảm hạn mức do đại lý chậm thanh toán nhiều lần...)"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:border-[#F85606] outline-none resize-none"
                                />
                            </div>
                        )}

                        {/* Nút Cập nhật */}
                        {canEdit && (
                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl bg-[#F85606] hover:bg-[#d04602] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Đang lưu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} />
                                            <span>Lưu Thay Đổi & Ghi Nhật Ký</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>

                    {/* BẢNG NHẬT KÝ KIỂM TOÁN (AUDIT LOG - AC 2) */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={15} className="text-gray-500" />
                            <span>Nhật Ký Thay Đổi Hạn Mức & Số Ngày Nợ</span>
                        </h4>

                        {loadingLogs ? (
                            <div className="py-8 text-center text-xs text-gray-400">Đang tải nhật ký...</div>
                        ) : logs.length === 0 ? (
                            <div className="py-6 px-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                                Chưa có lịch sử điều chỉnh hạn mức nào cho đại lý này.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors text-xs space-y-1.5">
                                        <div className="flex items-center justify-between text-gray-500 text-[11px]">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {log.updatedAt}
                                            </span>
                                            <span>Người sửa: <strong className="text-gray-700">{log.updatedBy}</strong> ({log.updatedByRole})</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 pt-0.5">
                                            <div className="text-[11px]">
                                                <span className="text-gray-500">Hạn mức tiền: </span>
                                                <span className="font-mono line-through text-gray-400">
                                                    {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(log.oldCreditLimit)}đ
                                                </span>
                                                {' ➔ '}
                                                <strong className="font-mono text-emerald-600 font-bold">
                                                    {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(log.newCreditLimit)}đ
                                                </strong>
                                            </div>

                                            <div className="text-[11px]">
                                                <span className="text-gray-500">Số ngày nợ: </span>
                                                <span className="line-through text-gray-400">{log.oldMaxDebtDays} ngày</span>
                                                {' ➔ '}
                                                <strong className="text-blue-600 font-bold">{log.newMaxDebtDays} ngày</strong>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded-lg">
                                            <strong className="text-gray-500">Lý do: </strong>"{log.reason}"
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* FOOTER */}
                <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};
