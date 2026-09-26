/* Service worker BCĐ 57: cài ra màn hình chính, nhận thông báo đẩy khi không mở web */
const PHIEN_BAN = 'bcd57-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

const TRANG_MAT_MANG = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BCĐ 57</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F4F2ED;
font-family:system-ui,sans-serif;color:#1F1A17}div{text-align:center;padding:24px}b{display:block;font-size:18px;margin:12px 0 6px}
button{margin-top:16px;min-height:44px;padding:0 20px;border:0;border-radius:12px;background:#A4161A;color:#fff;font:inherit;font-weight:600}</style></head>
<body><div><img src="/icon-192.png" width="72" height="72" style="border-radius:16px" alt=""><b>Không có kết nối mạng</b>
<span>Kiểm tra mạng rồi thử lại.</span><br><button onclick="location.reload()">Thử lại</button></div></body></html>`;

// Chỉ xử lý mở trang: mất mạng thì hiện trang báo, không lưu dữ liệu nghiệp vụ trên máy
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(TRANG_MAT_MANG, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { tieu_de: e.data ? e.data.text() : '' }; }
  const tieuDe = d.tieu_de || 'BCĐ 57';
  e.waitUntil((async () => {
    await self.registration.showNotification(tieuDe, {
      body: d.noi_dung || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: d.the || PHIEN_BAN,
      renotify: true,
      lang: 'vi',
      data: { duong_dan: d.duong_dan || '/' },
    });
    // Web đang mở thì làm mới chuông thông báo
    const ds = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    ds.forEach((c) => c.postMessage({ loai: 'thong_bao_moi' }));
    if (self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(); } catch { /* bỏ qua */ } }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const dich = new URL((e.notification.data && e.notification.data.duong_dan) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const ds = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = ds.find((x) => new URL(x.url).origin === self.location.origin);
    if (c) {
      await c.focus();
      c.postMessage({ loai: 'mo_duong_dan', duong_dan: dich.replace(self.location.origin, '') });
      return;
    }
    await self.clients.openWindow(dich);
  })());
});

// Trình duyệt tự đổi đăng ký (hết hạn khoá) -> báo web đăng ký lại khi mở
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((ds) => ds.forEach((c) => c.postMessage({ loai: 'dang_ky_lai' }))));
});
