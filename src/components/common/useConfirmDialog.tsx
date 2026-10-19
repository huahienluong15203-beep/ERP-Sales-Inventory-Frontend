import React, { useCallback, useRef, useState } from 'react';
import { ConfirmModal, type ConfirmModalProps } from './ConfirmModal';

type ConfirmOptions = Pick<ConfirmModalProps, 'title' | 'message' | 'confirmLabel' | 'cancelLabel' | 'variant' | 'icon'>;

/**
 * Hộp xác nhận theo giao diện hệ thống, dùng thay window.confirm() của trình duyệt.
 * Cách dùng:
 *   const { confirm, confirmDialog } = useConfirmDialog();
 *   if (!(await confirm({ title: 'Xoá dòng?', message: '...' }))) return;
 *   ...
 *   return (<>... {confirmDialog}</>);
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirmDialog = (
    <ConfirmModal
      open={options !== null}
      title={options?.title ?? ''}
      message={options?.message ?? ''}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      variant={options?.variant ?? 'warning'}
      icon={options?.icon}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, confirmDialog };
}
