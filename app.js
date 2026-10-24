/* =========================================================
 * EduMarket - app.js
 * Ứng dụng web thuần HTML/CSS/JS, không cần build hay thư viện ngoài.
 * Dữ liệu được lưu trong localStorage của trình duyệt (chỉ để demo).
 * ========================================================= */
(function () {
  'use strict';

  /* =========================================================
   * 1. CẤU HÌNH
   * ========================================================= */
  const STORAGE_KEY = 'edumarket-v1';
  const ME = 'Sinh viên Demo';
  const STUDENT_ID = 'SV-DEMO-2026';
  const VIEWS = ['market', 'forum', 'orders', 'chat', 'post', 'admin'];
  const MIN_PRICE = 1000;

  const STEPS = [
    'Đặt đơn & nạp Escrow',
    'Sàn giữ tiền',
    'Người bán bàn giao',
    'Nghiệm thu & giải ngân'
  ];

  // Số bước đã hoàn thành theo trạng thái đơn
  const STATUS_DONE = { escrow: 2, delivered: 3, disputed: 3, completed: 4, refunded: 4 };
  const STATUS_LABEL = {
    escrow: 'Đang giữ tiền',
    delivered: 'Đã bàn giao',
    disputed: 'Đang khiếu nại',
    completed: 'Hoàn tất',
    refunded: 'Đã hoàn tiền'
  };

  const CATEGORIES = [
    {
      id: 'docs', name: 'Tài liệu học tập', commission: 10,
      fields: [
        { key: 'pages', label: 'Số trang', type: 'number' },
        { key: 'pdfPreview', label: 'Có PDF xem thử (có watermark)', type: 'checkbox' }
      ]
    },
    {
      id: 'tutor', name: 'Gia sư học tập', commission: 12,
      fields: [
        { key: 'sessions', label: 'Số buổi', type: 'number' },
        { key: 'experience', label: 'Kinh nghiệm (năm)', type: 'number' }
      ]
    },
    {
      id: 'english', name: 'Dạy kèm Tiếng Anh', commission: 12,
      fields: [
        { key: 'cert', label: 'Chứng chỉ đạt được (VD: IELTS 7.5)', type: 'text' }
      ]
    },
    {
      id: 'skills', name: 'Hỗ trợ kỹ năng & tiểu luận', commission: 15,
      fields: [
        { key: 'turnaround', label: 'Thời gian hoàn thành (giờ)', type: 'number' }
      ]
    },
    {
      id: 'gym', name: 'PT Gym', commission: 8,
      fields: [
        { key: 'certificate', label: 'Chứng chỉ HLV', type: 'text' },
        { key: 'duration', label: 'Thời lượng chương trình (tuần)', type: 'number' }
      ]
    },
    {
      id: 'food', name: 'Thực phẩm sinh viên', commission: 5,
      fields: [
        { key: 'expiry', label: 'Hạn dùng (giờ sau khi giao)', type: 'number' },
        { key: 'atvsttp', label: 'Chứng nhận ATTP', type: 'text' }
      ]
    }
  ];

  // Mục tiêu nhanh trên trang chủ
  const GOALS = [
    { label: 'Cần qua môn X', category: 'docs', q: '' },
    { label: 'Luyện IELTS 6.5+', category: 'english', q: 'ielts' },
    { label: 'Luyện TOEIC chuẩn đầu ra', category: 'english', q: 'toeic' },
    { label: 'Giảm cân 5kg / Gym', category: 'gym', q: '' },
    { label: 'Làm thuyết trình gấp & Slide', category: 'skills', q: 'slide' },
    { label: 'Cơm Eat-Clean / Ăn vặt KTX', category: 'food', q: '' }
  ];

  // Luật phát hiện lách sàn (số điện thoại, Zalo, STK, từ khóa)
  const RISK_RULES = [
    { re: /(?:\+84|\b0)(?:[\s.-]?\d){8,10}/, label: 'số điện thoại' },
    { re: /zalo|facebook|messenger|telegram/i, label: 'liên hệ ngoài sàn (Zalo/mạng xã hội)' },
    { re: /stk|số tài khoản|tk ngân hàng|số tk/i, label: 'số tài khoản ngân hàng' },
    { re: /(?<!\d)\d{9,14}(?!\d)/, label: 'dãy số nghi là số tài khoản' },
    { re: /chuyển khoản (?:riêng|trực tiếp)|ngoài sàn|lách sàn|nhắn riêng|không qua sàn|bỏ qua sàn|giao dịch riêng/i, label: 'từ khóa lách sàn' }
  ];

  /* =========================================================
   * 2. TIỆN ÍCH
   * ========================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = (prefix) => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const money = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' đ';
  const catById = (id) => CATEGORIES.find((c) => c.id === id);
  const catName = (id) => (catById(id) ? catById(id).name : id);
  const nowStr = () => new Date().toLocaleString('vi-VN');
  const commissionOf = (o) => Math.round((Number(o.amount) * (Number(o.commissionRate) || 0)) / 100);

  /**
   * Tạo phần tử DOM an toàn (dùng textContent, tránh XSS).
   * el('button', { class: 'btn', onclick: fn, text: 'Nhấn' }, child1, child2)
   */
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [key, val] of Object.entries(attrs)) {
        if (val === null || val === undefined || val === false) continue;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = String(val);
        else if (key === 'value') node.value = String(val);
        else if (key.startsWith('on') && typeof val === 'function') {
          node.addEventListener(key.slice(2), val);
        } else node.setAttribute(key, val === true ? '' : String(val));
      }
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function detectRisk(text) {
    return RISK_RULES.filter((r) => r.re.test(text)).map((r) => r.label);
  }

  /* =========================================================
   * 3. DỮ LIỆU & LƯU TRỮ
   * ========================================================= */
  let state = null;
  let filter = { category: 'all', q: '', sort: 'default' };
  let activeThread = null;
  let toastTimer = null;

  function seed() {
    return {
      commissions: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.commission])),
      services: [
        { id: 'sv1', category: 'docs', title: 'Đề cương & Đề thi Giải tích 1 ĐH Bách Khoa', price: 35000, seller: 'Minh Anh', rating: 4.8, desc: 'Tổng hợp đề cương và đề thi các năm, có lời giải chi tiết.', details: { 'Số trang': 85, 'PDF xem thử': 'Có' }, preview: true },
        { id: 'sv2', category: 'docs', title: 'Flashcard Anki Giải phẫu học Y đa khoa (600 thẻ)', price: 90000, seller: 'Quốc Bảo', rating: 4.9, desc: 'Bộ 600 thẻ Anki, bám sát giáo trình giải phẫu.', details: { 'Số thẻ': 600, 'PDF xem thử': 'Không' }, preview: false },
        { id: 'sv3', category: 'docs', title: 'Tóm tắt Kinh tế vi mô - Mindmap A4', price: 25000, seller: 'Thảo Vy', rating: 4.6, desc: 'Sơ đồ tư duy A4 tóm tắt toàn bộ chương trình kinh tế vi mô.', details: { 'Số trang': 4, 'PDF xem thử': 'Có' }, preview: true },
        { id: 'sv4', category: 'tutor', title: 'Gia sư Toán cao cấp & Xác suất thống kê', price: 120000, seller: 'Quang Huy', rating: 4.7, desc: 'Kèm 1-1 tại nhà hoặc online, giải bài tập theo buổi.', details: { 'Đơn vị': '1 buổi (2 giờ)', 'Kinh nghiệm': '3 năm' }, preview: false },
        { id: 'sv5', category: 'tutor', title: 'Gia sư Lập trình Python & C++', price: 150000, seller: 'Đức Anh', rating: 4.8, desc: 'Hỗ trợ bài tập lớn, đồ án và luyện đề thi lập trình.', details: { 'Đơn vị': '1 buổi (2 giờ)', 'Kinh nghiệm': '4 năm' }, preview: false },
        { id: 'sv6', category: 'tutor', title: 'Gia sư Vật lý & Hóa đại cương', price: 100000, seller: 'Ngọc Mai', rating: 4.5, desc: 'Ôn tập cuối kỳ, giải bài tập Vật lý và Hóa đại cương.', details: { 'Đơn vị': '1 buổi (2 giờ)', 'Kinh nghiệm': '2 năm' }, preview: false },
        { id: 'sv7', category: 'english', title: 'Luyện IELTS Speaking & Writing 6.5+', price: 200000, seller: 'Hải Yến', rating: 4.9, desc: 'Chấm và sửa bài Writing, luyện Speaking theo chủ đề Part 1-3.', details: { 'Đơn vị': '1 buổi (90 phút)', 'Chứng chỉ': 'IELTS 8.0' }, preview: false },
        { id: 'sv8', category: 'english', title: 'Tiếng Anh giao tiếp cho sinh viên', price: 150000, seller: 'Thanh Tâm', rating: 4.4, desc: 'Phản xạ giao tiếp, luyện phỏng vấn xin việc bằng tiếng Anh.', details: { 'Đơn vị': '1 buổi (90 phút)', 'Chứng chỉ': 'TOEIC 900' }, preview: false },
        { id: 'sv9', category: 'english', title: 'Luyện thi TOEIC 600+ chuẩn đầu ra', price: 180000, seller: 'Hải Yến', rating: 4.7, desc: 'Lộ trình 8 buổi, luyện đề Listening & Reading.', details: { 'Đơn vị': '1 buổi (90 phút)', 'Chứng chỉ': 'TOEIC 990' }, preview: false },
        { id: 'sv10', category: 'skills', title: 'Góp ý & sửa chuẩn APA/IEEE', price: 80000, seller: 'Thu Hà', rating: 4.6, desc: 'Sửa trích dẫn, định dạng và văn phong cho tiểu luận.', details: { 'Thời gian hoàn thành (giờ)': 24 }, preview: false },
        { id: 'sv11', category: 'skills', title: 'Thiết kế slide thuyết trình trong 24h', price: 250000, seller: 'Minh Anh', rating: 4.8, desc: 'Slide 15-20 trang, thiết kế gọn gàng, dễ đọc.', details: { 'Thời gian hoàn thành (giờ)': 24 }, preview: false },
        { id: 'sv12', category: 'skills', title: 'Luyện thuyết trình & phản biện thử', price: 150000, seller: 'Thu Hà', rating: 4.5, desc: 'Mô phỏng buổi bảo vệ trước hội đồng, góp ý nội dung và phong thái.', details: { 'Thời gian hoàn thành (giờ)': 2 }, preview: false },
        { id: 'sv13', category: 'gym', title: 'Giảm cân an toàn trong 8 tuần', price: 1200000, seller: 'Coach Tuấn', rating: 4.6, desc: 'Lịch tập và thực đơn cơ bản, phù hợp lịch học sinh viên.', details: { 'Chứng chỉ HLV': 'PT quốc tế', 'Thời lượng (tuần)': 8 }, preview: false },
        { id: 'sv14', category: 'gym', title: 'Tăng cơ cho người mới bắt đầu', price: 900000, seller: 'Coach Lan', rating: 4.7, desc: 'Giáo trình tập Beginner 12 tuần, hướng dẫn kỹ thuật chuẩn.', details: { 'Chứng chỉ HLV': 'PT nội địa', 'Thời lượng (tuần)': 12 }, preview: false },
        { id: 'sv15', category: 'gym', title: 'Yoga & giãn cơ trị đau vai gáy', price: 300000, seller: 'Coach Lan', rating: 4.8, desc: 'Bài tập giãn cơ ngắn 15 phút, phù hợp dân văn phòng và sinh viên.', details: { 'Chứng chỉ HLV': 'Yoga 200h', 'Thời lượng (tuần)': 4 }, preview: false },
        { id: 'sv16', category: 'food', title: 'Cơm Eat-Clean giao trưa mỗi ngày', price: 45000, seller: 'Bếp Xanh KTX', rating: 4.5, desc: 'Cơm ức gà, rau củ, ít dầu mỡ. Giao trước 11h30.', details: { 'Hạn dùng (giờ)': 4, 'Chứng nhận ATTP': 'Có' }, preview: false },
        { id: 'sv17', category: 'food', title: 'Granola yến mạch ăn sáng nhanh', price: 55000, seller: 'Bếp Xanh KTX', rating: 4.4, desc: 'Granola tự làm, không chất bảo quản, đóng hộp tiện mang theo.', details: { 'Hạn dùng (giờ)': 720, 'Chứng nhận ATTP': 'Có' }, preview: false },
        { id: 'sv18', category: 'food', title: 'Combo bánh tráng trộn & ăn vặt KTX', price: 40000, seller: 'Snack Sinh Viên', rating: 4.3, desc: 'Giao 30 phút, thanh toán khi nhận hàng (COD).', details: { 'Hạn dùng (giờ)': 12, 'Chứng nhận ATTP': 'Có' }, preview: false }
      ],
      posts: [
        {
          id: 'post1', title: 'Cần người làm slide thuyết trình 15 trang', category: 'skills',
          budget: 300000, deadline: '3 ngày', desc: 'Đề tài kinh tế số, cần thiết kế gọn và có biểu đồ.',
          owner: 'Thu Hà', closed: false,
          bids: [
            { id: 'b1', bidder: 'Minh Anh', price: 250000, note: 'Giao sau 2 ngày, sửa 2 lần miễn phí' }
          ]
        },
        {
          id: 'post2', title: 'Cần gia sư Toán rời rạc, 2 buổi/tuần', category: 'tutor',
          budget: 500000, deadline: '2 tuần', desc: 'Ôn kiến thức cơ bản và giải bài tập về nhà.',
          owner: ME, closed: false,
          bids: [
            { id: 'b2', bidder: 'Quang Huy', price: 450000, note: 'Có kinh nghiệm dạy Toán 3 năm' },
            { id: 'b3', bidder: 'Đức Anh', price: 480000, note: 'Dạy online, có tài liệu kèm' }
          ]
        }
      ],
      orders: [],
      threads: {
        'Minh Anh': [{ from: 'them', text: 'Chào bạn, bạn cần tài liệu môn nào?' }],
        'Quang Huy': [],
        'Thu Hà': [{ from: 'them', text: 'Mình có thể gửi báo giá sớm nếu bạn cần.' }]
      }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.services)) {
          return Object.assign(seed(), data);
        }
      }
    } catch (err) {
      console.warn('Không đọc được dữ liệu đã lưu, dùng dữ liệu mẫu.', err);
    }
    return seed();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Không lưu được dữ liệu (có thể trình duyệt đang chặn localStorage).', err);
    }
  }

  /* =========================================================
   * 4. THÔNG BÁO & ĐIỀU HƯỚNG
   * ========================================================= */
  function toast(message, type = 'ok') {
    const box = $('#toast');
    box.textContent = message;
    box.className = 'toast ' + type;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 3000);
  }

  function showView(name) {
    const view = VIEWS.includes(name) ? name : 'market';
    VIEWS.forEach((v) => { $('#view-' + v).hidden = v !== view; });
    $$('.nav-btn').forEach((b) => {
      const active = b.dataset.view === view;
      b.classList.toggle('active', active);
      if (active) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    try {
      if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    } catch (err) { /* một số môi trường file:// không cho đổi hash */ }
    renderView(view);
    window.scrollTo(0, 0);
  }

  function renderView(view) {
    switch (view) {
      case 'market': renderMarket(); break;
      case 'forum': renderForum(); break;
      case 'orders': renderOrders(); break;
      case 'chat': renderChat(); break;
      case 'admin': renderAdmin(); break;
      default: break;
    }
  }

  /* =========================================================
   * 5. KHÁM PHÁ: mục tiêu, danh mục, lọc & danh sách
   * ========================================================= */
  function renderMarket() {
    renderGoals();
    renderChips();
    renderListing();
  }

  function renderGoals() {
    $('#goals').replaceChildren(...GOALS.map((g) =>
      el('button', {
        type: 'button', class: 'goal', text: g.label,
        onclick: () => {
          filter.category = g.category;
          filter.q = g.q;
          $('#search').value = g.q;
          renderMarket();
          $('#listing').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      })
    ));
  }

  function renderChips() {
    const all = { id: 'all', name: 'Tất cả' };
    $('#chips').replaceChildren(...[all, ...CATEGORIES].map((c) =>
      el('button', {
        type: 'button', class: 'chip', text: c.name,
        'aria-pressed': String(filter.category === c.id),
        onclick: () => { filter.category = c.id; renderMarket(); }
      })
    ));
  }

  function filteredServices() {
    const q = filter.q.trim().toLowerCase();
    let list = state.services.filter((s) =>
      (filter.category === 'all' || s.category === filter.category) &&
      (!q || (s.title + ' ' + s.desc + ' ' + s.seller).toLowerCase().includes(q))
    );
    if (filter.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (filter.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (filter.sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
  }

  function renderListing() {
    const list = filteredServices();
    $('#result-count').textContent = `Tìm thấy ${list.length} dịch vụ`;
    const box = $('#listing');
    if (!list.length) {
      box.replaceChildren(el('p', { class: 'muted', text: 'Không tìm thấy dịch vụ phù hợp. Thử từ khóa khác nhé.' }));
      return;
    }
    box.replaceChildren(...list.map(serviceCard));
  }

  function serviceCard(s) {
    return el('article', { class: 'card' },
      el('span', { class: 'tag', text: catName(s.category) }),
      el('h3', { text: s.title }),
      el('p', { class: 'muted small', text: `Người bán: ${s.seller} · ${s.rating ? '★ ' + Number(s.rating).toFixed(1) : 'Mới'}` }),
      el('p', { class: 'desc', text: s.desc }),
      el('div', { class: 'card-foot' },
        el('strong', { class: 'price', text: money(s.price) }),
        el('div', { class: 'btn-row' },
          el('button', { type: 'button', class: 'btn ghost small', text: 'Chi tiết', onclick: () => openDetail(s) }),
          el('button', { type: 'button', class: 'btn small', text: 'Mua qua Escrow', onclick: () => buyService(s) })
        )
      )
    );
  }

  /* ---------- Chi tiết + xem thử có watermark ---------- */
  function openDetail(s) {
    const dlg = $('#detail-dialog');
    $('#detail-title').textContent = s.title;
    $('#detail-meta').textContent = `${catName(s.category)} · Người bán: ${s.seller} · ${s.rating ? '★ ' + Number(s.rating).toFixed(1) : 'Mới'}`;
    $('#detail-desc').textContent = s.desc;
    $('#detail-info').replaceChildren(...Object.entries(s.details || {}).map(([k, v]) =>
      el('li', null, el('strong', { text: k + ': ' }), String(v))
    ));
    $('#detail-preview').replaceChildren(
      s.preview
        ? buildPreview(s)
        : el('p', { class: 'muted', text: 'Dịch vụ này không có bản xem thử. Bạn có thể mua qua Escrow để nhận bàn giao.' })
    );
    $('#detail-buy').onclick = () => { dlg.close(); buyService(s); };
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  /**
   * Xem thử có watermark chìm: mang tên người mua và mã sinh viên,
   * chặn chuột phải và không cho chọn văn bản.
   */
  function buildPreview(s) {
    const page = el('div', { class: 'preview-page' },
      el('h4', { text: 'Trang xem thử — ' + s.title }),
      ...Array.from({ length: 6 }, (_, i) =>
        el('p', { text: `Đoạn ${i + 1}: nội dung xem thử (một phần). Nội dung đầy đủ được mở sau khi thanh toán qua Escrow.` })
      )
    );
    const line = `EduMarket · ${ME} · MSSV ${STUDENT_ID} · Không sao chép`;
    const watermark = el('div', { class: 'wm', 'aria-hidden': 'true' },
      Array.from({ length: 14 }, () => el('div', { text: line }))
    );
    return el('div', { class: 'preview', oncontextmenu: (e) => e.preventDefault() }, page, watermark);
  }

  /* ---------- Mua dịch vụ: tạo đơn Escrow ---------- */
  function buyService(s) {
    if (s.seller === ME) {
      toast('Bạn không thể mua dịch vụ của chính mình.', 'error');
      return;
    }
    createOrder({
      serviceTitle: s.title, buyer: ME, seller: s.seller,
      amount: s.price, category: s.category
    });
    toast('Đã nạp tiền vào Escrow. Sàn đang giữ tiền an toàn.', 'ok');
    showView('orders');
  }

  function createOrder({ serviceTitle, buyer, seller, amount, category }) {
    const cat = catById(category);
    const rate = state.commissions[category] !== undefined
      ? state.commissions[category]
      : (cat ? cat.commission : 10);
    const order = {
      id: uid('ord'),
      serviceTitle, buyer, seller,
      amount: Number(amount),
      category,
      commissionRate: Number(rate),
      status: 'escrow',
      createdAt: nowStr()
    };
    state.orders.unshift(order);
    save();
    return order;
  }

  /* =========================================================
   * 6. DIỄN ĐÀN: đăng nhu cầu, báo giá, tạo đơn Escrow
   * ========================================================= */
  function renderForum() {
    const box = $('#posts');
    if (!state.posts.length) {
      box.replaceChildren(el('p', { class: 'muted', text: 'Chưa có nhu cầu nào.' }));
      return;
    }
    box.replaceChildren(...state.posts.map(postCard));
  }

  function postCard(p) {
    const bidItems = p.bids.length
      ? p.bids.map((b) => bidRow(p, b))
      : [el('li', { class: 'muted', text: 'Chưa có báo giá nào.' })];
    const canBid = !p.closed && p.owner !== ME;

    return el('article', { class: 'card' },
      el('div', { class: 'card-head' },
        el('span', { class: 'tag', text: catName(p.category) }),
        p.closed ? el('span', { class: 'tag done', text: 'Đã chọn người làm' }) : null
      ),
      el('h3', { text: p.title }),
      el('p', { class: 'muted small', text: `Đăng bởi ${p.owner} · Ngân sách: ${money(p.budget)} · Thời hạn: ${p.deadline || 'Linh hoạt'}` }),
      el('p', { class: 'desc', text: p.desc }),
      el('h4', { text: `Báo giá (${p.bids.length})` }),
      el('ul', { class: 'bids' }, bidItems),
      canBid ? bidForm(p) : null
    );
  }

  function bidRow(p, b) {
    const canAccept = p.owner === ME && !p.closed;
    let action = null;
    if (canAccept) {
      action = el('button', { type: 'button', class: 'btn small', text: 'Tạo đơn Escrow', onclick: () => acceptBid(p, b) });
    } else if (b.accepted) {
      action = el('span', { class: 'tag done', text: 'Đã chọn' });
    }
    return el('li', { class: 'bid' },
      el('div', null,
        el('strong', { text: `${b.bidder} — ${money(b.price)}` }),
        el('div', { class: 'muted small', text: b.note || '' })
      ),
      action
    );
  }

  function bidForm(p) {
    const priceInput = el('input', { type: 'number', min: MIN_PRICE, step: 1000, required: true, placeholder: 'Giá báo (đ)', 'aria-label': 'Giá báo' });
    const noteInput = el('input', { type: 'text', maxlength: 200, placeholder: 'Ghi chú (thời gian, cam kết)', 'aria-label': 'Ghi chú báo giá' });
    const form = el('form', { class: 'bid-form', novalidate: true },
      priceInput, noteInput,
      el('button', { type: 'submit', class: 'btn small', text: 'Gửi báo giá' })
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = Number(priceInput.value);
      if (!value || value < MIN_PRICE) {
        toast('Giá báo tối thiểu là 1.000 đ.', 'error');
        return;
      }
      const note = noteInput.value.trim();
      if (detectRisk(note).length) {
        toast('Ghi chú có dấu hiệu lách sàn, vui lòng chỉnh sửa.', 'error');
        return;
      }
      p.bids.push({ id: uid('bid'), bidder: ME, price: value, note });
      save();
      renderForum();
      toast('Đã gửi báo giá.', 'ok');
    });
    return form;
  }

  function acceptBid(p, b) {
    createOrder({
      serviceTitle: p.title, buyer: p.owner, seller: b.bidder,
      amount: b.price, category: p.category
    });
    p.closed = true;
    b.accepted = true;
    save();
    toast('Đã tạo đơn Escrow: tiền được giữ tới khi nghiệm thu.', 'ok');
    showView('orders');
  }

  function initForumForm() {
    $('#forum-category').replaceChildren(...CATEGORIES.map((c) => el('option', { value: c.id, text: c.name })));
    $('#forum-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const title = fieldValue(form, 'title').trim();
      const budget = Number(fieldValue(form, 'budget'));
      const deadline = fieldValue(form, 'deadline').trim();
      const desc = fieldValue(form, 'desc').trim();
      const category = fieldValue(form, 'category');
      if (!title || !budget || budget < MIN_PRICE) {
        toast('Vui lòng nhập tiêu đề và ngân sách hợp lệ (tối thiểu 1.000 đ).', 'error');
        return;
      }
      if (detectRisk(title + ' ' + desc).length) {
        toast('Nội dung có dấu hiệu lách sàn, vui lòng chỉnh sửa.', 'error');
        return;
      }
      state.posts.unshift({
        id: uid('post'), title, category, budget, deadline, desc,
        owner: ME, bids: [], closed: false
      });
      save();
      form.reset();
      $('#forum-category').value = CATEGORIES[0].id;
      renderForum();
      toast('Đã đăng nhu cầu. Người làm có thể gửi báo giá.', 'ok');
    });
  }

  /* Đọc giá trị ô nhập theo name (an toàn, luôn trả về chuỗi) */
  function fieldValue(root, name) {
    const node = root.querySelector(`[name="${name}"]`);
    return node && node.value !== undefined ? String(node.value) : '';
  }

  /* =========================================================
   * 7. ĐƠN HÀNG & ESCROW
   * ========================================================= */
  function renderOrders() {
    const box = $('#orders');
    if (!state.orders.length) {
      box.replaceChildren(el('p', { class: 'muted', text: 'Chưa có đơn nào. Hãy mua dịch vụ hoặc chọn báo giá để tạo đơn Escrow.' }));
      return;
    }
    box.replaceChildren(...state.orders.map(orderCard));
  }

  function orderCard(o) {
    const done = STATUS_DONE[o.status] || 0;
    const stepItems = STEPS.map((label, i) =>
      el('li', { class: i < done ? 'done' : (i === done ? 'current' : '') }, label)
    );

    const actions = [];
    if (o.status === 'escrow') {
      actions.push(el('button', { type: 'button', class: 'btn small', text: 'Người bán đã bàn giao (mô phỏng)', onclick: () => setOrderStatus(o.id, 'delivered') }));
    }
    if (o.status === 'delivered') {
      actions.push(el('button', { type: 'button', class: 'btn small', text: 'Nghiệm thu & giải ngân', onclick: () => setOrderStatus(o.id, 'completed') }));
      actions.push(el('button', { type: 'button', class: 'btn small ghost', text: 'Khiếu nại', onclick: () => setOrderStatus(o.id, 'disputed') }));
    }
    if (o.status === 'disputed') {
      actions.push(el('span', { class: 'muted small', text: 'Đang chờ quản trị viên xử lý khiếu nại.' }));
    }

    const commission = commissionOf(o);
    return el('article', { class: 'card' },
      el('div', { class: 'card-head' },
        el('strong', { text: o.serviceTitle }),
        el('span', { class: 'tag status-' + o.status, text: STATUS_LABEL[o.status] || o.status })
      ),
      el('p', { class: 'muted small', text: `Người mua: ${o.buyer} · Người bán: ${o.seller} · Tạo lúc ${o.createdAt}` }),
      el('p', null,
        el('strong', { text: `Escrow: ${money(o.amount)}` }),
        ` · Hoa hồng ${o.commissionRate}% (${money(commission)}) · Người bán nhận ${money(o.amount - commission)}`
      ),
      el('ol', { class: 'steps' }, stepItems),
      actions.length ? el('div', { class: 'btn-row' }, actions) : null
    );
  }

  function setOrderStatus(id, status) {
    const order = state.orders.find((x) => x.id === id);
    if (!order) return;
    order.status = status;
    order.updatedAt = nowStr();
    save();
    if (status === 'completed') {
      toast(`Đã giải ngân ${money(order.amount - commissionOf(order))} cho người bán.`, 'ok');
    } else if (status === 'disputed') {
      toast('Đã mở khiếu nại. Tiền vẫn được giữ trong Escrow.', 'error');
    } else {
      toast('Cập nhật trạng thái đơn thành công.', 'ok');
    }
    renderOrders();
  }

  /* =========================================================
   * 8. TIN NHẮN BUYER ↔ SELLER (có cảnh báo lách sàn)
   * ========================================================= */
  function renderChat() {
    const names = Object.keys(state.threads);
    if (!activeThread || !state.threads[activeThread]) activeThread = names[0] || null;

    $('#thread-list').replaceChildren(...names.map((n) =>
      el('button', {
        type: 'button',
        class: 'thread' + (n === activeThread ? ' active' : ''),
        'aria-current': n === activeThread ? 'true' : null,
        text: n,
        onclick: () => {
          activeThread = n;
          $('#chat-warning').hidden = true;
          renderChat();
        }
      })
    ));

    const box = $('#messages');
    if (!activeThread) {
      $('#chat-title').textContent = 'Chưa có cuộc trò chuyện';
      box.replaceChildren(el('p', { class: 'muted', text: 'Hãy liên hệ người bán từ trang Khám phá.' }));
      return;
    }

    $('#chat-title').textContent = 'Trò chuyện với ' + activeThread;
    const messages = state.threads[activeThread];
    if (!messages.length) {
      box.replaceChildren(el('p', { class: 'muted', text: 'Hãy bắt đầu cuộc trò chuyện.' }));
    } else {
      box.replaceChildren(...messages.map((m) =>
        el('div', { class: 'msg ' + (m.from === 'me' ? 'me' : 'them'), text: m.text })
      ));
    }
    box.scrollTop = box.scrollHeight;
  }

  function onChatSubmit(e) {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    const warning = $('#chat-warning');
    if (!text || !activeThread) return;

    const reasons = detectRisk(text);
    if (reasons.length) {
      warning.hidden = false;
      warning.textContent = '⚠️ Tin nhắn đã bị chặn vì phát hiện ' + reasons.join(', ') +
        '. Hãy giữ mọi giao dịch trên EduMarket để được bảo vệ bởi Escrow.';
      return;
    }

    warning.hidden = true;
    state.threads[activeThread].push({ from: 'me', text });
    input.value = '';
    save();
    renderChat();
  }

  /* =========================================================
   * 9. ĐĂNG DỊCH VỤ (form thay đổi theo danh mục)
   * ========================================================= */
  function initPostForm() {
    const select = $('#post-category');
    select.replaceChildren(...CATEGORIES.map((c) => el('option', { value: c.id, text: c.name })));
    select.addEventListener('change', renderExtraFields);
    renderExtraFields();
    $('#post-form').addEventListener('submit', onPostSubmit);
  }

  function renderExtraFields() {
    const cat = catById($('#post-category').value) || CATEGORIES[0];
    $('#post-extra').replaceChildren(...cat.fields.map((f) => {
      if (f.type === 'checkbox') {
        return el('label', { class: 'check' },
          el('input', { type: 'checkbox', name: f.key }),
          f.label
        );
      }
      return el('label', { class: 'field' },
        el('span', { text: f.label }),
        el('input', { type: f.type, name: f.key, min: f.type === 'number' ? 0 : null })
      );
    }));
  }

  function onPostSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const category = fieldValue(form, 'category');
    const title = fieldValue(form, 'title').trim();
    const price = Number(fieldValue(form, 'price'));
    const desc = fieldValue(form, 'desc').trim();

    if (!title || !price || price < MIN_PRICE) {
      toast('Vui lòng nhập tiêu đề và giá hợp lệ (tối thiểu 1.000 đ).', 'error');
      return;
    }
    if (detectRisk(title + ' ' + desc).length) {
      toast('Nội dung có dấu hiệu lách sàn, vui lòng chỉnh sửa.', 'error');
      return;
    }

    const cat = catById(category) || CATEGORIES[0];
    const details = {};
    let preview = false;
    cat.fields.forEach((f) => {
      const input = form.querySelector(`[name="${f.key}"]`);
      if (!input) return;
      if (f.type === 'checkbox') {
        details[f.label] = input.checked ? 'Có' : 'Không';
        if (f.key === 'pdfPreview') preview = input.checked;
      } else {
        details[f.label] = String(input.value).trim() || '—';
      }
    });

    state.services.unshift({
      id: uid('sv'), category: cat.id, title, price,
      seller: ME, rating: 0,
      desc: desc || 'Chưa có mô tả.',
      details, preview
    });
    save();
    form.reset();
    $('#post-category').value = cat.id;
    renderExtraFields();
    toast('Đã đăng dịch vụ thành công!', 'ok');
    showView('market');
  }

  /* =========================================================
   * 10. QUẢN TRỊ: thống kê, hoa hồng, khiếu nại
   * ========================================================= */
  function renderAdmin() {
    const completed = state.orders.filter((o) => o.status === 'completed');
    const held = state.orders.filter((o) => ['escrow', 'delivered', 'disputed'].includes(o.status));
    const disputes = state.orders.filter((o) => o.status === 'disputed');

    const revenue = completed.reduce((sum, o) => sum + commissionOf(o), 0);
    const heldAmount = held.reduce((sum, o) => sum + o.amount, 0);

    $('#stats').replaceChildren(
      statCard('Doanh thu sàn (hoa hồng)', money(revenue)),
      statCard('Tiền đang giữ Escrow', money(heldAmount)),
      statCard('Đơn hoàn tất', String(completed.length)),
      statCard('Khiếu nại đang mở', String(disputes.length))
    );

    $('#commission-table').replaceChildren(...CATEGORIES.map((c) => {
      const input = el('input', {
        type: 'number', min: 0, max: 30, step: 0.5,
        value: state.commissions[c.id],
        'aria-label': 'Hoa hồng ' + c.name
      });
      input.addEventListener('change', () => {
        const v = Number(input.value);
        if (Number.isNaN(v) || v < 0 || v > 30) {
          toast('Tỷ lệ hoa hồng phải từ 0% đến 30%.', 'error');
          input.value = state.commissions[c.id];
          return;
        }
        state.commissions[c.id] = v;
        save();
        toast(`Đã cập nhật hoa hồng "${c.name}" thành ${v}%.`, 'ok');
      });
      return el('tr', null,
        el('td', { text: c.name }),
        el('td', null, input, ' %')
      );
    }));

    $('#disputes').replaceChildren(...(disputes.length
      ? disputes.map((o) => el('article', { class: 'card' },
          el('strong', { text: o.serviceTitle }),
          el('p', { class: 'muted small', text: `Người mua: ${o.buyer} · Người bán: ${o.seller} · ${money(o.amount)}` }),
          el('div', { class: 'btn-row' },
            el('button', { type: 'button', class: 'btn ghost small', text: 'Hoàn tiền cho người mua', onclick: () => resolveDispute(o.id, 'refunded') }),
            el('button', { type: 'button', class: 'btn small', text: 'Giải ngân cho người bán', onclick: () => resolveDispute(o.id, 'completed') })
          )
        ))
      : [el('p', { class: 'muted', text: 'Không có khiếu nại nào.' })]
    ));
  }

  function statCard(label, value) {
    return el('div', { class: 'stat' },
      el('div', { class: 'label', text: label }),
      el('div', { class: 'value', text: value })
    );
  }

  function resolveDispute(id, status) {
    const order = state.orders.find((x) => x.id === id);
    if (!order) return;
    order.status = status;
    order.updatedAt = nowStr();
    save();
    toast(status === 'refunded' ? 'Đã hoàn tiền cho người mua.' : 'Đã giải ngân cho người bán.', 'ok');
    renderAdmin();
  }

  /* =========================================================
   * 11. KHỞI TẠO
   * ========================================================= */
  function init() {
    state = load();

    $$('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });

    $('#search').addEventListener('input', (e) => {
      filter.q = e.target.value;
      renderListing();
    });

    $('#sort').addEventListener('change', (e) => {
      filter.sort = e.target.value;
      renderListing();
    });

    $('#detail-close').addEventListener('click', () => $('#detail-dialog').close());

    $('#chat-form').addEventListener('submit', onChatSubmit);

    $('#reset-data').addEventListener('click', () => {
      if (!window.confirm('Khôi phục dữ liệu mẫu? Mọi thay đổi trên trình duyệt này sẽ bị xóa.')) return;
      state = seed();
      save();
      activeThread = null;
      renderAdmin();
      toast('Đã khôi phục dữ liệu mẫu.', 'ok');
    });

    initForumForm();
    initPostForm();

    window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
    showView(location.hash.slice(1) || 'market');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
