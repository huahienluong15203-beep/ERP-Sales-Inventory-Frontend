import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { RoleName } from '../../types/user';
import { AuditLogPage } from '../admin/AuditLogPage';
import { PriceHistoryPage } from '../pricing/PriceHistoryPage';
import { TerritoryHistoryTab } from './TerritoryHistoryTab';
import { ShieldCheck, History, Users } from '../../components/common/Icons';

type LogTab = 'audit' | 'territory' | 'price';

/** Loại nhật ký và vai trò được xem (khớp quyền Backend của từng API) */
const LOG_TABS: Array<{ key: LogTab; label: string; hint: string; roles: RoleName[] }> = [
  {
    key: 'audit',
    label: 'Nhật ký thao tác',
    hint: 'Tồn kho, công nợ, đại lý, bảng giá… ai làm, lúc nào',
    roles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_WH_MANAGER', 'ROLE_SALES_MANAGER']
  },
  {
    key: 'territory',
    label: 'Lịch sử chuyển địa bàn',
    hint: 'Bàn giao, phân công phụ trách đại lý giữa các NVKD',
    roles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  },
  {
    key: 'price',
    label: 'Lịch sử thay đổi giá',
    hint: 'Giá cũ → giá mới theo sản phẩm, nhóm khách hàng, người sửa',
    roles: ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_MANAGER', 'ROLE_SALES_REP']
  }
];

const readTabFromUrl = (): LogTab | null => {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab === 'audit' || tab === 'price' || tab === 'territory' ? (tab as LogTab) : null;
};

/**
 * Gộp các chức năng nhật ký thành 1 mục trên Sidebar: chọn loại nhật ký ở thanh tab trên cùng.
 * Mỗi tab giữ nguyên trang cũ (bộ lọc, phân trang trên URL). URL: /logs?tab=audit | /logs?tab=territory | /logs?tab=price
 */
export const SystemLogPage: React.FC = () => {
  const { currentRole } = useAuth();
  const tabs = LOG_TABS.filter((t) => t.roles.includes(currentRole));

  const [tab, setTab] = useState<LogTab>(() => {
    const fromUrl = readTabFromUrl();
    return fromUrl && tabs.some((t) => t.key === fromUrl) ? fromUrl : tabs[0]?.key ?? 'audit';
  });
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  const changeTab = (next: LogTab) => {
    if (next === active) return;
    // Bộ lọc giữa các loại nhật ký khác nhau -> xoá bộ lọc cũ trên URL, chỉ giữ loại nhật ký
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?tab=${next}`);
    setTab(next);
  };

  if (!active) {
    return <p className="p-6 text-sm text-slate-500">Vai trò hiện tại không có quyền xem nhật ký.</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      {tabs.length > 1 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
          {tabs.map((t) => {
            const isActive = t.key === active;
            const Icon = t.key === 'audit' ? ShieldCheck : t.key === 'territory' ? Users : History;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changeTab(t.key)}
                aria-pressed={isActive}
                className={`flex flex-1 items-center gap-2.5 rounded-xl px-4 py-2.5 text-left transition-colors min-h-[44px] cursor-pointer ${
                  isActive ? 'bg-[#F85606] text-white shadow-sm' : 'text-slate-600 hover:bg-orange-50 hover:text-[#F85606]'
                }`}
              >
                <Icon size={18} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{t.label}</span>
                  <span className={`block text-[11px] truncate ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>{t.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {active === 'audit' ? (
        <AuditLogPage />
      ) : active === 'territory' ? (
        <TerritoryHistoryTab />
      ) : (
        <PriceHistoryPage />
      )}
    </div>
  );
};
