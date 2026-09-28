// Giữ tạm tệp PDF + thông tin văn bản đang nhập trên máy (IndexedDB) để không mất khi
// điện thoại tải lại trang (chuyển ứng dụng, mở toàn màn hình, thiếu bộ nhớ). Xoá sau khi lưu / gửi thành công.
import type { MetaVb } from './docPdf';

type BanNhap = { tep: Blob; ten: string; loai: string; meta: MetaVb; luc: number };
const DB = 'bcd57-nhap', BANG = 'tep', HET_HAN = 7 * 86400e3;

function mo(): Promise<IDBDatabase> {
  return new Promise((ok, loi) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(BANG);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => loi(r.error);
  });
}
async function lam<T>(che: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await mo();
    return await new Promise<T>((ok, loi) => {
      const r = f(db.transaction(BANG, che).objectStore(BANG));
      r.onsuccess = () => ok(r.result); r.onerror = () => loi(r.error);
    });
  } catch { return undefined; }                                  // trình duyệt chặn IndexedDB: bỏ qua
}

export async function luuTepNhap(khoa: string, tep: File, meta: MetaVb) {
  await lam('readwrite', (s) => s.put({ tep, ten: tep.name, loai: tep.type, meta, luc: Date.now() } satisfies BanNhap, khoa));
}
export async function luuMetaNhap(khoa: string, meta: MetaVb) {
  const cu = await lam<BanNhap>('readonly', (s) => s.get(khoa));
  if (cu) await lam('readwrite', (s) => s.put({ ...cu, meta, luc: Date.now() }, khoa));
}
export async function docTepNhap(khoa: string): Promise<{ tep: File; meta: MetaVb } | null> {
  const b = await lam<BanNhap>('readonly', (s) => s.get(khoa));
  if (!b) return null;
  if (Date.now() - b.luc > HET_HAN) { await xoaTepNhap(khoa); return null; }
  return { tep: new File([b.tep], b.ten, { type: b.loai || 'application/pdf' }), meta: b.meta };
}
export async function xoaTepNhap(khoa: string) {
  await lam('readwrite', (s) => s.delete(khoa));
}
