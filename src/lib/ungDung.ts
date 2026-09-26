// Cài web ra màn hình chính (PWA) và thông báo đẩy khi không mở web
import { useEffect, useState } from 'react';
import { goiChucNang, supabase } from './supabase';

type SuKienCai = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let suKienCai: SuKienCai | null = null;
const nghe = new Set<() => void>();
const bao = () => nghe.forEach((f) => f());

// Khoá phóng to / thu nhỏ bằng 2 ngón (iPhone bỏ qua user-scalable=no nên chặn bằng sự kiện)
function khoaPhongTo() {
  const chan = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', chan, { passive: false });
  document.addEventListener('gesturechange', chan, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

export function khoiDongUngDung() {
  if (typeof window === 'undefined') return;
  khoaPhongTo();
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); suKienCai = e as SuKienCai; bao(); });
  window.addEventListener('appinstalled', () => { suKienCai = null; bao(); });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
  }
}

export const laIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const laDiDong = () => laIOS() || /android/i.test(navigator.userAgent);
export const laUngDung = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// 'android': có thể bấm cài ngay; 'ios': hướng dẫn Chia sẻ › Thêm vào MH chính; null: đã cài / không hỗ trợ
export function useCaiDat() {
  const [, dat] = useState(0);
  useEffect(() => { const f = () => dat((x) => x + 1); nghe.add(f); return () => { nghe.delete(f); }; }, []);
  const kieu: 'android' | 'ios' | null = laUngDung() ? null : suKienCai ? 'android' : laIOS() ? 'ios' : null;
  const cai = async () => {
    if (!suKienCai) return false;
    await suKienCai.prompt();
    const { outcome } = await suKienCai.userChoice;
    suKienCai = null; bao();
    return outcome === 'accepted';
  };
  return { kieu, cai };
}

// ---------- Thông báo đẩy ----------
export type TrangThaiDay = 'khong_ho_tro' | 'can_cai' | 'bi_chan' | 'da_bat' | 'chua_bat';

const hoTroDay = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function trangThaiDay(): Promise<TrangThaiDay> {
  if (!hoTroDay()) return laIOS() && !laUngDung() ? 'can_cai' : 'khong_ho_tro';
  if (Notification.permission === 'denied') return 'bi_chan';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'da_bat' : 'chua_bat';
}

const tuB64u = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const b64u = (b: ArrayBuffer | null) => (b ? btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '');

function tenMay() {
  const ua = navigator.userAgent;
  const hdh = laIOS() ? 'iPhone/iPad' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : 'Máy tính';
  const tr = /edg\//i.test(ua) ? 'Edge' : /crios|chrome/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : '';
  return [hdh, tr, laUngDung() ? 'ứng dụng' : ''].filter(Boolean).join(' · ');
}

async function luuDangKy(sub: PushSubscription) {
  const { error } = await supabase.rpc('dang_ky_push', {
    p_endpoint: sub.endpoint, p_p256dh: b64u(sub.getKey('p256dh')), p_auth: b64u(sub.getKey('auth')), p_thiet_bi: tenMay(),
  });
  if (error) throw error;
}

export async function batDay(): Promise<void> {
  if (!hoTroDay()) throw new Error(laIOS() ? 'Trên iPhone cần cài ứng dụng ra màn hình chính (iOS 16.4 trở lên) rồi mở từ biểu tượng.' : 'Trình duyệt này không hỗ trợ thông báo đẩy.');
  const quyen = await Notification.requestPermission();
  if (quyen !== 'granted') throw new Error('Chưa cho phép thông báo. Mở cài đặt trang web của trình duyệt để cho phép.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { khoa } = await goiChucNang<{ khoa: string }>('gui-thong-bao-day', { loai: 'khoa' });
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: tuB64u(khoa) });
  }
  await luuDangKy(sub);
}

export async function tatDay(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.rpc('huy_push', { p_endpoint: sub.endpoint });
  await sub.unsubscribe();
}

export const guiThuDay = () => goiChucNang<{ da_gui: number }>('gui-thong-bao-day', { loai: 'thu' });

// Sau khi đăng nhập: máy đã bật thì gắn lại vào tài khoản đang dùng
export async function dongBoDay() {
  try {
    if (!hoTroDay() || Notification.permission !== 'granted') return;
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (sub) await luuDangKy(sub);
  } catch { /* bỏ qua */ }
}

// Đăng xuất: máy này thôi nhận thông báo của tài khoản
export async function goDayKhiDangXuat() {
  try { await Promise.race([tatDay(), new Promise((r) => setTimeout(r, 2500))]); } catch { /* bỏ qua */ }
}
