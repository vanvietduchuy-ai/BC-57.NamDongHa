// Lịch báo cáo định kỳ (kỳ nối tiếp) của một đơn vị giao:
//   chuTri = null  : Thường trực BCĐ giao 2 đầu mối (Tổ CSKV, Phòng VH-XH)
//   chuTri = <id>  : đầu mối giao các phòng, đơn vị (chọn được đơn vị phải nộp)
import { useState, type ReactNode } from 'react';
import { CalendarClock, Play } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { ngayGio } from '../lib/dinhDang';
import { CAP_LICH, chuoiKyTiepTheo, TEN_LOAI_LICH, type LichDk, type QuyTacLich } from '../lib/lichDinhKy';
import { DangTai, HopLoi, lopO, Nut, The, TieuDeThe, cx } from './ui';

type LichSua = LichDk & { mau_bieu_id: string | null; don_vi_ap_dung: string[] | null; don_vi_id: string | null };
type DonVi = { id: string; ten: string; phai_bao_cao: boolean };

function Hang({ nhan, children }: { nhan: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#F1EEE7] py-3 text-sm"><span className="w-full font-semibold sm:w-56">{nhan}</span><div className="flex flex-wrap items-center gap-2">{children}</div></div>;
}

export default function LichDinhKy({ chuTri, hanMacDinh = 8 }: { chuTri: string | null; hanMacDinh?: number }) {
  const MAC_DINH: Record<string, QuyTacLich> = {
    thang: { mo_ngay: 15, han_ngay: hanMacDinh, han_gio: '17:00' },
    quy: { mo_ngay: 15, han_ngay: hanMacDinh, han_gio: '17:00', thay_thang: true },
    sau_thang: { mo_ngay: 15, han_ngay: hanMacDinh, han_gio: '17:00', thay_thang: true },
    nam: { mo_ngay: 15, han_ngay: hanMacDinh, han_gio: '17:00', thay_thang: true },
  };
  const { data, dangTai, taiLai } = useDuLieu(async () => {
    let q = supabase.from('lich_ky').select('id, ten, loai, hoat_dong, quy_tac, mau_bieu_id, don_vi_ap_dung, don_vi_id').in('loai', ['thang', 'quy', 'sau_thang', 'nam']);
    q = chuTri ? q.eq('don_vi_id', chuTri) : q.is('don_vi_id', null);
    const [a, b, c, d] = await Promise.all([
      q,
      supabase.from('don_vi').select('id, ten, phai_bao_cao').eq('hoat_dong', true).order('thu_tu'),
      supabase.from('mau_bieu').select('id, ten').ilike('ten', 'Báo cáo tháng%').limit(1).maybeSingle(),
      supabase.from('dau_moi_linh_vuc').select('don_vi_id'),
    ]);
    return {
      lich: (kq(a) ?? []) as LichSua[], donVi: (kq(b) ?? []) as DonVi[], mau: (c.data as { id: string } | null)?.id ?? null,
      dauMoi: [...new Set(((d.data ?? []) as { don_vi_id: string }[]).map((x) => x.don_vi_id))],
    };
  }, [chuTri]);
  const [sua, setSua] = useState<Record<string, LichSua>>({});
  const [nhan, setNhan] = useState<string[] | null>(null);
  const [tb, setTb] = useState<{ loi?: string; ok?: string } | null>(null);
  const [dang, setDang] = useState(false);
  if (dangTai && !data) return <DangTai />;
  if (!data) return null;

  const ds: LichSua[] = (['thang', 'quy', 'sau_thang', 'nam'] as const).map((loai) => sua[loai] ?? data.lich.find((l) => l.loai === loai) ?? {
    id: '', ten: { thang: 'Báo cáo tháng', quy: 'Báo cáo quý', sau_thang: 'Báo cáo 6 tháng', nam: 'Báo cáo năm' }[loai], loai, hoat_dong: false,
    quy_tac: MAC_DINH[loai], mau_bieu_id: data.mau, don_vi_ap_dung: null, don_vi_id: chuTri,
  });
  // Đơn vị phải nộp (dùng chung cho 4 lịch của đơn vị giao)
  const coTheNop = data.donVi.filter((d) => d.id !== chuTri && (chuTri ? d.phai_bao_cao : data.dauMoi.includes(d.id)));
  const nhanHienTai = nhan ?? data.lich.find((l) => l.don_vi_ap_dung?.length)?.don_vi_ap_dung ?? coTheNop.map((d) => d.id);
  const doi = (l: LichSua, x: Partial<LichSua> | { qt: Partial<QuyTacLich> }) => {
    const moi = 'qt' in x ? { ...l, quy_tac: { ...l.quy_tac, ...x.qt } } : { ...l, ...x };
    setSua({ ...sua, [l.loai]: moi }); setTb(null);
  };
  const soO = (l: LichSua, k: 'mo_ngay' | 'han_ngay' | 'han_gui_tinh_ngay', md: number) => (
    <input type="number" min={1} max={28} aria-label={`${k} ${l.loai}`} className={cx(lopO, 'w-[4.5rem] text-center')} value={String(l.quy_tac[k] ?? md)}
      onChange={(e) => doi(l, { qt: { [k]: Math.min(28, Math.max(1, Number(e.target.value) || md)) } })} />
  );
  const chuoi = chuoiKyTiepTheo(ds.map((l) => ({ ...l, id: l.id || l.loai })), 6);
  const coDoi = Object.keys(sua).length > 0 || nhan !== null;

  const luu = async () => {
    setDang(true); setTb(null);
    try {
      const apDung = chuTri && nhan ? (nhan.length === coTheNop.length ? null : nhan) : undefined;
      const canLuu = new Map(Object.values(sua).map((l) => [l.loai, l]));
      if (apDung !== undefined) for (const l of ds) if (l.id && !canLuu.has(l.loai)) canLuu.set(l.loai, l);
      for (const l of canLuu.values()) {
        const dong = {
          ten: l.ten, loai: l.loai, hoat_dong: l.hoat_dong, quy_tac: l.quy_tac, mau_bieu_id: l.mau_bieu_id ?? data.mau, don_vi_id: chuTri,
          ...(apDung !== undefined ? { don_vi_ap_dung: apDung } : {}),
        };
        const r = l.id ? await supabase.from('lich_ky').update(dong).eq('id', l.id) : await supabase.from('lich_ky').insert(dong);
        if (r.error) throw r.error;
      }
      setSua({}); setNhan(null); setTb({ ok: 'Đã lưu lịch. Áp dụng từ kỳ tiếp theo.' }); void taiLai();
    } catch (e) { setTb({ loi: loiDe(e) }); } finally { setDang(false); }
  };
  const taoNgay = async () => {
    setDang(true); setTb(null);
    const { data: n, error } = await supabase.rpc('sinh_ky_tu_lich');
    setDang(false);
    setTb(error ? { loi: loiDe(error) } : { ok: n ? `Đã tạo ${n} kỳ báo cáo tiếp theo.` : 'Kỳ hiện tại chưa hết hạn nộp — kỳ sau sẽ tự tạo ngay khi hết hạn.' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {ds.map((l) => (
          <The key={l.loai} className="flex flex-col px-5 py-3">
            <TieuDeThe phai={
              <label className="flex min-h-10 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[#A4161A]" checked={l.hoat_dong} onChange={(e) => doi(l, { hoat_dong: e.target.checked })} />Bật</label>
            }><span className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-mo" />{TEN_LOAI_LICH[l.loai]}</span></TieuDeThe>
            <Hang nhan="Tên lịch"><input className={cx(lopO, 'w-72')} value={l.ten} onChange={(e) => doi(l, { ten: e.target.value })} /></Hang>
            <Hang nhan="Số liệu tính từ">ngày {soO(l, 'mo_ngay', 15)} tháng trước tháng chốt</Hang>
            <Hang nhan="Hạn nộp">ngày {soO(l, 'han_ngay', hanMacDinh)} tháng chốt, lúc
              <input type="time" aria-label={`giờ hạn ${l.loai}`} className={lopO} value={l.quy_tac.han_gio ?? '17:00'} onChange={(e) => doi(l, { qt: { han_gio: e.target.value } })} /></Hang>
            {!chuTri && <Hang nhan="Hạn gửi cấp trên">trước ngày {soO(l, 'han_gui_tinh_ngay', 12)} tháng chốt</Hang>}
            {CAP_LICH[l.loai] > 1 && (
              <Hang nhan="Thay báo cáo cấp dưới"><label className="flex min-h-10 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#A4161A]" checked={!!l.quy_tac.thay_thang} onChange={(e) => doi(l, { qt: { thay_thang: e.target.checked } })} />Có (tháng chốt không có báo cáo {l.loai === 'quy' ? 'tháng' : 'tháng, quý'})</label></Hang>
            )}
          </The>
        ))}
        <The className="flex flex-col gap-2 px-5 py-3">
          <TieuDeThe>Đơn vị phải nộp ({chuTri ? nhanHienTai.length : coTheNop.length})</TieuDeThe>
          {chuTri ? (
            <div className="flex flex-wrap gap-2">
              {coTheNop.map((d) => {
                const chon = nhanHienTai.includes(d.id);
                return (
                  <button type="button" key={d.id} aria-pressed={chon} onClick={() => { setNhan(chon ? nhanHienTai.filter((x) => x !== d.id) : [...nhanHienTai, d.id]); setTb(null); }}
                    className={cx('min-h-9 rounded-lg border px-3 text-[13px]', chon ? 'border-ink bg-ink text-white' : 'border-vien-2 bg-white text-den')}>{d.ten}</button>
                );
              })}
            </div>
          ) : <span className="text-sm">{coTheNop.map((d) => d.ten).join(', ')}</span>}
        </The>
        <The className="flex flex-col gap-2 px-5 py-3">
          <TieuDeThe>Các kỳ tiếp theo (theo lịch đang soạn)</TieuDeThe>
          {chuoi.length === 0 ? <span className="text-sm text-mo">Chưa bật lịch nào.</span> : chuoi.map((k) => (
            <div key={k.ten} className="flex flex-col border-t border-[#F1EEE7] py-2 text-sm first:border-0">
              <div className="flex items-center gap-3"><span className="flex-1 font-semibold">{k.ten}</span><span className="text-xs text-mo">hạn {ngayGio(k.han)}</span></div>
              <span className="text-xs text-mo">Số liệu {k.tu} – {k.den} · {k.taoSau ? `tự tạo khi hết hạn kỳ trước (${ngayGio(k.taoSau)})` : 'kỳ hiện tại'}</span>
            </div>
          ))}
        </The>
      </div>
      {tb?.loi && <HopLoi loi={tb.loi} />}
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-vien bg-white/95 px-3 py-2 shadow-sm backdrop-blur lg:bottom-4">
        {tb?.ok && <span className="text-sm font-semibold text-[#166534]">{tb.ok}</span>}
        <Nut icon={<Play className="h-4 w-4" />} dangChay={dang} onClick={taoNgay}>Tạo kỳ tiếp theo ngay</Nut>
        {coDoi && <Nut onClick={() => { setSua({}); setNhan(null); }}>Huỷ thay đổi</Nut>}
        <Nut kieu="chinh" disabled={!coDoi} dangChay={dang} onClick={luu}>Lưu lịch</Nut>
      </div>
    </div>
  );
}
