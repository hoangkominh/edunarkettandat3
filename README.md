# EduMarket – Sàn trung gian dịch vụ cho sinh viên

Website tĩnh (HTML + CSS + JavaScript thuần), không cần build, không cần thư viện ngoài
(chỉ dùng Google Fonts cho font chữ, vẫn chạy bình thường nếu không có mạng).

## Tính năng

| Mục | Nội dung |
|-----|----------|
| Khám phá (3.3) | Nút mục tiêu nhanh (Cần qua môn X, IELTS 6.5+, TOEIC, Gym, Slide gấp, Eat-Clean/KTX), lọc danh mục, tìm kiếm, sắp xếp |
| Dữ liệu mẫu (10) | 18 dịch vụ thuộc 6 danh mục theo đặc tả |
| Watermark (4, 10.1) | Xem thử có watermark chìm mang tên người mua và MSSV, chặn chuột phải và chọn văn bản |
| Escrow (3.4, 6) | Luồng 4 bước: đặt đơn & nạp Escrow → sàn giữ tiền → người bán bàn giao → nghiệm thu & giải ngân (trừ hoa hồng), có khiếu nại |
| Diễn đàn (3.7, 10.7) | Đăng nhu cầu kèm ngân sách, gửi báo giá, người đăng bấm "Tạo đơn Escrow" |
| Chat (3.5, 8) | Chat Buyer ↔ Seller, tự động chặn và cảnh báo đỏ khi có số điện thoại, Zalo, STK, dấu hiệu lách sàn |
| Đăng dịch vụ (3.2) | Form tự đổi trường theo danh mục (số trang, PDF xem thử, chứng chỉ HLV, hạn dùng, ATTP...) |
| Quản trị (3.8, 7) | Doanh thu, tiền giữ Escrow, đơn hoàn tất, cấu hình hoa hồng 0–30% theo danh mục, xử lý khiếu nại |

Hoa hồng mặc định: Tài liệu 10%, Gia sư 12%, Tiếng Anh 12%, Kỹ năng & tiểu luận 15%, PT Gym 8%, Thực phẩm 5%.

## Cấu trúc thư mục

```
edumarket/
├── index.html      # Giao diện các trang (single page)
├── css/
│   └── style.css   # Giao diện, responsive, hỗ trợ dark mode
├── js/
│   └── app.js      # Toàn bộ logic: dữ liệu, escrow, chat, admin
└── README.md
```

## Chạy thử

Cách 1 – mở trực tiếp: nhấp đúp vào `index.html`.

Cách 2 – chạy local server (khuyên dùng):

```bash
cd edumarket
python -m http.server 3000
```

Sau đó mở `http://localhost:3000`.

## Đưa lên GitHub

```bash
cd edumarket
git init
git add .
git commit -m "Initial commit: EduMarket - sàn dịch vụ cho sinh viên"
git branch -M main
git remote add origin https://github.com/<TÊN_CỦA_BẠN>/edumarket.git
git push -u origin main
```

Bật GitHub Pages (tùy chọn): vào **Settings → Pages → Deploy from a branch → main / (root)**.

## Lưu ý quan trọng

- Đây là **bản frontend demo**. Dữ liệu được lưu trong `localStorage` của trình duyệt, chưa có máy chủ, không có thanh toán thật.
- Trang Quản trị chưa có đăng nhập. Khi đưa vào sản phẩm thật cần thêm backend (Node.js/Express, Django...), cơ sở dữ liệu, xác thực người dùng và cổng thanh toán có chức năng giữ tiền Escrow thật.
- Phần phát hiện lách sàn dùng biểu thức chính quy, chỉ mang tính chặn cơ bản. Chưa thay thế được kiểm duyệt của con người hay hệ thống AI chuyên dụng.
- Trong bản demo, một người dùng đóng vai cả người mua lẫn người bán để tiện thử nghiệm.

## Giấy phép

MIT (tùy chỉnh theo nhu cầu của bạn).
