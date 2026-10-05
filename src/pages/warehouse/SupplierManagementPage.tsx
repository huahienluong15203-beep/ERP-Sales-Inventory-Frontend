import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Icons } from '../../components/common/Icons';

type SupplierStatus = 'Đang hợp tác' | 'Tạm dừng' | 'Mới';

interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  taxCode: string;
  contactPerson: string;
  paymentTerms: string;
  status: SupplierStatus;
}

const initialSuppliers: SupplierRecord[] = [
  {
    id: 'SUP-001',
    code: 'NCC-ALPHA',
    name: 'Công ty TNHH Alpha Pharma',
    taxCode: '0101234567',
    contactPerson: 'Nguyễn Văn Hưng',
    paymentTerms: '30 ngày theo hóa đơn',
    status: 'Đang hợp tác'
  },
  {
    id: 'SUP-002',
    code: 'NCC-BETA',
    name: 'Đại lý Beta Logistics',
    taxCode: '0202345678',
    contactPerson: 'Trần Thị Mai',
    paymentTerms: 'Tiền mặt 100% trước khi giao',
    status: 'Mới'
  },
  {
    id: 'SUP-003',
    code: 'NCC-GAMMA',
    name: 'Gamma Packaging Co.',
    taxCode: '0303456789',
    contactPerson: 'Phạm Quốc Huy',
    paymentTerms: 'Net 45',
    status: 'Tạm dừng'
  },
  {
    id: 'SUP-004',
    code: 'NCC-DELTA',
    name: 'Delta Fresh Foods',
    taxCode: '0404567890',
    contactPerson: 'Lê Thu Hằng',
    paymentTerms: 'Thanh toán theo từng lô',
    status: 'Đang hợp tác'
  }
];

const emptyForm = {
  code: '',
  name: '',
  taxCode: '',
  contactPerson: '',
  paymentTerms: '',
  status: 'Đang hợp tác' as SupplierStatus
};

const statusPalette: Record<SupplierStatus, { bg: string; color: string; border: string }> = {
  'Đang hợp tác': { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  'Tạm dừng': { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  Mới: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
};

export const SupplierManagementPage: React.FC = () => {
  const { showToast } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter((supplier) =>
      [supplier.code, supplier.name, supplier.taxCode, supplier.contactPerson, supplier.paymentTerms]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [search, suppliers]);

  const totals = useMemo(() => {
    const active = suppliers.filter((supplier) => supplier.status === 'Đang hợp tác').length;
    const paused = suppliers.filter((supplier) => supplier.status === 'Tạm dừng').length;
    const newOnes = suppliers.filter((supplier) => supplier.status === 'Mới').length;

    return {
      total: suppliers.length,
      active,
      paused,
      newOnes
    };
  }, [suppliers]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (supplier: SupplierRecord) => {
    setEditingId(supplier.id);
    setForm({
      code: supplier.code,
      name: supplier.name,
      taxCode: supplier.taxCode,
      contactPerson: supplier.contactPerson,
      paymentTerms: supplier.paymentTerms,
      status: supplier.status
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim() || !form.taxCode.trim() || !form.contactPerson.trim()) {
      showToast('Thiếu thông tin bắt buộc', 'Vui lòng nhập mã, tên, MST và người liên hệ của nhà cung cấp.', 'error');
      return;
    }

    const payload: SupplierRecord = {
      id: editingId || `SUP-${String(Date.now()).slice(-4)}`,
      code: form.code.trim(),
      name: form.name.trim(),
      taxCode: form.taxCode.trim(),
      contactPerson: form.contactPerson.trim(),
      paymentTerms: form.paymentTerms.trim() || 'Theo thỏa thuận',
      status: form.status
    };

    setSuppliers((current) => {
      if (editingId) {
        return current.map((supplier) => (supplier.id === editingId ? payload : supplier));
      }

      return [payload, ...current];
    });

    setIsFormOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    showToast(
      editingId ? 'Cập nhật nhà cung cấp thành công' : 'Thêm nhà cung cấp thành công',
      editingId ? `Dữ liệu ${payload.name} đã được cập nhật.` : `Nhà cung cấp ${payload.name} đã được lưu vào danh mục.`,
      'success'
    );
  };

  const handleDelete = (supplierId: string) => {
    const supplier = suppliers.find((item) => item.id === supplierId);
    if (!supplier) return;

    setSuppliers((current) => current.filter((item) => item.id !== supplierId));
    showToast('Đã xoá nhà cung cấp', `Mã ${supplier.code} đã được gỡ khỏi danh mục.`, 'info');
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerCard}>
        <div>
          <div style={styles.eyebrow}>Kho & Nhập hàng</div>
          <h1 style={styles.title}>Quản lý nhà cung cấp</h1>
          <p style={styles.subtitle}>Theo dõi nguồn hàng, truy nguyên lô lỗi và chuẩn hóa hợp đồng mua hàng.</p>
        </div>

        <button style={styles.primaryButton} onClick={openCreateForm}>
          <Icons.Plus size={16} />
          <span>Thêm NCC</span>
        </button>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Tổng nhà cung cấp</div>
          <div style={styles.summaryValue}>{totals.total}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Đang hợp tác</div>
          <div style={{ ...styles.summaryValue, color: '#047857' }}>{totals.active}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Tạm dừng</div>
          <div style={{ ...styles.summaryValue, color: '#c2410c' }}>{totals.paused}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Mới</div>
          <div style={{ ...styles.summaryValue, color: '#1d4ed8' }}>{totals.newOnes}</div>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Icons.Search size={16} color="#6b7280" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã, tên, MST, người liên hệ..."
              style={styles.searchInput}
            />
          </div>
          <div style={styles.infoPill}>Hiển thị {filteredSuppliers.length} nhà cung cấp</div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Mã</th>
                <th style={styles.th}>Tên nhà cung cấp</th>
                <th style={styles.th}>Mã số thuế</th>
                <th style={styles.th}>Người liên hệ</th>
                <th style={styles.th}>Điều khoản thanh toán</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyState}>Không tìm thấy nhà cung cấp nào phù hợp.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} style={styles.tr}>
                    <td style={styles.td}><strong>{supplier.code}</strong></td>
                    <td style={styles.td}>{supplier.name}</td>
                    <td style={styles.td}>{supplier.taxCode}</td>
                    <td style={styles.td}>{supplier.contactPerson}</td>
                    <td style={styles.td}>{supplier.paymentTerms}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusPill,
                          background: statusPalette[supplier.status].bg,
                          color: statusPalette[supplier.status].color,
                          border: `1px solid ${statusPalette[supplier.status].border}`
                        }}
                      >
                        {supplier.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionGroup}>
                        <button style={styles.iconButton} onClick={() => openEditForm(supplier)} aria-label={`Sửa ${supplier.name}`}>
                          <Icons.Edit size={15} />
                        </button>
                        <button style={{ ...styles.iconButton, color: '#dc2626' }} onClick={() => handleDelete(supplier.id)} aria-label={`Xoá ${supplier.name}`}>
                          <Icons.X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsFormOpen(false)}>
          <div style={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>Danh mục nguồn hàng</div>
                <h2 style={styles.modalTitle}>{editingId ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</h2>
              </div>
              <button style={styles.closeButton} onClick={() => setIsFormOpen(false)} aria-label="Đóng form">
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Mã nhà cung cấp</span>
                  <input
                    value={form.code}
                    onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                    style={styles.input}
                    placeholder="VD: NCC-ALPHA"
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Tên nhà cung cấp</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    style={styles.input}
                    placeholder="Tên công ty / nhà cung cấp"
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Mã số thuế</span>
                  <input
                    value={form.taxCode}
                    onChange={(event) => setForm((current) => ({ ...current, taxCode: event.target.value }))}
                    style={styles.input}
                    placeholder="VD: 0101234567"
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Người liên hệ</span>
                  <input
                    value={form.contactPerson}
                    onChange={(event) => setForm((current) => ({ ...current, contactPerson: event.target.value }))}
                    style={styles.input}
                    placeholder="Tên người phụ trách"
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Điều khoản thanh toán</span>
                  <input
                    value={form.paymentTerms}
                    onChange={(event) => setForm((current) => ({ ...current, paymentTerms: event.target.value }))}
                    style={styles.input}
                    placeholder="VD: Net 30, 100% trước khi giao"
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Trạng thái</span>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SupplierStatus }))}
                    style={styles.input}
                  >
                    <option value="Đang hợp tác">Đang hợp tác</option>
                    <option value="Mới">Mới</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </label>
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.secondaryButton} onClick={() => setIsFormOpen(false)}>
                  Huỷ
                </button>
                <button type="submit" style={styles.primaryButton}>
                  {editingId ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '8px 0 24px'
  },
  headerCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
    border: '1px solid #fed7aa',
    borderRadius: 18,
    padding: '22px 24px'
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#c2410c',
    fontWeight: 700,
    marginBottom: 8
  },
  title: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.2,
    color: '#111827'
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#4b5563',
    fontSize: 14
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.25)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16
  },
  summaryCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: '18px 20px',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: 800,
    color: '#111827'
  },
  tableCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '18px 20px',
    borderBottom: '1px solid #f3f4f6',
    background: '#fffaf5'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '0 12px',
    minWidth: 340,
    maxWidth: 520,
    flex: 1
  },
  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    padding: '12px 0',
    background: 'transparent'
  },
  infoPill: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 12px'
  },
  tableWrap: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 980
  },
  th: {
    textAlign: 'left',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6b7280',
    background: '#f9fafb',
    padding: '14px 16px',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 700
  },
  tr: {
    borderBottom: '1px solid #f3f4f6'
  },
  td: {
    padding: '16px',
    fontSize: 14,
    color: '#374151',
    verticalAlign: 'top'
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    cursor: 'pointer'
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '28px 16px',
    fontStyle: 'italic'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 2000
  },
  modalCard: {
    width: 'min(760px, 100%)',
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
    padding: 0,
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '20px 22px',
    borderBottom: '1px solid #f3f4f6',
    background: '#fffaf5'
  },
  modalTitle: {
    margin: 0,
    fontSize: 24,
    color: '#111827'
  },
  closeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer'
  },
  form: {
    padding: '20px 22px 22px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 18
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    color: '#374151',
    fontSize: 14,
    fontWeight: 600
  },
  fieldLabel: {
    fontWeight: 700,
    color: '#374151'
  },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '11px 12px',
    fontSize: 14,
    background: '#fff',
    color: '#111827',
    outline: 'none'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer'
  }
};

export default SupplierManagementPage;
