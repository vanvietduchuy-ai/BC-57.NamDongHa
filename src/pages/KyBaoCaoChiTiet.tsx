import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronRight, FilePen, Lock, MoreHorizontal, Pencil, Trash2, Unlock, UserPlus } from 'lucide-react';
import { supabase, loiDe } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { laDauMoi, useAuth } from '../lib/auth';
import { ngay, ngayGio, ngayGioDu } from '../lib/dinhDang';
import { Chip, ChipHan, DangTai, HopLoi, HopThoai, lopO, Nut, O, Rong, The, TieuDeTrang, cx } from '../components/ui';
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

export default function KyBaoCaoChiTiet() {
  const { id } = useParams();
  const { hoSo } = useAuth();
  const quanTri = hoSo?.vai_tro === 'quan_tri';
  const dauMoi = hoSo?.vai_tro === 'don_vi' && laDauMoi(hoSo);        // đầu mối lĩnh vực: nhắc, xem, tiếp nhận
  const [xem, setXem] = useState<Nop | null>(null);
  const [dieuChinh, setDieuChinh] = useState<Nop | null>(null);
  const [moSua, setMoSua] = useState(false);
  const [moThem, setMoThem] = useState(false);
  const nav = useNavigate();
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [dsNhac, setDsNhac] = useState<DonViNhac[] | null>(null);

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
    return { ky, nop: dauMoi ? nop.filter((n) => n.don_vi_id !== hoSo?.don_vi_id) : nop, lienQuan, dm };
  }, [id]);

  if (loi) return <HopLoi loi={loi} taiLai={taiLai} />;
  if (dangTai && !data) return <DangTai />;
  if (!data) return null;
  const { ky, nop } = data;
  const quanLy = quanTri || (dauMoi && !!hoSo?.don_vi_id && ky.chu_tri_don_vi_id === hoSo.don_vi_id);   // đơn vị giao kỳ này
  const dem = (t: string[]) => nop.filter((n) => t.includes(n.trang_thai)).length;
  const chuaNop = nop.filter((n) => ['chua_nop', 'nhap', 'can_bo_sung'].includes(n.trang_thai));
  const coBaiNop = nop.some((n) => ['da_nop', 'da_duyet'].includes(n.trang_thai));
  const xoaKy = async () => {
    if (!window.confirm(`Xoá kỳ "${ky.ten}"?`)) return;
    const { error } = await supabase.from('ky_bao_cao').delete().eq('id', ky.id);
    if (error) setThongBao(loiDe(error)); else nav('/ky-bao-cao');
  };

  const nhac = (ds: Nop[]) => setDsNhac(ds.map((n) => ({ nop_id: n.id, don_vi_id: n.don_vi_id, don_vi: n.don_vi.ten })));
  const doiTrangThaiKy = async () => {
    if (ky.trang_thai === 'mo' && !window.confirm('Khoá kỳ? Đơn vị sẽ không nộp, sửa được nữa.')) return;
    const { error } = await supabase.from('ky_bao_cao').update({ trang_thai: ky.trang_thai === 'mo' ? 'khoa' : 'mo' }).eq('id', ky.id);
    if (error) setThongBao(loiDe(error)); else void taiLai();
  };

  return (
    <>
      <TieuDeTrang tren={<><Link to={dauMoi && !quanLy ? '/viec-can-nop' : '/ky-bao-cao'} className="text-mo">{dauMoi && !quanLy ? 'Việc cần nộp' : 'Kỳ báo cáo'}</Link> / {ky.cap === 'linh_vuc' ? 'Tổng hợp lĩnh vực' : ky.loai === 'dot_xuat' ? 'Đột xuất' : 'Định kỳ'}</>}
        ten={ky.ten}
        phai={<>
          {quanLy && chuaNop.length > 0 && ky.trang_thai === 'mo' && <Nut icon={<Bell className="h-4 w-4" />} onClick={() => nhac(chuaNop)}>Nhắc {chuaNop.length} đơn vị</Nut>}
          {quanLy && <>
            <Nut icon={<Pencil className="h-4 w-4" />} onClick={() => setMoSua(true)}>Sửa kỳ</Nut>
            {ky.trang_thai === 'mo' && <Nut icon={<UserPlus className="h-4 w-4" />} onClick={() => setMoThem(true)}>Thêm đơn vị</Nut>}
            {!coBaiNop && <Nut kieu="nguy" icon={<Trash2 className="h-4 w-4" />} onClick={xoaKy}>Xoá kỳ</Nut>}
            <Nut icon={ky.trang_thai === 'mo' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} onClick={doiTrangThaiKy}>{ky.trang_thai === 'mo' ? 'Khoá kỳ' : 'Mở lại kỳ'}</Nut>
          </>}
          {!ky.chu_tri_don_vi_id && hoSo?.vai_tro !== 'don_vi' && <Nut kieu="chinh" icon={<FilePen className="h-4 w-4" />} onClick={() => nav(`/ky-bao-cao/${ky.ky_cha_id ?? ky.id}/bao-cao-chung`)}>Soạn báo cáo chung</Nut>}
        </>} />
      {data.lienQuan && (
        <Link to={`/ky-bao-cao/${data.lienQuan.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-vien bg-white px-4 py-3 text-sm text-den hover:border-ink">
          <span className="font-bold">Đầu mối tổng hợp gửi Thường trực</span>
          {data.lienQuan.nop.map((n, i) => <span key={i} className="flex items-center gap-1.5">{n.don_vi.ten} <Chip nen={TT_NOP[n.trang_thai].nen} chu={TT_NOP[n.trang_thai].chu}>{TT_NOP[n.trang_thai].nhan}</Chip></span>)}
          <span className="flex-1" /><ChevronRight className="h-4 w-4 text-mo" />
        </Link>
      )}
      {ky.cap === 'linh_vuc' && ky.ky_cha_id && !dauMoi && <Link to={`/ky-bao-cao/${ky.ky_cha_id}`} className="text-[13px] font-semibold text-[#A4161A]">← Báo cáo của các đơn vị trong kỳ</Link>}
      {thongBao && <div role="status" className="rounded-xl bg-xanh-nhat px-4 py-3 text-sm text-xanh">{thongBao}</div>}

      {ky.yeu_cau && <div className="whitespace-pre-line rounded-xl bg-nen-3 px-4 py-3 text-sm"><b>Yêu cầu:</b> {ky.yeu_cau}</div>}
      <The className="flex flex-wrap items-center gap-6 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-mo">{ky.trang_thai === 'mo' ? 'Còn lại đến hạn đơn vị nộp' : 'Kỳ đã khoá'}</span>
          {ky.trang_thai === 'mo' ? <ChipHan han={ky.han_nop} className="self-start text-base" /> : <Chip>Đã khoá sổ</Chip>}
          <span className="text-xs text-mo">Hạn <span className="whitespace-nowrap">{ngayGioDu(ky.han_nop)}</span>{ky.tu_ngay && <span className="whitespace-nowrap">{` · kỳ ${ngay(ky.tu_ngay)} – ${ngay(ky.den_ngay)}`}</span>}</span>
        </div>
        {[['Đã duyệt', dem(['da_duyet']), 'text-xanh'], ['Chờ duyệt', dem(['da_nop']), 'text-den'], ['Cần bổ sung', dem(['can_bo_sung']), 'text-cam'], ['Chưa nộp', dem(['chua_nop', 'nhap']), 'text-mo']].map(([t, n, m]) => (
          <div key={t as string} className="flex flex-col"><span className={cx('so text-[22px] font-bold', m as string)}>{n}</span><span className="text-xs text-mo">{t}</span></div>
        ))}
      </The>

      <The className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead className="bg-nen-2 text-left text-[11px] tracking-wide text-mo">
              <tr><th className="px-4 py-3">ĐƠN VỊ</th><th className="px-3">TRẠNG THÁI</th><th className="px-3">THỜI ĐIỂM NỘP</th><th className="px-3">VĂN BẢN</th><th className="px-4 text-right">THAO TÁC</th></tr>
            </thead>
            <tbody>
              {nop.map((n) => {
                const t = TT_NOP[n.trang_thai];
                const hanDv = n.han_rieng ?? ky.han_nop;
                const tre = n.nop_luc && new Date(n.nop_luc) > new Date(hanDv);
                return (
                  <tr key={n.id} className="border-t border-[#F1EEE7]">
                    <td className="px-4 py-3 font-semibold">{n.don_vi.ten}</td>
                    <td className="px-3"><Chip nen={t.nen} chu={t.chu}>{t.nhan}</Chip>{n.nop_ngoai && <div className="mt-0.5 text-[11px] text-mo">nộp ngoài hệ thống</div>}{n.han_rieng && <div className="mt-0.5 text-[11px] font-semibold text-cam-dam">gia hạn đến {ngayGio(n.han_rieng)}</div>}</td>
                    <td className="so px-3 text-xs">{n.nop_luc ? ngayGio(n.nop_luc) : '—'}{tre && <span className="ml-1 font-sans font-bold text-cam">trễ</span>}</td>
                    <td className="px-3 text-xs">
                      {n.van_ban
                        ? <button type="button" onClick={() => setXem(n)} className="flex max-w-72 flex-col text-left text-den"><b className="so text-[#A4161A]">{n.van_ban.so_ky_hieu ?? 'Văn bản'}{n.van_ban.ngay_ban_hanh ? ` · ${ngay(n.van_ban.ngay_ban_hanh)}` : ''}</b><span className="truncate text-mo">{n.van_ban.trich_yeu}</span></button>
                        : (n.tep.length ? n.tep.map((f) => <NutTepDrive key={f.id} loai="tep" id={f.id} ten={f.ten} nhan={f.ten} className="px-0" />) : '—')}
                    </td>
                    <td className="px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {n.trang_thai === 'chua_nop' || n.trang_thai === 'nhap'
                          ? quanLy && ky.trang_thai === 'mo' && <button className="min-h-9 rounded-lg px-2 font-semibold text-nguy hover:bg-nguy-nhat" onClick={() => nhac([n])}>Nhắc</button>
                          : <button className="min-h-9 whitespace-nowrap rounded-lg px-2 font-semibold text-[#A4161A] hover:bg-do/5" onClick={() => setXem(n)}>{n.trang_thai === 'da_nop' && quanTri ? 'Xem, duyệt' : n.trang_thai === 'da_nop' && quanLy ? 'Xem, tiếp nhận' : 'Xem'}</button>}
                        {quanLy && ky.trang_thai === 'mo' && <button aria-label={`Điều chỉnh ${n.don_vi.ten}`} title="Gia hạn, ghi nhận nộp, trả lại…" className="flex h-9 w-9 items-center justify-center rounded-lg text-mo hover:bg-nen" onClick={() => setDieuChinh(n)}><MoreHorizontal className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {nop.length === 0 && <div className="p-4"><Rong>Kỳ này chưa có đơn vị nào phải nộp.</Rong></div>}
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
            <span className="text-[13px] font-semibold text-mo-2">Tệp đính kèm</span>
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
