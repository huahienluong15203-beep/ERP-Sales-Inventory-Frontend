/**
 * Script sinh file Excel 5.000 sản phẩm mẫu chuẩn hóa cho hệ thống ERP Sales & Inventory
 * Sheet 1: DanhMucSanPham (12 cột chuẩn, 5.000 dòng dữ liệu chân thực)
 * Sheet 2: HuongDan_QuyDinh (Quy chuẩn và hướng dẫn nhập liệu chi tiết)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Hàm tính mã vạch EAN-13 chuẩn kèm chữ số kiểm tra (check digit)
function generateEan13(prefix12Digits) {
  const digits = prefix12Digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return prefix12Digits + checkDigit;
}

// Cấu hình danh mục ngành hàng và phân bổ 5.000 sản phẩm
const categoryConfigs = [
  {
    dept: 'Đồ uống',
    prefix: 'DO',
    count: 1000,
    groups: [
      {
        cat: 'Nước giải khát',
        sub: 'Có ga',
        unit: 'Lon',
        packaging: ['Thùng 24 lon', 'Lốc 6 lon', 'Khay 24 lon'],
        costRange: [180000, 245000],
        brands: ['Coca-Cola', 'Pepsi', '7Up', 'Mirinda', 'Sprite', 'Fanta', 'Schweppes', 'Mountain Dew'],
        variants: [
          'Vị nguyên bản 330ml', 'Không đường Zero Sugar 330ml', 'Vị chanh tươi mát 330ml',
          'Vị xá xị truyền thống 330ml', 'Vị cam ép tươi 330ml', 'Vị soda chanh gừng 330ml',
          'Vị việt quất chua ngọt 330ml', 'Vị nho tím thanh mát 330ml', 'Lon cao Sleek 250ml',
          'Chai nhựa 390ml', 'Chai nhựa 600ml', 'Chai đại tiệc 1.5L', 'Vị dưa hấu mát lạnh 330ml'
        ]
      },
      {
        cat: 'Nước giải khát',
        sub: 'Không ga & Trái cây',
        unit: 'Chai',
        packaging: ['Thùng 24 chai', 'Lốc 6 chai', 'Thùng 12 chai'],
        costRange: [120000, 220000],
        brands: ['Trà xanh C2', 'Trà Không Độ', 'Vfresh', 'Tipco', 'Cocoxim', 'Fuzetea', 'Twister'],
        variants: [
          'Hương chanh hoa cúc 450ml', 'Hương đào hạt chia 450ml', 'Nước cam ép có tép 350ml',
          'Nước dừa xiêm nguyên chất 330ml', 'Nước ổi hồng nguyên chất 1L', 'Nước táo ép thanh mát 1L',
          'Trà ô long không đường 450ml', 'Trà chanh mật ong 500ml', 'Trà tắc sả mát lạnh 450ml'
        ]
      },
      {
        cat: 'Nước giải khát',
        sub: 'Nước tăng lực',
        unit: 'Lon',
        packaging: ['Khay 24 lon', 'Lốc 6 lon', 'Thùng 24 lon'],
        costRange: [190000, 270000],
        brands: ['Red Bull', 'Sting', 'Monster Energy', 'Compact', 'Lipovitan', 'Number 1', 'Warrior'],
        variants: [
          'Hương dâu đỏ lon 330ml', 'Vị nhân sâm vàng 330ml', 'Bò húc Thái Lan lon 250ml',
          'Vị nho tím có ga 330ml', 'Energy Drink Ultra White 355ml', 'Hương mật ong lon 250ml',
          'Hương chanh muối bù khoáng 330ml', 'Energy Drink Mango Loco 355ml'
        ]
      },
      {
        cat: 'Bia & Nước có cồn',
        sub: 'Bia lon',
        unit: 'Lon',
        packaging: ['Thùng 24 lon', 'Lốc 6 lon', 'Thùng 12 lon'],
        costRange: [250000, 480000],
        brands: ['Heineken', 'Tiger', 'Bia Sài Gòn', 'Bia 333', 'Budweiser', 'Corona', 'Blanc 1664', 'Sapporo'],
        variants: [
          'Silver lon 330ml cao cấp', 'Crystal lon 330ml sảng khoái', 'Special lon cao 330ml',
          'Export lon vàng 330ml', 'Lager thượng hạng lon 330ml', 'Premium lon bạc 330ml',
          'Bia tuyết trắng lon 330ml hương cam', 'Không cồn 0.0% lon 330ml'
        ]
      },
      {
        cat: 'Bia & Nước có cồn',
        sub: 'Rượu vang & Cider',
        unit: 'Chai',
        packaging: ['Thùng 24 chai', 'Lốc 4 chai', 'Thùng 6 chai'],
        costRange: [160000, 550000],
        brands: ['Strongbow', 'Somersby', 'Vang Đà Lạt', 'Vang Chile', 'Vang Pháp'],
        variants: [
          'Cider Táo đỏ lên men chai 330ml', 'Cider Mật ong thanh ngọt 330ml', 'Cider Dâu đen đậm vị 330ml',
          'Cider Đào tươi chai 330ml', 'Classic vang đỏ chai 750ml', 'Vang trắng Sauvignon chai 750ml',
          'Cabernet Sauvignon vang đỏ đậm đà 750ml'
        ]
      },
      {
        cat: 'Cà phê & Trà',
        sub: 'Cà phê hòa tan',
        unit: 'Hộp',
        packaging: ['Thùng 24 hộp', 'Thùng 12 hộp', 'Dây 10 gói'],
        costRange: [45000, 140000],
        brands: ['Trung Nguyên Legend', 'G7', 'Nescafé', 'Highlands Coffee', 'MacCoffee', 'King Coffee'],
        variants: [
          'Cà phê hòa tan 3in1 hộp 18 gói', 'Cà phê đen đá hòa tan hộp 15 gói', 'Cà phê sữa đá Phố hộp 10 gói',
          'Cà phê Cappuccino vị hạt dẻ hộp 12 gói', 'Cà phê Espresso rang đậm hộp 15 gói', 'Cà phê sữa hòa tan đậm vị hộp 20 gói'
        ]
      },
      {
        cat: 'Cà phê & Trà',
        sub: 'Trà túi lọc & Trà khô',
        unit: 'Hộp',
        packaging: ['Thùng 24 hộp', 'Thùng 12 hộp', 'Hộp 25 túi'],
        costRange: [35000, 95000],
        brands: ['Lipton', 'Phúc Long', 'Dilmah', 'Cozy', 'Ahmad Tea'],
        variants: [
          'Nhãn vàng Yellow Label hộp 25 túi lọc', 'Trà xanh lài tự nhiên hộp 25 túi', 'Trà đào túi lọc hương thơm dịu hộp 20 túi',
          'Trà sen truyền thống hộp 50g', 'Trà Ô long thượng hạng hộp 100g', 'Trà Earl Grey Bá tước hộp 20 túi'
        ]
      },
      {
        cat: 'Nước tinh khiết & Khoáng',
        sub: 'Nước đóng chai',
        unit: 'Chai',
        packaging: ['Thùng 24 chai', 'Lốc 6 chai', 'Thùng 12 chai'],
        costRange: [65000, 135000],
        brands: ['Aquafina', 'La Vie', 'Vĩnh Hảo', 'Dasani', 'Ion Life', 'Satori', 'Fujiwa'],
        variants: [
          'Nước tinh khiết chai 500ml', 'Nước khoáng thiên nhiên chai 500ml', 'Nước khoáng có ga chai 500ml',
          'Nước tinh khiết chai nhỏ 350ml', 'Nước ion kiềm Alkaline chai 450ml', 'Nước khoáng thiên nhiên bình 1.5L'
        ]
      }
    ]
  },
  {
    dept: 'Thực phẩm đóng gói & Khô',
    prefix: 'TP',
    count: 800,
    groups: [
      {
        cat: 'Mì - Miến - Phở',
        sub: 'Mì ăn liền gói',
        unit: 'Gói',
        packaging: ['Thùng 30 gói', 'Lốc 5 gói', 'Thùng 24 gói'],
        costRange: [85000, 160000],
        brands: ['Hảo Hảo', 'Omachi', 'Kokomi', 'Ba Miền', 'Đệ Nhất', 'Indomie', 'Koreno'],
        variants: [
          'Tôm chua cay gói 75g', 'Sườn hầm ngũ quả xốt đậm gói 80g', 'Bò hầm rau thơm gói 75g',
          'Gà quay tỏi ớt gói 75g', 'Xốt Spaghetti bò bằm gói 85g', 'Tôm hành phi chua cay gói 90g',
          'Mì xào tương đen chua ngọt gói 85g', 'Mì lẩu thái cay đậm đà gói 80g'
        ]
      },
      {
        cat: 'Mì - Miến - Phở',
        sub: 'Mì ly & Phở ăn liền',
        unit: 'Ly',
        packaging: ['Thùng 24 ly', 'Thùng 12 tô', 'Thùng 30 gói'],
        costRange: [110000, 210000],
        brands: ['Modern', 'Cung Đình', 'Vifon', 'Phú Hương', 'Acecook', 'Samyang'],
        variants: [
          'Mì ly lẩu thái tôm chua cay 65g', 'Mì ly vị sườn heo hầm hạt sen 68g', 'Phở bò Hà Nội gói cao cấp 70g',
          'Phở gà lá chanh gói 70g', 'Miến sườn heo măng cay gói 60g', 'Hủ tiếu sườn heo Nam Vang gói 70g',
          'Mì tô bò cay Hàn Quốc 105g', 'Bánh đa cua Hải Phòng ăn liền 70g'
        ]
      },
      {
        cat: 'Đồ hộp & Thực phẩm chế biến',
        sub: 'Cá & Thịt hộp',
        unit: 'Hộp',
        packaging: ['Thùng 24 hộp', 'Thùng 12 hộp', 'Lốc 3 hộp'],
        costRange: [18000, 65000],
        brands: ['3 Cô Gái', 'Hạ Long', 'Vissan', 'Seacrown', 'Dongwon', 'Spam'],
        variants: [
          'Cá nục xốt cà chua hộp 155g', 'Cá mòi ngâm dầu ô liu hộp 125g', 'Thịt heo hầm đóng hộp 150g',
          'Patê gan heo thượng hạng hộp 170g', 'Cá ngừ ngâm dầu thực vật hộp 185g', 'Xúc xích tiệt trùng heo tiệt trùng gói 10 cây',
          'Bò hầm xốt vang hộp 150g', 'Thịt viên sốt cà chua hộp 170g'
        ]
      },
      {
        cat: 'Gạo & Ngũ cốc',
        sub: 'Gạo thơm đặc sản',
        unit: 'Túi',
        packaging: ['Túi 5kg', 'Túi 10kg', 'Bao 25kg'],
        costRange: [95000, 320000],
        brands: ['Gạo ST25 Ông Cua', 'Gạo Jasmine', 'Neptune Gạo Thơm', 'Gạo Lài Miên', 'Gạo Vua Gạo'],
        variants: [
          'ST25 Lúa tôm chuẩn thượng hạng túi 5kg', 'Gạo Nàng Hoa tiến vua túi 5kg', 'Gạo Thơm lài sữa dẻo mềm túi 5kg',
          'Gạo lứt đỏ huyết rồng túi 2kg', 'Gạo nếp cái hoa vàng chuẩn xôi túi 2kg', 'Yến mạch nguyên chất Quacker gói 500g',
          'Đậu xanh hạt nguyên vỏ túi 500g', 'Đậu đen xanh lòng giàu dinh dưỡng túi 500g'
        ]
      },
      {
        cat: 'Đồ khô & Chế biến khô',
        sub: 'Khô ăn liền & Rong biển',
        unit: 'Hũ',
        packaging: ['Thùng 24 hũ', 'Hũ 300g', 'Thùng 12 gói'],
        costRange: [35000, 115000],
        brands: ['G-Kitchen', 'Dh Foods', 'Bibigo', 'Tân Long', 'Hải Châu'],
        variants: [
          'Khô gà lá chanh cay giòn hũ 300g', 'Khô bò miếng sấy Tây Bắc hũ 250g', 'Khô mực hấp nước dừa xé sợi hũ 200g',
          'Heo khô cháy tỏi thơm lừng hũ 300g', 'Rong biển sấy dầu mè giòn tan lốc 3 gói', 'Nấm hương khô chọn lọc túi 150g'
        ]
      }
    ]
  },
  {
    dept: 'Bánh kẹo & Đồ ăn vặt',
    prefix: 'BK',
    count: 700,
    groups: [
      {
        cat: 'Bánh quy & Bánh xốp',
        sub: 'Bánh quy',
        unit: 'Hộp',
        packaging: ['Thùng 12 hộp', 'Thùng 24 gói', 'Thùng 6 hộp'],
        costRange: [28000, 185000],
        brands: ['Danisa', 'Cosy', 'Oreo', 'AFC', 'Goute', 'LU Pháp', 'Ritz'],
        variants: [
          'Bánh quy bơ Đan Mạch hộp thiếc 454g', 'Bánh quy mè dừa giòn rụm gói 288g', 'Bánh Oreo vị kem vani cây 133g',
          'Bánh Oreo kem socola đen cây 133g', 'Bánh cracker dinh dưỡng vị rau cải hộp 172g', 'Bánh cracker vị phô mai đậm đà hộp 172g',
          'Bánh quy hạt mè mè đen hộp 288g', 'Bánh quy bơ hảo hạng hộp giấy 200g'
        ]
      },
      {
        cat: 'Bánh quy & Bánh xốp',
        sub: 'Bánh xốp phô mai & kem',
        unit: 'Hộp',
        packaging: ['Thùng 24 hộp', 'Thùng 12 hộp', 'Hộp 20 gói'],
        costRange: [22000, 75000],
        brands: ['Nabati', 'Cal Cheese', 'Loacker', 'Imperial', 'Hải Hà'],
        variants: [
          'Bánh xốp nhân phô mai hộp 300g', 'Bánh xốp nhân kem socola hộp 300g', 'Bánh xốp kem dâu tây hộp 200g',
          'Bánh xốp bơ sữa giòn tan gói 150g', 'Bánh xốp mè rang hạt dẻ hộp 180g'
        ]
      },
      {
        cat: 'Bánh tươi & Bánh mềm',
        sub: 'Chocopie & Bông lan',
        unit: 'Hộp',
        packaging: ['Thùng 16 hộp', 'Thùng 12 hộp', 'Thùng 8 hộp'],
        costRange: [42000, 95000],
        brands: ['Orion', 'Custas', 'Solite', 'Kinh Đô', 'Lotte'],
        variants: [
          'Bánh Chocopie truyền thống hộp 12 cái 396g', 'Bánh Chocopie vị matcha trà xanh hộp 12 cái',
          'Bánh Custas nhân kem trứng mềm mịn hộp 12 cái', 'Bánh bông lan bơ sữa cuộn kem hộp 360g',
          'Bánh bông lan mè đen trứng muối hộp 10 cái', 'Bánh mì hoa cúc tươi xốp bơ thơm 300g'
        ]
      },
      {
        cat: 'Kẹo & Socola',
        sub: 'Kẹo dẻo & Socola',
        unit: 'Gói',
        packaging: ['Thùng 24 gói', 'Thùng 12 hộp', 'Hũ 200 viên'],
        costRange: [15000, 85000],
        brands: ['Chupa Chups', 'Alpenliebe', 'KitKat', 'M&M', 'Ricola', 'Dynamite', 'Snickers'],
        variants: [
          'Kẹo dẻo hương trái cây cầu vồng gói 90g', 'Kẹo dẻo gấu Panda vị dâu đào gói 100g',
          'Kẹo ngậm caramel sữa Alpenliebe gói 120g', 'Kẹo ngậm thảo mộc ngậm ho Ricola hộp 40g',
          'Socola KitKat thanh xốp 4 ngón gói 35g', 'Socola M&M sữa đậu phộng gói 100g',
          'Kẹo cứng nhân socola bạc hà Dynamite gói 120g', 'Thanh năng lượng Socola hạt lạc Snickers 50g'
        ]
      },
      {
        cat: 'Snack & Hạt dinh dưỡng',
        sub: 'Bim bim & Hạt dinh dưỡng',
        unit: 'Gói',
        packaging: ['Thùng 30 gói', 'Thùng 20 lon', 'Hũ 500g'],
        costRange: [9000, 155000],
        brands: ['Lay\'s', 'Oishi', 'Pringles', 'Tân Tân', 'Bình Phước Nuts', 'Toonies'],
        variants: [
          'Snack khoai tây vị tự nhiên Lay\'s gói 95g', 'Snack khoai tây sườn nướng BBQ lon 105g',
          'Khoai tây lát chiên lon Pringles chua cay 107g', 'Bim bim tôm cay Oishi gói 40g',
          'Bim bim phồng mực sốt cay gói 45g', 'Hạt điều lụa rang muối Bình Phước hũ 500g',
          'Đậu phộng da cá giòn rụm vị tỏi ớt hũ 250g', 'Hạt dẻ cười Mỹ rang muối hũ 400g'
        ]
      }
    ]
  },
  {
    dept: 'Gia vị & Chế biến món ăn',
    prefix: 'GV',
    count: 700,
    groups: [
      {
        cat: 'Nước mắm & Nước tương',
        sub: 'Nước mắm cá cơm',
        unit: 'Chai',
        packaging: ['Thùng 12 chai', 'Thùng 6 chai', 'Thùng 15 chai'],
        costRange: [28000, 165000],
        brands: ['Khải Hoàn', 'Nam Ngư', 'Chin-Su', 'Cát Hải', 'Liên Thành', 'Hưng Thịnh'],
        variants: [
          'Nước mắm Phú Quốc truyền thống 40 độ đạm chai 500ml', 'Nước mắm Phú Quốc 43 độ đạm chai thủy tinh 520ml',
          'Nước mắm Nam Ngư Đệ Nhị chai 900ml', 'Nước mắm Nam Ngư cá cơm tươi chai 750ml',
          'Nước mắm Chin-Su hương cá hồi chai 500ml', 'Nước mắm nhĩ thượng hạng cốt đặc biệt chai 500ml',
          'Nước mắm chua ngọt pha sẵn ăn liền tỏi ớt chai 300ml'
        ]
      },
      {
        cat: 'Nước mắm & Nước tương',
        sub: 'Nước tương & Xì dầu',
        unit: 'Chai',
        packaging: ['Thùng 24 chai', 'Thùng 12 chai', 'Thùng 6 chai'],
        costRange: [12000, 48000],
        brands: ['Maggi', 'Chin-Su', 'Lee Kum Kee', 'Tam Thái Tử', 'Nhất Ca'],
        variants: [
          'Nước tương Maggi đậm đặc chai 700ml', 'Nước tương Maggi đậu nành thanh dịu chai 700ml',
          'Nước tương Chin-Su tỏi ớt thơm cay chai 330ml', 'Xì dầu thượng hạng Lee Kum Kee chai 500ml',
          'Nước tương Tam Thái Tử Nhị Ca chai 500ml', 'Xì dầu càng cua đậm đà hương vị chai 500ml'
        ]
      },
      {
        cat: 'Dầu ăn & Bơ thực vật',
        sub: 'Dầu thực vật & Dầu hạt',
        unit: 'Chai',
        packaging: ['Thùng 12 chai', 'Thùng 4 can', 'Can 5L'],
        costRange: [38000, 260000],
        brands: ['Simply', 'Neptune', 'Tường An', 'Meizan', 'Sloboda', 'Borges'],
        variants: [
          'Dầu đậu nành nguyên chất Simply chai 1L', 'Dầu đậu nành Simply can 5L tiết kiệm',
          'Dầu gạo lứt nguyên chất Simply chai 1L', 'Dầu ăn thượng hạng Neptune Gold chai 1L',
          'Dầu ăn tinh luyện Tường An Cooking Oil chai 1L', 'Dầu hướng dương Nga tinh chế chai 1L',
          'Dầu mè thơm nguyên chất Meizan chai 250ml', 'Bơ thực vật Tường An hộp 200g làm bánh thơm béo'
        ]
      },
      {
        cat: 'Hạt nêm, Mì chính & Bột nêm',
        sub: 'Hạt nêm & Bột canh',
        unit: 'Gói',
        packaging: ['Thùng 24 gói', 'Thùng 12 gói', 'Thùng 10 bao'],
        costRange: [12000, 85000],
        brands: ['Knorr', 'Aji-ngon', 'Maggi', 'Ajinomoto', 'Vedan', 'Hải Châu', 'Dh Foods'],
        variants: [
          'Hạt nêm từ thịt thăn xương ống Knorr gói 900g', 'Hạt nêm từ thịt Knorr gói 400g tiện lợi',
          'Hạt nêm heo đậm vị ngọt tủy Aji-ngon gói 400g', 'Hạt nêm nấm hương chay thanh đạm gói 450g',
          'Bột ngọt tinh khiết Ajinomoto hạt lớn gói 1kg', 'Bột ngọt Vedan gói 454g',
          'Bột canh i-ốt Hải Châu truyền thống gói 190g', 'Tiêu sọ Phú Quốc xay nhuyễn Dh Foods hũ 60g'
        ]
      },
      {
        cat: 'Tương & Sốt gia vị',
        sub: 'Tương ớt & Sốt ướp',
        unit: 'Chai',
        packaging: ['Thùng 24 chai', 'Thùng 12 chai', 'Chai 500g'],
        costRange: [14000, 58000],
        brands: ['Chin-Su', 'Cholimex', 'Heinz', 'Kewpie', 'Barona', 'Guyumi'],
        variants: [
          'Tương ớt Chin-Su vị cay nồng chai 250g', 'Tương ớt Chin-Su siêu cay chai 500g',
          'Tương cà chua đậm đà Heinz chai úp ngược 397g', 'Tương ớt Cholimex chua ngọt chai 270g',
          'Sốt mayonnaise Kewpie hương vị Nhật Bản chai 300g', 'Sốt ướp thịt nướng xá xíu Barona gói 80g',
          'Sốt ướp sườn nướng ngũ vị đậm đà gói 80g', 'Giấm gạo lên men tự nhiên chai 450ml'
        ]
      }
    ]
  },
  {
    dept: 'Sữa & Sản phẩm từ sữa',
    prefix: 'SU',
    count: 600,
    groups: [
      {
        cat: 'Sữa nước tiệt trùng',
        sub: 'Sữa tươi & Sữa lúa mạch',
        unit: 'Hộp',
        packaging: ['Thùng 48 hộp', 'Lốc 4 hộp', 'Thùng 12 chai'],
        costRange: [28000, 385000],
        brands: ['Vinamilk', 'TH True Milk', 'Dutch Lady', 'Milo', 'Ovaltine'],
        variants: [
          'Sữa tươi tiệt trùng 100% có đường hộp 180ml', 'Sữa tươi tiệt trùng ít đường TH True Milk hộp 180ml',
          'Sữa tươi nguyên chất không đường hộp 180ml', 'Sữa tươi hương dâu ngọt ngào hộp 180ml',
          'Sữa tươi hương socola lúa mạch hộp 180ml', 'Thức uống lúa mạch Milo nắp vặn hộp 200ml',
          'Thức uống dinh dưỡng Ovaltine vị socola hộp 180ml', 'Sữa tươi tiệt trùng bịch 220ml tiết kiệm'
        ]
      },
      {
        cat: 'Sữa hạt & Sữa thực vật',
        sub: 'Sữa đậu nành & Sữa hạt dinh dưỡng',
        unit: 'Hộp',
        packaging: ['Thùng 36 hộp', 'Lốc 6 hộp', 'Thùng 24 hộp'],
        costRange: [24000, 185000],
        brands: ['Fami', 'Vinasoy', '137 Degrees', 'TH True Nut', 'Vinamilk Super Nut'],
        variants: [
          'Sữa đậu nành nguyên chất Fami hộp 200ml', 'Sữa đậu nành Fami Canxi vị đậu đỏ hộp 200ml',
          'Sữa hạt óc chó Vinamilk 9 loại hạt hộp 180ml', 'Sữa hạnh nhân nguyên chất 137 Degrees hộp 180ml',
          'Sữa hạt macca cao cấp TH True Nut hộp 180ml', 'Sữa gạo lứt giàu chất xơ hộp 180ml'
        ]
      },
      {
        cat: 'Sữa chua & Váng sữa',
        sub: 'Sữa chua ăn & uống',
        unit: 'Lốc',
        packaging: ['Thùng 12 lốc', 'Lốc 4 hộp', 'Thùng 24 chai'],
        costRange: [22000, 115000],
        brands: ['Vinamilk', 'TH True Yogurt', 'Probi', 'Monte', 'Đà Lạt Milk', 'Zott'],
        variants: [
          'Sữa chua ăn có đường Vinamilk lốc 4 hộp 100g', 'Sữa chua nha đam giòn dai TH True lốc 4 hộp 100g',
          'Sữa chua nếp cẩm thơm bùi lốc 4 hộp 100g', 'Sữa chua uống men sống Probi chai 65ml lốc 5 chai',
          'Váng sữa Monte hương vani béo ngậy lốc 4 hộp 55g', 'Váng sữa hương socola thơm lừng lốc 4 hộp 55g',
          'Sữa chua Hy Lạp nguyên chất hũ 150g'
        ]
      },
      {
        cat: 'Sữa đặc & Phô mai',
        sub: 'Sữa đặc & Bơ phô mai',
        unit: 'Lon',
        packaging: ['Thùng 48 lon', 'Thùng 24 hộp', 'Khối 200g'],
        costRange: [21000, 195000],
        brands: ['Ông Thọ', 'Ngôi Sao Phương Nam', 'Con Bò Cười', 'Anchor', 'President'],
        variants: [
          'Sữa đặc có đường Ông Thọ nhãn đỏ lon thiếc 380g', 'Sữa đặc Ông Thọ nắp bật nhãn xanh lon 380g',
          'Sữa đặc Ngôi Sao Phương Nam xanh dương hộp giấy 1.284kg', 'Phô mai Con Bò Cười truyền thống hộp 8 miếng 112g',
          'Phô mai lát Cheddar Anchor gói 12 lát 200g', 'Bơ lạt tự nhiên Anchor khối 227g làm bánh',
          'Phô mai sợi Mozzarella béo ngậy gói 200g'
        ]
      }
    ]
  },
  {
    dept: 'Hóa mỹ phẩm & Tẩy rửa',
    prefix: 'HC',
    count: 500,
    groups: [
      {
        cat: 'Giặt giũ & Xả vải',
        sub: 'Nước giặt cửa trước & trên',
        unit: 'Túi',
        packaging: ['Thùng 4 túi', 'Can 3.6kg', 'Bao 5kg'],
        costRange: [115000, 240000],
        brands: ['OMO Matic', 'Ariel', 'Surf', 'Comfort', 'Downy', 'Tide'],
        variants: [
          'Nước giặt OMO Matic cửa trước chuyên gia khử mùi túi 3.6kg', 'Nước giặt OMO Matic cửa trên hương ban mai túi 3.6kg',
          'Nước giặt Ariel Matic sạch sâu kháng khuẩn túi 3.2kg', 'Nước giặt Surf hương sương mai ngát hương bao 3.5kg',
          'Nước xả vải Comfort một lần xả hương ban mai túi 3.2L', 'Nước xả vải Comfort tinh dầu thơm thanh lịch túi 3.2L',
          'Nước xả vải Downy hương nắng mai túi 3L', 'Bột giặt Tide trắng đột phá bao 4.5kg'
        ]
      },
      {
        cat: 'Vệ sinh nhà cửa & Bếp',
        sub: 'Nước rửa chén & Tẩy rửa',
        unit: 'Chai',
        packaging: ['Thùng 12 chai', 'Thùng 4 can', 'Can 3.6kg'],
        costRange: [25000, 135000],
        brands: ['Sunlight', 'Mỹ Hảo', 'Vim', 'Cif', 'Gift', 'Mr Muscle'],
        variants: [
          'Nước rửa chén Sunlight chanh tươi khử mùi tanh chai 750g', 'Nước rửa chén Sunlight thiên nhiên chiết xuất lô hội can 3.6kg',
          'Nước lau sàn Sunlight hương hoa lily chai 1kg', 'Nước lau sàn Sunlight tinh dầu sả chanh chai 1kg',
          'Nước tẩy bồn cầu diệt khuẩn Vim đậm đặc chai 900ml', 'Kem tẩy đa năng nhà bếp Cif chai 500ml',
          'Nước lau kính sáng bóng chống bám bụi Cif chai 520ml', 'Nước thông tắc cống thoát nước siêu tốc chai 1L'
        ]
      },
      {
        cat: 'Giấy vệ sinh & Đồ dùng tiện ích',
        sub: 'Giấy lụa & Khăn ướt',
        unit: 'Lốc',
        packaging: ['Thùng 6 lốc', 'Thùng 10 lốc', 'Thùng 24 gói'],
        costRange: [38000, 125000],
        brands: ['Pulppy', 'Paseo', 'Bless You', 'Bobby', 'Opec', 'Rạng Đông'],
        variants: [
          'Giấy vệ sinh 3 lớp cao cấp Pulppy lốc 10 cuộn không lõi', 'Giấy vệ sinh 3 lớp Bless You lốc 10 cuộn có lõi',
          'Khăn giấy lụa rút cao cấp Paseo 3 lớp gói 180 tờ', 'Khăn giấy ướt không cồn Bobby gói 100 miếng nắp đậy',
          'Túi đựng rác tự hủy sinh học 3 màu cuộn 1kg', 'Màng bọc thực phẩm PE có dao cắt cuộn 30cm x 150m'
        ]
      }
    ]
  },
  {
    dept: 'Chăm sóc cá nhân',
    prefix: 'CS',
    count: 400,
    groups: [
      {
        cat: 'Chăm sóc tóc',
        sub: 'Dầu gội & Dầu xả',
        unit: 'Chai',
        packaging: ['Thùng 12 chai', 'Thùng 6 chai', 'Chai 650g'],
        costRange: [85000, 195000],
        brands: ['Clear Men', 'Head & Shoulders', 'Pantene', 'Sunsilk', 'TRESemmé', 'Dove'],
        variants: [
          'Dầu gội sạch gàu Clear Men bạc hà mát lạnh chai 630g', 'Dầu gội bạc hà sảng khoái Head & Shoulders chai 625ml',
          'Dầu gội ngăn rụng tóc nuôi dưỡng Pantene chai 650ml', 'Dầu gội Sunsilk óng mượt rạng ngời chai 650g',
          'Dầu xả phục hồi tóc hư tổn chuẩn Salon TRESemmé chai 640ml', 'Kem ủ dưỡng ẩm chuyên sâu keratin hũ 180ml'
        ]
      },
      {
        cat: 'Tắm & Vệ sinh cơ thể',
        sub: 'Sữa tắm & Xà bông',
        unit: 'Chai',
        packaging: ['Thùng 12 chai', 'Thùng 24 bánh', 'Chai 850g'],
        costRange: [25000, 165000],
        brands: ['Lifebuoy', 'Dove', 'Safeguard', 'Enchanteur', 'Romano', 'X-Men'],
        variants: [
          'Sữa tắm bảo vệ vượt trội diệt khuẩn 99.9% Lifebuoy chai 850g', 'Sữa tắm dưỡng ẩm sáng mịn da Dove chai 900g',
          'Xà bông cục diệt khuẩn Safeguard bánh 130g', 'Sữa tắm hương nước hoa Pháp Enchanteur chai 650g',
          'Sữa tắm hương nước hoa nam tính Romano Classic chai 650g', 'Sữa tắm gội 2in1 năng động nam X-Men chai 650g'
        ]
      },
      {
        cat: 'Chăm sóc răng miệng',
        sub: 'Kem đánh răng & Bàn chải',
        unit: 'Tuýp',
        packaging: ['Thùng 36 tuýp', 'Thùng 24 tuýp', 'Hộp 12 cây'],
        costRange: [28000, 95000],
        brands: ['Colgate', 'Sensodyne', 'Close Up', 'P/S', 'Listerine'],
        variants: [
          'Kem đánh răng ngừa sâu răng tối ưu Colgate Total tuýp 150g', 'Kem đánh răng phục hồi răng ê buốt Sensodyne tuýp 100g',
          'Kem đánh răng lửa băng thơm mát Close Up tuýp 180g', 'Kem đánh răng than hoạt tính trắng răng P/S tuýp 180g',
          'Bàn chải đánh răng lông tơ siêu mềm P/S than tre', 'Nước súc miệng diệt khuẩn Listerine Cool Mint chai 500ml'
        ]
      },
      {
        cat: 'Chăm sóc da & Khử mùi',
        sub: 'Sữa rửa mặt & Lăn khử mùi',
        unit: 'Tuýp',
        packaging: ['Thùng 24 tuýp', 'Thùng 36 chai', 'Tuýp 100g'],
        costRange: [45000, 115000],
        brands: ['Nivea', 'Acnes', 'Senka', 'Rexona', 'Romano'],
        variants: [
          'Sữa rửa mặt sáng da sạch sâu nhờn mụn Nivea Men tuýp 100g', 'Sữa rửa mặt ngăn ngừa mụn kháng khuẩn Acnes tuýp 100g',
          'Sữa rửa mặt tạo bọt tơ tằm Senka Perfect Whip tuýp 120g', 'Lăn khử mùi khô thoáng nam Nivea Men chai 50ml',
          'Lăn khử mùi thơm lâu nữ Rexona kháng khuẩn chai 50ml'
        ]
      }
    ]
  },
  {
    dept: 'Văn phòng phẩm & Tiện ích',
    prefix: 'VP',
    count: 300,
    groups: [
      {
        cat: 'Giấy in & Sổ tay',
        sub: 'Giấy in văn phòng & Tập học sinh',
        unit: 'Ram',
        packaging: ['Thùng 5 ram', 'Lốc 10 quyển', 'Thùng 10 ram'],
        costRange: [42000, 310000],
        brands: ['Double A', 'IK Plus', 'Paper One', 'Campus', 'Hồng Hà'],
        variants: [
          'Giấy in A4 định lượng 70gsm thùng 5 ram (500 tờ/ram)', 'Giấy in A4 định lượng 80gsm thùng 5 ram cao cấp',
          'Giấy in A3 định lượng 70gsm thùng 5 ram', 'Tập học sinh 96 trang kẻ ngang chống lóa Campus lốc 10 cuốn',
          'Sổ lò xo A5 kẻ ngang bìa cứng 200 trang', 'Sổ tay da cao cấp dập chìm gáy còng A5'
        ]
      },
      {
        cat: 'Bút viết & Mực',
        sub: 'Bút bi, Bút gel & Bút dạ quang',
        unit: 'Hộp',
        packaging: ['Hộp 20 cây', 'Hộp 12 cây', 'Hộp 10 cây'],
        costRange: [35000, 145000],
        brands: ['Thiên Long', 'Pentel', 'Pilot', 'Stabilo', 'Bến Nghé'],
        variants: [
          'Bút bi mực xanh ngòi 0.5mm Thiên Long TL-027 hộp 20 cây', 'Bút bi mực đen ngòi 0.7mm Thiên Long hộp 20 cây',
          'Bút gel bấm EnerGel mực xanh ngòi 0.5mm Pentel hộp 12 cây', 'Bút dạ quang vàng chanh chống lóa Stabilo Boss hộp 10 cây',
          'Bút lông bảng trắng xóa được Thiên Long WB-03 hộp 10 cây', 'Bút lông dầu 2 đầu đen Pilot hộp 12 cây'
        ]
      },
      {
        cat: 'Dụng cụ văn phòng',
        sub: 'Bấm kim, Băng keo & Bìa còng',
        unit: 'Cái',
        packaging: ['Hộp 12 cái', 'Lốc 6 cuộn', 'Thùng 50 cái'],
        costRange: [18000, 85000],
        brands: ['SDI', 'Deli', 'KingJim', 'Thiên Long', 'Plus'],
        variants: [
          'Máy bấm kim số 10 trợ lực SDI cán bọc nhựa', 'Hộp kim bấm số 10 chất lượng cao Thiên Long hộp 20 hộp nhỏ',
          'Băng keo trong dán thùng 4.8cm x 100 yard lốc 6 cuộn', 'Kéo cắt văn phòng inox cán đen Deli 175mm',
          'Bìa còng bật KingJim khổ A4 7cm gáy dày', 'Bìa nút My Clear khổ A4 xấp 10 cái'
        ]
      }
    ]
  }
];

function generateProducts() {
  const rows = [];
  let globalIndex = 0;

  for (const conf of categoryConfigs) {
    const { dept, prefix, count, groups } = conf;
    let deptCount = 0;

    while (deptCount < count) {
      for (const group of groups) {
        if (deptCount >= count) break;

        const brand = group.brands[deptCount % group.brands.length];
        const variant = group.variants[Math.floor(deptCount / group.brands.length) % group.variants.length];
        const pack = group.packaging[deptCount % group.packaging.length];
        const unit = group.unit;

        globalIndex++;
        deptCount++;

        const stt = globalIndex;
        const skuNumber = String(deptCount).padStart(4, '0');
        const sku = `SP-${prefix}-${skuNumber}`;

        // Tạo tên sản phẩm chuyên nghiệp, tự nhiên và độc nhất
        // Thêm mã phân biệt nếu số lượng lặp cấu hình
        const repeatLoop = Math.floor(deptCount / (group.brands.length * group.variants.length));
        const suffix = repeatLoop > 0 ? ` (Lô ${repeatLoop + 1})` : '';
        const productName = `${brand} - ${variant}${suffix}`;

        // Giá vốn biến thiên hợp lý
        const [minCost, maxCost] = group.costRange;
        const costStep = Math.max(1000, Math.floor((maxCost - minCost) / 50));
        const costPrice = minCost + ((deptCount * 7919) % (maxCost - minCost + 1));
        const roundedCost = Math.round(costPrice / 1000) * 1000;

        // Mã vạch EAN-13 chuẩn Việt Nam (bắt đầu bằng 893)
        // 893 + 2 chữ số ngành + 6 chữ số stt = 11 số + 1 số 0 + check digit
        const deptCodeMap = { DO: '10', TP: '20', BK: '30', GV: '40', SU: '50', HC: '60', CS: '70', VP: '80' };
        const deptCode = deptCodeMap[prefix] || '90';
        const prefix12 = `893${deptCode}${String(globalIndex).padStart(7, '0')}`;
        const barcode = generateEan13(prefix12);

        // Trạng thái: 98% ACTIVE, 2% INACTIVE để kiểm thử bộ lọc
        const status = (globalIndex % 47 === 0) ? 'INACTIVE' : 'ACTIVE';

        // Ghi chú chi tiết
        const notes = [
          'Hàng chính hãng, bảo quản nơi khô ráo thoáng mát.',
          'Sản phẩm đạt chuẩn ISO 9001, hạn sử dụng 12 - 24 tháng.',
          'Đóng gói nguyên đai nguyên kiện từ nhà máy sản xuất.',
          'Phân phối kênh đại lý và điểm bán lẻ toàn quốc.',
          'Tiêu chuẩn an toàn vệ sinh thực phẩm theo quy chuẩn bộ Y tế.'
        ];
        const note = notes[globalIndex % notes.length];

        rows.push({
          'STT': stt,
          'Mã SKU (*)': sku,
          'Tên sản phẩm (*)': productName,
          'Đơn vị tính cơ sở (*)': unit,
          'Ngành hàng (Cấp 1)': dept,
          'Nhóm hàng (Cấp 2)': group.cat,
          'Phân nhóm (Cấp 3)': group.sub,
          'Quy cách đóng gói': pack,
          'Giá vốn (VNĐ)': roundedCost,
          'Mã vạch (Barcode)': barcode,
          'Trạng thái (ACTIVE / INACTIVE)': status,
          'Mô tả / Ghi chú': note
        });
      }
    }
  }

  return rows;
}

console.log('Đang khởi tạo danh mục 5.000 sản phẩm...');
const productData = generateProducts();
console.log(`Đã sinh xong ${productData.length} sản phẩm.`);

// Tạo Workbook
const wb = XLSX.utils.book_new();

// Sheet 1: DanhMucSanPham
const ws1 = XLSX.utils.json_to_sheet(productData, {
  header: [
    'STT',
    'Mã SKU (*)',
    'Tên sản phẩm (*)',
    'Đơn vị tính cơ sở (*)',
    'Ngành hàng (Cấp 1)',
    'Nhóm hàng (Cấp 2)',
    'Phân nhóm (Cấp 3)',
    'Quy cách đóng gói',
    'Giá vốn (VNĐ)',
    'Mã vạch (Barcode)',
    'Trạng thái (ACTIVE / INACTIVE)',
    'Mô tả / Ghi chú'
  ]
});

// Độ rộng các cột
ws1['!cols'] = [
  { wch: 8 },   // STT
  { wch: 18 },  // SKU
  { wch: 42 },  // Tên
  { wch: 18 },  // ĐVT
  { wch: 25 },  // Cấp 1
  { wch: 25 },  // Cấp 2
  { wch: 28 },  // Cấp 3
  { wch: 22 },  // Quy cách
  { wch: 18 },  // Giá vốn
  { wch: 22 },  // Barcode
  { wch: 25 },  // Trạng thái
  { wch: 55 }   // Ghi chú
];

XLSX.utils.book_append_sheet(wb, ws1, 'DanhMucSanPham');

// Sheet 2: HuongDan_QuyDinh
const guideData = [
  ['HƯỚNG DẪN QUY CHUẨN NHẬP DANH MỤC SẢN PHẨM TỪ TỆP EXCEL (QUY MÔ 5.000 SKU)'],
  [''],
  ['1. Các cột có dấu (*) là thông tin bắt buộc phải có dữ liệu.'],
  ['2. Mã SKU (*): Mã nhận diện duy nhất của sản phẩm trong hệ thống (2 - 50 ký tự: chữ hoa, số, gạch nối).'],
  ['3. CÂY PHÂN CẤP NHÓM HÀNG 3 CẤP:'],
  ['   - Cột "Ngành hàng (Cấp 1)": Cấp gốc cao nhất (Đồ uống, Thực phẩm đóng gói, Bánh kẹo & Đồ ăn vặt, Gia vị...).'],
  ['   - Cột "Nhóm hàng (Cấp 2)": Nhóm ngành trực thuộc (Nước giải khát, Bia, Mì - Miến - Phở, Bánh quy...).'],
  ['   - Cột "Phân nhóm (Cấp 3)": Phân nhánh chi tiết (Có ga, Bia lon, Mì ăn liền gói, Nước mắm cá cơm...).'],
  ['   - Hệ thống tự động phân tích và hiển thị đồng bộ lên Cây phân cấp sản phẩm.'],
  ['4. QUY TẮC CẬP NHẬT & GHI ĐÈ CẤP CÂY PHÂN CẤP:'],
  ['   - Nếu Mã SKU chưa tồn tại trong hệ thống -> TẠO MỚI và gán trực tiếp vào nhánh cây phân cấp tương ứng.'],
  ['   - Nếu Mã SKU đã tồn tại trong CSDL -> CẬP NHẬT thông tin, tự động GHI ĐÈ đổi cấp cây phân cấp.'],
  ['5. Tên sản phẩm (*): Tên hiển thị đầy đủ của mặt hàng (tối đa 200 ký tự).'],
  ['6. Đơn vị tính cơ sở (*): Đơn vị nhỏ nhất để theo dõi tồn kho (Lon, Chai, Hộp, Gói, Túi, Ram, Cuộn...).'],
  ['7. Quy cách đóng gói: Diễn giải quy cách đóng thùng/lốc phục vụ nhập kho và quy đổi đơn vị (Thùng 24 lon, Lốc 6 chai...).'],
  ['8. Giá vốn (VNĐ): Số tiền >= 0. Hệ thống lưu trữ chính xác phục vụ tính toán lợi nhuận và định giá bán buôn.'],
  ['9. Mã vạch: Chuẩn mã EAN-13 quốc gia Việt Nam (bắt đầu bằng 893) phục vụ tích hợp máy quét mã vạch.'],
  ['10. Trạng thái: ACTIVE (Đang kinh doanh) hoặc INACTIVE (Tạm ngưng kinh doanh).'],
  ['11. Hiệu năng: Tệp dữ liệu 5.000 sản phẩm được nạp và kiểm tra mượt mà theo kiến trúc Batch 500 records trong 1 giao dịch.'],
  ['12. Kết quả nhập: Báo cáo chi tiết số dòng tạo mới, cập nhật và bỏ qua dòng sai định dạng mà không gián đoạn luồng dữ liệu.']
];

const ws2 = XLSX.utils.aoa_to_sheet(guideData);
ws2['!cols'] = [{ wch: 100 }];
XLSX.utils.book_append_sheet(wb, ws2, 'HuongDan_QuyDinh');

// Lưu các file:
// 1. Thư mục gốc dự án d:\Documents\TTCS\Mau_Nhap_5000_SanPham_ERP.xlsx
const rootFilePath = path.resolve('..', 'Mau_Nhap_5000_SanPham_ERP.xlsx');
XLSX.writeFile(wb, rootFilePath);
console.log(`Đã xuất file thành công: ${rootFilePath}`);

// 2. Thư mục public d:\Documents\TTCS\ERP-Sales-Inventory-Frontend\public\Mau_Nhap_5000_SanPham_ERP.xlsx
const publicFilePath = path.resolve('public', 'Mau_Nhap_5000_SanPham_ERP.xlsx');
XLSX.writeFile(wb, publicFilePath);
console.log(`Đã xuất file thành công: ${publicFilePath}`);
