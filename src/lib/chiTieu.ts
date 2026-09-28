// Chỉ tiêu số liệu Chuyển đổi số – NQ 57 và Đề án 06
// Đơn vị chủ trì (đầu mối lĩnh vực) cài đặt chỉ tiêu, giao đơn vị cập nhật; đơn vị nhập số theo kỳ; Thường trực, lãnh đạo xem.
export type LvChiTieu = 'chuyen_doi_so' | 'de_an_06';
export type KieuChiTieu = 'ty_le' | 'so' | 'co_khong';
export type ChieuChiTieu = 'cao_hon_tot' | 'thap_hon_tot';

export const LV_CT: Record<LvChiTieu, { ten: string; ngan: string; dauMoi: string }> = {
  chuyen_doi_so: { ten: 'Chuyển đổi số – NQ 57', ngan: 'Chuyển đổi số', dauMoi: 'Phòng Văn hóa – Xã hội' },
  de_an_06: { ten: 'Đề án 06', ngan: 'Đề án 06', dauMoi: 'Tổ CSKV – Công an phường' },
};
export const KIEU_CT: Record<KieuChiTieu, { ten: string; goiY: string }> = {
  ty_le: { ten: 'Tỷ lệ (tử số / mẫu số)', goiY: 'VD: hồ sơ trực tuyến / tổng hồ sơ' },
  so: { ten: 'Số lượng', goiY: 'VD: số tài khoản VNeID kích hoạt mới' },
  co_khong: { ten: 'Có / Không', goiY: 'VD: đã có trang thông tin điện tử' },
};

export type ChiTieu = {
  id: string; linh_vuc: LvChiTieu; nhom: string; ma: string; ten: string; kieu: KieuChiTieu; don_vi_tinh: string | null;
  nhan_tu: string | null; nhan_mau: string | null;              // nhãn tử số, mẫu số (tỷ lệ)
  muc_tieu: number | null; chieu: ChieuChiTieu; han_ngay: number; luy_ke: boolean;   // luỹ kế: cộng dồn từ tháng 1 // hạn cập nhật: ngày … của tháng sau kỳ
  don_vi_ids: string[]; thu_tu: number; hoat_dong: boolean; ghi_chu: string | null;
};
export type SoLieu = {
  chi_tieu_id: string; don_vi_id: string; ky: string; tu: number | null; mau: number | null; gia_tri: number | null;
  ghi_chu: string | null; da_gui: boolean; cap_nhat_luc: string | null;
};

// Kỳ tháng 'YYYY-MM'
export const kyNay = (d = new Date()) => {
  const v = new Date(d.getTime() + 7 * 3600e3);
  return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}`;
};
// Kỳ mặc định: từ ngày 20 là kỳ tháng này (đang tổng hợp), trước đó là tháng trước (đang trong hạn cập nhật)
export const kyMacDinh = (d = new Date()) => (new Date(d.getTime() + 7 * 3600e3).getUTCDate() >= 20 ? kyNay(d) : kyLui(kyNay(d)));
export const kyLui = (ky: string, n = 1) => {
  const [y, m] = ky.split('-').map(Number); const t = y * 12 + (m - 1) - n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
export const tenKyCt = (ky: string) => { const [y, m] = ky.split('-'); return `Tháng ${Number(m)}/${y}`; };
export const tenKyNgan = (ky: string) => { const [y, m] = ky.split('-'); return `T${Number(m)}/${y.slice(2)}`; };
// Hạn cập nhật: 17:00 ngày han_ngay của tháng sau kỳ
export const hanKy = (ky: string, hanNgay: number) => {
  const sau = kyLui(ky, -1);
  return new Date(`${sau}-${String(hanNgay).padStart(2, '0')}T17:00:00+07:00`).toISOString();
};

// Giá trị 1 dòng số liệu (tỷ lệ tính %)
export function giaTriDong(ct: Pick<ChiTieu, 'kieu'>, s: Pick<SoLieu, 'tu' | 'mau' | 'gia_tri'> | undefined): number | null {
  if (!s) return null;
  if (ct.kieu === 'ty_le') return s.tu != null && s.mau ? (s.tu / s.mau) * 100 : null;
  return s.gia_tri;
}

// Gộp số liệu các đơn vị: tỷ lệ = tổng tử / tổng mẫu; số lượng = cộng; có/không = % đơn vị "có"
export function gopSoLieu(ct: ChiTieu, ds: SoLieu[]): { gt: number | null; tu: number; mau: number; soDv: number } {
  const co = ds.filter((s) => (ct.kieu === 'ty_le' ? s.tu != null && s.mau != null : s.gia_tri != null));
  if (!co.length) return { gt: null, tu: 0, mau: 0, soDv: 0 };
  if (ct.kieu === 'ty_le') {
    const tu = co.reduce((a, s) => a + (s.tu ?? 0), 0); const mau = co.reduce((a, s) => a + (s.mau ?? 0), 0);
    return { gt: mau ? (tu / mau) * 100 : null, tu, mau, soDv: co.length };
  }
  if (ct.kieu === 'co_khong') return { gt: (co.filter((s) => s.gia_tri === 1).length / co.length) * 100, tu: 0, mau: 0, soDv: co.length };
  return { gt: co.reduce((a, s) => a + (s.gia_tri ?? 0), 0), tu: 0, mau: 0, soDv: co.length };
}

// Kỳ đầu cần tải để tính: luỹ kế cần từ tháng 1 của năm
export const dauNam = (ky: string) => `${ky.slice(0, 4)}-01`;
// Các dòng số liệu (đã gửi) dùng để tính giá trị chỉ tiêu tại kỳ: luỹ kế = tháng 1 … kỳ; thường = đúng kỳ
export const dongTheoKy = (ct: Pick<ChiTieu, 'id' | 'luy_ke'>, ds: SoLieu[], ky: string, dv?: string) =>
  ds.filter((s) => s.chi_tieu_id === ct.id && s.da_gui && (!dv || s.don_vi_id === dv)
    && (ct.luy_ke ? s.ky >= dauNam(ky) && s.ky <= ky : s.ky === ky));
export const gtTheoKy = (ct: ChiTieu, ds: SoLieu[], ky: string, dv?: string) => gopSoLieu(ct, dongTheoKy(ct, ds, ky, dv)).gt;

export const datMucTieu = (ct: ChiTieu, gt: number | null) =>
  gt == null || ct.muc_tieu == null ? null : ct.chieu === 'cao_hon_tot' ? gt >= ct.muc_tieu : gt <= ct.muc_tieu;

export const dinhDangGt = (ct: Pick<ChiTieu, 'kieu' | 'don_vi_tinh'>, gt: number | null, le = 1) =>
  gt == null ? '—' : ct.kieu === 'so' ? `${gt.toLocaleString('vi-VN', { maximumFractionDigits: le })}${ct.don_vi_tinh ? ` ${ct.don_vi_tinh}` : ''}`
    : `${gt.toLocaleString('vi-VN', { maximumFractionDigits: le })}%`;
export const dinhDangMucTieu = (ct: ChiTieu) =>
  ct.muc_tieu == null ? 'Không đặt' : `${ct.chieu === 'cao_hon_tot' ? '≥' : '≤'} ${dinhDangGt(ct, ct.muc_tieu, 2)}`;

// Tỷ lệ hoàn thành so với mục tiêu (0..1) để vẽ thanh
export function tienDo(ct: ChiTieu, gt: number | null): number {
  if (gt == null) return 0;
  if (ct.kieu !== 'so') return Math.max(0, Math.min(1, gt / 100));
  if (!ct.muc_tieu) return 0;
  return ct.chieu === 'cao_hon_tot' ? Math.min(1, gt / ct.muc_tieu) : gt <= ct.muc_tieu ? 1 : Math.max(0, ct.muc_tieu / gt);
}
export const vachMucTieu = (ct: ChiTieu) => (ct.kieu !== 'so' && ct.muc_tieu != null ? ct.muc_tieu / 100 : ct.kieu === 'so' && ct.muc_tieu ? 1 : null);
