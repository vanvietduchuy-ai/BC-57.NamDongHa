import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronRight, ExternalLink, FilePen, FileText, Lock, MoreHorizontal, Pencil, Trash2, Unlock, UserPlus } from 'lucide-react';
import { supabase, loiDe } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { laDauMoi, useAuth, laQuanTri } from '../lib/auth';
import { ngay, ngayGio, ngayGioDu } from '../lib/dinhDang';
import { Chip, DangTai, DongHo, DongHoChu, MenuThaoTac, HopLoi, HopThoai, lopO, Nut, O, Rong, The, TieuDeTrang, cx } from '../components/ui';
import { DieuChinhDonVi, SuaKy, ThemDonVi } from '../components/DieuChinhKy';
import { COT_VB_NOP, ThongTinVanBan, type VanBanDaNop } from '../components/VanBanPdf';
import { NutTepDrive } from '../components/TepDrive';
import { HopNhac, type DonViNhac } from '../components/HopNhac';

type Truong = { ma: string; nhan: string; kieu: string; bat_buoc?: boolean; linh_vuc?: string; don_vi_tinh?: string };
type Ky = { id: string; chu_tri_don_vi_id: string | null; ten: string; loai: string; tu_ngay: string | null; den_ngay: string | null; han_nop: string; han_gui_tinh: string | null; trang_thai: string; yeu_cau: string | null; cap: string; ky_cha_id: string | null; hinh_thuc: string | null; mau_bieu: { truong: Truong[]; hinh_thuc: string } | null };
type Tep = { id: string; drive_file_id: string; ten: string };
type Nop = {
  id: string; don_vi_id: string; trang_thai: string; so_lieu: Record<string, string>; kho_khan: string | null; nop_luc: string | null; duyet_luc: string | null; y_kien_duyet: string | null;
  han_rieng: string | null; nop_ngoai: boolean;
  don_vi: { ten: string; thu_tu: number }; tep: Tep[]; van_ban: VanBanDaNop | null;
};

export const TT_NOP: Record<string, { nhan: string; nen: string; chu: string }> = {
  chua_nop: { nhan: 'Chưa nộp', nen: 'bg-[#F1EEE7]', chu: 'text-mo' },
  nhap: { nhan: 'Đang soạn', nen: 'bg-[#F1EEE7]', chu: 'text-mo-2' },
  da_nop: { nhan: 'Chờ duyệt', nen: 'bg-[#E7E5DF]', chu: 'text-den' },
  can_bo_sung: { nhan: 'Cần bổ sung', nen: 'bg-cam-nhat', chu: 'text-cam-dam' },
  da_duyet: { nhan: 'Đã duyệt', nen: 'bg-xanh-nhat', chu: 'text-xanh' },
};

// nhung: hiển thị trong khung bên phải trang Theo dõi kỳ báo cáo (màn hình rộng)
export default function KyBaoCaoChiTiet({ kyId, nhung, sauXoa, khe, themNut }: { kyId?: string; nhung?: boolean; sauXoa?: () => void; khe?: HTMLElement | null; themNut?: ReactNode } = {}) {
  const params = useParams();
  const id = kyId ?? params.id;
  const { hoSo } = useAuth();
  const quanTri = laQuanTri(hoSo);
  const dauMoi = hoSo?.vai_tro === 'don_vi' && laDauMoi(hoSo);        // đầu mối lĩnh vực: nhắc, xem, tiếp nhận
  const [xem, setXem] = useState<Nop | null>(null);
  const [dieuChinh, setDieuChinh] = useState<Nop | null>(null);
  const [moSua, setMoSua] = useState(false);
  const [moThem, setMoThem] = useState(false);
  const nav = useNavigate();
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dsNhac, setDsNhac] = useState<DonViNhac[] | null>(null);
  const [loc, setLoc] = useState('');

  const { data, loi, dangTai, taiLai } = useDuLieu(async () => {
    const [a, b] = await Promise.all([
      supabase.from('ky_bao_cao').select('id, chu_tri_don_vi_id, ten, loai, tu_ngay, den_ngay, han_nop, han_gui_tinh, trang_thai, yeu_cau, cap, ky_cha_id, hinh_thuc, mau_bieu(truong, hinh_thuc)').eq('id', id!).single(),
      supabase.from('nop_bao_cao').select(`id, don_vi_id, trang_thai, so_lieu, kho_khan, nop_luc, duyet_luc, y_kien_duyet, han_rieng, nop_ngoai, don_vi(ten, thu_tu), tep(id, drive_file_id, ten), van_ban!nop_bao_cao_van_ban_id_fkey(${COT_VB_NOP})`).eq('ky_id', id!),
    ]);
    const ky = kq(a) as unknown as Ky;
    const nop = ((kq(b) ?? []) as unknown as Nop[]).sort((x, y) => x.don_vi.thu_tu - y.don_vi.thu_tu);
    // Kỳ liên quan: kỳ đơn vị ↔ kỳ tổng hợp lĩnh vực (đầu mối gửi Thường trực BCĐ)
    const lienQuan = null as { id: string; ten: string; nop: { trang_thai: string; don_vi: { ten: string } }[] } | null;
    const dm = (kq(await supabase.from('dau_moi_linh_vuc').select('linh_vuc, don_vi_id')) ?? []) as { linh_vuc: string; don_vi_id: string }[];
    // Cán bộ đầu mối của từng đơn vị (Thường trực, lãnh đạo xem được danh sách tài khoản)
    const nd = (await supabase.from('nguoi_dung').select('ho_ten, chuc_vu, don_vi_id').eq('vai_tro', 'don_vi').eq('hoat_dong', true)).data as { ho_ten: string; chuc_vu: string | null; don_vi_id: string }[] | null;
    const canBo: Record<string, string> = {};
    for (const x of nd ?? []) if (!canBo[x.don_vi_id]) canBo[x.don_vi_id] = x.chuc_vu ? `Đ/c ${x.chuc_vu}` : x.ho_ten;
    return { ky, nop: dauMoi ? nop.filter((n) => n.don_vi_id !== hoSo?.don_vi_id) : nop, lienQuan, dm, canBo };
  }, [id]);

  if (loi) return <HopLoi loi={loi} taiLai={taiLai} />;
  if (dangTai && !data) return <DangTai />;
  if (!data) return null;
  const { ky, nop, canBo } = data;
  const quanLy = quanTri || (dauMoi && !!hoSo?.don_vi_id && ky.chu_tri_don_vi_id === hoSo.don_vi_id);   // đơn vị giao kỳ này
  const dem = (t: string[]) => nop.filter((n) => t.includes(n.trang_thai)).length;
  const chuaNop = nop.filter((n) => ['chua_nop', 'nhap', 'can_bo_sung'].includes(n.trang_thai));
  const coBaiNop = nop.some((n) => ['da_nop', 'da_duyet'].includes(n.trang_thai));
  const xoaKy = async () => {
    if (!window.confirm(`Xoá kỳ "${ky.ten}"?`)) return;
    const { error } = await supabase.from('ky_bao_cao').delete().eq('id', ky.id);
    if (error) setThongBao(loiDe(error)); else if (sauXoa) sauXoa(); else nav('/ky-bao-cao');
  };

  const nhac = (ds: Nop[]) => setDsNhac(ds.map((n) => ({ nop_id: n.id, don_vi_id: n.don_vi_id, don_vi: n.don_vi.ten })));
  const doiTrangThaiKy = async () => {
    if (ky.trang_thai === 'mo' && !window.confirm('Khoá kỳ? Đơn vị sẽ không nộp, sửa được nữa.')) return;
    const { error } = await supabase.from('ky_bao_cao').update({ trang_thai: ky.trang_thai === 'mo' ? 'khoa' : 'mo' }).eq('id', ky.id);
    if (error) setThongBao(loiDe(error)); else void taiLai();
  };

  const loaiNhan = ky.cap === 'linh_vuc' ? 'Tổng hợp lĩnh vực' : ky.loai === 'dot_xuat' ? 'Đột xuất' : `Định kỳ ${({ thang: 'tháng', quy: 'quý', sau_thang: '6 tháng', nam: 'năm' } as Record<string, string>)[ky.loai] ?? ''}`;
  const soanChung = !ky.chu_tri_don_vi_id && hoSo?.vai_tro !== 'don_vi';
  const nutKy = (
    <>
      {quanLy && chuaNop.length > 0 && ky.trang_thai === 'mo' && <Nut className="max-md:hidden" icon={<Bell className="h-4 w-4" />} onClick={() => nhac(chuaNop)}>Nhắc {chuaNop.length} đơn vị chưa nộp</Nut>}
      {quanLy && <MenuThaoTac nhan="Thao tác kỳ" ds={[
        { ten: 'Sửa kỳ', icon: <Pencil className="h-4 w-4" />, bam: () => setMoSua(true) },
        { ten: 'Thêm đơn vị', icon: <UserPlus className="h-4 w-4" />, bam: () => setMoThem(true), an: ky.trang_thai !== 'mo' },
        { ten: ky.trang_thai === 'mo' ? 'Khoá kỳ' : 'Mở lại kỳ', icon: ky.trang_thai === 'mo' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />, bam: doiTrangThaiKy },
        { ten: 'Xoá kỳ', icon: <Trash2 className="h-4 w-4" />, bam: xoaKy, nguy: true, an: coBaiNop },
        ...(nhung ? [{ ten: 'Mở trang riêng', icon: <ExternalLink className="h-4 w-4" />, bam: () => nav(`/ky-bao-cao/${ky.id}`) }] : []),
      ]} />}
      {soanChung && <Nut kieu={themNut ? 'phu' : 'chinh'} icon={<FilePen className="h-4 w-4" />} onClick={() => nav(`/ky-bao-cao/${ky.ky_cha_id ?? ky.id}/bao-cao-chung`)} ngan="Báo cáo chung">Soạn báo cáo chung</Nut>}
      {themNut}
    </>
  );
  const dauTrang = (
    <TieuDeTrang tren={<><Link to={dauMoi && !quanLy ? '/viec-can-nop' : '/ky-bao-cao'} className="text-mo">{dauMoi && !quanLy ? 'Việc cần nộp' : 'Theo dõi kỳ báo cáo'}</Link> / {loaiNhan}</>}
      ten={ky.ten} phai={nutKy} />
  );
  const LOC: [string, string, string[]][] = [['', 'Tất cả trạng thái', []], ['da_duyet', 'Đã duyệt', ['da_duyet']], ['da_nop', 'Chờ duyệt', ['da_nop']], ['can_bo_sung', 'Yêu cầu bổ sung', ['can_bo_sung']], ['chua_nop', 'Chưa nộp', ['chua_nop', 'nhap']]];
  const dsHien = loc ? nop.filter((n) => LOC.find((x) => x[0] === loc)![2].includes(n.trang_thai)) : nop;
  const coDauMoi = nop.some((n) => canBo[n.don_vi_id]);
  const thaoTac = (n: Nop) => n.trang_thai === 'chua_nop' || n.trang_thai === 'nhap'
    ? (quanLy && ky.trang_thai === 'mo' ? <button type="button" className="min-h-9 font-semibold text-nguy hover:underline" onClick={() => nhac([n])}>Nhắc</button> : <span className="text-mo">—</span>)
    : <button type="button" className="min-h-9 whitespace-nowrap font-semibold text-[#8E1B22] hover:underline" onClick={() => setXem(n)}>
        {n.trang_thai === 'da_nop' && quanTri ? 'Duyệt' : n.trang_thai === 'da_nop' && quanLy ? 'Tiếp nhận' : n.trang_thai === 'can_bo_sung' ? 'Xem góp ý' : 'Xem'}
      </button>;
  const vanBan = (n: Nop) => n.van_ban
    ? <button type="button" onClick={() => setXem(n)} className="flex min-w-0 max-w-full items-center gap-1.5 text-left text-[#8E1B22]"><FileText className="h-3.5 w-3.5 shrink-0 text-mo" /><span className="truncate">{n.van_ban.so_ky_hieu ?? n.van_ban.trich_yeu ?? 'Văn bản'}</span></button>
    : n.tep.length ? n.tep.map((f) => <NutTepDrive key={f.id} loai="tep" id={f.id} ten={f.ten} nhan={f.ten} className="px-0" />) : <span className="text-mo">—</span>;
  const luc = (d: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric' }).format(new Date(d)) + ' · ' + new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));

  return (
    <>
      {khe ? createPortal(dauTrang, khe) : dauTrang}
      {data.lienQuan && (
        <Link to={`/ky-bao-cao/${data.lienQuan.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-vien bg-white px-4 py-3 text-sm text-den hover:border-ink">
          <span className="font-bold">Đầu mối tổng hợp gửi Thường trực</span>
          {data.lienQuan.nop.map((n, i) => <span key={i} className="flex items-center gap-1.5">{n.don_vi.ten} <Chip nen={TT_NOP[n.trang_thai].nen} chu={TT_NOP[n.trang_thai].chu}>{TT_NOP[n.trang_thai].nhan}</Chip></span>)}
          <span className="flex-1" /><ChevronRight className="h-4 w-4 text-mo" />
        </Link>
      )}
      {ky.cap === 'linh_vuc' && ky.ky_cha_id && !dauMoi && <Link to={`/ky-bao-cao/${ky.ky_cha_id}`} className="text-[0.8125rem] font-semibold text-[#8E1B22]">← Báo cáo của các đơn vị trong kỳ</Link>}
      {thongBao && <div role="status" className="rounded-xl bg-xanh-nhat px-4 py-3 text-sm text-xanh">{thongBao}</div>}
      {ky.yeu_cau && <div className="whitespace-pre-line rounded-xl bg-nen-3 px-4 py-3 text-sm"><b>Yêu cầu:</b> {ky.yeu_cau}</div>}

      {/* Điện thoại: khối đếm ngược + tiến độ */}
      <section className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-[#7C1419] via-ink to-ink-3 p-4 text-white shadow-[0_12px_32px_-16px_rgba(106,15,20,0.6)] md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[0.8125rem] text-[#F0C9C4]">{ky.trang_thai === 'mo' ? 'Còn lại đến hạn đơn vị nộp' : 'Kỳ đã khoá sổ'}</span>
          <span className="rounded-full bg-white/12 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#FFF4DA]">{loaiNhan}</span>
        </div>
        {ky.trang_thai === 'mo' && <DongHo han={ky.han_nop} />}
        <div className="text-[0.75rem] text-[#F0C9C4]">Hạn <b className="font-semibold text-white">{ngayGioDu(ky.han_nop)}</b>{ky.tu_ngay && ` · kỳ ${ngay(ky.tu_ngay).replace(/\/\d{4}$/, '')} – ${ngay(ky.den_ngay).replace(/\/\d{4}$/, '')}`}</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex h-2 overflow-hidden rounded-full bg-white/15">
            {([['da_duyet', 'bg-[#93C5FD]'], ['da_nop', 'bg-white'], ['can_bo_sung', 'bg-vang']] as const).map(([t, m]) => { const n = dem([t]); return n ? <div key={t} className={cx('h-2', m)} style={{ width: `${(n / Math.max(1, nop.length)) * 100}%` }} /> : null; })}
          </div>
          <div className="flex items-baseline gap-1.5 text-[0.8125rem]"><b className="mono text-[1.0625rem]">{dem(['da_nop', 'da_duyet'])}/{nop.length}</b><span className="text-[#F0C9C4]">đơn vị đã nộp</span>
            {dem(['chua_nop', 'nhap']) > 0 && <span className="ml-auto text-[#FFF4DA]">{dem(['chua_nop', 'nhap'])} chưa nộp</span>}</div>
        </div>
        {quanLy && chuaNop.length > 0 && ky.trang_thai === 'mo' && (
          <button type="button" onClick={() => nhac(chuaNop)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white text-[0.875rem] font-bold text-ink active:scale-[0.98]"><Bell className="h-4 w-4" />Nhắc {chuaNop.length} đơn vị chưa hoàn thành</button>
        )}
      </section>

      <The className="flex min-w-0 flex-col overflow-hidden">
        {/* Điện thoại: lọc nhanh theo trạng thái */}
        <div className="-mb-px flex gap-1.5 overflow-x-auto border-b border-vien px-3 py-3 md:hidden" role="tablist" aria-label="Lọc trạng thái">
          {LOC.map(([k, t, ds]) => { const n = k ? dem(ds) : nop.length; const on = loc === k; return (
            <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setLoc(k)}
              className={cx('flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors', on ? 'bg-ink text-white' : 'bg-nen-2 text-mo-2')}>
              {k ? t : 'Tất cả'}<span className={cx('mono rounded-full px-1.5 text-[11.5px]', on ? 'bg-white/20' : 'bg-white text-den')}>{n}</span>
            </button>
          ); })}
        </div>
        {/* Máy tính: còn lại + số lượng + lọc */}
        <div className="hidden flex-wrap items-center gap-x-6 gap-y-3 border-b border-vien px-4 py-4 sm:gap-y-4 sm:px-6 sm:py-5 md:flex">
          <div className="flex flex-col gap-1.5 sm:pr-6 md:border-r md:border-vien">
            <span className="text-[0.7812rem] text-mo">{ky.trang_thai === 'mo' ? 'Còn lại đến hạn đơn vị nộp' : 'Kỳ đã khoá sổ'}</span>
            {ky.trang_thai === 'mo' ? <DongHoChu han={ky.han_nop} /> : <Chip>Đã khoá sổ</Chip>}
            <span className="text-[0.75rem] text-mo">Hạn <span className="whitespace-nowrap">{ngayGioDu(ky.han_nop)}</span>{ky.tu_ngay && <span className="whitespace-nowrap">{` · kỳ ${ngay(ky.tu_ngay).replace(/\/\d{4}$/, '')} – ${ngay(ky.den_ngay).replace(/\/\d{4}$/, '')}`}</span>}</span>
          </div>
          <div className="grid w-full grid-cols-4 gap-x-2 sm:w-auto sm:min-w-[250px] sm:flex-1">
            {([['Đã duyệt', dem(['da_duyet']), 'text-xanh'], ['Chờ duyệt', dem(['da_nop']), 'text-den'], ['Bổ sung', dem(['can_bo_sung']), 'text-cam'], ['Chưa nộp', dem(['chua_nop', 'nhap']), 'text-mo-2']] as const).map(([t, n, m]) => (
              <div key={t} className="flex min-w-0 flex-col gap-0.5"><span className={cx('mono text-[1.375rem] font-bold leading-tight', m)}>{n}</span><span className="whitespace-nowrap text-[0.75rem] leading-snug text-mo">{t}</span></div>
            ))}
          </div>
          <label className="flex w-full items-center gap-2 text-[0.8125rem] text-mo sm:w-auto">Lọc
            <select className={cx(lopO, 'min-h-10 flex-1 bg-white sm:w-44 sm:flex-none')} value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Lọc trạng thái">
              {LOC.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </label>
        </div>

        {/* Máy tính: bảng */}
        <div className="hidden md:block">
          <table className="w-full table-fixed border-collapse text-[0.8438rem]">
            <thead className="text-left text-[11px] font-bold tracking-wide text-mo">
              <tr className="border-b border-vien">
                <th className="w-[29%] px-6 py-3.5">ĐƠN VỊ</th>
                {coDauMoi && <th className="w-[16%] px-2">CÁN BỘ ĐẦU MỐI</th>}
                <th className="w-[16%] px-2">TRẠNG THÁI</th>
                <th className="w-[14%] px-2">THỜI ĐIỂM NỘP</th>
                <th className="px-2">VĂN BẢN</th>
                <th className="w-[110px] px-6 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {dsHien.map((n) => {
                const t = TT_NOP[n.trang_thai];
                const tre = n.nop_luc && new Date(n.nop_luc) > new Date(n.han_rieng ?? ky.han_nop);
                return (
                  <tr key={n.id} className="border-b border-[#F1EEE7] last:border-0 hover:bg-nen-2/60">
                    <td className="px-6 py-4 font-semibold">{n.don_vi.ten}{n.han_rieng && <div className="text-[11px] font-semibold text-cam-dam">gia hạn đến {ngayGio(n.han_rieng)}</div>}</td>
                    {coDauMoi && <td className="px-2 text-mo-2"><span className="line-clamp-2">{canBo[n.don_vi_id] ?? '—'}</span></td>}
                    <td className="px-2"><Chip cham nen={t.nen} chu={t.chu}>{t.nhan}</Chip>{n.nop_ngoai && <div className="mt-0.5 text-[11px] text-mo">nộp ngoài hệ thống</div>}</td>
                    <td className="mono px-2 text-[0.7812rem]">{n.nop_luc ? luc(n.nop_luc) : '—'}{tre && <span className="ml-1 font-sans text-[11px] font-bold text-cam">trễ</span>}</td>
                    <td className="px-2 text-[0.8125rem]"><div className="flex min-w-0 flex-col">{vanBan(n)}</div></td>
                    <td className="px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {thaoTac(n)}
                        {quanLy && ky.trang_thai === 'mo' && <button aria-label={`Điều chỉnh ${n.don_vi.ten}`} title="Gia hạn, ghi nhận nộp, trả lại…" className="flex h-8 w-8 items-center justify-center rounded-lg text-mo hover:bg-nen" onClick={() => setDieuChinh(n)}><MoreHorizontal className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Điện thoại: mỗi đơn vị 1 dòng gọn */}
        <ul className="flex flex-col md:hidden">
          {dsHien.map((n) => {
            const t = TT_NOP[n.trang_thai];
            const cham = n.trang_thai === 'da_duyet' ? 'bg-xanh' : n.trang_thai === 'da_nop' ? 'bg-den' : n.trang_thai === 'can_bo_sung' ? 'bg-[#F59E0B]' : 'bg-[#CFC9BC]';
            const tre = n.nop_luc && new Date(n.nop_luc) > new Date(n.han_rieng ?? ky.han_nop);
            const chuaNopBai = n.trang_thai === 'chua_nop' || n.trang_thai === 'nhap';
            return (
              <li key={n.id} className="flex items-center gap-3 border-b border-[#F1EEE7] px-4 py-3 last:border-0">
                <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', cham)} aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[0.9062rem] font-semibold leading-snug">{n.don_vi.ten}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[0.75rem] text-mo">
                    <span className={cx('font-semibold', t.chu)}>{t.nhan}</span>
                    {n.nop_luc && <span className="mono">· {luc(n.nop_luc)}</span>}
                    {tre && <span className="font-bold text-cam">· trễ</span>}
                    {n.han_rieng && <span className="font-semibold text-cam-dam">· gia hạn {ngayGio(n.han_rieng)}</span>}
                    {n.nop_ngoai && <span>· bản giấy</span>}
                  </span>
                  {(n.van_ban || n.tep.length > 0) && <span className="min-w-0 text-[0.75rem]">{vanBan(n)}</span>}
                </div>
                {chuaNopBai
                  ? (quanLy && ky.trang_thai === 'mo' && <button type="button" onClick={() => nhac([n])} className="flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-[#E9C6C3] px-3 text-[0.8125rem] font-semibold text-nguy active:bg-nguy-nhat"><Bell className="h-3.5 w-3.5" />Nhắc</button>)
                  : <span className="shrink-0 text-[0.8125rem]">{thaoTac(n)}</span>}
                {quanLy && ky.trang_thai === 'mo' && <button aria-label={`Điều chỉnh ${n.don_vi.ten}`} className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-mo active:bg-nen" onClick={() => setDieuChinh(n)}><MoreHorizontal className="h-4 w-4" /></button>}
              </li>
            );
          })}
        </ul>
        {dsHien.length === 0 && <div className="p-5"><Rong>{nop.length ? 'Không có đơn vị ở trạng thái này.' : 'Kỳ này chưa có đơn vị nào phải nộp.'}</Rong></div>}
      </The>

      <XemBaiNop nop={xem} ky={ky} quanTri={quanTri} dauMoi={quanLy && !quanTri} dm={data.dm} dong={() => setXem(null)} xong={() => { setXem(null); void taiLai(); }} />
      {quanLy && <>
        <SuaKy ky={ky} mo={moSua} dong={() => setMoSua(false)} xong={() => { setMoSua(false); void taiLai(); }} />
        <ThemDonVi kyId={ky.id} daCo={nop.map((n) => n.don_vi_id)} mo={moThem} dong={() => setMoThem(false)} xong={() => { setMoThem(false); void taiLai(); }} />
        <DieuChinhDonVi nop={dieuChinh} hanKy={ky.han_nop} mo={!!dieuChinh} dong={() => setDieuChinh(null)} xong={() => { setDieuChinh(null); void taiLai(); }} />
      </>}
      <HopNhac mo={!!dsNhac} dong={() => setDsNhac(null)} tenKy={ky.ten} hanNop={ky.han_nop} ds={dsNhac ?? []} xong={setThongBao} />
    </>
  );
}

function XemBaiNop({ nop, ky, quanTri, dauMoi, dm, dong, xong }: { nop: Nop | null; ky: Ky; quanTri: boolean; dauMoi: boolean; dm: { linh_vuc: string; don_vi_id: string }[]; dong: () => void; xong: () => void }) {
  const [yKien, setYKien] = useState('');
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  if (!nop) return null;
  const truong = ky.mau_bieu?.truong ?? [];
  const xuLy = async (trangThai: 'da_duyet' | 'can_bo_sung') => {
    if (trangThai === 'can_bo_sung' && !yKien.trim()) { setLoi('Ghi rõ nội dung cần bổ sung'); return; }
    setDangChay(true);
    const { error } = await supabase.from('nop_bao_cao').update({ trang_thai: trangThai, y_kien_duyet: yKien.trim() || null }).eq('id', nop.id);
    setDangChay(false);
    if (error) setLoi(loiDe(error)); else xong();
  };
  const xuLyDuoc = (quanTri || dauMoi) && nop.trang_thai === 'da_nop';
  void truong;
  void dm;
  return (
    <HopThoai mo dong={dong} tieuDe={nop.don_vi.ten} rong="max-w-[900px]">
      <div className="flex flex-col gap-4">
        {loi && <HopLoi loi={loi} />}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 text-xs text-mo">Nộp lúc {ngayGio(nop.nop_luc)}{nop.nop_ngoai && ' (ngoài hệ thống)'} · {TT_NOP[nop.trang_thai].nhan}</span>
        </div>
        {nop.van_ban && <ThongTinVanBan vb={nop.van_ban} />}
        {!nop.van_ban && <div className="rounded-xl bg-nen-2 p-3 text-sm text-mo">{nop.nop_ngoai ? 'Nộp bản giấy ngoài hệ thống.' : 'Chưa có văn bản.'}</div>}
        {nop.tep.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-semibold text-mo-2">Tệp đính kèm</span>
            {nop.tep.map((f) => <NutTepDrive key={f.id} loai="tep" id={f.id} ten={f.ten} nhan={f.ten} className="self-start px-0" />)}
          </div>
        )}
        {nop.y_kien_duyet && <div className="rounded-xl bg-cam-nhat p-3 text-sm text-cam-dam">Ý kiến: {nop.y_kien_duyet}</div>}
        {xuLyDuoc && (
          <>
            <O nhan={dauMoi ? 'Ý kiến của đầu mối' : 'Ý kiến của Cơ quan Thường trực'}><textarea className={cx(lopO, 'min-h-20 py-2')} value={yKien} onChange={(e) => setYKien(e.target.value)} /></O>
            <div className="flex flex-wrap gap-2">
              <Nut kieu="chinh" dangChay={dangChay} onClick={() => xuLy('da_duyet')}>{dauMoi ? 'Tiếp nhận' : 'Duyệt'}</Nut>
              <Nut kieu="nguy" dangChay={dangChay} onClick={() => xuLy('can_bo_sung')}>Yêu cầu bổ sung</Nut>
            </div>
          </>
        )}
      </div>
    </HopThoai>
  );
}
