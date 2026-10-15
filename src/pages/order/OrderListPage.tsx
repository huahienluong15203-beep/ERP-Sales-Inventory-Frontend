import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Building2,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  RefreshCw,
  Eye,
  Edit,
  Copy,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from '../../routes/Router';
import {
  fetchOrders,
  fetchOrderTotals,
  fetchOrderDetail,
  cloneOrderToDraft,
  bulkApproveOrders,
  formatCurrencyVND,
  formatQuantity,
  fetchBackendDrafts,
  fetchBackendDraftById,
  setActiveDraft,
  getActiveDraft,
  clearActiveDraft,
  cancelOrder,
  fetchBackorders
} from '../../services/orderService';
import { fetchAgencies, fetchAgencyFormOptions } from '../../services/agencyApi';
import type { Agency, RegionOption, SalesRepOption } from '../../types/agency';
import type {
  OrderSummaryItem,
  OrderTotalsSummary,
  OrderFilterCriteria,
  PendingOrderResponse,
  OrderBackendResponse,
  OrderDraft
} from '../../types/order';
import { OrderDetailModal } from '../../components/order/OrderDetailModal';
import { OrderApprovalActionModal, type ApprovalActionType } from '../../components/order/OrderApprovalActionModal';
import { OrderPdfPreviewModal } from '../../components/order/OrderPdfPreviewModal';
import { OrderDraftsModal } from '../../components/order/OrderDraftsModal';
import { SearchSelect } from '../../components/common/SearchSelect';
import { RowActionMenu } from '../../components/common/RowActionMenu';

// Danh sách tabs trạng thái nhanh
const STATUS_TABS = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL', badgeColor: 'bg-amber-100 text-amber-800' },
  { label: 'Đã duyệt', value: 'APPROVED', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { label: 'Đang soạn hàng', value: 'PICKING', badgeColor: 'bg-blue-100 text-blue-800' },
  { label: 'Đã xuất kho', value: 'DISPATCHED', badgeColor: 'bg-indigo-100 text-indigo-800' },
  { label: 'Đơn nợ hàng (Backorder)', value: 'BACKORDER', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  { label: 'Đơn nháp', value: 'DRAFT', badgeColor: 'bg-gray-100 text-gray-700' },
  { label: 'Từ chối / Hủy', value: 'REJECTED,CANCELLED', badgeColor: 'bg-rose-100 text-rose-800' }
];

export const OrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentRole, showToast } = useAuth();
  const [cloningOrderId, setCloningOrderId] = useState<number | string | null>(null);

  // Xác định quyền hạn: Quản lý kinh doanh & Admin được xem toàn bộ và lọc theo NVKD
  const isManagerOrAdmin = useMemo(() => {
    const roles = user?.roles || [];
    return (
      currentRole === 'ROLE_SALES_MANAGER' ||
      currentRole === 'ROLE_ADMIN' ||
      roles.includes('ROLE_SALES_MANAGER') ||
      roles.includes('ROLE_ADMIN')
    );
  }, [user, currentRole]);

  // Chỉ Quản lý kinh doanh được duyệt đơn
  const isSalesManager = useMemo(() => {
    const roles = user?.roles || [];
    return currentRole === 'ROLE_SALES_MANAGER' || roles.includes('ROLE_SALES_MANAGER');
  }, [user, currentRole]);

  const isSalesRep = currentRole === 'ROLE_SALES_REP' || Boolean(user?.roles?.includes('ROLE_SALES_REP'));

  // Xác định vai trò Kho (Quản lý kho hoặc Thủ kho): không tạo đơn bán, chỉ xử lý đơn hàng thật
  const isWarehouseRole = useMemo(() => {
    const roles = user?.roles || [];
    return (
      currentRole === 'ROLE_WAREHOUSE' ||
      currentRole === 'ROLE_WH_MANAGER' ||
      roles.includes('ROLE_WAREHOUSE') ||
      roles.includes('ROLE_WH_MANAGER')
    );
  }, [currentRole, user]);

  // Quyền khởi tạo / sao chép đơn hàng: Chỉ Admin, Quản lý kinh doanh và Nhân viên kinh doanh
  const canCreateOrder = useMemo(() => {
    const roles = user?.roles || [];
    return (
      currentRole === 'ROLE_SALES_REP' ||
      currentRole === 'ROLE_SALES_MANAGER' ||
      currentRole === 'ROLE_ADMIN' ||
      roles.some((r) => r === 'ROLE_SALES_REP' || r === 'ROLE_SALES_MANAGER' || r === 'ROLE_ADMIN')
    );
  }, [user, currentRole]);

  // Tabs trạng thái theo vai trò: Kho chỉ quan tâm các đơn hàng thật cần xử lý, ẩn tab Đơn nháp
  const activeStatusTabs = useMemo(() => {
    if (isWarehouseRole) {
      return [
        { label: 'Tất cả đơn cần xử lý', value: '' },
        { label: 'Chờ xuất kho (Đã duyệt)', value: 'APPROVED', badgeColor: 'bg-emerald-100 text-emerald-800' },
        { label: 'Đang soạn hàng', value: 'PACKING', badgeColor: 'bg-blue-100 text-blue-800' },
        { label: 'Đã xuất kho', value: 'DISPATCHED', badgeColor: 'bg-indigo-100 text-indigo-800' },
        { label: 'Đã giao hàng', value: 'DELIVERED', badgeColor: 'bg-teal-100 text-teal-800' },
        { label: 'Đã hủy', value: 'CANCELLED', badgeColor: 'bg-rose-100 text-rose-800' }
      ];
    }
    return STATUS_TABS;
  }, [isWarehouseRole]);

  // State danh mục hỗ trợ lọc
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepOption[]>([]);

  // State bộ lọc (Filter Criteria)
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('');

  // Nếu vai trò Kho mà vô tình đang chọn DRAFT thì tự động chuyển về tất cả đơn cần xử lý
  useEffect(() => {
    if (isWarehouseRole && selectedStatusTab === 'DRAFT') {
      setSelectedStatusTab('');
    }
  }, [isWarehouseRole, selectedStatusTab]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Góp ý GV mục 8: tick chọn nhiều đơn chờ duyệt (hoặc tick tất cả) rồi xử lý một lần
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'REJECT' | 'RETURN' | null>(null);
  const [bulkComment, setBulkComment] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // Dữ liệu đơn hàng & tổng kết
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [totals, setTotals] = useState<OrderTotalsSummary>({ orderCount: 0, totalAmount: 0 });
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal xem chi tiết đơn
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Modal duyệt / từ chối / trả lại sửa
  const [approvalModalOrder, setApprovalModalOrder] = useState<PendingOrderResponse | null>(null);
  const [approvalModalAction, setApprovalModalAction] = useState<ApprovalActionType>('APPROVE');
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);

  // Modal và dữ liệu đơn hàng nháp
  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState<boolean>(false);

  const loadDrafts = () => {
    if (isWarehouseRole) return;
    fetchBackendDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]));
  };

  useEffect(() => {
    loadDrafts();
  }, [refreshKey, isWarehouseRole]);

  const handleSelectDraft = async (draft: OrderDraft) => {
    try {
      if (draft.backendDraftId) {
        const full = await fetchBackendDraftById(Number(draft.backendDraftId));
        setActiveDraft(full);
      } else {
        setActiveDraft(draft);
      }
      setIsDraftsModalOpen(false);
      navigate('/orders/create');
    } catch (err: unknown) {
      showToast('Lỗi mở đơn nháp', err instanceof Error ? err.message : 'Không mở được đơn nháp', 'error');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    const draftToDelete = drafts.find((d) => d.id === draftId);
    if (!draftToDelete) return;
    const draftDisplayName = draftToDelete.orderNumber || draftToDelete.agencyName || draftToDelete.id;
    try {
      if (draftToDelete.backendDraftId) {
        await cancelOrder(draftToDelete.backendDraftId, 'Xóa đơn hàng nháp');
      }
      const active = getActiveDraft();
      if (active && (active.id === draftId || (draftToDelete.backendDraftId && active.backendDraftId === draftToDelete.backendDraftId))) {
        clearActiveDraft();
      }
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      if (selectedStatusTab === 'DRAFT') {
        setRefreshKey((k) => k + 1);
      }
      showToast('Đã xóa đơn nháp', `Đã xóa đơn nháp "${draftDisplayName}" thành công`, 'success', 3000);
    } catch (err: unknown) {
      showToast('Không thể xóa đơn nháp', err instanceof Error ? err.message : 'Vui lòng thử lại', 'error');
    }
  };

  // Mở modal Duyệt / Trả lại / Từ chối từ menu thao tác của dòng đơn
  const openApprovalModal = (o: OrderSummaryItem, action: ApprovalActionType) => {
    setApprovalModalOrder({
      id: Number(o.id),
      code: o.code,
      customerId: Number(o.customerId || 0),
      customerCode: o.customerCode || '',
      customerName: o.customerName || '',
      lineCount: o.lineCount || 0,
      totalAmount: Number(o.totalAmount || 0),
      submittedByUsername: o.salesRepName || '',
      submittedAt: o.createdAt || '',
      reasons: []
    });
    setApprovalModalAction(action);
    setIsApprovalModalOpen(true);
  };

  // Mục 8: chỉ đơn Chờ duyệt mới tick được, và chỉ Quản lý kinh doanh (giống nút Duyệt từng đơn)
  const canBulkApprove = isSalesManager;
  const isSelectable = (o: OrderSummaryItem) => canBulkApprove && o.status === 'PENDING_APPROVAL';
  const selectableOnPage = orders.filter(isSelectable);
  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((o) => selectedIds.has(String(o.id)));

  const toggleSelect = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) selectableOnPage.forEach((o) => next.delete(String(o.id)));
      else selectableOnPage.forEach((o) => next.add(String(o.id)));
      return next;
    });
  };

  const runBulk = async (action: 'APPROVE' | 'REJECT' | 'RETURN', comment?: string) => {
    if (selectedIds.size === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await bulkApproveOrders(action, Array.from(selectedIds), comment);
      const verb = action === 'APPROVE' ? 'duyệt' : action === 'REJECT' ? 'từ chối' : 'trả lại';
      if (res.failed === 0) {
        showToast('Xử lý hàng loạt thành công', `Đã ${verb} ${res.succeeded} đơn hàng`, 'success');
      } else {
        const firstErrors = res.results
          .filter((r) => !r.success)
          .slice(0, 3)
          .map((r) => `#${r.orderId}: ${r.message}`)
          .join('; ');
        showToast(
          `Đã ${verb} ${res.succeeded}/${res.total} đơn`,
          `${res.failed} đơn không xử lý được. ${firstErrors}`,
          res.succeeded > 0 ? 'info' : 'error'
        );
      }
      setSelectedIds(new Set());
      setBulkAction(null);
      setBulkComment('');
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      showToast('Xử lý hàng loạt thất bại', err instanceof Error ? err.message : 'Không xử lý được các đơn đã chọn', 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Modal xem trước và in PDF đơn hàng
  const [pdfPreviewOrder, setPdfPreviewOrder] = useState<OrderBackendResponse | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [loadingPdfId, setLoadingPdfId] = useState<number | string | null>(null);

  const handleOpenPdfPreview = async (orderId: number | string) => {
    try {
      setLoadingPdfId(orderId);
      const detail = await fetchOrderDetail(orderId);
      setPdfPreviewOrder(detail);
      setIsPdfModalOpen(true);
    } catch (err: unknown) {
      console.error('Lỗi tải chi tiết đơn hàng để in PDF:', err);
      showToast('Lỗi tải PDF', err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng để in', 'error');
    } finally {
      setLoadingPdfId(null);
    }
  };

  // Sao chép đơn cũ thành đơn mới cho khách quen trong vài giây
  const handleCloneOrder = async (orderId: number | string) => {
    try {
      setCloningOrderId(orderId);
      const res = await cloneOrderToDraft(orderId);
      showToast(
        'Đã sao chép đơn cũ',
        `Đã sao chép ${res.itemCount} dòng hàng từ đơn ${res.sourceCode}. Đơn giá và chiết khấu đã được tự động tính lại theo bảng giá hiện hành!`,
        'success'
      );
      navigate('/orders/create');
    } catch (err: unknown) {
      console.error('Lỗi sao chép đơn hàng:', err);
      showToast('Sao chép thất bại', err instanceof Error ? err.message : 'Không thể sao chép đơn hàng', 'error');
    } finally {
      setCloningOrderId(null);
    }
  };

  // Tải danh mục phục vụ bộ lọc (Đại lý, Khu vực, NVKD)
  useEffect(() => {
    fetchAgencies({ size: 100 })
      .then((res) => setAgencies(res.content || []))
      .catch((err) => console.warn('Lỗi tải danh sách đại lý:', err));

    fetchAgencyFormOptions()
      .then((opts) => {
        setRegions(opts.regions || []);
        setSalesReps(opts.salesReps || []);
      })
      .catch((err) => console.warn('Lỗi tải danh mục lọc khu vực & NVKD:', err));
  }, []);

  // Xử lý kiểm tra tính hợp lệ của khoảng ngày
  const dateError = useMemo(() => {
    if (fromDate && toDate) {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      if (d1 > d2) {
        return 'Ngày bắt đầu không được lớn hơn ngày kết thúc';
      }
      const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 366) {
        return 'Khoảng thời gian lọc tối đa là 1 năm (366 ngày)';
      }
    }
    return null;
  }, [fromDate, toDate]);

  // Tải dữ liệu danh sách đơn hàng & tổng tiền
  useEffect(() => {
    if (dateError) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setLoading(true);
        setError(null);
      }
    }, 0);

    const OFFICIAL_ORDER_STATUSES = [
      'PENDING_APPROVAL',
      'APPROVED',
      'PICKING',
      'PREPARING',
      'DISPATCHED',
      'DELIVERED',
      'CLOSED',
      'COMPLETED'
    ];

    const WAREHOUSE_ALL_STATUSES = [
      'APPROVED',
      'PACKING',
      'PICKING',
      'PREPARING',
      'DISPATCHED',
      'DELIVERED',
      'CLOSED',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
      'PENDING_APPROVAL'
    ];

    const criteria: OrderFilterCriteria = {
      page,
      size: pageSize,
      keyword: keyword.trim() || undefined,
      customerId: selectedAgencyId ? Number(selectedAgencyId) : undefined,
      salesRepId: selectedSalesRepId ? Number(selectedSalesRepId) : undefined,
      regionId: selectedRegionId ? Number(selectedRegionId) : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      statuses: selectedStatusTab
        ? selectedStatusTab.split(',')
        : isWarehouseRole
        ? WAREHOUSE_ALL_STATUSES
        : undefined
    };

    if (selectedStatusTab === 'BACKORDER') {
      fetchBackorders({
        customerId: selectedAgencyId ? Number(selectedAgencyId) : undefined,
        keyword: keyword.trim() || undefined,
        page,
        size: pageSize
      })
        .then((pageRes) => {
          if (isSubscribed) {
            setOrders(pageRes.content || []);
            setSelectedIds(new Set());
            setTotalPages(pageRes.totalPages || 1);
            setTotalElements(pageRes.totalElements || 0);
            const totalBackorderAmount = (pageRes.content || []).reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
            setTotals({
              orderCount: pageRes.totalElements || (pageRes.content || []).length,
              totalAmount: totalBackorderAmount
            });
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isSubscribed) {
            console.error('Lỗi khi tải đơn nợ hàng:', err);
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn nợ hàng');
            setLoading(false);
          }
        });
    } else {
      // Khi ở tab "Tất cả trạng thái", tính tổng tiền các đơn chính thức (loại trừ đơn nháp DRAFT, đơn hủy CANCELLED và đơn từ chối REJECTED)
      const totalsCriteria: OrderFilterCriteria = {
        ...criteria,
        statuses: selectedStatusTab ? selectedStatusTab.split(',') : OFFICIAL_ORDER_STATUSES
      };

      Promise.all([
        fetchOrders(criteria),
        fetchOrderTotals(totalsCriteria)
      ])
        .then(([pageRes, totalsRes]) => {
          if (isSubscribed) {
            setOrders(pageRes.content || []);
            setSelectedIds(new Set());
            setTotalPages(pageRes.totalPages || 1);
            setTotalElements(pageRes.totalElements || 0);
            setTotals(totalsRes || { orderCount: 0, totalAmount: 0 });
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isSubscribed) {
            console.error('Lỗi khi tải dữ liệu đơn hàng:', err);
            setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng');
            setLoading(false);
          }
        });
    }

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [
    page,
    pageSize,
    keyword,
    selectedAgencyId,
    selectedSalesRepId,
    selectedRegionId,
    fromDate,
    toDate,
    selectedStatusTab,
    dateError,
    refreshKey
  ]);

  // Đặt lại toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSelectedStatusTab('');
    setSelectedAgencyId('');
    setSelectedSalesRepId('');
    setSelectedRegionId('');
    setFromDate('');
    setToDate('');
    setKeyword('');
    setPage(0);
  };

  // Nút chọn nhanh khoảng ngày
  const handleQuickDateSelect = (type: 'today' | '7days' | '30days' | 'thisMonth') => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    let fromDateObj = new Date();

    if (type === 'today') {
      fromDateObj = now;
    } else if (type === '7days') {
      fromDateObj.setDate(now.getDate() - 7);
    } else if (type === '30days') {
      fromDateObj.setDate(now.getDate() - 30);
    } else if (type === 'thisMonth') {
      fromDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setFromDate(fromDateObj.toISOString().slice(0, 10));
    setToDate(toStr);
    setPage(0);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} />
            <span>Đã duyệt</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={12} />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <FileText size={12} />
            <span>Đơn nháp</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={12} />
            <span>Từ chối</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} />
            <span>Hoàn thành</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <CheckCircle2 size={12} />
            <span>Đã hoàn tất</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <CheckCircle2 size={12} />
            <span>Đã giao hàng</span>
          </span>
        );
      case 'PICKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>Đang soạn hàng</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <span>Đã xuất kho</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <XCircle size={12} />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 pb-8 animate-in fade-in duration-200">
      {/* 1. Header Trang - Nút tác vụ (đồng bộ giao diện hệ thống) */}
      <div className="flex items-center justify-end gap-2">
        {/* Nút tải lại ở vị trí khoanh đỏ: chỉ icon, không cần chữ */}
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          title="Tải lại danh sách đơn hàng"
          className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-[#F85606] hover:border-orange-200 hover:bg-gray-50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-[#F85606]' : ''} />
        </button>

        {/* Nút đơn nháp ở vị trí khoanh màu xanh */}
        {!isWarehouseRole && (
          <button
            type="button"
            onClick={() => {
              loadDrafts();
              setIsDraftsModalOpen(true);
            }}
            title="Xem danh sách đơn hàng nháp"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:text-[#F85606] hover:border-orange-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs h-9"
          >
            <FileText size={14} />
            <span>Đơn nháp</span>
            {drafts.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#F85606] text-white text-[10px] font-bold flex items-center justify-center">
                {drafts.length}
              </span>
            )}
          </button>
        )}

        {!isWarehouseRole && (
          <button
            type="button"
            onClick={() => navigate('/orders/create')}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[#F85606] to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-98 text-white text-xs font-bold rounded-lg shadow-sm shadow-orange-500/25 flex items-center gap-1.5 transition-all cursor-pointer h-9"
          >
            <Plus size={16} />
            <span>Tạo đơn hàng mới</span>
          </button>
        )}
      </div>

      {/* Khối thẻ thống kê kết quả đang lọc */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Card 1: Tổng số đơn hàng */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Tổng số đơn đang lọc
            </span>
            <div className="text-xl font-black text-gray-900">
              {loading ? '...' : `${formatQuantity(totalElements)} đơn`}
            </div>
            <p className="text-[10px] text-gray-400">
              {selectedStatusTab ? 'Khớp với trạng thái đang chọn' : `Gồm ${formatQuantity(totals.orderCount)} đơn chính thức (kèm nháp & hủy)`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F85606] flex items-center justify-center shrink-0 border border-orange-100">
            <ShoppingCart size={18} />
          </div>
        </div>

        {/* Card 2: Tổng tiền toàn bộ kết quả lọc */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 border border-orange-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-[#F85606] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={12} />
              <span>
                {selectedStatusTab === 'DRAFT'
                  ? 'Tổng giá trị đơn nháp'
                  : selectedStatusTab === 'REJECTED,CANCELLED'
                  ? 'Tổng tiền đơn hủy / từ chối'
                  : selectedStatusTab === 'PENDING_APPROVAL'
                  ? 'Tổng tiền chờ duyệt'
                  : selectedStatusTab === 'APPROVED'
                  ? 'Tổng tiền đã duyệt'
                  : 'Tổng tiền đơn chính thức'}
              </span>
            </span>
            <div className="text-xl font-black text-[#F85606] leading-tight">
              {loading ? '...' : formatCurrencyVND(totals.totalAmount)}
            </div>
            <p className="text-[10px] text-orange-700/80">
              {selectedStatusTab === 'DRAFT'
                ? 'Tổng giá trị các bản nháp đang soạn'
                : selectedStatusTab === 'REJECTED,CANCELLED'
                ? 'Giá trị các đơn bị từ chối hoặc đã hủy'
                : selectedStatusTab === 'PENDING_APPROVAL'
                ? 'Giá trị các đơn hàng đang chờ quản lý duyệt'
                : selectedStatusTab === 'APPROVED'
                ? 'Giá trị các đơn hàng đã phê duyệt thành công'
                : 'Giá trị đơn chính thức (không gồm đơn nháp & đã hủy)'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
            <span className="font-extrabold text-sm">₫</span>
          </div>
        </div>

        {/* Card 3: Phân quyền & Phạm vi xem */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Phạm vi hiển thị
            </span>
            <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 pt-0.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>{isManagerOrAdmin ? 'Toàn bộ công ty' : 'Đại lý phụ trách'}</span>
            </div>
            <p className="text-[10px] text-gray-500">
              {isSalesRep ? `Chỉ hiển thị đại lý của ${user?.fullName || 'bạn'}` : 'Toàn quyền theo dõi doanh số'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Building2 size={18} />
          </div>
        </div>
      </div>

      {/* Bộ lọc đa chiều */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
        {/* Hàng 1: Tabs Trạng thái nhanh */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {activeStatusTabs.map((tab) => {
              const isActive = selectedStatusTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setSelectedStatusTab(tab.value);
                    setPage(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${isActive
                    ? 'bg-gradient-to-r from-[#F85606] to-orange-600 text-white shadow-xs'
                    : 'bg-gray-100/80 hover:bg-gray-200 text-gray-600'
                    }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-gray-500 hover:text-[#F85606] flex items-center gap-1.5 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-orange-50"
          >
            <RotateCcw size={13} />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>

        {/* Hàng 2: Các ô nhập điều kiện lọc */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô 1: Từ khóa tìm kiếm */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Tìm kiếm</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(0);
                }}
                placeholder="Mã đơn, mã hoặc tên đại lý..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Ô 2: Chọn đại lý */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Đại lý</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <SearchSelect
                value={selectedAgencyId}
                onChange={(e) => {
                  setSelectedAgencyId(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="">Tất cả đại lý</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>

          {/* Ô 3: Nhân viên kinh doanh (Chỉ hiện cho Quản lý / Admin) */}
          {isManagerOrAdmin ? (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">NVKD Phụ trách</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <SearchSelect
                  value={selectedSalesRepId}
                  onChange={(e) => {
                    setSelectedSalesRepId(e.target.value);
                    setPage(0);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition appearance-none cursor-pointer"
                >
                  <option value="">Tất cả nhân viên kinh doanh</option>
                  {salesReps.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.fullName} ({sr.username})
                    </option>
                  ))}
                </SearchSelect>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase">Phạm vi của bạn</label>
              <div className="px-3 py-2 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-[#F85606] font-semibold flex items-center gap-1.5 truncate">
                <User size={13} className="shrink-0" />
                <span className="truncate">{user?.fullName || 'NVKD'} (Đại lý phụ trách)</span>
              </div>
            </div>
          )}

          {/* Ô 4: Khu vực kinh doanh */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Khu vực</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <SearchSelect
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#F85606] focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="">Tất cả khu vực</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>
        </div>

        {/* Hàng 3: Khoảng thời gian (fromDate - toDate) & Nút chọn nhanh */}
        <div className="pt-2 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1">
              <Calendar size={13} className="text-[#F85606]" />
              <span>Khoảng ngày tạo:</span>
            </span>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:bg-white transition"
              title="Từ ngày"
            />
            <span className="text-gray-400 text-xs">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] focus:bg-white transition"
              title="Đến ngày"
            />
          </div>

          {/* Các nút chọn nhanh thời gian */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-500 mr-1">Lọc nhanh:</span>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('today')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('7days')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('30days')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              30 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleQuickDateSelect('thisMonth')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
            >
              Tháng này
            </button>
          </div>
        </div>

        {/* Thông báo lỗi khoảng ngày nếu có */}
        {dateError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* Bảng dữ liệu danh sách đơn hàng (Data Table) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        {/* Thông báo lỗi tải dữ liệu nếu có */}
        {error && (
          <div className="m-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mục 8: thanh thao tác hàng loạt khi đã tick chọn đơn */}
        {canBulkApprove && selectedIds.size > 0 && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-800">
              Đã chọn <strong className="text-[#F85606]">{selectedIds.size}</strong> đơn chờ duyệt
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => runBulk('APPROVE')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={14} /> Duyệt tất cả đã chọn
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => {
                  setBulkComment('');
                  setBulkAction('RETURN');
                }}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw size={14} /> Trả lại sửa
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => {
                  setBulkComment('');
                  setBulkAction('REJECT');
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <XCircle size={14} /> Từ chối
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/90 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                {canBulkApprove && (
                  <th className="py-3 pl-4 pr-0 w-8">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      disabled={selectableOnPage.length === 0}
                      onChange={toggleSelectAll}
                      title={
                        selectableOnPage.length === 0
                          ? 'Trang này không có đơn chờ duyệt'
                          : 'Chọn tất cả đơn chờ duyệt trên trang'
                      }
                      className="w-4 h-4 accent-[#F85606] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Mã đơn hàng</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4">Đại lý</th>
                <th className="py-3 px-4">NVKD Phụ trách</th>
                <th className="py-3 px-4">Khu vực</th>
                <th className="py-3 px-4 text-center">Số mặt hàng</th>
                <th className="py-3 px-4 text-right">Tổng tiền (VNĐ)</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={canBulkApprove ? 10 : 9} className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={26} className="animate-spin text-[#F85606]" />
                      <span className="text-xs font-semibold">Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={canBulkApprove ? 10 : 9} className="py-16 text-center text-gray-400 space-y-2">
                    <ShoppingCart size={36} className="mx-auto text-gray-300" />
                    <p className="text-sm font-bold text-gray-700">Không tìm thấy đơn hàng nào</p>
                    <p className="text-xs text-gray-500">
                      Vui lòng thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className={`transition-colors ${
                      selectedIds.has(String(o.id)) ? 'bg-orange-50/60' : 'hover:bg-orange-50/25'
                    }`}
                  >
                    {canBulkApprove && (
                      <td className="py-3 pl-4 pr-0">
                        {isSelectable(o) && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(String(o.id))}
                            onChange={() => toggleSelect(o.id)}
                            title="Chọn đơn này để xử lý hàng loạt"
                            className="w-4 h-4 accent-[#F85606] cursor-pointer"
                          />
                        )}
                      </td>
                    )}
                    {/* Mã đơn */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="font-mono font-bold text-[#F85606] hover:underline cursor-pointer"
                          title="Xem chi tiết đơn hàng"
                        >
                          {o.code}
                        </button>
                        {o.backorder && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title={`Đơn nợ hàng tự động tách từ đơn gốc ${o.parentOrderCode || ''}`}
                          >
                            Đơn nợ hàng {o.parentOrderCode ? `(từ ${o.parentOrderCode})` : ''}
                          </span>
                        )}
                        {o.hasShortage && !o.backorder && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title="Đã từng xuất thiếu hàng trong quá trình giao"
                          >
                            Xuất thiếu
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-3 px-4 text-gray-600">
                      <div>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}</div>
                      <div className="text-[10px] text-gray-400">
                        {o.createdAt ? new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>

                    {/* Đại lý */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 leading-tight">{o.customerName}</div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">{o.customerCode}</div>
                    </td>

                    {/* NVKD Phụ trách */}
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {o.salesRepName || 'Chưa phân công'}
                    </td>

                    {/* Khu vực */}
                    <td className="py-3 px-4 text-gray-600">
                      {o.regionName ? (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                          {o.regionName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Số mặt hàng */}
                    <td className="py-3 px-4 text-center font-semibold text-gray-800">
                      {o.lineCount} SKU
                    </td>

                    {/* Tổng tiền */}
                    <td className="py-3 px-4 text-right font-black text-[#F85606] text-sm">
                      {formatCurrencyVND(Number(o.totalAmount || 0))}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(o.status)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#F85606] hover:bg-orange-50 transition cursor-pointer"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Thao tác phụ gom vào menu "⋯" cho gọn: Chỉnh sửa nháp, Sao chép, In/PDF, Duyệt/Trả lại/Từ chối */}
                        <RowActionMenu
                          items={[
                            {
                              label: 'Chỉnh sửa đơn nháp',
                              icon: <Edit size={14} />,
                              onClick: () => navigate(`/orders/create?draftId=${o.id}`),
                              hidden: o.status !== 'DRAFT' || !canCreateOrder,
                            },
                            {
                              label: 'Sao chép thành đơn mới',
                              icon: <Copy size={14} />,
                              onClick: () => handleCloneOrder(o.id),
                              disabled: cloningOrderId === o.id,
                              hidden: !canCreateOrder,
                            },
                            {
                              label: 'In / Xuất PDF',
                              icon: <Printer size={14} />,
                              onClick: () => handleOpenPdfPreview(o.id),
                              disabled: loadingPdfId === o.id,
                            },
                            {
                              label: 'Phê duyệt đơn hàng',
                              icon: <CheckCircle2 size={14} />,
                              onClick: () => openApprovalModal(o, 'APPROVE'),
                              hidden: !(o.status === 'PENDING_APPROVAL' && isSalesManager),
                            },
                            {
                              label: 'Trả lại NVKD sửa',
                              icon: <RotateCcw size={14} />,
                              onClick: () => openApprovalModal(o, 'RETURN'),
                              hidden: !(o.status === 'PENDING_APPROVAL' && isSalesManager),
                            },
                            {
                              label: 'Từ chối đơn hàng',
                              icon: <XCircle size={14} />,
                              onClick: () => openApprovalModal(o, 'REJECT'),
                              hidden: !(o.status === 'PENDING_APPROVAL' && isSalesManager),
                              danger: true,
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PHÂN TRANG (PAGINATION BAR) */}
        {!loading && totalElements > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60">
            <div className="text-xs text-gray-500">
              Hiển thị <strong>{page * pageSize + 1}</strong> -{' '}
              <strong>{Math.min((page + 1) * pageSize, totalElements)}</strong> trong tổng số{' '}
              <strong>{formatQuantity(totalElements)}</strong> đơn hàng
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Hiển thị:</span>
              <SearchSelect
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#F85606] cursor-pointer"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
              </SearchSelect>

              <div className="flex items-center gap-1 pl-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang trước"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="px-2.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg">
                  {page + 1} / {Math.max(1, totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang sau"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. MODAL XEM CHI TIẾT ĐƠN HÀNG */}
      {/* Mục 8: nhập lý do khi Từ chối / Trả lại hàng loạt */}
      {bulkAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">
              {bulkAction === 'REJECT' ? 'Từ chối' : 'Trả lại sửa'} {selectedIds.size} đơn đã chọn
            </h3>
            <p className="text-xs text-gray-500">
              Lý do sẽ được ghi vào lịch sử duyệt của từng đơn. NV kinh doanh sẽ thấy lý do này.
            </p>
            <textarea
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              maxLength={500}
              rows={3}
              autoFocus
              placeholder="Nhập lý do (bắt buộc)..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-[#F85606] outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => setBulkAction(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={bulkSubmitting || !bulkComment.trim()}
                onClick={() => runBulk(bulkAction, bulkComment)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${
                  bulkAction === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {bulkSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={isDetailModalOpen}
        onCloneOrder={handleCloneOrder}
        onOrderUpdated={() => setRefreshKey((k) => k + 1)}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedOrderId(null);
        }}
      />

      {/* Modal duyệt / từ chối / trả lại sửa từ danh sách */}
      <OrderApprovalActionModal
        isOpen={isApprovalModalOpen}
        order={approvalModalOrder}
        actionType={approvalModalAction}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setApprovalModalOrder(null);
        }}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      {/* Modal xem trước và in PDF đơn hàng */}
      <OrderPdfPreviewModal
        isOpen={isPdfModalOpen}
        order={pdfPreviewOrder}
        onClose={() => {
          setIsPdfModalOpen(false);
          setPdfPreviewOrder(null);
        }}
      />

      {/* 9. MODAL DANH SÁCH ĐƠN HÀNG NHÁP */}
      <OrderDraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        drafts={drafts}
        onSelectDraft={handleSelectDraft}
        onDeleteDraft={handleDeleteDraft}
      />
    </div>
  );
};
