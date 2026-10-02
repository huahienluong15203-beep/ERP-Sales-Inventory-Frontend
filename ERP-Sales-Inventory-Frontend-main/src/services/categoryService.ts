import type { CategoryNode, CategoryProductItem } from '../types/product';

const CATEGORY_STORAGE_KEY = 'erp_categories_tree_s2_06_v2';

// Cây nhóm hàng 3 cấp mẫu ban đầu chuẩn hóa theo ngành FMCG
// Đáp ứng S2-06: "quản lý nhóm hàng nhiều cấp, để xem được doanh số theo ngành hàng chứ không chỉ theo từng mã"
export const INITIAL_CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'cat-drink',
    code: 'NGH-DOUONG',
    name: 'Đồ uống & Nước giải khát',
    level: 1,
    productCount: 4,
    revenue: 0, // Sẽ được tính tự động từ tổng các nhóm con
    expanded: true,
    description: 'Ngành hàng bia, rượu, nước giải khát đóng chai và lon',
    children: [
      {
        id: 'sub-beer',
        code: 'NHOM-BIA',
        name: 'Bia các loại',
        level: 2,
        parentId: 'cat-drink',
        productCount: 2,
        revenue: 0,
        expanded: true,
        description: 'Bia lon, bia chai và bia tươi các thương hiệu',
        children: [
          {
            id: 'seg-beer-can',
            code: 'PHAN-BIA-LON',
            name: 'Bia lon cao cấp (330ml - 500ml)',
            level: 3,
            parentId: 'sub-beer',
            productCount: 2,
            revenue: 845000000, // 845 triệu đồng
            expanded: false,
            description: 'Bia Sài Gòn Special, Heineken, Tiger...',
            products: [
              {
                id: 'prod-001',
                sku: 'BEER-SGS-330',
                name: 'Bia Sài Gòn Special Lon 330ml',
                basePrice: 15000,
                revenue: 520000000
              },
              {
                id: 'prod-001b',
                sku: 'BEER-TIG-330',
                name: 'Bia Tiger Crystal Lon 330ml',
                basePrice: 18500,
                revenue: 325000000
              }
            ]
          },
          {
            id: 'seg-beer-btl',
            code: 'PHAN-BIA-CHAI',
            name: 'Bia chai truyền thống (330ml - 450ml)',
            level: 3,
            parentId: 'sub-beer',
            productCount: 0,
            revenue: 0,
            expanded: false,
            description: 'Bia Sài Gòn Export chai, Tiger chai...',
            products: []
          }
        ]
      },
      {
        id: 'sub-softdrink',
        code: 'NHOM-NGK',
        name: 'Nước ngọt & Có gas',
        level: 2,
        parentId: 'cat-drink',
        productCount: 1,
        revenue: 0,
        expanded: true,
        description: 'Nước ngọt có gas các vị',
        children: [
          {
            id: 'seg-cola',
            code: 'PHAN-COLA',
            name: 'Dòng sản phẩm Cola & Vị nguyên bản',
            level: 3,
            parentId: 'sub-softdrink',
            productCount: 1,
            revenue: 412000000, // 412 triệu đồng
            expanded: false,
            description: 'Coca-Cola, Pepsi các quy cách lon và chai',
            products: [
              {
                id: 'prod-002',
                sku: 'COCA-CAN-320',
                name: 'Nước ngọt Coca-Cola Vị Nguyên Bản Lon 320ml',
                basePrice: 10000,
                revenue: 412000000
              }
            ]
          },
          {
            id: 'seg-citrus',
            code: 'PHAN-CHANH-FRUIT',
            name: 'Dòng hương chanh & Cam trái cây',
            level: 3,
            parentId: 'sub-softdrink',
            productCount: 0,
            revenue: 0,
            expanded: false,
            description: 'Sprite, 7Up, Mirinda cam...',
            products: []
          }
        ]
      },
      {
        id: 'sub-water-tea',
        code: 'NHOM-NUOC-TRA',
        name: 'Nước khoáng & Trà đóng chai',
        level: 2,
        parentId: 'cat-drink',
        productCount: 1,
        revenue: 0,
        expanded: false,
        description: 'Nước khoáng thiên nhiên, nước tinh khiết, trà xanh',
        children: [
          {
            id: 'seg-water-purified',
            code: 'PHAN-NUOC-KHOANG',
            name: 'Nước tinh khiết chai 350ml - 1.5L',
            level: 3,
            parentId: 'sub-water-tea',
            productCount: 1,
            revenue: 198000000, // 198 triệu đồng
            expanded: false,
            description: 'Aquafina, Lavie, Dasani...',
            products: [
              {
                id: 'prod-005',
                sku: 'WATER-AQF-500',
                name: 'Nước Tinh Khiết Aquafina Chai 500ml',
                basePrice: 6000,
                revenue: 198000000
              }
            ]
          },
          {
            id: 'seg-tea-bottle',
            code: 'PHAN-TRA-CHAI',
            name: 'Trà xanh & Trà ô long đóng chai',
            level: 3,
            parentId: 'sub-water-tea',
            productCount: 0,
            revenue: 0,
            expanded: false,
            description: 'C2 Chanh, Không Độ, Tea+...',
            products: []
          }
        ]
      }
    ]
  },
  {
    id: 'cat-food',
    code: 'NGH-THUCPHAM',
    name: 'Thực phẩm chế biến & Đồ khô',
    level: 1,
    productCount: 2,
    revenue: 0,
    expanded: true,
    description: 'Thực phẩm ăn liền, gia vị nhà bếp và đồ khô',
    children: [
      {
        id: 'sub-noodles',
        code: 'NHOM-MI-PHO',
        name: 'Mì, Phở & Miến ăn liền',
        level: 2,
        parentId: 'cat-food',
        productCount: 1,
        revenue: 0,
        expanded: true,
        description: 'Các sản phẩm ăn liền dạng gói và dạng ly',
        children: [
          {
            id: 'seg-noodle-pack',
            code: 'PHAN-MI-GOI',
            name: 'Mì gói truyền thống (65g - 85g)',
            level: 3,
            parentId: 'sub-noodles',
            productCount: 1,
            revenue: 685000000, // 685 triệu đồng
            expanded: false,
            description: 'Hảo Hảo, Omachi, 3 Miền, Kokomi...',
            products: [
              {
                id: 'prod-003',
                sku: 'NOODLE-HH-TOM',
                name: 'Mì Ăn Liền Hảo Hảo Tôm Chua Cay Gói 75g',
                basePrice: 4500,
                revenue: 685000000
              }
            ]
          },
          {
            id: 'seg-noodle-bowl',
            code: 'PHAN-MI-LY',
            name: 'Mì ly & Mì tô cao cấp',
            level: 3,
            parentId: 'sub-noodles',
            productCount: 0,
            revenue: 0,
            expanded: false,
            description: 'Omachi tô bắp bò, Hảo Hảo ly Handy...',
            products: []
          }
        ]
      },
      {
        id: 'sub-spices-oil',
        code: 'NHOM-GIAVI-DAU',
        name: 'Gia vị & Dầu thực vật',
        level: 2,
        parentId: 'cat-food',
        productCount: 1,
        revenue: 0,
        expanded: false,
        description: 'Dầu ăn chai, nước mắm, hạt nêm các loại',
        children: [
          {
            id: 'seg-oil-bottle',
            code: 'PHAN-DAU-AN',
            name: 'Dầu ăn chai 1L - 5L',
            level: 3,
            parentId: 'sub-spices-oil',
            productCount: 1,
            revenue: 345000000, // 345 triệu đồng
            expanded: false,
            description: 'Tường An, Simply, Neptune...',
            products: [
              {
                id: 'prod-006',
                sku: 'OIL-TUONGAN-1L',
                name: 'Dầu Ăn Tường An Cooking Oil Chai 1L',
                basePrice: 42000,
                revenue: 345000000
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'cat-dairy',
    code: 'NGH-SUA',
    name: 'Sữa & Sản phẩm từ sữa',
    level: 1,
    productCount: 1,
    revenue: 0,
    expanded: false,
    description: 'Sữa tươi tiệt trùng, sữa chua uống và sữa đặc',
    children: [
      {
        id: 'sub-fresh-milk',
        code: 'NHOM-SUA-TUOI',
        name: 'Sữa tươi tiệt trùng',
        level: 2,
        parentId: 'cat-dairy',
        productCount: 1,
        revenue: 0,
        expanded: false,
        description: 'Sữa tươi hộp giấy 110ml, 180ml, 1L',
        children: [
          {
            id: 'seg-milk-180ml',
            code: 'PHAN-SUA-180',
            name: 'Sữa tiệt trùng hộp 180ml',
            level: 3,
            parentId: 'sub-fresh-milk',
            productCount: 1,
            revenue: 530000000, // 530 triệu đồng
            expanded: false,
            description: 'Vinamilk, TH True Milk 180ml...',
            products: [
              {
                id: 'prod-004',
                sku: 'MILK-VNM-180',
                name: 'Sữa Tươi Tiệt Trùng Vinamilk Có Đường 180ml',
                basePrice: 8500,
                revenue: 530000000
              }
            ]
          }
        ]
      }
    ]
  }
];

// Lấy cây nhóm hàng từ localStorage hoặc mặc định
export function getCategoryTree(): CategoryNode[] {
  const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORY_TREE));
    return INITIAL_CATEGORY_TREE;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_CATEGORY_TREE;
  }
}

// Lưu cây nhóm hàng vào localStorage
export function saveCategoryTree(tree: CategoryNode[]): void {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(tree));
}

/**
 * Tính tổng doanh số của một node (Bao gồm doanh số trực tiếp + toàn bộ doanh số của các nhánh con cháu)
 * S2-06: "để xem được doanh số theo ngành hàng chứ không chỉ theo từng mã"
 */
export function getTotalDescendantRevenue(node: CategoryNode): number {
  let total = node.revenue || 0;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      total += getTotalDescendantRevenue(child);
    }
  }
  return total;
}

/**
 * Tính tổng số lượng sản phẩm của một node bao gồm toàn bộ con cháu (descendants)
 */
export function getTotalDescendantProducts(node: CategoryNode): number {
  let count = (node.products ? node.products.length : node.productCount) || 0;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      count += getTotalDescendantProducts(child);
    }
  }
  return count;
}

// Tìm kiếm node theo ID trong cây
export function findCategoryNode(tree: CategoryNode[], id: string): CategoryNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findCategoryNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Kiểm tra xem `possibleAncestorId` có phải là tổ tiên của `nodeId` không (để tránh kéo cha vào con)
export function isAncestor(tree: CategoryNode[], possibleAncestorId: string, nodeId: string): boolean {
  if (possibleAncestorId === nodeId) return true;
  const ancestor = findCategoryNode(tree, possibleAncestorId);
  if (!ancestor || !ancestor.children) return false;

  for (const child of ancestor.children) {
    if (child.id === nodeId || isAncestor([child], child.id, nodeId)) {
      return true;
    }
  }
  return false;
}

// Xóa node khỏi cây (trả về node đã bị tách ra)
function removeNodeFromTree(tree: CategoryNode[], id: string): { newTree: CategoryNode[]; removedNode: CategoryNode | null } {
  let removed: CategoryNode | null = null;

  function filterTree(nodes: CategoryNode[]): CategoryNode[] {
    const result: CategoryNode[] = [];
    for (const node of nodes) {
      if (node.id === id) {
        removed = node;
      } else {
        const copy = { ...node };
        if (copy.children && copy.children.length > 0) {
          copy.children = filterTree(copy.children);
        }
        result.push(copy);
      }
    }
    return result;
  }

  const newTree = filterTree(tree);
  return { newTree, removedNode: removed };
}

// Cập nhật lại level cho node và toàn bộ con cháu sau khi di chuyển
function recalculateLevels(node: CategoryNode, newLevel: number, newParentId?: string | null): CategoryNode {
  return {
    ...node,
    level: newLevel,
    parentId: newParentId,
    children: node.children
      ? node.children.map((child) => recalculateLevels(child, newLevel + 1, node.id))
      : []
  };
}

/**
 * Xử lý KÉO THẢ (Drag & Drop) di chuyển node trong cây
 */
export function moveCategoryNode(
  tree: CategoryNode[],
  draggedId: string,
  targetId: string,
  position: 'inside' | 'before' | 'after'
): { success: boolean; message: string; newTree?: CategoryNode[] } {
  if (draggedId === targetId) {
    return { success: false, message: 'Không thể kéo thả vào chính nó!' };
  }

  // Chặn kéo node cha vào node con của chính nó
  if (isAncestor(tree, draggedId, targetId)) {
    return {
      success: false,
      message: 'Không thể di chuyển một nhóm cha vào bên trong nhóm con của chính nó!'
    };
  }

  // Tách node bị kéo ra khỏi cây
  const { newTree: treeWithoutDragged, removedNode } = removeNodeFromTree(tree, draggedId);
  if (!removedNode) {
    return { success: false, message: 'Không tìm thấy nhóm hàng bị kéo!' };
  }

  if (position === 'inside') {
    // Thêm removedNode vào làm con của targetId
    let placed = false;
    function insertInside(nodes: CategoryNode[]): CategoryNode[] {
      return nodes.map((node) => {
        if (node.id === targetId) {
          placed = true;
          const updatedNodeToInsert = recalculateLevels(removedNode!, node.level + 1, node.id);
          const currentChildren = node.children || [];
          return {
            ...node,
            expanded: true,
            children: [...currentChildren, updatedNodeToInsert]
          };
        }
        if (node.children && node.children.length > 0) {
          return { ...node, children: insertInside(node.children) };
        }
        return node;
      });
    }

    const updatedTree = insertInside(treeWithoutDragged);
    if (placed) {
      saveCategoryTree(updatedTree);
      return { success: true, message: `Đã chuyển nhóm [${removedNode.name}] vào làm nhóm con thành công!`, newTree: updatedTree };
    }
  } else {
    // Sắp xếp trước hoặc sau targetId
    let placed = false;
    function insertRelative(nodes: CategoryNode[], parentLevel: number, parentId: string | null): CategoryNode[] {
      const res: CategoryNode[] = [];
      for (const node of nodes) {
        if (node.id === targetId) {
          placed = true;
          const updatedNodeToInsert = recalculateLevels(removedNode!, node.level, parentId);
          if (position === 'before') {
            res.push(updatedNodeToInsert);
            res.push(node);
          } else {
            res.push(node);
            res.push(updatedNodeToInsert);
          }
        } else {
          const copy = { ...node };
          if (copy.children && copy.children.length > 0) {
            copy.children = insertRelative(copy.children, copy.level, copy.id);
          }
          res.push(copy);
        }
      }
      return res;
    }

    const updatedTree = insertRelative(treeWithoutDragged, 1, null);
    if (placed) {
      saveCategoryTree(updatedTree);
      return { success: true, message: `Đã sắp xếp lại vị trí nhóm [${removedNode.name}] thành công!`, newTree: updatedTree };
    }
  }

  return { success: false, message: 'Không thể di chuyển nhóm hàng!' };
}

/**
 * Thêm nhóm hàng mới
 */
export function addCategoryNode(
  tree: CategoryNode[],
  parentId: string | null,
  name: string,
  code: string,
  description?: string
): { success: boolean; message: string; newTree?: CategoryNode[] } {
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();

  if (!cleanName) return { success: false, message: 'Tên nhóm hàng là bắt buộc!' };
  if (!cleanCode) return { success: false, message: 'Mã nhóm hàng là bắt buộc!' };

  const newNode: CategoryNode = {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: cleanCode,
    name: cleanName,
    level: 1,
    parentId,
    productCount: 0,
    revenue: 0,
    expanded: true,
    description: description?.trim() || '',
    children: [],
    products: []
  };

  if (!parentId) {
    const updatedTree = [...tree, newNode];
    saveCategoryTree(updatedTree);
    return { success: true, message: `Đã thêm ngành hàng gốc [${cleanName}] thành công!`, newTree: updatedTree };
  }

  function insertChild(nodes: CategoryNode[]): CategoryNode[] {
    return nodes.map((node) => {
      if (node.id === parentId) {
        newNode.level = node.level + 1;
        return {
          ...node,
          expanded: true,
          children: [...(node.children || []), newNode]
        };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: insertChild(node.children) };
      }
      return node;
    });
  }

  const updatedTree = insertChild(tree);
  saveCategoryTree(updatedTree);
  return { success: true, message: `Đã thêm nhóm con [${cleanName}] thành công!`, newTree: updatedTree };
}

/**
 * Chỉnh sửa tên, mã, mô tả nhóm hàng
 */
export function updateCategoryNode(
  tree: CategoryNode[],
  id: string,
  name: string,
  code: string,
  description?: string
): { success: boolean; message: string; newTree?: CategoryNode[] } {
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();

  if (!cleanName) return { success: false, message: 'Tên nhóm hàng không được để trống!' };
  if (!cleanCode) return { success: false, message: 'Mã nhóm hàng không được để trống!' };

  function updateInNodes(nodes: CategoryNode[]): CategoryNode[] {
    return nodes.map((node) => {
      if (node.id === id) {
        return {
          ...node,
          name: cleanName,
          code: cleanCode,
          description: description !== undefined ? description.trim() : node.description
        };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: updateInNodes(node.children) };
      }
      return node;
    });
  }

  const updatedTree = updateInNodes(tree);
  saveCategoryTree(updatedTree);
  return { success: true, message: `Cập nhật thông tin nhóm [${cleanName}] thành công!`, newTree: updatedTree };
}

/**
 * Xóa nhóm hàng:
 * Tuân thủ quy tắc nghiệp vụ S2-06: "Nhóm còn sản phẩm thì KHÔNG XOÁ ĐƯỢC"
 */
export function deleteCategoryNode(
  tree: CategoryNode[],
  id: string
): { success: boolean; message: string; newTree?: CategoryNode[] } {
  const node = findCategoryNode(tree, id);
  if (!node) {
    return { success: false, message: 'Không tìm thấy nhóm hàng cần xoá!' };
  }

  // Kiểm tra số lượng sản phẩm trực thuộc hoặc con cháu
  const totalProducts = getTotalDescendantProducts(node);
  if (totalProducts > 0) {
    return {
      success: false,
      message: `Nhóm hàng [${node.name}] hiện đang có ${totalProducts} sản phẩm/SKU liên kết. Theo quy tắc nghiệp vụ S2-06: "Nhóm còn sản phẩm thì KHÔNG XOÁ ĐƯỢC"! Vui lòng chuyển các sản phẩm sang nhóm khác trước.`
    };
  }

  // Kiểm tra nếu có nhóm con
  if (node.children && node.children.length > 0) {
    return {
      success: false,
      message: `Nhóm hàng [${node.name}] có chứa ${node.children.length} nhóm cấp dưới. Vui lòng xoá hoặc di chuyển các nhóm con trước khi xoá nhóm cha này.`
    };
  }

  const { newTree } = removeNodeFromTree(tree, id);
  saveCategoryTree(newTree);
  return { success: true, message: `Đã xoá nhóm hàng [${node.name}] thành công!`, newTree };
}

/**
 * Chuyển một sản phẩm (SKU) cụ thể sang nhóm khác (S2-06: "Chuyển sản phẩm giữa các nhóm được")
 */
export function transferProductToCategory(
  tree: CategoryNode[],
  productId: string,
  sourceCatId: string,
  targetCatId: string
): { success: boolean; message: string; newTree?: CategoryNode[] } {
  const source = findCategoryNode(tree, sourceCatId);
  const target = findCategoryNode(tree, targetCatId);

  if (!source || !target) {
    return { success: false, message: 'Không tìm thấy nhóm nguồn hoặc nhóm đích!' };
  }

  const prodIndex = (source.products || []).findIndex((p) => p.id === productId);
  if (prodIndex < 0) {
    return { success: false, message: 'Không tìm thấy sản phẩm trong nhóm nguồn!' };
  }

  const productToMove = source.products![prodIndex];

  function applyMove(nodes: CategoryNode[]): CategoryNode[] {
    return nodes.map((node) => {
      let copy = { ...node };
      if (node.id === sourceCatId) {
        const updatedProds = (node.products || []).filter((p) => p.id !== productId);
        copy.products = updatedProds;
        copy.productCount = updatedProds.length;
        copy.revenue = Math.max(0, (copy.revenue || 0) - productToMove.revenue);
      }
      if (node.id === targetCatId) {
        const updatedProds = [...(node.products || []), productToMove];
        copy.products = updatedProds;
        copy.productCount = updatedProds.length;
        copy.revenue = (copy.revenue || 0) + productToMove.revenue;
      }
      if (copy.children && copy.children.length > 0) {
        copy.children = applyMove(copy.children);
      }
      return copy;
    });
  }

  const updatedTree = applyMove(tree);
  saveCategoryTree(updatedTree);
  return {
    success: true,
    message: `Đã chuyển sản phẩm [${productToMove.sku} - ${productToMove.name}] sang nhóm [${target.name}] thành công!`,
    newTree: updatedTree
  };
}
