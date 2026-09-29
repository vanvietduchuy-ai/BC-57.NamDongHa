import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlarmClock, ArrowRight, ChevronLeft } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { kq, useBayGio, useDuLieu } from '../lib/useDuLieu';
import { useAuth } from '../lib/auth';
import { conLai, hai, ngay, ngayGioDu } from '../lib/dinhDang';
import { Chip, DangTai, HopLoi, Nut, Rong, The, TieuDeThe, cx } from '../components/ui';
import { TT_NOP } from './KyBaoCaoChiTiet';
import { moTepDrive } from '../components/TepDrive';
import TepDinhKem, { type Tep } from '../components/TepDinhKem';
import OVanBanPdf, { COT_VB_NOP, kiemTraMeta, linkXemDrive, metaTuVanBan, taiPdfLenDrive, ThongTinVanBan, type VanBanDaNop } from '../components/VanBanPdf';
import type { MetaVb } from '../lib/docPdf';
import type { TruongMau } from '../lib/baoCaoA4';

type Truong = TruongMau;
type Nop = {
  id: string; ky_id: string; don_vi_id: string; trang_thai: string; so_lieu: Record<string, string>; nop_luc: string | null; y_kien_duyet: string | null; han_rieng: string | null; nop_ngoai: boolean;
  ky_bao_cao: { id: string; ten: string; loai: string; han_nop: string; trang_thai: string; chu_tri_don_vi_id: string | null; tu_ngay: string | null; den_ngay: string | null; yeu_cau: string | null; cap: string; ky_cha_id: string | null; hinh_thuc: string | null; mau_bieu: { truong: Truong[]; hinh_thuc: string } | null };
  don_vi: { ten: string }; tep: Tep[]; van_ban: VanBanDaNop | null;
};

export default function NopBaoCao() {
  const { id } = useParams();
  const { hoSo } = useAuth();
  const { data, loi, dangTai, taiLai } = useDuLieu(async () =>
    kq(await supabase.from('nop_bao_cao')
      .select(`id, ky_id, don_vi_id, trang_thai, so_lieu, nop_luc, y_kien_duyet, han_rieng, nop_ngoai, ky_bao_cao(id, ten, loai, han_nop, trang_thai, chu_tri_don_vi_id, tu_ngay, den_ngay, yeu_cau, cap, ky_cha_id, hinh_thuc, mau_bieu(truong, hinh_thuc)), don_vi(ten), tep(id, drive_file_id, ten), van_ban!nop_bao_cao_van_ban_id_fkey(${COT_VB_NOP})`)
      .eq('id', id!).single()) as unknown as Nop, [id]);

  if (loi) return <HopLoi loi={loi} taiLai={taiLai} />;
  if (dangTai && !data) return <DangTai />;
  if (!data) return null;
  const ky = data.ky_bao_cao;
  const suaDuoc = hoSo?.don_vi_id === data.don_vi_id && ky.trang_thai === 'mo' && ['chua_nop', 'nhap', 'can_bo_sung'].includes(data.trang_thai);
  const tt = TT_NOP[data.trang_thai];
  const han = data.han_rieng ?? ky.han_nop;
  const rutDuoc = hoSo?.don_vi_id === data.don_vi_id && ky.trang_thai === 'mo' && data.trang_thai === 'da_nop' && !data.nop_ngoai;
  const rutLai = async () => {
    if (!window.confirm('Rút lại báo cáo để sửa? Nhớ gửi lại trước hạn.')) return;
    const { error } = await supabase.from('nop_bao_cao').update({ trang_thai: 'nhap' }).eq('id', data.id);
    if (error) window.alert(loiDe(error)); else void taiLai();
  };

  return (
    <>
      <header className="flex items-center gap-3">
        <Link to="/viec-can-nop" aria-label="Quay lại Văn bản cần nộp" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-vien bg-white text-den hover:bg-nen-2"><ChevronLeft className="h-5 w-5" /></Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="m-0 text-[1.25rem] font-extrabold leading-snug tracking-tight md:text-[1.5rem]">{ky.ten}</h1>
          <span className="truncate text-[0.8125rem] text-mo">{data.don_vi.ten}{ky.tu_ngay ? ` · Kỳ ${ngay(ky.tu_ngay).replace(/\/\d{4}$/, '')} – ${ngay(ky.den_ngay).replace(/\/\d{4}$/, '')}` : ''}</span>
        </div>
        {!suaDuoc && <Chip cham nen={tt.nen} chu={tt.chu}>{tt.nhan}</Chip>}
      </header>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-ink px-4 py-3 text-white">
        <AlarmClock className="h-5 w-5 shrink-0 text-[#F0C9C4]" />
        <span className="flex-1 text-[0.8438rem] text-[#F6E3E0]">{ky.trang_thai === 'mo' ? 'Còn lại đến hạn' : 'Kỳ đã khoá'}{data.han_rieng && ' (đã gia hạn)'}</span>
        {ky.trang_thai === 'mo' && <ConLaiDong han={han} />}
        {rutDuoc && <button onClick={rutLai} className="min-h-9 rounded-lg bg-white/10 px-3 text-[0.8125rem] font-semibold text-white hover:bg-white/20">Rút lại để sửa</button>}
        <span className="w-full text-[0.75rem] text-[#F0C9C4] sm:hidden">Hạn {ngayGioDu(han)}</span>
        <span className="hidden w-full text-[0.75rem] text-[#F0C9C4] sm:block">Hạn nộp {ngayGioDu(han)}</span>
      </div>
      {ky.yeu_cau && <div className="whitespace-pre-line rounded-xl bg-nen-3 px-4 py-3 text-sm"><b>Yêu cầu:</b> {ky.yeu_cau}</div>}
      {data.trang_thai === 'can_bo_sung' && data.y_kien_duyet && <div className="rounded-xl bg-cam-nhat p-4 text-sm text-cam-dam"><b>Cần bổ sung:</b> {data.y_kien_duyet}</div>}
      {data.trang_thai === 'da_duyet' && <div className="rounded-xl bg-xanh-nhat p-4 text-sm text-xanh">Đã được duyệt{data.y_kien_duyet ? `: ${data.y_kien_duyet}` : ''}.</div>}
      <FormBaoCao nop={data} suaDuoc={suaDuoc} xong={taiLai} />
    </>
  );
}

// ---------------------------------------------------------------- Báo cáo = văn bản PDF đã ký, đóng dấu (+ tài liệu kèm theo)
const TRUONG_MD: Truong[] = [{ ma: 'tep_bao_cao', nhan: 'Tài liệu kèm theo (nếu có)', kieu: 'tep' }];

function FormBaoCao({ nop, suaDuoc, xong }: { nop: Nop; suaDuoc: boolean; xong: () => void }) {
  const nav = useNavigate();
  const ky = nop.ky_bao_cao;
  const truong = ky.mau_bieu?.truong?.length ? ky.mau_bieu.truong : TRUONG_MD;
  const laLinhVuc = ky.cap === 'linh_vuc';
  const [gt, setGt] = useState<Record<string, string>>(nop.so_lieu ?? {});
  const [meta, setMeta] = useState<MetaVb>(() => ({ ...metaTuVanBan(nop.van_ban), co_quan_ban_hanh: nop.van_ban?.co_quan_ban_hanh ?? nop.don_vi.ten }));
  const [tep, setTep] = useState<File | null>(null);
  const [doiChua, setDoiChua] = useState(false);
  const [camKet, setCamKet] = useState(false);
  const [dangChay, setDangChay] = useState<'nhap' | 'nop' | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => { setGt(nop.so_lieu ?? {}); setDoiChua(false); setTep(null); setMeta({ ...metaTuVanBan(nop.van_ban), co_quan_ban_hanh: nop.van_ban?.co_quan_ban_hanh ?? nop.don_vi.ten }); }, [nop.id, nop.van_ban?.id, nop.trang_thai]); // eslint-disable-line react-hooks/exhaustive-deps
  // (không đặt lại khi tải lại dữ liệu lúc quay về trang — giữ tệp đang chọn)

  const tepPhu = truong.filter((t) => t.kieu === 'tep');

  const luu = async (tt: 'nhap' | 'da_nop') => {
    setLoi(null);
    if (tt === 'da_nop') {
      if (!tep && !nop.van_ban) { setLoi('Chọn tệp PDF văn bản đã ký, đóng dấu'); return; }
      const l = kiemTraMeta(meta); if (l) { setLoi(l); return; }
      if (!camKet) { setLoi('Tích ô xác nhận trước khi gửi'); return; }
    } else if (meta.mat) { setLoi('Văn bản có độ mật — không nộp lên hệ thống.'); return; }
    setDangChay(tt === 'nhap' ? 'nhap' : 'nop');
    try {
      if (tep || (nop.van_ban && doiChua)) {
        const l = kiemTraMeta(meta, false); if (l) throw new Error(l);
        const len = tep ? await taiPdfLenDrive(tep, 'van_ban_nop', { nopId: nop.id, thuMuc: `${ky.ten}/${nop.don_vi.ten}` }) : null;
        const { error } = await supabase.rpc('nop_gan_van_ban', { p_nop: nop.id, p: {
          ...meta, noi_dung: tep ? meta.noi_dung : null, drive_file_id: len?.drive_file_id ?? '', drive_url: len?.url ?? '', ten_tep: tep?.name ?? '',
        } });
        if (error) throw error;
      }
      const { error } = await supabase.from('nop_bao_cao').update({ so_lieu: gt, trang_thai: tt }).eq('id', nop.id);
      if (error) throw error;
      setDoiChua(false); setTep(null);
      if (tt === 'da_nop') nav('/viec-can-nop'); else xong();
    } catch (e) { setLoi(loiDe(e)); } finally { setDangChay(null); }
  };

  const coVb = !!tep || !!nop.van_ban;
  const buoc = !suaDuoc ? 3 : !coVb ? 1 : camKet ? 3 : 2;
  const guiToi = laLinhVuc ? 'Gửi Thường trực BCĐ' : ky.chu_tri_don_vi_id ? 'Gửi đơn vị giao' : 'Gửi Cơ quan Thường trực';
  return (
    <>
      <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="Các bước nộp">
        {['Văn bản', 'Tệp đính kèm', 'Xác nhận'].map((t, i) => (
          <li key={t} className="flex flex-col gap-1.5" aria-current={buoc === i + 1 ? 'step' : undefined}>
            <span className={cx('h-1 rounded-full', i + 1 <= buoc ? 'bg-ink' : 'bg-vien-2')} />
            <span className={cx('text-[0.7812rem]', i + 1 <= buoc ? 'font-semibold text-den' : 'text-mo')}>{i + 1} · {t}</span>
          </li>
        ))}
      </ol>
      {laLinhVuc && ky.ky_cha_id && <BaiDonViDaNhan kyChaId={ky.ky_cha_id} />}
      {(
        <The className="flex flex-col gap-3 p-4">
          <TieuDeThe>{laLinhVuc ? 'Báo cáo tổng hợp đã ký, đóng dấu' : 'Báo cáo đã ký, đóng dấu'}</TieuDeThe>
          {suaDuoc
            ? <OVanBanPdf meta={meta} doiMeta={(m) => { setMeta(m); setDoiChua(true); }} tep={tep} driveId={nop.van_ban?.drive_file_id} khoaNhap={suaDuoc ? `nop:${nop.id}` : undefined}
                chonTep={(f, m) => { setTep(f); setMeta(m); setDoiChua(true); }} />
            : nop.van_ban ? <ThongTinVanBan vb={nop.van_ban} /> : <Rong>{nop.nop_ngoai ? 'Nộp ngoài hệ thống.' : 'Chưa có văn bản.'}</Rong>}
        </The>
      )}
      {tepPhu.map((t) => (
        <The key={t.ma} className="flex flex-col gap-2 p-4">
          <span className="text-[0.8125rem] font-semibold text-mo-2">{t.nhan}{t.bat_buoc ? ' *' : ''}</span>
          <TepDinhKem thuMuc={`${ky.ten}/${nop.don_vi.ten}`} loai="nop_bao_cao" dichId={nop.id} suaDuoc={suaDuoc} tep={nop.tep} xong={xong} />
        </The>
      ))}
      {suaDuoc && (
        <div className="day-duoi sticky z-10 flex flex-col gap-2 rounded-2xl border border-vien bg-white/95 p-3 shadow-lg backdrop-blur">
          {loi && <HopLoi loi={loi} />}
          <label className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-mo-2">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-ink" checked={camKet} onChange={(e) => setCamKet(e.target.checked)} />
            Tôi xác nhận văn bản đã được chỉ huy/lãnh đạo đơn vị ký, đóng dấu; tài liệu không chứa nội dung mật.
          </label>
          <div className="flex items-center gap-2.5">
            <Nut className="min-h-12" dangChay={dangChay === 'nhap'} onClick={() => luu('nhap')}>{doiChua ? 'Lưu nháp' : 'Đã lưu'}</Nut>
            <Nut kieu="chinh" className="min-h-12 flex-1 whitespace-nowrap" dangChay={dangChay === 'nop'} onClick={() => luu('da_nop')}>{guiToi}<ArrowRight className="h-4 w-4 max-sm:hidden" /></Nut>
          </div>
        </div>
      )}
    </>
  );
}

// Đầu mối: danh sách báo cáo đơn vị trong kỳ để làm căn cứ tổng hợp
function BaiDonViDaNhan({ kyChaId }: { kyChaId: string }) {
  const { hoSo } = useAuth();
  const { data } = useDuLieu(async () => (kq(await supabase.from('nop_bao_cao')
    .select(`id, trang_thai, don_vi_id, don_vi(ten, thu_tu), van_ban!nop_bao_cao_van_ban_id_fkey(${COT_VB_NOP})`).eq('ky_id', kyChaId)) ?? []) as unknown as
    { id: string; trang_thai: string; don_vi_id: string; don_vi: { ten: string; thu_tu: number }; van_ban: VanBanDaNop | null }[], [kyChaId]);
  const ds = (data ?? []).filter((x) => x.don_vi_id !== hoSo?.don_vi_id).sort((a, b) => a.don_vi.thu_tu - b.don_vi.thu_tu);
  if (!ds.length) return null;
  return (
    <The className="flex flex-col gap-2 p-4">
      <TieuDeThe>Báo cáo của các đơn vị · {ds.filter((x) => ['da_nop', 'da_duyet'].includes(x.trang_thai)).length}/{ds.length} đã gửi</TieuDeThe>
      <ul className="m-0 flex list-none flex-col p-0">
        {ds.map((x) => {
          const link = x.van_ban ? (x.van_ban.drive_url || linkXemDrive(x.van_ban.drive_file_id)) : null;
          return (
            <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#F1EEE7] py-2.5 text-[0.8125rem] last:border-0">
              <span className="w-44 shrink-0 font-semibold">{x.don_vi.ten}</span>
              <span className="min-w-0 flex-1">
                {x.van_ban ? <>{link && !String(x.van_ban.drive_file_id ?? '').startsWith('thu-') ? <button type="button" onClick={() => void moTepDrive('van_ban', x.van_ban!.id, x.van_ban!.ten_tep ?? 'van-ban.pdf', 'xem', x.van_ban!.drive_url)} className="so font-bold text-[#8E1B22]">{x.van_ban.so_ky_hieu ?? 'Văn bản'}</button> : <b className="so">{x.van_ban.so_ky_hieu}</b>} · {x.van_ban.trich_yeu}</> : <span className="text-mo">—</span>}
              </span>
              <Chip nen={TT_NOP[x.trang_thai].nen} chu={TT_NOP[x.trang_thai].chu}>{TT_NOP[x.trang_thai].nhan}</Chip>
            </li>
          );
        })}
      </ul>
    </The>
  );
}

// "12 ngày 01:35:48"
function ConLaiDong({ han }: { han: string }) {
  const t = useBayGio();
  const c = conLai(han, t);
  return <span className={cx('mono text-[1.0625rem] font-bold', c.ms <= 0 && 'text-[#FCA5A5]')}>{c.ms <= 0 ? 'Quá hạn' : `${c.ngay} ngày ${hai(c.gio)}:${hai(c.phut)}:${hai(c.giay)}`}</span>;
}
