// Nhiệm vụ Ban Chỉ đạo ("6 rõ"): nhãn, màu, kiểu dữ liệu dùng chung
export type TrangThaiNv = 'chua_trien_khai' | 'dang_thuc_hien' | 'trinh_ky' | 'hoan_thanh' | 'tam_dung';
export type NhomNv = 'chuong_trinh_cong_tac' | 'viec_co_quan_thuong_truc' | 'khac';
export type LinhVuc = 'nq57' | 'khcn_dmst' | 'chuyen_doi_so' | 'de_an_06' | 'chung';

export const TT_NV: Record<TrangThaiNv, { nhan: string; nen: string; chu: string; thanh: string }> = {
  chua_trien_khai: { nhan: 'Chưa triển khai', nen: 'bg-nen-3', chu: 'text-mo-2', thanh: 'bg-mo' },
  dang_thuc_hien: { nhan: 'Đang thực hiện', nen: 'bg-xanh-nhat', chu: 'text-xanh', thanh: 'bg-xanh' },
  trinh_ky: { nhan: 'Đang trình ký', nen: 'bg-cam-nhat', chu: 'text-cam-dam', thanh: 'bg-cam' },
  hoan_thanh: { nhan: 'Hoàn thành', nen: 'bg-[#DCFCE7]', chu: 'text-[#166534]', thanh: 'bg-[#16A34A]' },
  tam_dung: { nhan: 'Tạm dừng', nen: 'bg-nen-3', chu: 'text-mo', thanh: 'bg-mo' },
};

export const NHOM_NV: Record<NhomNv, string> = {
  chuong_trinh_cong_tac: 'Chương trình công tác',
  viec_co_quan_thuong_truc: 'Việc của Cơ quan Thường trực',
  khac: 'Khác',
};

export const LINH_VUC: Record<LinhVuc, string> = {
  nq57: 'Nghị quyết 57',
  khcn_dmst: 'KHCN, đổi mới sáng tạo',
  chuyen_doi_so: 'Chuyển đổi số',
  de_an_06: 'Đề án 06',
  chung: 'Chung',
};

export type NhiemVu = {
  id: string; ma: string | null; nhom: NhomNv; linh_vuc: LinhVuc; ten: string; mo_ta: string | null;
  chu_tri_don_vi_id: string | null; chu_tri_ten: string | null; lanh_dao_phu_trach: string | null;
  han: string | null; san_pham: string | null; tham_quyen: string | null;
  can_cu_van_ban_id: string | null; can_cu_so_ky_hieu: string | null;
  trang_thai: TrangThaiNv; phan_tram: number; trang_thai_giao: 'de_xuat' | 'da_duyet'; duyet_luc: string | null;
  da_cap_nhat_theodoinq: boolean; qua_han: boolean; con_ngay: number | null;
  phoi_hop_ids: string[] | null; cap_nhat_cuoi: string | null; so_tep: number; tao_luc: string; tao_boi: string | null;
  // Nhiệm vụ định kỳ: chu kỳ, hạn trong kỳ; kỳ hiện tại (mã, hạn, đã xong), kỳ trước
  dinh_ky: DinhKy | null; han_trong_ky: number | null;
  ky_ma: string | null; ky_han: string | null; ky_xong: boolean; ky_truoc_ma: string | null; ky_truoc_xong: boolean;
};

export type DinhKy = 'tuan' | 'thang' | 'quy' | 'nam';
export const DINH_KY: Record<DinhKy, string> = { tuan: 'Hằng tuần', thang: 'Hằng tháng', quy: 'Hằng quý', nam: 'Hằng năm' };
export const THU: Record<number, string> = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ nhật' };
// "Hằng tháng, hạn ngày 25" · "Hằng tuần, hạn Thứ Sáu"
export function moTaDinhKy(dk: DinhKy, h: number | null): string {
  if (dk === 'tuan') return `${DINH_KY[dk]}, hạn ${THU[h ?? 5]}`;
  if (dk === 'thang') return `${DINH_KY[dk]}, hạn ${h ? `ngày ${h}` : 'ngày cuối tháng'}`;
  return `${DINH_KY[dk]}, hạn ${h ? `ngày ${h}` : 'ngày cuối'} tháng cuối ${dk === 'quy' ? 'quý' : 'năm'}`;
}
// "2026-10" -> "tháng 10/2026"; "2026-T40" -> "tuần 40/2026"; "2026-Q4" -> "quý IV/2026"
export function tenKyNv(ma: string | null | undefined): string {
  if (!ma) return '';
  let m = ma.match(/^(\d{4})-T(\d+)$/); if (m) return `tuần ${+m[2]}/${m[1]}`;
  m = ma.match(/^(\d{4})-Q(\d)$/); if (m) return `quý ${['', 'I', 'II', 'III', 'IV'][+m[2]]}/${m[1]}`;
  m = ma.match(/^(\d{4})-(\d{2})$/); if (m) return `tháng ${+m[2]}/${m[1]}`;
  return `năm ${ma}`;
}

export const COT_NV = 'id, ma, nhom, linh_vuc, ten, mo_ta, chu_tri_don_vi_id, chu_tri_ten, lanh_dao_phu_trach, han, san_pham, tham_quyen, can_cu_van_ban_id, can_cu_so_ky_hieu, trang_thai, phan_tram, trang_thai_giao, duyet_luc, da_cap_nhat_theodoinq, qua_han, con_ngay, phoi_hop_ids, cap_nhat_cuoi, so_tep, tao_luc, tao_boi, dinh_ky, han_trong_ky, ky_ma, ky_han, ky_xong, ky_truoc_ma, ky_truoc_xong';

// Hạn nhiệm vụ là ngày: tính đến 17:00 ngày đó (giờ VN)
export const hanNv = (han: string) => `${han}T17:00:00+07:00`;

// "6 rõ" còn thiếu -> nhắc CQTT hoàn thiện trước khi trình duyệt
export function thieu6Ro(n: Pick<NhiemVu, 'ten' | 'chu_tri_don_vi_id' | 'lanh_dao_phu_trach' | 'han' | 'san_pham' | 'tham_quyen'> & { dinh_ky?: DinhKy | null }): string[] {
  const t: string[] = [];
  if (!n.chu_tri_don_vi_id) t.push('rõ người (đơn vị chủ trì)');
  if (!n.lanh_dao_phu_trach) t.push('rõ trách nhiệm (lãnh đạo phụ trách)');
  if (!n.han && !n.dinh_ky) t.push('rõ thời gian (hạn)');
  if (!n.san_pham) t.push('rõ sản phẩm');
  if (!n.tham_quyen) t.push('rõ thẩm quyền');
  return t;
}

// Bỏ dấu tiếng Việt để tìm kiếm
export const khongDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
