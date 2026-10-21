import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, Printer, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrencyVND } from '../../services/orderService';
import { agencyRespondStatement, fetchReconciliationStatements } from '../../services/debtReconciliationApi';
import type { PeriodicReconciliationStatement } from '../../types/debtReconciliation';
import { ConfirmModal } from '../common/ConfirmModal';
import { ReconciliationDisputeModal } from './ReconciliationDisputeModal';
import { ReconciliationPrintModal } from './ReconciliationPrintModal';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : value;
};

const StatusBadge: React.FC<{ stmt: PeriodicReconciliationStatement }> = ({ stmt }) => {
  if (stmt.status === 'AGENCY_ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle2 size={12} />
        <span>Đã xác nhận</span>
      </span>
    );
  }
  if (stmt.status === 'AGENCY_DISPUTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
        <AlertCircle size={12} />
        <span>Đã báo lệch</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
      <Clock size={12} />
      <span>Chờ bạn xác nhận</span>
    </span>
  );
};

/**
 * S7-06: Biên bản đối chiếu công nợ trên cổng đại lý.
 * Đại lý xem biên bản kế toán đã chốt, in A4, và xác nhận đúng hoặc báo lệch kèm lý do.
 * Backend tự giới hạn chỉ trả biên bản của đại lý đang đăng nhập (không gửi customerId).
 */
export const AgencyReconciliationPanel: React.FC = () => {
  const { showToast } = useAuth();
  const [statements, setStatements] = useState<PeriodicReconciliationStatement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [acceptTarget, setAcceptTarget] = useState<PeriodicReconciliationStatement | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<PeriodicReconciliationStatement | null>(null);
  const [printTarget, setPrintTarget] = useState<PeriodicReconciliationStatement | null>(null);
  const [responding, setResponding] = useState<boolean>(false);

  const loadStatements = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setStatements(await fetchReconciliationStatements());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được biên bản đối chiếu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  const respond = async (stmt: PeriodicReconciliationStatement, isAccept: boolean, feedback?: string) => {
    setResponding(true);
    try {
      await agencyRespondStatement(stmt.id, isAccept ? 'AGENCY_ACCEPTED' : 'AGENCY_DISPUTED', feedback);
      showToast(
        isAccept ? 'Đã xác nhận biên bản' : 'Đã gửi phản hồi lệch',
        isAccept
          ? `Biên bản ${stmt.statementCode} đã được xác nhận số liệu`
          : `Kế toán sẽ kiểm tra lại biên bản ${stmt.statementCode}`,
        isAccept ? 'success' : 'info'
      );
      setAcceptTarget(null);
      setDisputeTarget(null);
      loadStatements();
    } catch (err) {
      showToast('Lỗi', err instanceof Error ? err.message : 'Không gửi được phản hồi', 'error');
    } finally {
      setResponding(false);
    }
  };

  const pendingCount = statements.filter((s) => s.status === 'CONFIRMED').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-[#F85606]" />
            <span>Biên bản đối chiếu công nợ</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                {pendingCount} chờ xác nhận
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500">
            Kiểm tra số dư công nợ kế toán đã chốt, xác nhận nếu đúng hoặc báo lệch để kế toán kiểm tra lại
          </p>
        </div>
        <button
          type="button"
          onClick={loadStatements}
          disabled={loading}
          title="Tải lại"
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-6 text-center">Đang tải biên bản đối chiếu...</p>
      ) : loadError ? (
        <p className="text-xs text-rose-600 py-6 text-center">{loadError}</p>
      ) : statements.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">Chưa có biên bản đối chiếu nào được gửi cho bạn.</p>
      ) : (
        <div className="space-y-3">
          {statements.map((stmt) => (
            <div
              key={stmt.id}
              className={`rounded-2xl border p-3.5 sm:p-4 space-y-3 ${
                stmt.status === 'CONFIRMED' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-sm text-gray-900">{stmt.statementCode}</p>
                  <p className="text-[11px] text-gray-500">
                    Kỳ {formatDate(stmt.fromDate)} → {formatDate(stmt.toDate)} · Lập ngày {formatDate(stmt.statementDate)}
                  </p>
                </div>
                <StatusBadge stmt={stmt} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Đầu kỳ</p>
                  <p className="font-mono font-bold text-gray-800">{formatCurrencyVND(stmt.openingBalance)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Phát sinh nợ</p>
                  <p className="font-mono font-bold text-[#F85606]">{stmt.totalDebit > 0 ? '+' : ''}{formatCurrencyVND(stmt.totalDebit)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Đã trả / giảm trừ</p>
                  <p className="font-mono font-bold text-emerald-700">{stmt.totalCredit > 0 ? '-' : ''}{formatCurrencyVND(stmt.totalCredit)}</p>
                </div>
                <div className="rounded-xl bg-orange-50 px-3 py-2">
                  <p className="text-gray-500">Số dư cuối kỳ</p>
                  <p className="font-mono font-black text-[#F85606]">{formatCurrencyVND(stmt.closingBalance)}</p>
                </div>
              </div>

              {stmt.status === 'AGENCY_DISPUTED' && stmt.agencyFeedback && (
                <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  <strong>Nội dung bạn đã báo lệch:</strong> {stmt.agencyFeedback}
                </p>
              )}
              {stmt.status !== 'CONFIRMED' && stmt.agencySignedAt && (
                <p className="text-[11px] text-gray-500">
                  Phản hồi bởi {stmt.agencySignedBy || 'đại lý'} lúc{' '}
                  {new Date(stmt.agencySignedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPrintTarget(stmt)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Xem / In A4</span>
                </button>
                {stmt.status === 'CONFIRMED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setDisputeTarget(stmt)}
                      disabled={responding}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <AlertCircle size={13} />
                      <span>Báo lệch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcceptTarget(stmt)}
                      disabled={responding}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                      <span>Xác nhận đúng</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={acceptTarget !== null}
        variant="success"
        title="Xác nhận số liệu đối chiếu"
        confirmLabel="Xác nhận đúng"
        loading={responding}
        onCancel={() => setAcceptTarget(null)}
        onConfirm={() => acceptTarget && respond(acceptTarget, true)}
        message={
          acceptTarget && (
            <>
              Bạn xác nhận số dư công nợ cuối kỳ{' '}
              <strong className="text-[#F85606]">{formatCurrencyVND(acceptTarget.closingBalance)}</strong> trong biên bản{' '}
              <strong className="font-mono">{acceptTarget.statementCode}</strong> là đúng? Sau khi xác nhận sẽ không đổi lại được.
            </>
          )
        }
      />

      <ReconciliationDisputeModal
        open={disputeTarget !== null}
        statementCode={disputeTarget?.statementCode}
        loading={responding}
        onCancel={() => setDisputeTarget(null)}
        onSubmit={(feedback) => disputeTarget && respond(disputeTarget, false, feedback)}
      />

      <ReconciliationPrintModal
        isOpen={printTarget !== null}
        onClose={() => setPrintTarget(null)}
        statement={printTarget}
      />
    </div>
  );
};
