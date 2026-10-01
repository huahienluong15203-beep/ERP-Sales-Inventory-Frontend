import React, { useState } from 'react';
import type { ExcelImportRow, Product } from '../../../types/product';
import { ProductService } from '../../../services/productService';
import { Icons } from '../../../components/common/Icons';

interface ProductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  onImportSuccess: (count: number) => void;
}

export const ProductExcelImportModal: React.FC<ProductExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onImportSuccess
}) => {
  const [importedRows, setImportedRows] = useState<ExcelImportRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'errors' | 'valid'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Xử lý nạp dữ liệu mẫu để kiểm thử trực quan lưới báo lỗi từng dòng
  const handleLoadSampleData = () => {
    const sampleRawData = ProductService.getSampleImportExcelData();
    const validated = ProductService.validateExcelImportRows(sampleRawData, existingProducts);
    setImportedRows(validated);
    setNotification({
      type: 'success',
      message: `Đã nạp ${validated.length} dòng dữ liệu mẫu (Gồm cả dòng hợp lệ và các lỗi thực tế để kiểm tra).`
    });
  };

  // Đọc file CSV / text tải lên từ máy tính
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) {
          setNotification({ type: 'error', message: 'File không có dữ liệu hoặc chỉ có dòng tiêu đề!' });
          return;
        }

        // Đọc các dòng (bỏ qua dòng 1 là tiêu đề)
        const parsedRows: Array<Record<string, any>> = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cells.length >= 2) {
            parsedRows.push({
              rowNumber: i + 1,
              sku: cells[1] || cells[0] || '',
              name: cells[2] || cells[1] || '',
              category: cells[3] || 'Hàng tiêu dùng',
              baseUnit: cells[4] || '',
              packagingSpec: cells[5] || '',
              costPrice: cells[6] || 0,
              status: cells[7] || 'ACTIVE',
              conversionsText: cells[8] || ''
            });
          }
        }

        const validated = ProductService.validateExcelImportRows(parsedRows, existingProducts);
        setImportedRows(validated);
        setNotification({
          type: 'success',
          message: `Đã đọc và kiểm tra ${validated.length} dòng sản phẩm từ file "${file.name}".`
        });
      } catch (err: any) {
        setNotification({ type: 'error', message: 'Lỗi khi đọc file: ' + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Sửa trực tiếp một ô lỗi trên lưới dữ liệu (Inline Edit)
  const handleCellChange = (rowIndex: number, field: keyof ExcelImportRow, newValue: any) => {
    const updated = [...importedRows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      [field]: newValue
    };

    // Tái kiểm tra lại toàn bộ danh sách để cập nhật lỗi thời gian thực
    const rawData = updated.map((r) => ({
      rowNumber: r.rowNumber,
      sku: r.sku,
      name: r.name,
      category: r.category,
      baseUnit: r.baseUnit,
      packagingSpec: r.packagingSpec,
      costPrice: r.costPrice,
      imageUrl: r.imageUrl,
      status: r.status,
      conversionsText: r.conversionsText
    }));

    const revalidated = ProductService.validateExcelImportRows(rawData, existingProducts);
    setImportedRows(revalidated);
  };

  // Xóa một dòng khỏi lưới kiểm tra
  const handleDeleteRow = (rowIndex: number) => {
    const updated = importedRows.filter((_, idx) => idx !== rowIndex);
    const rawData = updated.map((r) => ({
      rowNumber: r.rowNumber,
      sku: r.sku,
      name: r.name,
      category: r.category,
      baseUnit: r.baseUnit,
      packagingSpec: r.packagingSpec,
      costPrice: r.costPrice,
      imageUrl: r.imageUrl,
      status: r.status,
      conversionsText: r.conversionsText
    }));
    const revalidated = ProductService.validateExcelImportRows(rawData, existingProducts);
    setImportedRows(revalidated);
  };

  // Tổng hợp thống kê dòng hợp lệ và lỗi
  const validCount = importedRows.filter((r) => r.isValid).length;
  const errorCount = importedRows.filter((r) => !r.isValid).length;

  // Lọc hiển thị theo tab
  const displayRows = importedRows.filter((r) => {
    if (filterMode === 'errors') return !r.isValid;
    if (filterMode === 'valid') return r.isValid;
    return true;
  });

  // Tiến hành Import các dòng hợp lệ vào cơ sở dữ liệu
  const handleExecuteImport = async (onlyValid: boolean = false) => {
    const rowsToImport = onlyValid ? importedRows.filter((r) => r.isValid) : importedRows;
    if (rowsToImport.length === 0) {
      setNotification({ type: 'error', message: 'Không có dòng dữ liệu hợp lệ nào để import!' });
      return;
    }

    if (!onlyValid && errorCount > 0) {
      setNotification({
        type: 'error',
        message: `Vẫn còn ${errorCount} dòng có lỗi! Vui lòng sửa lỗi trên lưới hoặc chọn "Bỏ qua dòng lỗi & Import ${validCount} dòng hợp lệ".`
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await ProductService.importProducts(rowsToImport);
      onImportSuccess(res.count);
      onClose();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Lỗi khi lưu dữ liệu import!' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1150px',
          maxHeight: '94vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #A7F3D0'
              }}
            >
              <Icons.FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Import Danh Mục Sản Phẩm Từ Excel / CSV
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                Lưới kiểm tra dữ liệu tự động, phát hiện và chỉ rõ chi tiết lỗi của từng dòng
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => ProductService.downloadExcelTemplate()}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Icons.Download size={14} />
              <span>Tải file mẫu Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#F1F5F9',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Icons.X size={16} />
            </button>
          </div>
        </div>

        {/* Thông báo Notification */}
        {notification && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: notification.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              borderBottom: notification.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
              color: notification.type === 'success' ? '#065F46' : '#DC2626',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {notification.type === 'success' ? <Icons.CheckCircle2 size={16} /> : <Icons.AlertCircle size={16} />}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}

        {/* Khu vực Chọn / Tải file hoặc Nạp dữ liệu kiểm thử */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Icons.Upload size={15} />
              <span>Tải file Excel / CSV từ máy</span>
              <input type="file" accept=".csv, .txt, .xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            {/* Nút nạp demo cực kỳ tiện lợi để test ngay */}
            <button
              type="button"
              onClick={handleLoadSampleData}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: '#FFF7ED',
                color: '#EA580C',
                border: '1.5px solid #FDBA74',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Nạp sẵn bộ dữ liệu chứa cả dòng hợp lệ và các dòng lỗi thường gặp"
            >
              <Icons.Sparkles size={15} />
              <span>Nạp Dữ Liệu Mẫu Kiểm Thử (Có Dòng Báo Lỗi)</span>
            </button>
          </div>

          {/* Thanh thống kê kết quả kiểm tra từng dòng */}
          {importedRows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: filterMode === 'all' ? '1.5px solid #0F172A' : '1px solid #CBD5E1',
                  backgroundColor: filterMode === 'all' ? '#0F172A' : '#FFFFFF',
                  color: filterMode === 'all' ? '#FFFFFF' : '#334155',
                  cursor: 'pointer'
                }}
              >
                Tất cả ({importedRows.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('errors')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: filterMode === 'errors' ? '1.5px solid #EF4444' : '1px solid #FECACA',
                  backgroundColor: filterMode === 'errors' ? '#EF4444' : '#FEF2F2',
                  color: filterMode === 'errors' ? '#FFFFFF' : '#DC2626',
                  cursor: 'pointer'
                }}
              >
                🔴 Dòng có lỗi ({errorCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('valid')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: filterMode === 'valid' ? '1.5px solid #10B981' : '1px solid #A7F3D0',
                  backgroundColor: filterMode === 'valid' ? '#10B981' : '#ECFDF5',
                  color: filterMode === 'valid' ? '#FFFFFF' : '#059669',
                  cursor: 'pointer'
                }}
              >
                🟢 Dòng hợp lệ ({validCount})
              </button>
            </div>
          )}
        </div>

        {/* LƯỚI DỮ LIỆU BÁO LỖI TỪNG DÒNG (DATA GRID) */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', backgroundColor: '#FFFFFF' }}>
          {importedRows.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                border: '2px dashed #E2E8F0',
                borderRadius: '16px',
                color: '#64748B'
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  backgroundColor: '#F1F5F9',
                  color: '#94A3B8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px'
                }}
              >
                <Icons.Upload size={28} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                Chưa có dữ liệu nào được nạp
              </h3>
              <p style={{ fontSize: '13px', margin: '0 0 16px', maxWidth: '440px', marginInline: 'auto' }}>
                Bấm vào <strong>"Nạp Dữ Liệu Mẫu Kiểm Thử"</strong> ở trên để xem ngay lưới báo lỗi từng dòng, hoặc tải file Excel từ máy của bạn.
              </p>
            </div>
          ) : (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '10px 10px', width: '55px', textAlign: 'center', fontWeight: 700 }}>DÒNG</th>
                    <th style={{ padding: '10px 10px', width: '90px', textAlign: 'center', fontWeight: 700 }}>KẾT QUẢ</th>
                    <th style={{ padding: '10px 12px', minWidth: '220px', fontWeight: 700, color: '#DC2626' }}>
                      CHI TIẾT LỖI TỪNG DÒNG
                    </th>
                    <th style={{ padding: '10px 10px', minWidth: '130px', fontWeight: 700 }}>MÃ SKU</th>
                    <th style={{ padding: '10px 10px', minWidth: '180px', fontWeight: 700 }}>TÊN SẢN PHẨM</th>
                    <th style={{ padding: '10px 10px', minWidth: '120px', fontWeight: 700 }}>NHÓM HÀNG</th>
                    <th style={{ padding: '10px 10px', minWidth: '85px', fontWeight: 700 }}>ĐVT CƠ SỞ</th>
                    <th style={{ padding: '10px 10px', minWidth: '130px', fontWeight: 700 }}>QUY CÁCH</th>
                    <th style={{ padding: '10px 10px', minWidth: '100px', fontWeight: 700 }}>GIÁ VỐN</th>
                    <th style={{ padding: '10px 10px', minWidth: '110px', fontWeight: 700 }}>QUY ĐỔI</th>
                    <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center' }}>XÓA</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, idx) => {
                    const realIndex = importedRows.findIndex((r) => r.rowNumber === row.rowNumber);
                    return (
                      <tr
                        key={row.rowNumber}
                        style={{
                          borderBottom: '1px solid #E2E8F0',
                          backgroundColor: !row.isValid ? '#FEF2F2' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Dòng số */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#64748B' }}>
                          #{row.rowNumber}
                        </td>

                        {/* Trạng thái hợp lệ / lỗi */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {row.isValid ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                fontWeight: 700,
                                fontSize: '11px'
                              }}
                            >
                              <Icons.CheckCircle2 size={13} />
                              <span>Hợp lệ</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C',
                                fontWeight: 700,
                                fontSize: '11px'
                              }}
                            >
                              <Icons.AlertCircle size={13} />
                              <span>Lỗi</span>
                            </span>
                          )}
                        </td>

                        {/* CỘT CHI TIẾT BÁO LỖI TỪNG DÒNG (Trực quan, dễ đọc, chỉ rõ lỗi) */}
                        <td style={{ padding: '8px 12px' }}>
                          {row.errors.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {row.errors.map((err, errIdx) => (
                                <div
                                  key={errIdx}
                                  style={{
                                    fontSize: '11.5px',
                                    color: '#B91C1C',
                                    fontWeight: 600,
                                    lineHeight: 1.35,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '5px'
                                  }}
                                >
                                  <span style={{ color: '#DC2626' }}>•</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#15803D', fontWeight: 500 }}>
                              ✓ Dữ liệu chuẩn xác, sẵn sàng nạp
                            </span>
                          )}
                        </td>

                        {/* Mã SKU (Cho phép chỉnh sửa trực tiếp Inline Edit) */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.sku}
                            onChange={(e) => handleCellChange(realIndex, 'sku', e.target.value.toUpperCase())}
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: !row.sku || row.errors.some((e) => e.includes('SKU')) ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                              backgroundColor: !row.sku || row.errors.some((e) => e.includes('SKU')) ? '#FFF5F5' : '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              outline: 'none',
                              fontFamily: 'monospace'
                            }}
                            title="Nhấp để sửa mã SKU trực tiếp"
                          />
                        </td>

                        {/* Tên sản phẩm */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleCellChange(realIndex, 'name', e.target.value)}
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: !row.name || row.errors.some((e) => e.includes('Tên')) ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                              fontSize: '11.5px',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Nhóm hàng */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.category}
                            onChange={(e) => handleCellChange(realIndex, 'category', e.target.value)}
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '11.5px',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* ĐVT cơ sở */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.baseUnit}
                            onChange={(e) => handleCellChange(realIndex, 'baseUnit', e.target.value)}
                            placeholder="Lon/Chai"
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: !row.baseUnit ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                              backgroundColor: !row.baseUnit ? '#FFF5F5' : '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#EA580C',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Quy cách */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.packagingSpec}
                            onChange={(e) => handleCellChange(realIndex, 'packagingSpec', e.target.value)}
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '11.5px',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Giá vốn */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="number"
                            value={row.costPrice}
                            onChange={(e) => handleCellChange(realIndex, 'costPrice', e.target.value)}
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: row.errors.some((e) => e.includes('Giá vốn')) ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                              fontSize: '11.5px',
                              outline: 'none',
                              textAlign: 'right'
                            }}
                          />
                        </td>

                        {/* Quy đổi */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.conversionsText || ''}
                            onChange={(e) => handleCellChange(realIndex, 'conversionsText', e.target.value)}
                            placeholder="Thùng:24"
                            style={{
                              width: '100%',
                              height: '30px',
                              padding: '0 6px',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              fontSize: '11px',
                              outline: 'none'
                            }}
                          />
                        </td>

                        {/* Nút xóa */}
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(realIndex)}
                            title="Bỏ dòng này khỏi danh sách import"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#FEE2E2',
                              color: '#EF4444',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Icons.Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Modal Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#475569' }}>
            {importedRows.length > 0 ? (
              <span>
                Tổng cộng <strong>{importedRows.length}</strong> dòng • Có{' '}
                <strong style={{ color: '#059669' }}>{validCount}</strong> dòng hợp lệ •{' '}
                <strong style={{ color: '#DC2626' }}>{errorCount}</strong> dòng có lỗi
              </span>
            ) : (
              <span>Vui lòng tải file hoặc bấm "Nạp Dữ Liệu Mẫu Kiểm Thử" để bắt đầu.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>

            {/* Nút chỉ import các dòng hợp lệ */}
            {errorCount > 0 && validCount > 0 && (
              <button
                type="button"
                onClick={() => handleExecuteImport(true)}
                disabled={isProcessing}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #059669',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                Bỏ qua dòng lỗi & Import {validCount} dòng hợp lệ
              </button>
            )}

            {/* Nút import tất cả (khi đã sửa hết lỗi) */}
            <button
              type="button"
              onClick={() => handleExecuteImport(false)}
              disabled={isProcessing || importedRows.length === 0 || errorCount > 0}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                border: 'none',
                background:
                  errorCount > 0 || importedRows.length === 0
                    ? '#CBD5E1'
                    : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: errorCount > 0 ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                cursor: errorCount > 0 || importedRows.length === 0 || isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isProcessing ? (
                <>
                  <Icons.RefreshCw size={15} className="animate-spin" />
                  <span>Đang Import...</span>
                </>
              ) : (
                <>
                  <Icons.CheckCircle2 size={16} />
                  <span>Import Toàn Bộ ({validCount} dòng)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
