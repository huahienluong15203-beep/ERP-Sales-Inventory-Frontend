/**
 * Ứng dụng Quản lý Danh mục Sản phẩm Chuẩn hóa
 * Đáp ứng chặt chẽ các quy định nghiệp vụ:
 * 1. Mã SKU là duy nhất trên toàn hệ thống.
 * 2. Giá vốn chỉ Quản lý kinh doanh xem và sửa được (Phân quyền Role).
 * 3. Sản phẩm đã phát sinh giao dịch thì không xoá được, chỉ được chuyển sang "Ngừng kinh doanh".
 */

// Key lưu trữ localStorage
const STORAGE_KEY = 'standard_product_catalog_v2';
const ROLE_STORAGE_KEY = 'user_current_role_v2';

// Vai trò người dùng hiện tại: 'manager' (Quản lý kinh doanh) | 'staff' (Nhân viên kinh doanh)
let currentUserRole = 'manager';

// Biến lưu sản phẩm đang chờ xử lý khi bị chặn xóa
let pendingBlockedProduct = null;

// Biến lưu sản phẩm đang xem chi tiết
let currentViewingProduct = null;

// Mẫu ảnh SVG nội bộ (đảm bảo hiển thị 100% đẹp mắt)
const PRESET_IMAGES = [
  {
    name: 'Đồ uống (Lon)',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fee2e2"/><rect x="32" y="20" width="36" height="60" rx="10" fill="%23ef4444"/><ellipse cx="50" cy="20" rx="18" ry="6" fill="%23dc2626"/><ellipse cx="50" cy="80" rx="18" ry="6" fill="%23b91c1c"/><path d="M42 35 Q50 45 58 35" stroke="white" stroke-width="3" fill="none"/></svg>'
  },
  {
    name: 'Thực phẩm gói',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fef3c7"/><rect x="25" y="22" width="50" height="56" rx="4" fill="%23f59e0b"/><polygon points="25,22 30,16 70,16 75,22" fill="%23d97706"/><circle cx="50" cy="50" r="14" fill="%23fff" opacity="0.9"/><text x="50" y="55" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23b45309" text-anchor="middle">FOOD</text></svg>'
  },
  {
    name: 'Chai / Hóa mỹ phẩm',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e0f2fe"/><path d="M42 16 h16 v14 h-16 z" fill="%230284c7"/><path d="M30 36 C30 30 70 30 70 36 L66 82 C66 86 34 86 34 82 Z" fill="%2338bdf8"/><circle cx="50" cy="55" r="12" fill="%23fff" opacity="0.8"/><text x="50" y="60" font-family="sans-serif" font-size="10" font-weight="bold" fill="%230369a1" text-anchor="middle">CLEAN</text></svg>'
  },
  {
    name: 'Sữa / Hộp giấy',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23dcfce7"/><polygon points="32,26 50,14 68,26" fill="%2316a34a"/><rect x="32" y="26" width="36" height="58" fill="%2322c55e"/><text x="50" y="58" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23ffffff" text-anchor="middle">MILK</text></svg>'
  },
  {
    name: 'Bánh kẹo',
    data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3e8ff"/><rect x="26" y="32" width="48" height="40" rx="8" fill="%239333ea"/><circle cx="50" cy="52" r="10" fill="%23fcd34d"/><text x="50" y="56" font-family="sans-serif" font-size="11" font-weight="bold" fill="%237e22ce" text-anchor="middle">SWEET</text></svg>'
  }
];

// Danh mục sản phẩm khởi tạo chuẩn mẫu
const DEFAULT_PRODUCTS = [
  {
    id: 'prod_1',
    sku: 'COCA-LON-330',
    name: 'Nước ngọt có gas Coca-Cola lon 330ml',
    category: 'Đồ uống & Giải khát',
    baseUom: 'Lon',
    packaging: 'Thùng 24 lon',
    costPrice: 8200,
    image: PRESET_IMAGES[0].data,
    status: 'Đang kinh doanh',
    hasTransactions: true, // Đã phát sinh giao dịch -> Không thể xóa, chỉ ngừng kinh doanh
    createdAt: Date.now() - 3600000 * 24 * 10
  },
  {
    id: 'prod_2',
    sku: 'MILO-HOP-180',
    name: 'Sữa lúa mạch Nestlé Milo hộp 180ml',
    category: 'Sữa & Sản phẩm từ sữa',
    baseUom: 'Hộp',
    packaging: 'Thùng 48 hộp (12 lốc x 4)',
    costPrice: 7100,
    image: PRESET_IMAGES[3].data,
    status: 'Đang kinh doanh',
    hasTransactions: true, // Đã phát sinh giao dịch
    createdAt: Date.now() - 3600000 * 24 * 8
  },
  {
    id: 'prod_3',
    sku: 'HAOHAO-TOM-75',
    name: 'Mì ăn liền Hảo Hảo Tôm chua cay 75g',
    category: 'Thực phẩm đóng gói',
    baseUom: 'Gói',
    packaging: 'Thùng 30 gói',
    costPrice: 3600,
    image: PRESET_IMAGES[1].data,
    status: 'Đang kinh doanh',
    hasTransactions: false, // Mới khai báo, chưa phát sinh giao dịch -> Có thể xóa
    createdAt: Date.now() - 3600000 * 24 * 5
  },
  {
    id: 'prod_4',
    sku: 'SUNLIGHT-CHANH-750',
    name: 'Nước rửa chén Sunlight chanh can 750ml',
    category: 'Hóa mỹ phẩm & Tẩy rửa',
    baseUom: 'Chai',
    packaging: 'Thùng 12 chai',
    costPrice: 24500,
    image: PRESET_IMAGES[2].data,
    status: 'Đang kinh doanh',
    hasTransactions: true, // Đã phát sinh giao dịch
    createdAt: Date.now() - 3600000 * 24 * 3
  },
  {
    id: 'prod_5',
    sku: 'CHOCOPIE-HOP-12P',
    name: 'Bánh Chocopie Orion hộp 12 cái 396g',
    category: 'Bánh kẹo & Snack',
    baseUom: 'Hộp',
    packaging: 'Thùng 8 hộp',
    costPrice: 46000,
    image: PRESET_IMAGES[4].data,
    status: 'Đang kinh doanh',
    hasTransactions: false, // Chưa phát sinh giao dịch -> Có thể xóa
    createdAt: Date.now() - 3600000 * 24 * 2
  },
  {
    id: 'prod_6',
    sku: 'PEPSI-CHAI-390-OLD',
    name: 'Nước ngọt Pepsi chai thủy tinh 390ml (Mẫu cũ)',
    category: 'Đồ uống & Giải khát',
    baseUom: 'Chai',
    packaging: 'Két 24 chai',
    costPrice: 6500,
    image: PRESET_IMAGES[0].data,
    status: 'Ngừng kinh doanh',
    hasTransactions: true, // Đã phát sinh giao dịch
    createdAt: Date.now() - 3600000 * 24 * 30
  }
];

// State quản lý danh mục
let products = [];
let currentFilter = {
  search: '',
  category: '',
  status: '',
  tx: ''
};

// ==========================================================================
// Khởi tạo ứng dụng & LocalStorage
// ==========================================================================
function initApp() {
  loadRole();
  loadProducts();
  renderPresetChips();
  setupEventListeners();
  applyRoleUI();
  renderTable();
  updateStats();
  updateCategoryFilterDropdown();
}

function loadRole() {
  const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
  if (savedRole === 'manager' || savedRole === 'staff') {
    currentUserRole = savedRole;
  } else {
    currentUserRole = 'manager';
  }
  const roleSelect = document.getElementById('select-user-role');
  if (roleSelect) {
    roleSelect.value = currentUserRole;
  }
}

function setRole(role) {
  currentUserRole = role;
  localStorage.setItem(ROLE_STORAGE_KEY, role);
  applyRoleUI();
  renderTable();
  showToast(
    role === 'manager' 
      ? 'Đã chuyển sang vai trò: Quản lý kinh doanh (Được phép xem và sửa giá vốn)'
      : 'Đã chuyển sang vai trò: Nhân viên kinh doanh (Giá vốn được bảo mật ẩn đi)',
    'info'
  );
}

function applyRoleUI() {
  const isManager = currentUserRole === 'manager';
  const thCostHint = document.getElementById('th-cost-hint');
  if (thCostHint) {
    thCostHint.textContent = isManager ? '(Quản lý)' : '(Bảo mật)';
    thCostHint.style.color = isManager ? 'var(--primary-600)' : 'var(--amber-600)';
  }
}

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      products = JSON.parse(saved);
    } catch (e) {
      console.error('Lỗi đọc dữ liệu từ storage, khôi phục mặc định:', e);
      products = [...DEFAULT_PRODUCTS];
      saveProducts();
    }
  } else {
    products = [...DEFAULT_PRODUCTS];
    saveProducts();
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// ==========================================================================
// Thiết lập Event Listeners
// ==========================================================================
function setupEventListeners() {
  // Đổi vai trò
  document.getElementById('select-user-role').addEventListener('change', (e) => {
    setRole(e.target.value);
  });

  // Mở modal thêm mới
  document.getElementById('btn-open-create').addEventListener('click', () => {
    openModalForCreate();
  });
  document.getElementById('btn-empty-create').addEventListener('click', () => {
    openModalForCreate();
  });

  // Đóng modal thêm/sửa
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
  document.getElementById('product-modal').addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeModal();
  });

  // Đóng modal chi tiết
  document.getElementById('btn-close-detail').addEventListener('click', closeDetailModal);
  document.getElementById('btn-close-detail-footer').addEventListener('click', closeDetailModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeDetailModal();
  });

  // Đóng modal chặn xóa
  document.getElementById('btn-close-blocked').addEventListener('click', closeBlockedModal);
  document.getElementById('btn-cancel-blocked').addEventListener('click', closeBlockedModal);
  document.getElementById('blocked-delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'blocked-delete-modal') closeBlockedModal();
  });

  // Xác nhận chuyển sang Ngừng kinh doanh từ modal chặn xóa
  document.getElementById('btn-confirm-stop-business').addEventListener('click', handleStopBusinessFromModal);

  // Submit form khai báo / chỉnh sửa
  document.getElementById('product-form').addEventListener('submit', handleFormSubmit);

  // Lắng nghe thay đổi giá vốn để format hiển thị tức thời
  const inputCost = document.getElementById('input-cost-price');
  inputCost.addEventListener('input', () => {
    const val = parseFloat(inputCost.value) || 0;
    document.getElementById('cost-price-preview').textContent = formatCurrency(val);
  });

  // Tự động chuyển SKU thành chữ hoa không dấu & kiểm tra trùng lặp thời gian thực
  const inputSku = document.getElementById('input-sku');
  inputSku.addEventListener('input', () => {
    inputSku.value = sanitizeSku(inputSku.value);
    validateSkuLive(inputSku.value);
  });

  // Xử lý upload ảnh từ máy người dùng
  const fileInput = document.getElementById('input-file-image');
  fileInput.addEventListener('change', handleImageUpload);

  // Nút xóa ảnh
  document.getElementById('btn-remove-image').addEventListener('click', clearImagePreview);

  // Bộ lọc & Tìm kiếm
  const searchInput = document.getElementById('filter-search');
  const clearSearchBtn = document.getElementById('btn-clear-search');
  searchInput.addEventListener('input', (e) => {
    currentFilter.search = e.target.value.trim().toLowerCase();
    clearSearchBtn.style.display = currentFilter.search ? 'block' : 'none';
    renderTable();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentFilter.search = '';
    clearSearchBtn.style.display = 'none';
    renderTable();
  });

  document.getElementById('filter-category').addEventListener('change', (e) => {
    currentFilter.category = e.target.value;
    renderTable();
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    currentFilter.status = e.target.value;
    renderTable();
  });

  document.getElementById('filter-tx').addEventListener('change', (e) => {
    currentFilter.tx = e.target.value;
    renderTable();
  });

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    searchInput.value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-tx').value = '';
    currentFilter = { search: '', category: '', status: '', tx: '' };
    clearSearchBtn.style.display = 'none';
    renderTable();
    showToast('Đã đặt lại toàn bộ bộ lọc', 'info');
  });

  // Phím tắt ESC để đóng modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDetailModal();
      closeBlockedModal();
    }
  });
}

// ==========================================================================
// Kiểm tra Tính Duy Nhất của Mã SKU (QUY TẮC 1)
// ==========================================================================
function validateSkuLive(sku) {
  const currentEditingId = document.getElementById('form-product-id').value;
  const errorEl = document.getElementById('error-sku');
  const inputEl = document.getElementById('input-sku');

  if (!sku) {
    errorEl.textContent = '';
    inputEl.classList.remove('is-invalid');
    return true;
  }

  const isDuplicate = products.some(p => 
    p.sku.toUpperCase() === sku.toUpperCase() && p.id !== currentEditingId
  );

  if (isDuplicate) {
    errorEl.textContent = `⚠️ Mã SKU "${sku}" đã tồn tại! Mã SKU bắt buộc phải là duy nhất trên toàn hệ thống.`;
    inputEl.classList.add('is-invalid');
    return false;
  } else {
    errorEl.textContent = '';
    inputEl.classList.remove('is-invalid');
    return true;
  }
}

// ==========================================================================
// Hiển thị Preset Ảnh nhanh
// ==========================================================================
function renderPresetChips() {
  const container = document.getElementById('preset-chips');
  container.innerHTML = '';
  PRESET_IMAGES.forEach((preset) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'preset-chip';
    chip.textContent = preset.name;
    chip.addEventListener('click', () => {
      setImagePreview(preset.data);
    });
    container.appendChild(chip);
  });
}

function setImagePreview(dataUrl) {
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  const hiddenInput = document.getElementById('input-image-data');
  const removeBtn = document.getElementById('btn-remove-image');

  if (dataUrl) {
    preview.src = dataUrl;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    hiddenInput.value = dataUrl;
    removeBtn.style.display = 'inline-flex';
  } else {
    clearImagePreview();
  }
}

function clearImagePreview() {
  const preview = document.getElementById('image-preview');
  const placeholder = document.getElementById('image-placeholder');
  const hiddenInput = document.getElementById('input-image-data');
  const removeBtn = document.getElementById('btn-remove-image');
  const fileInput = document.getElementById('input-file-image');

  preview.src = '';
  preview.style.display = 'none';
  placeholder.style.display = 'flex';
  hiddenInput.value = '';
  removeBtn.style.display = 'none';
  fileInput.value = '';
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Vui lòng chỉ chọn tệp hình ảnh!', 'error');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast('Kích thước ảnh không vượt quá 2MB!', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    setImagePreview(evt.target.result);
  };
  reader.readAsDataURL(file);
}

// ==========================================================================
// Render Bảng Danh Mục Sản Phẩm Chuẩn Hóa
// ==========================================================================
function renderTable() {
  const tbody = document.getElementById('product-tbody');
  const emptyState = document.getElementById('empty-state');
  const table = document.getElementById('product-table');
  const isManager = currentUserRole === 'manager';

  const filtered = products.filter(p => {
    const matchSearch = !currentFilter.search || 
      p.sku.toLowerCase().includes(currentFilter.search) || 
      p.name.toLowerCase().includes(currentFilter.search);

    const matchCategory = !currentFilter.category || p.category === currentFilter.category;
    const matchStatus = !currentFilter.status || p.status === currentFilter.status;

    let matchTx = true;
    if (currentFilter.tx === 'has_tx') matchTx = p.hasTransactions === true;
    if (currentFilter.tx === 'no_tx') matchTx = !p.hasTransactions;

    return matchSearch && matchCategory && matchStatus && matchTx;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';

  tbody.innerHTML = filtered.map(product => {
    const isBusiness = product.status === 'Đang kinh doanh';
    const statusClass = isBusiness ? 'active' : 'inactive';
    const defaultImg = PRESET_IMAGES[0].data;

    // QUY TẮC 2: Giá vốn chỉ Quản lý kinh doanh xem được
    const priceDisplay = isManager 
      ? `<span class="price-text">${formatCurrency(product.costPrice)}</span>`
      : `<span class="price-masked" title="Chỉ Quản lý kinh doanh mới có quyền xem giá vốn">🔒 Bảo mật (Chỉ QLKD)</span>`;

    // QUY TẮC 3: Sản phẩm đã phát sinh giao dịch thì không xoá được
    const txBadge = product.hasTransactions
      ? `<span class="badge-tx has-tx" title="Đã có giao dịch đơn hàng/kho - Không thể xóa, chỉ ngừng kinh doanh">📦 Đã có giao dịch</span>`
      : `<span class="badge-tx no-tx" title="Chưa có giao dịch - Có thể xóa">Chưa có GD</span>`;

    const deleteTooltip = product.hasTransactions
      ? `Sản phẩm đã có giao dịch - Không thể xóa, chỉ ngừng KD`
      : `Xóa sản phẩm khỏi danh mục`;

    return `
      <tr data-id="${product.id}">
        <td>
          <img src="${product.image || defaultImg}" alt="${escapeHtml(product.name)}" class="product-img-thumb" loading="lazy">
        </td>
        <td>
          <span class="sku-badge" title="Mã SKU duy nhất">${escapeHtml(product.sku)}</span>
        </td>
        <td>
          <div class="product-name-cell" title="${escapeHtml(product.name)}">
            ${escapeHtml(product.name)}
          </div>
        </td>
        <td>
          <span class="category-tag">${escapeHtml(product.category)}</span>
        </td>
        <td>
          <span class="uom-tag">${escapeHtml(product.baseUom)}</span>
        </td>
        <td>
          <span class="packaging-text">${escapeHtml(product.packaging)}</span>
        </td>
        <td style="text-align: right;">
          ${priceDisplay}
        </td>
        <td style="text-align: center;">
          <span class="status-pill ${statusClass}">${escapeHtml(product.status)}</span>
        </td>
        <td style="text-align: center;">
          ${txBadge}
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action action-view" onclick="viewProductDetail('${product.id}')" title="Xem chi tiết chuẩn hóa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="btn-action action-edit" onclick="openModalForEdit('${product.id}')" title="Chỉnh sửa khai báo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-action action-delete ${product.hasTransactions ? 'is-blocked' : ''}" onclick="handleDeleteRequest('${product.id}')" title="${deleteTooltip}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// Thống kê & Bộ lọc Nhóm hàng
// ==========================================================================
function updateStats() {
  const total = products.length;
  const active = products.filter(p => p.status === 'Đang kinh doanh').length;
  const inactive = products.filter(p => p.status === 'Ngừng kinh doanh').length;
  const hasTxCount = products.filter(p => p.hasTransactions === true).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-inactive').textContent = inactive;
  document.getElementById('stat-has-tx').textContent = hasTxCount;
}

function updateCategoryFilterDropdown() {
  const select = document.getElementById('filter-category');
  const currentVal = select.value;
  const categories = Array.from(new Set(products.map(p => p.category.trim()).filter(Boolean))).sort();

  select.innerHTML = '<option value="">Tất cả nhóm hàng</option>' +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  if (categories.includes(currentVal)) {
    select.value = currentVal;
  }
}

// ==========================================================================
// Quản lý Modal Thêm / Chỉnh Sửa
// ==========================================================================
function openModalForCreate() {
  clearErrors();
  const isManager = currentUserRole === 'manager';

  document.getElementById('modal-title').textContent = 'Khai Báo Sản Phẩm Mới';
  document.getElementById('form-product-id').value = '';
  document.getElementById('input-sku').value = '';
  document.getElementById('input-name').value = '';
  document.getElementById('input-category').value = '';
  document.getElementById('input-base-uom').value = '';
  document.getElementById('input-packaging').value = '';
  document.getElementById('input-has-transactions').checked = false;

  // QUY TẮC 2: Phân quyền Giá vốn khi tạo mới
  const inputCost = document.getElementById('input-cost-price');
  const costContainer = document.getElementById('cost-input-container');
  const costLockedMsg = document.getElementById('cost-price-locked-msg');
  const costPreview = document.getElementById('cost-price-preview');

  if (isManager) {
    inputCost.disabled = false;
    inputCost.value = '';
    costContainer.style.display = 'flex';
    costLockedMsg.style.display = 'none';
    costPreview.style.display = 'block';
    costPreview.textContent = '0 VNĐ';
  } else {
    // Nhân viên kinh doanh: không được xem hoặc sửa giá vốn
    inputCost.disabled = true;
    inputCost.value = 0;
    costContainer.style.display = 'none';
    costLockedMsg.style.display = 'block';
    costPreview.style.display = 'none';
  }

  // Mặc định chọn Đang kinh doanh
  document.querySelector('input[name="input-status"][value="Đang kinh doanh"]').checked = true;
  clearImagePreview();

  const modal = document.getElementById('product-modal');
  modal.classList.add('is-open');
  setTimeout(() => document.getElementById('input-sku').focus(), 150);
}

function openModalForEdit(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  clearErrors();
  const isManager = currentUserRole === 'manager';

  document.getElementById('modal-title').textContent = 'Chỉnh Sửa Thông Tin Sản Phẩm';
  document.getElementById('form-product-id').value = product.id;
  document.getElementById('input-sku').value = product.sku;
  document.getElementById('input-name').value = product.name;
  document.getElementById('input-category').value = product.category;
  document.getElementById('input-base-uom').value = product.baseUom;
  document.getElementById('input-packaging').value = product.packaging;
  document.getElementById('input-has-transactions').checked = !!product.hasTransactions;

  // QUY TẮC 2: Phân quyền Giá vốn khi chỉnh sửa
  const inputCost = document.getElementById('input-cost-price');
  const costContainer = document.getElementById('cost-input-container');
  const costLockedMsg = document.getElementById('cost-price-locked-msg');
  const costPreview = document.getElementById('cost-price-preview');

  if (isManager) {
    inputCost.disabled = false;
    inputCost.value = product.costPrice;
    costContainer.style.display = 'flex';
    costLockedMsg.style.display = 'none';
    costPreview.style.display = 'block';
    costPreview.textContent = formatCurrency(product.costPrice);
  } else {
    // Nhân viên không được xem hay sửa giá vốn
    inputCost.disabled = true;
    inputCost.value = product.costPrice; // Lưu ngầm giá trị để khi nhân viên lưu các trường khác không bị mất giá vốn cũ
    costContainer.style.display = 'none';
    costLockedMsg.style.display = 'block';
    costPreview.style.display = 'none';
  }

  const statusRadio = document.querySelector(`input[name="input-status"][value="${product.status}"]`);
  if (statusRadio) statusRadio.checked = true;

  setImagePreview(product.image || '');

  const modal = document.getElementById('product-modal');
  modal.classList.add('is-open');
  setTimeout(() => document.getElementById('input-name').focus(), 150);
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.remove('is-open');
  clearErrors();
}

function clearErrors() {
  ['sku', 'name', 'category', 'base-uom', 'packaging', 'cost-price'].forEach(field => {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) errorEl.textContent = '';
    const inputEl = document.getElementById(`input-${field}`);
    if (inputEl) inputEl.classList.remove('is-invalid');
  });
}

function setFieldError(field, message) {
  const errorEl = document.getElementById(`error-${field}`);
  if (errorEl) errorEl.textContent = message;
  const inputEl = document.getElementById(`input-${field}`);
  if (inputEl) inputEl.classList.add('is-invalid');
}

// ==========================================================================
// Xử lý Lưu Khai Báo (Submit Form)
// ==========================================================================
function handleFormSubmit(e) {
  e.preventDefault();
  clearErrors();

  const id = document.getElementById('form-product-id').value;
  const sku = sanitizeSku(document.getElementById('input-sku').value.trim());
  const name = document.getElementById('input-name').value.trim();
  const category = document.getElementById('input-category').value.trim();
  const baseUom = document.getElementById('input-base-uom').value.trim();
  const packaging = document.getElementById('input-packaging').value.trim();
  const costPriceVal = document.getElementById('input-cost-price').value;
  const image = document.getElementById('input-image-data').value || (PRESET_IMAGES[0].data);
  const statusRadio = document.querySelector('input[name="input-status"]:checked');
  const status = statusRadio ? statusRadio.value : 'Đang kinh doanh';
  const hasTransactions = document.getElementById('input-has-transactions').checked;

  let hasError = false;

  // QUY TẮC 1: Validate Mã SKU là DUY NHẤT
  if (!sku) {
    setFieldError('sku', 'Vui lòng nhập Mã SKU định danh');
    hasError = true;
  } else {
    const isDuplicate = products.some(p => p.sku.toUpperCase() === sku.toUpperCase() && p.id !== id);
    if (isDuplicate) {
      setFieldError('sku', `Mã SKU "${sku}" đã tồn tại! Mã SKU bắt buộc phải là DUY NHẤT trên toàn hệ thống.`);
      hasError = true;
    }
  }

  // 2. Validate Tên sản phẩm
  if (!name) {
    setFieldError('name', 'Vui lòng nhập Tên sản phẩm chuẩn mực');
    hasError = true;
  }

  // 3. Validate Nhóm hàng
  if (!category) {
    setFieldError('category', 'Vui lòng chọn hoặc nhập Nhóm hàng');
    hasError = true;
  }

  // 4. Validate Đơn vị tính cơ sở
  if (!baseUom) {
    setFieldError('base-uom', 'Vui lòng nhập Đơn vị tính cơ sở (Lon, Chai, Hộp...)');
    hasError = true;
  }

  // 5. Validate Quy cách đóng gói
  if (!packaging) {
    setFieldError('packaging', 'Vui lòng nhập Quy cách đóng gói (Thùng 24 lon...)');
    hasError = true;
  }

  // QUY TẮC 2: Validate Giá vốn
  // Nếu là Quản lý: kiểm tra nhập giá vốn hợp lệ
  // Nếu là Nhân viên: nếu tạo mới, không cho phép khai báo giá vốn (hoặc bắt buộc Quản lý duyệt); nếu sửa: giữ nguyên giá vốn cũ
  let costPrice = 0;
  if (currentUserRole === 'manager') {
    if (costPriceVal === '' || isNaN(costPriceVal)) {
      setFieldError('cost-price', 'Vui lòng nhập Giá vốn');
      hasError = true;
    } else if (parseFloat(costPriceVal) < 0) {
      setFieldError('cost-price', 'Giá vốn không thể là số âm');
      hasError = true;
    } else {
      costPrice = Math.round(parseFloat(costPriceVal));
    }
  } else {
    // Vai trò Nhân viên
    if (!id) {
      // Nhân viên không được tự ý đặt giá vốn khi tạo mới
      costPrice = 0;
    } else {
      // Giữ nguyên giá vốn cũ đã được Quản lý thiết lập
      const existing = products.find(p => p.id === id);
      costPrice = existing ? existing.costPrice : 0;
    }
  }

  if (hasError) return;

  if (id) {
    // Chỉnh sửa sản phẩm hiện tại
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        sku,
        name,
        category,
        baseUom,
        packaging,
        costPrice,
        image,
        status,
        hasTransactions,
        updatedAt: Date.now()
      };
      saveProducts();
      showToast(`Đã cập nhật sản phẩm [${sku}] thành công!`, 'success');
    }
  } else {
    // Thêm mới sản phẩm
    const newProduct = {
      id: 'prod_' + Date.now(),
      sku,
      name,
      category,
      baseUom,
      packaging,
      costPrice,
      image,
      status,
      hasTransactions,
      createdAt: Date.now()
    };
    products.unshift(newProduct);
    saveProducts();
    showToast(`Đã khai báo mã SKU "${sku}" duy nhất thành công!`, 'success');
  }

  closeModal();
  renderTable();
  updateStats();
  updateCategoryFilterDropdown();
}

// ==========================================================================
// QUY TẮC 3: Sản phẩm đã phát sinh giao dịch thì KHÔNG XOÁ ĐƯỢC, CHỈ NGỪNG KINH DOANH
// ==========================================================================
function handleDeleteRequest(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (product.hasTransactions) {
    // CHẶN XÓA: Sản phẩm đã có giao dịch -> Hiện modal cảnh báo nghiêm ngặt
    openBlockedDeleteModal(product);
  } else {
    // Sản phẩm chưa có giao dịch nào -> Cho phép xóa sau khi xác nhận
    const confirmed = confirm(
      `XÁC NHẬN XÓA SẢN PHẨM (CHƯA PHÁT SINH GIAO DỊCH):\n\n` +
      `• Mã SKU: ${product.sku}\n` +
      `• Tên: ${product.name}\n\n` +
      `Sản phẩm này chưa phát sinh giao dịch nào trong hệ thống. Bạn có chắc chắn muốn xóa không?`
    );

    if (confirmed) {
      products = products.filter(p => p.id !== id);
      saveProducts();
      renderTable();
      updateStats();
      updateCategoryFilterDropdown();
      showToast(`Đã xóa sản phẩm ${product.sku} khỏi danh mục.`, 'info');
    }
  }
}

function openBlockedDeleteModal(product) {
  pendingBlockedProduct = product;
  document.getElementById('blocked-product-name').textContent = product.name;
  document.getElementById('blocked-product-sku').textContent = product.sku;

  const modal = document.getElementById('blocked-delete-modal');
  modal.classList.add('is-open');
}

function closeBlockedModal() {
  const modal = document.getElementById('blocked-delete-modal');
  modal.classList.remove('is-open');
  pendingBlockedProduct = null;
}

function handleStopBusinessFromModal() {
  if (!pendingBlockedProduct) return;

  const index = products.findIndex(p => p.id === pendingBlockedProduct.id);
  if (index !== -1) {
    products[index].status = 'Ngừng kinh doanh';
    products[index].updatedAt = Date.now();
    saveProducts();

    showToast(`Đã chuyển sản phẩm [${pendingBlockedProduct.sku}] sang trạng thái "Ngừng kinh doanh" thành công!`, 'success');
    closeBlockedModal();
    renderTable();
    updateStats();
  }
}

// ==========================================================================
// Xem Chi Tiết Chuẩn Hóa
// ==========================================================================
function viewProductDetail(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  currentViewingProduct = product;
  const content = document.getElementById('detail-content');
  const isBusiness = product.status === 'Đang kinh doanh';
  const statusClass = isBusiness ? 'active' : 'inactive';
  const defaultImg = PRESET_IMAGES[0].data;
  const isManager = currentUserRole === 'manager';

  // QUY TẮC 2: Hiển thị giá vốn theo vai trò
  const costDetail = isManager
    ? `<span class="detail-value" style="color: #0284c7; font-size: 16px;">${formatCurrency(product.costPrice)}</span>`
    : `<span class="detail-value" style="color: #d97706; font-size: 13px;">🔒 Bảo mật (Chỉ Quản lý kinh doanh được xem)</span>`;

  // QUY TẮC 3: Hiển thị lịch sử giao dịch
  const txStatusDetail = product.hasTransactions
    ? `<span style="color: #9333ea; font-weight: 700;">📦 Đã phát sinh giao dịch (Không thể xóa - Chỉ ngừng kinh doanh)</span>`
    : `<span style="color: #64748b; font-weight: 600;">Chưa phát sinh giao dịch nào</span>`;

  content.innerHTML = `
    <div class="detail-card">
      <div class="detail-header-block">
        <img src="${product.image || defaultImg}" alt="${escapeHtml(product.name)}" class="detail-img">
        <div class="detail-title-group">
          <span class="sku-badge" style="font-size: 13px;">${escapeHtml(product.sku)}</span>
          <h3 style="margin-top: 6px;">${escapeHtml(product.name)}</h3>
          <span class="status-pill ${statusClass}">${escapeHtml(product.status)}</span>
        </div>
      </div>

      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Nhóm hàng</span>
          <span class="detail-value">${escapeHtml(product.category)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Đơn vị tính cơ sở (ĐVT)</span>
          <span class="detail-value">${escapeHtml(product.baseUom)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Quy cách đóng gói</span>
          <span class="detail-value">${escapeHtml(product.packaging)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Giá vốn chuẩn hóa</span>
          ${costDetail}
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <span class="detail-label">Tình trạng giao dịch</span>
          ${txStatusDetail}
        </div>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid var(--border-light); font-size: 12.5px; color: #475569;">
        <strong>📌 Chuẩn mực báo giá toàn công ty:</strong><br>
        <code style="display: block; margin-top: 6px; padding: 6px 10px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: 700; color: #1e3a8a;">[${product.sku}] ${product.name}</code>
      </div>
    </div>
  `;

  document.getElementById('detail-modal').classList.add('is-open');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('is-open');
  currentViewingProduct = null;
}

// Sao chép tên chuẩn vào clipboard
document.getElementById('btn-copy-standard').addEventListener('click', () => {
  if (!currentViewingProduct) return;
  const standardText = `[${currentViewingProduct.sku}] ${currentViewingProduct.name} - ĐVT: ${currentViewingProduct.baseUom} (Quy cách: ${currentViewingProduct.packaging})`;
  navigator.clipboard.writeText(standardText).then(() => {
    showToast('Đã sao chép mã và tên chuẩn hóa vào bộ nhớ tạm!', 'success');
  }).catch(() => {
    showToast('Không thể sao chép tự động, vui lòng chọn văn bản thủ công', 'error');
  });
});

// ==========================================================================
// Tiện ích (Utilities)
// ==========================================================================
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 VNĐ';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
}

function sanitizeSku(str) {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
    .replace(/[^A-Z0-9\-_]/g, '-');  // Ký tự hợp lệ
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', initApp);
