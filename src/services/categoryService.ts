import type { ProductCategoryNode } from '../types/product';

const CATEGORY_STORAGE_KEY = 'erp_product_categories_tree';

// Cây danh mục nhóm hàng đa cấp mẫu chuẩn phân cấp tối thiểu 3 cấp (FMCG / Bán buôn & Phân phối)
export const INITIAL_CATEGORY_TREE: ProductCategoryNode[] = [
  {
    id: 'cat-beverage',
    name: 'Đồ Uống & Nước Giải Khát',
    code: 'BEV',
    parentId: null,
    order: 1,
    children: [
      {
        id: 'cat-beer',
        name: 'Bia & Đồ uống có cồn',
        code: 'BEER',
        parentId: 'cat-beverage',
        order: 1,
        children: [
          {
            id: 'cat-beer-can',
            name: 'Bia lon & Bia chai phổ thông',
            code: 'BEER_CAN',
            parentId: 'cat-beer',
            order: 1
          },
          {
            id: 'cat-beer-craft',
            name: 'Bia thủ công & Nhập khẩu cao cấp',
            code: 'BEER_CRAFT',
            parentId: 'cat-beer',
            order: 2
          }
        ]
      },
      {
        id: 'cat-soft-drinks',
        name: 'Nước ngọt & Giải khát',
        code: 'SOFT_DRINK',
        parentId: 'cat-beverage',
        order: 2,
        children: [
          {
            id: 'cat-carbonated',
            name: 'Nước ngọt có ga lon/chai',
            code: 'CARBONATED',
            parentId: 'cat-soft-drinks',
            order: 1
          },
          {
            id: 'cat-water',
            name: 'Nước khoáng & Nước tinh khiết',
            code: 'WATER',
            parentId: 'cat-soft-drinks',
            order: 2
          }
        ]
      }
    ]
  },
  {
    id: 'cat-dairy',
    name: 'Sữa & Chế Phẩm Từ Sữa',
    code: 'DAIRY',
    parentId: null,
    order: 2,
    children: [
      {
        id: 'cat-liquid-milk',
        name: 'Sữa tươi & Sữa nước dinh dưỡng',
        code: 'MILK_LIQUID',
        parentId: 'cat-dairy',
        order: 1,
        children: [
          {
            id: 'cat-fresh-milk',
            name: 'Sữa tươi tiệt trùng UHT 180ml / 1L',
            code: 'MILK_FRESH',
            parentId: 'cat-liquid-milk',
            order: 1
          },
          {
            id: 'cat-nut-milk',
            name: 'Sữa hạt & Sữa đậu nành hộp giấy',
            code: 'MILK_NUT',
            parentId: 'cat-liquid-milk',
            order: 2
          }
        ]
      },
      {
        id: 'cat-cultured-dairy',
        name: 'Sữa chua & Chế phẩm bơ phô mai',
        code: 'DAIRY_CULTURED',
        parentId: 'cat-dairy',
        order: 2,
        children: [
          {
            id: 'cat-yogurt',
            name: 'Sữa chua ăn & Sữa chua uống lên men',
            code: 'YOGURT',
            parentId: 'cat-cultured-dairy',
            order: 1
          },
          {
            id: 'cat-cheese-butter',
            name: 'Phô mai, Bơ thực vật & Váng sữa',
            code: 'CHEESE_BUTTER',
            parentId: 'cat-cultured-dairy',
            order: 2
          }
        ]
      }
    ]
  },
  {
    id: 'cat-condiments',
    name: 'Gia Vị & Nước Chấm Bếp',
    code: 'COND',
    parentId: null,
    order: 3,
    children: [
      {
        id: 'cat-sauces',
        name: 'Nước mắm & Nước tương pha sẵn',
        code: 'SAUCES',
        parentId: 'cat-condiments',
        order: 1,
        children: [
          {
            id: 'cat-fish-sauce',
            name: 'Nước mắm cá cơm truyền thống',
            code: 'FISH_SAUCE',
            parentId: 'cat-sauces',
            order: 1
          },
          {
            id: 'cat-soy-sauce',
            name: 'Nước tương đậu nành & Dầu hào',
            code: 'SOY_SAUCE',
            parentId: 'cat-sauces',
            order: 2
          }
        ]
      },
      {
        id: 'cat-cooking-essentials',
        name: 'Gia vị hạt & Dầu ăn thực vật',
        code: 'ESSENTIALS',
        parentId: 'cat-condiments',
        order: 2,
        children: [
          {
            id: 'cat-seasoning',
            name: 'Hạt nêm, Bột ngọt & Muối tiêu',
            code: 'SEASONING',
            parentId: 'cat-cooking-essentials',
            order: 1
          },
          {
            id: 'cat-cooking-oil',
            name: 'Dầu ăn tinh luyện & Dầu đậu nành',
            code: 'COOKING_OIL',
            parentId: 'cat-cooking-essentials',
            order: 2
          }
        ]
      }
    ]
  },
  {
    id: 'cat-dry-food',
    name: 'Thực Phẩm Khô & Chế Biến Sẵn',
    code: 'DRY_FOOD',
    parentId: null,
    order: 4,
    children: [
      {
        id: 'cat-instant-staples',
        name: 'Mì, Miến, Bún & Phở ăn liền',
        code: 'INSTANT_STAPLES',
        parentId: 'cat-dry-food',
        order: 1,
        children: [
          {
            id: 'cat-instant-noodles',
            name: 'Mì gói ăn liền vị chua cay',
            code: 'NOODLES',
            parentId: 'cat-instant-staples',
            order: 1
          },
          {
            id: 'cat-instant-pho',
            name: 'Phở gói, Hủ tiếu & Bún ăn liền',
            code: 'PHO_INSTANT',
            parentId: 'cat-instant-staples',
            order: 2
          }
        ]
      },
      {
        id: 'cat-canned-food',
        name: 'Đồ hộp & Thực phẩm ăn liền đóng gói',
        code: 'CANNED',
        parentId: 'cat-dry-food',
        order: 2,
        children: [
          {
            id: 'cat-canned-fish',
            name: 'Cá hộp xốt cà & Thịt hộp hầm',
            code: 'CANNED_FISH',
            parentId: 'cat-canned-food',
            order: 1
          },
          {
            id: 'cat-sausages',
            name: 'Xúc xích tiệt trùng & Đồ ăn nhanh',
            code: 'SAUSAGES',
            parentId: 'cat-canned-food',
            order: 2
          }
        ]
      }
    ]
  },
  {
    id: 'cat-snacks',
    name: 'Bánh Kẹo & Đồ Ăn Vặt',
    code: 'SNACK',
    parentId: null,
    order: 5,
    children: [
      {
        id: 'cat-bakery',
        name: 'Bánh quy & Bánh bông lan tươi',
        code: 'BAKERY',
        parentId: 'cat-snacks',
        order: 1,
        children: [
          {
            id: 'cat-biscuits',
            name: 'Bánh quy giòn & Bánh kẹp kem xốp',
            code: 'BISCUITS',
            parentId: 'cat-bakery',
            order: 1
          },
          {
            id: 'cat-sponge-cake',
            name: 'Bánh bông lan & Bánh trứng tươi',
            code: 'SPONGE_CAKE',
            parentId: 'cat-bakery',
            order: 2
          }
        ]
      },
      {
        id: 'cat-crisps-candies',
        name: 'Snack, Đậu phộng & Kẹo các loại',
        code: 'CRISPS_CANDIES',
        parentId: 'cat-snacks',
        order: 2,
        children: [
          {
            id: 'cat-chips',
            name: 'Snack khoai tây sấy & Bột phô mai',
            code: 'CHIPS',
            parentId: 'cat-crisps-candies',
            order: 1
          },
          {
            id: 'cat-candies',
            name: 'Kẹo dẻo gelatin & Kẹo socola',
            code: 'CANDIES',
            parentId: 'cat-crisps-candies',
            order: 2
          }
        ]
      }
    ]
  }
];

export class CategoryService {
  /**
   * Tính độ sâu lớn nhất của cây phân cấp
   */
  static getTreeDepth(nodes: ProductCategoryNode[]): number {
    if (!nodes || nodes.length === 0) return 0;
    let maxChildDepth = 0;
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        const d = this.getTreeDepth(node.children);
        if (d > maxChildDepth) maxChildDepth = d;
      }
    }
    return 1 + maxChildDepth;
  }

  /**
   * Lấy toàn bộ cây phân cấp nhóm hàng (Đảm bảo tối thiểu 3 cấp)
   */
  static getCategoryTree(): ProductCategoryNode[] {
    try {
      const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (stored) {
        const parsed: ProductCategoryNode[] = JSON.parse(stored);
        // Kiểm tra nếu cây cũ chưa đạt chuẩn tối thiểu 3 cấp thì reset lại cây 3 cấp chuẩn
        if (parsed && Array.isArray(parsed) && this.getTreeDepth(parsed) >= 3) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Lỗi khi đọc cây nhóm hàng từ localStorage:', e);
    }
    // Khởi tạo cây mặc định tối thiểu 3 cấp
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORY_TREE));
    return JSON.parse(JSON.stringify(INITIAL_CATEGORY_TREE));
  }

  /**
   * Lưu cây nhóm hàng vào storage
   */
  static saveCategoryTree(tree: ProductCategoryNode[]): void {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(tree));
  }

  /**
   * Lấy danh sách phẳng (flat list) toàn bộ nhóm hàng để chọn trong dropdown
   */
  static getFlatCategories(tree?: ProductCategoryNode[], level: number = 0): Array<{ id: string; name: string; level: number; code: string; parentId: string | null }> {
    const nodes = tree || this.getCategoryTree();
    let result: Array<{ id: string; name: string; level: number; code: string; parentId: string | null }> = [];

    for (const node of nodes) {
      result.push({
        id: node.id,
        name: `${'— '.repeat(level)}${node.name}`,
        level,
        code: node.code,
        parentId: node.parentId
      });

      if (node.children && node.children.length > 0) {
        result = result.concat(this.getFlatCategories(node.children, level + 1));
      }
    }

    return result;
  }

  /**
   * Tìm kiếm một node trong cây theo ID
   */
  static findNodeById(tree: ProductCategoryNode[], id: string): ProductCategoryNode | null {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Lấy toàn bộ tên nhóm hàng bao gồm cả node hiện tại và tất cả các nhóm con (để lọc sản phẩm)
   */
  static getCategoryAndDescendantNames(tree: ProductCategoryNode[], categoryId: string): string[] {
    const targetNode = this.findNodeById(tree, categoryId);
    if (!targetNode) return [];

    const names: string[] = [targetNode.name];

    const collectNames = (children?: ProductCategoryNode[]) => {
      if (!children) return;
      for (const child of children) {
        names.push(child.name);
        if (child.children) collectNames(child.children);
      }
    };

    collectNames(targetNode.children);
    return names;
  }

  /**
   * Thêm một nhóm hàng mới (nhóm gốc hoặc nhóm con)
   */
  static addCategory(
    name: string,
    code: string,
    parentId: string | null = null
  ): ProductCategoryNode[] {
    const tree = this.getCategoryTree();
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase() || `CAT_${Date.now()}`;

    const newNode: ProductCategoryNode = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      code: cleanCode,
      parentId,
      children: []
    };

    if (!parentId) {
      // Thêm vào nhóm gốc
      tree.push(newNode);
    } else {
      // Thêm vào nhóm cha tương ứng
      const parentNode = this.findNodeById(tree, parentId);
      if (parentNode) {
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(newNode);
      } else {
        tree.push(newNode);
      }
    }

    this.saveCategoryTree(tree);
    return tree;
  }

  /**
   * Cập nhật thông tin nhóm hàng
   */
  static updateCategory(id: string, name: string, code?: string): ProductCategoryNode[] {
    const tree = this.getCategoryTree();
    const node = this.findNodeById(tree, id);
    if (node) {
      node.name = name.trim();
      if (code) node.code = code.trim().toUpperCase();
      this.saveCategoryTree(tree);
    }
    return tree;
  }

  /**
   * Xóa một nhóm hàng (và nhóm con của nó)
   * QUY TẮC NGHIỆP VỤ: Nhóm còn sản phẩm thì KHÔNG ĐƯỢC XÓA!
   */
  static deleteCategory(id: string, existingProducts?: Array<{ category: string; categoryId?: string }>): ProductCategoryNode[] {
    const tree = this.getCategoryTree();
    const node = this.findNodeById(tree, id);
    if (!node) return tree;

    // Kiểm tra nếu nhóm (hoặc các nhóm con) còn sản phẩm
    if (existingProducts && existingProducts.length > 0) {
      const descendantNames = this.getCategoryAndDescendantNames(tree, id);
      const productCount = existingProducts.filter(
        (p) => descendantNames.includes(p.category) || p.categoryId === id
      ).length;

      if (productCount > 0) {
        throw new Error(
          `Nhóm hàng "${node.name}" đang chứa ${productCount} sản phẩm SKU. Quy tắc bắt buộc: Nhóm còn sản phẩm thì không được xóa! Vui lòng chuyển sản phẩm sang nhóm khác trước khi xóa.`
        );
      }
    }

    const removeFromList = (list: ProductCategoryNode[]): ProductCategoryNode[] => {
      return list
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.children && item.children.length > 0) {
            return { ...item, children: removeFromList(item.children) };
          }
          return item;
        });
    };

    const updatedTree = removeFromList(tree);
    this.saveCategoryTree(updatedTree);
    return updatedTree;
  }

  /**
   * XỬ LÝ KÉO THẢ (DRAG AND DROP): Di chuyển node sourceId vào làm con của targetParentId
   * Hỗ trợ tái cấu trúc phân cấp đa cấp bằng kéo thả trực quan
   */
  static moveCategory(sourceId: string, targetParentId: string | null): ProductCategoryNode[] {
    const tree = this.getCategoryTree();

    if (sourceId === targetParentId) return tree;

    // 1. Tìm node nguồn
    const sourceNode = this.findNodeById(tree, sourceId);
    if (!sourceNode) return tree;

    // Ngăn chặn kéo nhóm cha vào trong chính nhóm con của nó (Tránh vòng lặp vô hạn)
    const isDescendant = (parent: ProductCategoryNode, childId: string): boolean => {
      if (!parent.children) return false;
      for (const c of parent.children) {
        if (c.id === childId) return true;
        if (isDescendant(c, childId)) return true;
      }
      return false;
    };

    if (targetParentId && isDescendant(sourceNode, targetParentId)) {
      throw new Error('Không thể kéo nhóm cha vào trong nhóm con của chính nó!');
    }

    // 2. Tách node nguồn ra khỏi vị trí cũ
    const removeNode = (list: ProductCategoryNode[]): ProductCategoryNode[] => {
      return list
        .filter((n) => n.id !== sourceId)
        .map((n) => ({
          ...n,
          children: n.children ? removeNode(n.children) : []
        }));
    };

    const treeWithoutSource = removeNode(tree);

    // 3. Cập nhật parentId của sourceNode
    const updatedSourceNode: ProductCategoryNode = {
      ...sourceNode,
      parentId: targetParentId
    };

    // 4. Thêm vào vị trí đích
    if (!targetParentId) {
      // Chuyển thành node gốc
      treeWithoutSource.push(updatedSourceNode);
    } else {
      const targetParent = this.findNodeById(treeWithoutSource, targetParentId);
      if (targetParent) {
        if (!targetParent.children) targetParent.children = [];
        targetParent.children.push(updatedSourceNode);
      } else {
        treeWithoutSource.push(updatedSourceNode);
      }
    }

    this.saveCategoryTree(treeWithoutSource);
    return treeWithoutSource;
  }
}
