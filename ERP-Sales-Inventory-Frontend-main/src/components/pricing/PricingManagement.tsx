import React, { useState } from 'react';
import { PriceListForm } from './PriceListForm';
import { DiscountTierSetup } from './DiscountTierSetup';
import { PriceHistoryGrid } from './PriceHistoryGrid';

export type PricingTab = 'PRICE_FORM' | 'DISCOUNT_TIERS' | 'PRICE_HISTORY';

export const PricingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PricingTab>('PRICE_FORM');

  return (
    <div className="space-y-6">
      {/* Thanh điều hướng 3 mục chức năng (Tabs dạng Pill chuẩn App ETC) */}
      <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Tab 1: Form nhập bảng giá */}
          <button
            type="button"
            onClick={() => setActiveTab('PRICE_FORM')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'PRICE_FORM'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            style={
              activeTab === 'PRICE_FORM'
                ? { background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)' }
                : undefined
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            1. Form Nhập Bảng Giá
          </button>

          {/* Tab 2: Thiết lập bậc chiết khấu */}
          <button
            type="button"
            onClick={() => setActiveTab('DISCOUNT_TIERS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'DISCOUNT_TIERS'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            style={
              activeTab === 'DISCOUNT_TIERS'
                ? { background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)' }
                : undefined
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            2. Thiết Lập Bậc Chiết Khấu
          </button>

          {/* Tab 3: Lưới hiển thị lịch sử thay đổi giá */}
          <button
            type="button"
            onClick={() => setActiveTab('PRICE_HISTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'PRICE_HISTORY'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            style={
              activeTab === 'PRICE_HISTORY'
                ? { background: 'linear-gradient(135deg, #FF6A00 0%, #EE4D2D 100%)' }
                : undefined
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            3. Lưới Lịch Sử Thay Đổi Giá
          </button>
        </div>

        <div className="text-[11px] text-gray-400 font-medium px-2">
          Hệ thống Bán hàng & Quản lý giá (EP-02: Pricing)
        </div>
      </div>

      {/* Nội dung tương ứng với từng phần yêu cầu */}
      <div>
        {activeTab === 'PRICE_FORM' && <PriceListForm />}
        {activeTab === 'DISCOUNT_TIERS' && <DiscountTierSetup />}
        {activeTab === 'PRICE_HISTORY' && <PriceHistoryGrid />}
      </div>
    </div>
  );
};
