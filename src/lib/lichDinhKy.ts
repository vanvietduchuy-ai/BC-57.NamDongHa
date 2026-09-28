// Lịch báo cáo định kỳ — cùng quy tắc với hàm SQL sinh_ky_tu_lich (migration 1400):
//   kỳ nối tiếp: kỳ trước hết hạn nộp thì tạo kỳ của tháng chốt kế tiếp;
//   số liệu từ ngày mo_ngay tháng trước đến (mo_ngay - 1) tháng chốt; hạn đơn vị nộp han_gio ngày han_ngay tháng chốt;
//   cùng tháng chốt chỉ tạo báo cáo cấp cao nhất (khi lịch cấp cao bật thay_thang).
export type QuyTacLich = {
  mo_ngay?: number; han_ngay?: number; han_gio?: string; han_gui_tinh_ngay?: number;
  thang_chot?: number[]; thay_thang?: boolean;
};
export type LichDk = { id: string; ten: string; loai: string; hoat_dong: boolean; quy_tac: QuyTacLich };

export const CAP_LICH: Record<string, number> = { thang: 1, quy: 3, sau_thang: 6, nam: 12 };
export const THANG_CHOT_MD: Record<string, number[]> = {
  thang: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], quy: [3, 6, 9, 12], sau_thang: [6, 12], nam: [12],
};
const thangChot = (l: LichDk) => (l.quy_tac.thang_chot?.length ? l.quy_tac.thang_chot : THANG_CHOT_MD[l.loai] ?? []);

const TEN_MAC_DINH = ['Báo cáo tháng', 'Báo cáo quý', 'Báo cáo 6 tháng', 'Báo cáo năm'];
// Như SQL ten_ky_theo_lich: lịch đặt tên riêng -> "Tên lịch tháng 10/2026"
export function tenKyTheoLich(tenLich: string | null | undefined, loai: string, thang: number, nam: number) {
  const t = (tenLich ?? '').trim();
  const goc = tenKy(loai, thang, nam);
  return !t || TEN_MAC_DINH.includes(t) ? goc : `${t} ${goc.replace(/^Báo cáo /, '')}`;
}

export function tenKy(loai: string, thang: number, nam: number) {
  if (loai === 'quy') return `Báo cáo quý ${['I', 'II', 'III', 'IV'][Math.floor((thang - 1) / 3)]}/${nam}`;
  if (loai === 'sau_thang') return `Báo cáo 6 tháng ${thang <= 6 ? 'đầu' : 'cuối'} năm ${nam}`;
  if (loai === 'nam') return `Báo cáo năm ${nam}`;
  return `Báo cáo tháng ${thang}/${nam}`;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const homNay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

export const TEN_LOAI_LICH: Record<string, string> = { thang: 'Hằng tháng', quy: 'Hằng quý', sau_thang: '6 tháng', nam: 'Hằng năm' };
const nd = (s: string) => s.split('-').reverse().join('/');

// Chuỗi kỳ định kỳ kế tiếp (tính từ kỳ số liệu đang diễn ra hôm nay); kỳ sau được tạo khi kỳ trước hết hạn
export type KyDuKien = { ten: string; loai: string; tu: string; den: string; han: string; taoSau: string | null };
export function chuoiKyTiepTheo(ds: LichDk[], soKy = 6, theoTenLich = false): KyDuKien[] {
  const bat = ds.filter((l) => l.hoat_dong && CAP_LICH[l.loai]);
  if (!bat.length) return [];
  const mo = [...bat].sort((a, b) => CAP_LICH[a.loai] - CAP_LICH[b.loai])[0].quy_tac.mo_ngay ?? 15;
  const [y0, m0, d0] = homNay().split('-').map(Number);
  let idx = (y0 * 12 + m0 - 1) + (d0 >= mo ? 1 : 0);             // tháng chốt hiện tại (đếm theo tháng)
  const ra: KyDuKien[] = [];
  let hanTruoc: string | null = null;
  for (let buoc = 0; buoc < 60 && ra.length < soKy; buoc++, idx++) {
    const nChot = Math.floor(idx / 12), tChot = (idx % 12) + 1;
    const trong: KyDuKien[] = [];
    for (const l of bat) {
      if (!thangChot(l).includes(tChot)) continue;
      if (bat.some((h) => h.id !== l.id && CAP_LICH[h.loai] > CAP_LICH[l.loai] && h.quy_tac.thay_thang && thangChot(h).includes(tChot))) continue;
      const m = l.quy_tac.mo_ngay ?? 15;
      const denIdx = idx, tuIdx = idx - CAP_LICH[l.loai];
      const den = iso(Math.floor(denIdx / 12), (denIdx % 12) + 1, m - 1);
      const tu = iso(Math.floor(tuIdx / 12), (tuIdx % 12) + 1, m);
      trong.push({ ten: theoTenLich ? tenKyTheoLich(l.ten, l.loai, tChot, nChot) : tenKy(l.loai, tChot, nChot), loai: l.loai, tu: nd(tu), den: nd(den),
        han: `${iso(nChot, tChot, l.quy_tac.han_ngay ?? 8)}T${l.quy_tac.han_gio ?? '17:00'}:00+07:00`, taoSau: hanTruoc });
    }
    if (trong.length) { ra.push(...trong); hanTruoc = trong.map((x) => x.han).sort().slice(-1)[0]; }
  }
  return ra.slice(0, soKy);
}
