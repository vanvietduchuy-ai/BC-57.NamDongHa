// Lập dự thảo báo cáo tổng hợp của một kỳ (mô hình trang A4, cùng kiểu MoHinhA4 của web).
// Dùng cho trang Soạn báo cáo chung của Thường trực BCĐ.
// Đầu vào: kết quả hàm SQL du_lieu_tong_hop(ky_id).
//   loai 'chung'    : báo cáo chung của Cơ quan Thường trực (gửi Công an tỉnh qua PV01)
//   loai 'linh_vuc' : báo cáo tổng hợp lĩnh vực của một đầu mối (Phòng VH-XH, Tổ CSKV) gửi Thường trực BCĐ

export type KhoiA4 =
  | { loai: 'tieu_de'; text: string; batBuoc?: boolean }
  | { loai: 'van'; ma: string; nhan: string; noiDung: string; goiY?: string; tuDo?: boolean }
  | { loai: 'so'; ma: string; nhan: string; noiDung: string; donViTinh?: string }
  | { loai: 'bang'; ma: string; tieuDe?: string; cot: string[]; rong: number[]; dong: string[][]; cotTrai?: number[] };

export type MoHinhA4 = {
  dang: boolean; cq: string; bh: string; so: string; kh: string; ngay: string; nam: number;
  tenLoai: string; trichYeu: string; trichYeuNhieuDong?: boolean; dongPhu: string; kinhGui?: string | null;
  khoi: KhoiA4[];
  noiNhan: string; chucDanh: string; hoTen: string;
};

type VanBanTH = { so_ky_hieu: string | null; ngay_ban_hanh: string | null; trich_yeu: string | null; nguoi_ky?: string | null; noi_dung: string | null } | null;
export type BaiTH = {
  don_vi_id: string; don_vi: string; thu_tu: number; trang_thai: string; nop_luc: string | null;
  han?: string; nop_ngoai?: boolean; so_lieu?: Record<string, unknown>; van_ban: VanBanTH;
};
export type KyTH = { id: string; ten: string; loai: string; cap: string; tu_ngay: string | null; den_ngay: string | null; han_nop: string; ky_cha_id: string | null };
export type DauMoiTH = {
  linh_vuc: string; don_vi_id: string; don_vi: string; ten_ban_hanh: string | null; co_quan_chu_quan: string | null;
  ky_hieu: string | null; nguoi_ky_chuc_danh: string | null; nguoi_ky_ho_ten: string | null;
};
export type TruongTH = { ma: string; nhan: string; kieu: string; don_vi_tinh?: string };
export type DuLieuTH = {
  ky: KyTH; ky_don_vi: KyTH; truong: TruongTH[]; bai_don_vi: BaiTH[]; bai_linh_vuc: BaiTH[];
  dau_moi: DauMoiTH[]; nguoi_ky: { chuc_danh?: string; ho_ten?: string } | null; luc: string;
};
export type TomTat = {
  so_don_vi: number; da_nop: number; dung_han: number; tre: number; chua_nop: number;
  ds_tre: string[]; ds_chua_nop: string[];
};

export const LV_CDS = ['nq57', 'khcn_dmst', 'chuyen_doi_so'];

// ---------- tiện ích ngày giờ (giờ Việt Nam) ----------
const ngayVN = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
const gioNgayVN = (iso: string) => {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('hour')} giờ ${g('minute')} ngày ${g('day')}/${g('month')}/${g('year')}`;
};
const ngayChu = (d: string) => d.split('-').reverse().join('/');          // 2026-10-08 -> 08/10/2026
const soVN = (n: number) => (Number.isInteger(n) ? n.toLocaleString('vi-VN') : n.toLocaleString('vi-VN', { maximumFractionDigits: 2 }));

// "Báo cáo quý IV/2026" -> "quý IV/2026"; kỳ đột xuất giữ nguyên tên
export function cumKy(ky: KyTH): string {
  const t = ky.ten.replace(/^Tổng hợp lĩnh vực\s*–\s*/i, '');
  if (ky.loai === 'dot_xuat') return '';
  return t.replace(/^báo cáo\s+/i, '').trim();
}
export const dongKyTu = (tu: string | null, den: string | null) => (tu && den ? `(Từ ngày ${ngayChu(tu)} đến ngày ${ngayChu(den)})` : '');

// Phần thân văn bản đọc từ PDF: bỏ phần ký, đề mục in hoa của văn bản gốc; ghép dòng thành đoạn
export function thanVanBan(chu?: string | null): string[] {
  if (!chu) return [];
  const d = chu.split('\n').map((x) => x.trim()).filter(Boolean);
  let cuoi = d.findIndex((x) => /^Nơi nhận/i.test(x));
  if (cuoi < 0) cuoi = d.length;
  const doan: string[] = [];
  for (const x of d.slice(0, cuoi)) {
    if (/^\((Từ|Kỳ)/.test(x)) continue;
    if (/\p{L}/u.test(x) && x === x.toUpperCase() && x.length < 90) continue;
    if (/^Kính gửi/.test(x)) continue;
    const moi = /^([IVX]+\.|\d+(\.\d+)*\.|[a-zđ]\)|[-+•])\s/.test(x) || !doan.length || /[.:;!?]$/.test(doan[doan.length - 1]);
    if (moi) doan.push(x); else doan[doan.length - 1] += ` ${x}`;
  }
  return doan;
}
const catNgan = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);

// ---------- tình hình gửi báo cáo ----------
const daGui = (b: BaiTH) => !!b.nop_luc && ['da_nop', 'da_duyet', 'can_bo_sung'].includes(b.trang_thai);
export function tomTatNop(bai: BaiTH[], hanKy: string): TomTat {
  const t: TomTat = { so_don_vi: bai.length, da_nop: 0, dung_han: 0, tre: 0, chua_nop: 0, ds_tre: [], ds_chua_nop: [] };
  for (const b of bai) {
    if (!daGui(b)) { t.chua_nop++; t.ds_chua_nop.push(b.don_vi); continue; }
    t.da_nop++;
    if (Date.parse(b.nop_luc!) <= Date.parse(b.han ?? hanKy)) t.dung_han++; else { t.tre++; t.ds_tre.push(b.don_vi); }
  }
  return t;
}
const trichDanVb = (b: BaiTH) => b.van_ban
  ? `Báo cáo số ${b.van_ban.so_ky_hieu ?? '…'}${b.van_ban.ngay_ban_hanh ? ` ngày ${ngayChu(b.van_ban.ngay_ban_hanh)}` : ''}`
  : '';
function danhGiaNop(b: BaiTH, hanKy: string): string {
  if (!daGui(b)) return 'Chưa gửi';
  const tre = Math.ceil((Date.parse(b.nop_luc!) - Date.parse(b.han ?? hanKy)) / 86_400_000);
  const s = tre > 0 ? `Trễ ${tre} ngày` : 'Đúng hạn';
  return b.trang_thai === 'can_bo_sung' ? `${s}, đang bổ sung` : s;
}
export function bangTinhHinh(bai: BaiTH[], hanKy: string): KhoiA4 {
  return {
    loai: 'bang', ma: 'tinh_hinh_nop', tieuDe: 'Tình hình các đơn vị gửi báo cáo',
    cot: ['TT', 'Đơn vị', 'Văn bản', 'Ngày gửi', 'Đánh giá'], rong: [620, 2800, 2351, 1450, 1850], cotTrai: [1, 2],
    dong: bai.map((b, i) => [
      String(i + 1), b.don_vi,
      b.van_ban ? `${b.van_ban.so_ky_hieu ?? 'Chưa ghi số'}${b.van_ban.ngay_ban_hanh ? ` (${ngayChu(b.van_ban.ngay_ban_hanh)})` : ''}` : (daGui(b) ? (b.nop_ngoai ? 'Bản giấy / email' : 'Số liệu trên hệ thống') : ''),
      daGui(b) ? ngayVN(b.nop_luc!) : '', danhGiaNop(b, hanKy),
    ]),
  };
}
function cauTinhHinh(t: TomTat, ky: KyTH, chuThe: string): string {
  const ph = [`${t.dung_han} đơn vị gửi đúng hạn`];
  if (t.tre) ph.push(`${t.tre} đơn vị gửi trễ hạn (${t.ds_tre.join(', ')})`);
  if (t.chua_nop) ph.push(`${t.chua_nop} đơn vị chưa gửi (${t.ds_chua_nop.join(', ')})`);
  return `${chuThe} đã đôn đốc ${t.so_don_vi} đơn vị báo cáo${cumKy(ky) ? ` ${cumKy(ky)}` : ''}; đến hết hạn (${gioNgayVN(ky.han_nop)}), ${ph.join('; ')}.`;
}

// ---------- nội dung của từng đơn vị ----------
function noiDungDonVi(b: BaiTH, truong: TruongTH[], n = 600): string {
  if (b.van_ban) {
    const t = thanVanBan(b.van_ban.noi_dung).join(' ');
    return t ? catNgan(t, n) : (b.van_ban.trich_yeu ? `V/v ${b.van_ban.trich_yeu}` : '…');
  }
  const sl = b.so_lieu ?? {};
  const MUC_RIENG = ['kho_khan', 'nhiem_vu_toi', 'de_xuat'];           // đưa vào mục III–V
  const maVb = truong.filter((x) => x.kieu === 'van_ban').map((x) => x.ma);
  const ma = (maVb.length ? maVb : Object.keys(sl)).filter((k) => !k.startsWith('_') && !MUC_RIENG.includes(k));
  const phan = ma.filter((k) => typeof sl[k] === 'string' && String(sl[k]).trim())
    .map((k) => String(sl[k]).trim().replace(/\s*\n+\s*/g, '; '));
  return phan.length ? catNgan(phan.join(' '), n) : '…';
}
function dongDonVi(bai: BaiTH[], truong: TruongTH[]): string[] {
  const gui = bai.filter(daGui);
  if (!gui.length) return ['(Chưa có đơn vị gửi báo cáo.)'];
  return gui.map((b) => `- ${b.don_vi}${b.van_ban ? ` (${trichDanVb(b)})` : ''}: ${noiDungDonVi(b, truong)}`);
}
// Trường văn bản của phiếu gom theo mục (tồn tại, nhiệm vụ tới, đề xuất)
function gomTruong(bai: BaiTH[], ma: string): string[] {
  return bai.filter(daGui).flatMap((b) => {
    const v = b.so_lieu?.[ma];
    return typeof v === 'string' && v.trim() ? [`- ${b.don_vi}: ${v.trim().replace(/\s*\n+\s*/g, '; ')}`] : [];
  });
}
// "1.240" = 1240 · "78,5" = 78.5 · "78.5" = 78.5 · "12%" = 12
export function docSo(x: string): number {
  const s = x.replace(/[%\s]/g, '');
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  return Number(s);
}
// Bảng cộng số liệu của phiếu (trường kiểu số / tỷ lệ)
function bangSoLieu(bai: BaiTH[], truong: TruongTH[]): KhoiA4 | null {
  const so = truong.filter((t) => t.kieu === 'so' || t.kieu === 'ty_le');
  if (!so.length) return null;
  const gui = bai.filter(daGui);
  const dong = so.map((t, i) => {
    const gt = gui.map((b) => String(b.so_lieu?.[t.ma] ?? '').trim()).filter(Boolean)
      .map(docSo).filter((x) => Number.isFinite(x));
    const tong = t.kieu === 'ty_le' ? (gt.length ? gt.reduce((a, b) => a + b, 0) / gt.length : NaN) : gt.reduce((a, b) => a + b, 0);
    return [String(i + 1), t.nhan, t.don_vi_tinh ?? (t.kieu === 'ty_le' ? '%' : ''), gt.length ? soVN(tong) : '', String(gt.length)];
  });
  return {
    loai: 'bang', ma: 'so_lieu_tong_hop', tieuDe: 'Tổng hợp số liệu các đơn vị báo cáo (tỷ lệ tính bình quân)',
    cot: ['TT', 'Nội dung', 'Đơn vị tính', 'Tổng hợp', 'Số đơn vị'], rong: [620, 4251, 1300, 1600, 1300], cotTrai: [1],
    dong,
  };
}

// ---------- lập mô hình ----------
const phanLinhVuc = (dm: DauMoiTH[]) => {
  const cds = dm.some((x) => LV_CDS.includes(x.linh_vuc)), da06 = dm.some((x) => x.linh_vuc === 'de_an_06');
  return { cds, da06, cum: [cds || !da06 ? 'Nghị quyết số 57-NQ/TW' : '', da06 ? 'Đề án 06' : ''].filter(Boolean).join(' và ') };
};
const namCua = (ky: KyTH) => Number((ky.den_ngay ?? ky.han_nop).slice(0, 4));

export function lapBaoCaoChung(d: DuLieuTH): { m: MoHinhA4; tomTat: TomTat } {
  const ky = d.ky_don_vi;
  const t = tomTatNop(d.bai_don_vi, ky.han_nop);
  const lv = phanLinhVuc(d.dau_moi);
  const dmCua = (f: (x: string) => boolean) => d.dau_moi.find((x) => f(x.linh_vuc))?.don_vi_id;
  // Bài của đầu mối: kỳ Thường trực giao đầu mối (bai_don_vi); kỳ cũ có tầng "tổng hợp lĩnh vực" (bai_linh_vuc)
  const cuaDm = (id?: string) => d.bai_linh_vuc.find((b) => b.don_vi_id === id) ?? d.bai_don_vi.find((b) => b.don_vi_id === id);
  const baiCds = cuaDm(dmCua((x) => LV_CDS.includes(x)));
  const baiDa06 = cuaDm(dmCua((x) => x === 'de_an_06'));
  let daLietKe = false;
  const phan = (bai: BaiTH | undefined, tenDm?: string) => {
    if (bai && daGui(bai) && bai.van_ban) {
      const x = thanVanBan(bai.van_ban.noi_dung);
      return x.length ? x : [`(Theo ${trichDanVb(bai)} của ${bai.don_vi}: …)`];
    }
    if (daLietKe) return [`(Chờ báo cáo tổng hợp của ${tenDm ?? 'đầu mối'}; kết quả của các đơn vị đã nêu ở mục trên.)`];
    daLietKe = true;
    return dongDonVi(d.bai_don_vi, d.truong);
  };
  const tenDmCua = (f: (x: string) => boolean) => d.dau_moi.find((x) => f(x.linh_vuc))?.don_vi;
  const canCu = [baiCds, baiDa06].filter((b): b is BaiTH => !!b && daGui(b) && !!b.van_ban).map((b) => `${trichDanVb(b)} của ${b.don_vi}`);
  const ck = cumKy(ky);

  const ketQua: string[] = ['II. KẾT QUẢ THỰC HIỆN'];
  let muc = 1;
  if (d.dau_moi.length) {
    if (lv.cds || !lv.da06) ketQua.push(`${muc++}. Thực hiện Nghị quyết số 57-NQ/TW, khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số`, ...phan(baiCds, tenDmCua((x) => LV_CDS.includes(x))));
    if (lv.da06) ketQua.push(`${muc++}. Thực hiện Đề án 06`, ...phan(baiDa06, tenDmCua((x) => x === 'de_an_06')));
  } else {
    ketQua.push(`${muc++}. Kết quả thực hiện của các đơn vị`, ...dongDonVi(d.bai_don_vi, d.truong));
  }
  ketQua.push(`${muc}. An ninh mạng, an toàn thông tin`, '…');

  const khoi: KhoiA4[] = [
    { loai: 'van', ma: 'phan1', nhan: 'Phần I', tuDo: true, noiDung: [
      ...(canCu.length ? [`Trên cơ sở ${canCu.join('; ')}, Công an phường (Cơ quan Thường trực BCĐ 57) báo cáo như sau:`] : []),
      'I. CÔNG TÁC LÃNH ĐẠO, CHỈ ĐẠO, TRIỂN KHAI',
      '…',
      cauTinhHinh(t, ky, 'Cơ quan Thường trực'),
    ].join('\n') },
    bangTinhHinh(d.bai_don_vi, ky.han_nop),
    { loai: 'van', ma: 'phan2', nhan: 'Phần II', tuDo: true, noiDung: ketQua.join('\n') },
  ];
  const bang = bangSoLieu(d.bai_don_vi, d.truong);
  if (bang) khoi.push(bang);
  const tonTai = gomTruong(d.bai_don_vi, 'kho_khan'), nvToi = gomTruong(d.bai_don_vi, 'nhiem_vu_toi'), deXuat = gomTruong(d.bai_don_vi, 'de_xuat');
  khoi.push({ loai: 'van', ma: 'phan3', nhan: 'Phần III–V', tuDo: true, noiDung: [
    'III. TỒN TẠI, HẠN CHẾ', ...(tonTai.length ? tonTai : ['…']),
    `IV. NHIỆM VỤ TRỌNG TÂM ${ky.loai === 'thang' ? 'THÁNG' : 'THỜI GIAN'} TỚI`, ...(nvToi.length ? nvToi : ['…']),
    'V. ĐỀ XUẤT, KIẾN NGHỊ', ...(deXuat.length ? deXuat : ['…']),
  ].join('\n') });

  return {
    tomTat: t,
    m: {
      dang: false, cq: 'CÔNG AN TỈNH QUẢNG TRỊ', bh: 'CÔNG AN PHƯỜNG NAM ĐÔNG HÀ', so: '', kh: 'BC-CAP-TH', ngay: '', nam: namCua(ky),
      tenLoai: 'BÁO CÁO',
      trichYeu: ck ? `Kết quả thực hiện ${lv.cum} ${ck}` : ky.ten.charAt(0).toUpperCase() + ky.ten.slice(1),
      dongPhu: dongKyTu(ky.tu_ngay, ky.den_ngay), khoi,
      noiNhan: '- Công an tỉnh (qua PV01);\n- Thường trực BCĐ 57 phường;\n- Ban Chỉ huy CAP;\n- Lưu: VT, TH.',
      chucDanh: d.nguoi_ky?.chuc_danh ?? 'TRƯỞNG CÔNG AN PHƯỜNG', hoTen: d.nguoi_ky?.ho_ten ?? '',
    },
  };
}

export function lapBaoCaoLinhVuc(d: DuLieuTH, donViId: string): { m: MoHinhA4; tomTat: TomTat } {
  const ky = d.ky_don_vi;
  const cuaMinh = d.dau_moi.filter((x) => x.don_vi_id === donViId);
  const dv = cuaMinh[0];
  const lv = phanLinhVuc(cuaMinh);
  const bai = d.bai_don_vi.filter((b) => b.don_vi_id !== donViId);
  const t = tomTatNop(bai, ky.han_nop);
  const ck = cumKy(ky);
  const ten = dv?.don_vi ?? 'Đầu mối lĩnh vực';
  const khoi: KhoiA4[] = [
    { loai: 'van', ma: 'phan1', nhan: 'Phần I', tuDo: true, noiDung: [
      `Thực hiện Quy chế làm việc của Ban Chỉ đạo 57 phường, ${ten} tổng hợp báo cáo của các đơn vị${ck ? ` ${ck}` : ''} như sau:`,
      'I. TÌNH HÌNH CÁC ĐƠN VỊ GỬI BÁO CÁO',
      cauTinhHinh(t, ky, ten),
    ].join('\n') },
    bangTinhHinh(bai, ky.han_nop),
    { loai: 'van', ma: 'phan2', nhan: 'Phần II', tuDo: true, noiDung: ['II. KẾT QUẢ THỰC HIỆN CỦA CÁC ĐƠN VỊ', ...dongDonVi(bai, d.truong)].join('\n') },
  ];
  const bang = bangSoLieu(bai, d.truong);
  if (bang) khoi.push(bang);
  const tonTai = gomTruong(bai, 'kho_khan'), deXuat = gomTruong(bai, 'de_xuat');
  khoi.push({ loai: 'van', ma: 'phan3', nhan: 'Phần III–V', tuDo: true, noiDung: [
    'III. TỒN TẠI, HẠN CHẾ', ...(tonTai.length ? tonTai : ['…']),
    'IV. NHIỆM VỤ TRỌNG TÂM KỲ TỚI', '…',
    'V. ĐỀ XUẤT, KIẾN NGHỊ', ...(deXuat.length ? deXuat : ['…']),
  ].join('\n') });
  return {
    tomTat: t,
    m: {
      dang: false, cq: dv?.co_quan_chu_quan ?? 'UBND PHƯỜNG NAM ĐÔNG HÀ', bh: dv?.ten_ban_hanh ?? ten.toUpperCase(), so: '', kh: dv?.ky_hieu ?? 'BC', ngay: '',
      nam: namCua(ky), tenLoai: 'BÁO CÁO',
      trichYeu: `Tổng hợp kết quả thực hiện ${lv.cum}${ck ? ` ${ck}` : ''}`,
      dongPhu: dongKyTu(ky.tu_ngay, ky.den_ngay), khoi,
      noiNhan: '- Thường trực BCĐ 57 phường;\n- Lưu: VT.',
      chucDanh: dv?.nguoi_ky_chuc_danh ?? 'THỦ TRƯỞNG ĐƠN VỊ', hoTen: dv?.nguoi_ky_ho_ten ?? '',
    },
  };
}

// Tên tệp không dấu (an toàn khi tải về, gửi Zalo / email): "Du thao bao cao chung - Bao cao thang 9-2026"
const khongDau = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
export const tenTepTongHop = (d: DuLieuTH, loai: 'chung' | 'linh_vuc', tenDv?: string) =>
  khongDau(`${loai === 'chung' ? 'Du thao bao cao chung' : `Du thao tong hop linh vuc - ${tenDv ?? ''}`} - ${d.ky_don_vi.ten}`)
    .replace(/[\\/:*?"<>|]+/g, '-').replace(/[–—]/g, '-');
