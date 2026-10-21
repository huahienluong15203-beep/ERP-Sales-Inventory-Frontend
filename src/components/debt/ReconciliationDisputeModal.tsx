import React, { useEffect, useState } from 'react';
import { ConfirmModal } from '../common/ConfirmModal';

interface ReconciliationDisputeModalProps {
  open: boolean;
  statementCode?: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (feedback: string) => void;
}

/**
 * S7-06: Hộp nhập lý do khi đại lý báo lệch biên bản đối chiếu (thay window.prompt của trình duyệt).
 * Bắt buộc ghi rõ số liệu lệch, tối thiểu 5 ký tự (backend cũng kiểm tra lại).
 */
export const ReconciliationDisputeModal: React.FC<ReconciliationDisputeModalProps> = ({
  open,
  statementCode,
  loading = false,
  onCancel,
  onSubmit
}) => {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFeedback('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    const value = feedback.trim();
    if (value.length < 5) {
      setError('Vui lòng ghi rõ số liệu lệch (tối thiểu 5 ký tự)');
      return;
    }
    onSubmit(value);
  };

  return (
    <ConfirmModal
      open={open}
      variant="warning"
      title="Báo lệch số liệu đối chiếu"
      confirmLabel="Gửi phản hồi lệch"
      loading={loading}
      onCancel={onCancel}
      onConfirm={handleSubmit}
      message={
        <div className="space-y-2">
          <p>
            Ghi rõ số liệu chưa khớp
            {statementCode ? (
              <>
                {' '}trong biên bản <strong className="font-mono">{statementCode}</strong>
              </>
            ) : null}{' '}
            để kế toán kiểm tra lại.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              if (error) setError(null);
            }}
            rows={4}
            maxLength={1000}
            disabled={loading}
            placeholder="VD: Hoá đơn HD2026-000003 bên tôi đã thanh toán 480.000 ₫ ngày 15/10 nhưng chưa thấy ghi nhận..."
            className={`w-full px-3 py-2 rounded-xl border bg-white text-xs text-gray-800 outline-none resize-none focus:ring-2 ${
              error
                ? 'border-rose-300 focus:ring-rose-500/20'
                : 'border-gray-200 focus:border-orange-400 focus:ring-orange-500/20'
            }`}
          />
          {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
        </div>
      }
    />
  );
};
