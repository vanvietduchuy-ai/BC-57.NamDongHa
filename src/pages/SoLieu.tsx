// Đơn vị cập nhật số liệu các chỉ tiêu được giao (Chuyển đổi số – NQ 57, Đề án 06), theo kỳ tháng
import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Info, Send } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { loiDe, supabase } from '../lib/supabase';
import { ngayGio } from '../lib/dinhDang';
import { datMucTieu, dauNam, dinhDangGt, dinhDangMucTieu, giaTriDong, gopSoLieu, hanKy, kyLui, kyMacDinh, kyNay, LV_CT, tenKyCt, type ChiTieu, type SoLieu as Sl } from '../lib/chiTieu';
import { Chip, ChipHan, cx, DangTai, HopLoi, lopO, Nut, Rong, The, TieuDeTrang } from '../components/ui';

type Nhap = { tu: string; mau: string; gia_tri: string; ghi_chu: string };
const soVao = (s: string) => (s.trim() === '' ? null : Number(s.replace(/\./g, '').replace(',', '.')));

export default function SoLieu() {
  const { hoSo } = useAuth();
  const dv = hoSo?.don_vi_id ?? '';
  const [ky, setKy] = useState(kyMacDinh());
  const [nhap, setNhap] = useState<Record<string, Nhap>>({});
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [bao, setBao] = useState<string | null>(null);

  const { data, loi: loiTai, dangTai, taiLai } = useDuLieu(async () => {
    const [a, b] = await Promise.all([
      supabase.from('chi_tieu').select('*').contains('don_vi_ids', [dv]).eq('hoat_dong', true).order('linh_vuc').order('thu_tu'),
      supabase.from('chi_tieu_so_lieu').select('chi_tieu_id, don_vi_id, ky, tu, mau, gia_tri, ghi_chu, da_gui, cap_nhat_luc').eq('don_vi_id', dv).gte('ky', [kyLui(ky), dauNam(ky)].sort()[0]).lte('ky', ky),
    ]);
    const ct = (kq(a) ?? []) as ChiTieu[]; const sl = (kq(b) ?? []) as Sl[];
    const m: Record<string, Nhap> = {};
    ct.forEach((c) => { const s = sl.find((x) => x.chi_tieu_id === c.id && x.ky === ky);
      m[c.id] = { tu: s?.tu?.toString() ?? '', mau: s?.mau?.toString() ?? '', gia_tri: s?.gia_tri?.toString() ?? '', ghi_chu: s?.ghi_chu ?? '' }; });
    setNhap(m);
    return { ct, sl };
  }, [dv, ky]);

  const han = data?.ct.length ? hanKy(ky, Math.min(...data.ct.map((c) => c.han_ngay))) : null;
  const daGui = (id: string) => data?.sl.find((s) => s.chi_tieu_id === id && s.ky === ky)?.da_gui;
  const du = (c: ChiTieu) => { const n = nhap[c.id]; return !!n && (c.kieu === 'ty_le' ? n.tu !== '' && n.mau !== '' : n.gia_tri !== ''); };
  const soDu = data?.ct.filter(du).length ?? 0;
  const nhomLv = useMemo(() => (['chuyen_doi_so', 'de_an_06'] as const).map((lv) => [lv, data?.ct.filter((c) => c.linh_vuc === lv) ?? []] as const).filter(([, d]) => d.length), [data]);

  const luu = async (gui: boolean) => {
    if (!data) return;
    setLoi(null); setBao(null);
    const sai = data.ct.find((c) => c.kieu === 'ty_le' && du(c) && (soVao(nhap[c.id].mau) ?? 0) < (soVao(nhap[c.id].tu) ?? 0));
    if (sai) { setLoi(`${sai.ma}: tử số lớn hơn mẫu số`); return; }
    if (gui && soDu < data.ct.length) { setLoi(`Còn ${data.ct.length - soDu} chỉ tiêu chưa nhập số`); return; }
    setDang(true);
    const dong = data.ct.filter(du).map((c) => ({ chi_tieu_id: c.id, ky, tu: soVao(nhap[c.id].tu), mau: soVao(nhap[c.id].mau), gia_tri: soVao(nhap[c.id].gia_tri), ghi_chu: nhap[c.id].ghi_chu || null }));
    const { error } = await supabase.rpc('cap_nhat_so_lieu', { p_ky: ky, p_dong: dong, p_gui: gui });
    setDang(false);
    if (error) setLoi(loiDe(error)); else { setBao(gui ? 'Đã gửi số liệu cho đơn vị chủ trì.' : 'Đã lưu nháp.'); void taiLai(); }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      <TieuDeTrang tren={hoSo?.don_vi?.ten} ten="Cập nhật số liệu" />
      <div className="flex items-center gap-2">
        <button aria-label="Kỳ trước" onClick={() => setKy(kyLui(ky))} className="grid h-10 w-10 place-items-center rounded-xl border border-vien-2 bg-white"><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex min-w-0 flex-1 flex-col items-center leading-tight"><span className="text-[0.9375rem] font-bold">{tenKyCt(ky)}</span>
          <span className="text-[11.5px] text-mo">{han ? `Hạn ${ngayGio(han)}` : ''}</span></div>
        <button aria-label="Kỳ sau" disabled={ky >= kyNay()} onClick={() => setKy(kyLui(ky, -1))} className="grid h-10 w-10 place-items-center rounded-xl border border-vien-2 bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {(loiTai || loi) && <HopLoi loi={(loiTai || loi)!} />}
      {bao && <div className="flex items-center gap-2 rounded-xl bg-[#DCFCE7] px-3 py-2 text-[0.8125rem] font-semibold text-[#166534]"><CheckCircle2 className="h-4 w-4" />{bao}</div>}
      {dangTai && !data && <DangTai />}
      {data && !data.ct.length && <Rong>Đơn vị chưa được giao chỉ tiêu cập nhật số liệu.</Rong>}
      {data && data.ct.length > 0 && (
        <The className="flex items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col"><span className="text-[0.875rem]"><b className="so">{soDu}/{data.ct.length}</b> chỉ tiêu đã nhập</span>
            <span className="text-[11.5px] text-mo">{data.ct.every((c) => daGui(c.id)) ? 'Đã gửi đơn vị chủ trì' : 'Nhập xong bấm "Gửi số liệu"'}</span></div>
          {han && <ChipHan han={han} />}
        </The>
      )}
      {nhomLv.map(([lv, ds]) => (
        <section key={lv} className="flex flex-col gap-2">
          <h2 className="m-0 px-1 text-[11.5px] font-bold uppercase tracking-wide text-mo">{LV_CT[lv].ten} · chủ trì: {LV_CT[lv].dauMoi.replace(' – Công an phường', '')}</h2>
          {ds.map((c) => {
            const n = nhap[c.id] ?? { tu: '', mau: '', gia_tri: '', ghi_chu: '' };
            const doi = (k: keyof Nhap, v: string) => setNhap({ ...nhap, [c.id]: { ...n, [k]: v } });
            const truoc = data?.sl.find((s) => s.chi_tieu_id === c.id && s.ky === kyLui(ky));
            const gt = giaTriDong(c, { tu: soVao(n.tu), mau: soVao(n.mau), gia_tri: soVao(n.gia_tri) });
            // Luỹ kế: các tháng trước (đã gửi) + số đang nhập
            const lk = c.luy_ke && du(c) ? gopSoLieu(c, [...(data?.sl ?? []).filter((s) => s.chi_tieu_id === c.id && s.da_gui && s.ky >= dauNam(ky) && s.ky < ky),
              { chi_tieu_id: c.id, don_vi_id: dv, ky, tu: soVao(n.tu), mau: soVao(n.mau), gia_tri: soVao(n.gia_tri), ghi_chu: null, da_gui: true, cap_nhat_luc: null }]).gt : null;
            const dat = du(c) ? datMucTieu(c, c.luy_ke ? lk : gt) : null;
            return (
              <The key={c.id} className="flex flex-col gap-2.5 p-4">
                <div className="flex items-start gap-2">
                  <span className="so mt-0.5 shrink-0 rounded bg-nen-3 px-1.5 text-[10.5px] font-bold text-mo-2">{c.ma}</span>
                  <span className="min-w-0 flex-1 text-[0.875rem] font-semibold leading-snug">{c.ten}</span>
                  {daGui(c.id) ? <Chip nen="bg-[#DCFCE7]" chu="text-[#166534]">Đã gửi</Chip> : du(c) ? <Chip nen="bg-xanh-nhat" chu="text-xanh">Nháp</Chip> : <Chip nen="bg-cam-nhat" chu="text-cam-dam">Chưa nhập</Chip>}
                </div>
                {c.kieu === 'ty_le' && (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <label className="flex min-w-0 flex-col gap-1"><span className="truncate text-[11.5px] text-mo">{c.nhan_tu ?? 'Tử số'}</span>
                      <input inputMode="numeric" className={cx(lopO, 'so text-right')} value={n.tu} onChange={(e) => doi('tu', e.target.value)} /></label>
                    <span className="pb-3 text-mo">/</span>
                    <label className="flex min-w-0 flex-col gap-1"><span className="truncate text-[11.5px] text-mo">{c.nhan_mau ?? 'Mẫu số'}</span>
                      <input inputMode="numeric" className={cx(lopO, 'so text-right')} value={n.mau} onChange={(e) => doi('mau', e.target.value)} /></label>
                  </div>
                )}
                {c.kieu === 'so' && (
                  <label className="flex items-center gap-2"><input inputMode="numeric" className={cx(lopO, 'so flex-1 text-right')} value={n.gia_tri} onChange={(e) => doi('gia_tri', e.target.value)} />
                    <span className="w-20 text-[0.8125rem] text-mo">{c.don_vi_tinh}</span></label>
                )}
                {c.kieu === 'co_khong' && (
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-nen-3 p-1">
                    {[['1', 'Có'], ['0', 'Chưa có']].map(([v, t]) => <button key={v} aria-pressed={n.gia_tri === v} onClick={() => doi('gia_tri', v)}
                      className={cx('min-h-9 rounded-lg text-[0.8125rem] font-semibold', n.gia_tri === v ? 'bg-white shadow-sm' : 'text-mo')}>{t}</button>)}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-mo">
                  {c.kieu !== 'co_khong' && <span>{c.luy_ke ? 'Tháng này' : 'Kết quả'}: <b className={cx('so text-[0.8125rem]', !c.luy_ke && dat === false ? 'text-nguy' : !c.luy_ke && dat ? 'text-[#166534]' : 'text-den')}>{dinhDangGt(c, du(c) ? gt : null)}</b></span>}
                  {c.luy_ke && <span>· Luỹ kế từ T1: <b className={cx('so text-[0.8125rem]', dat === false ? 'text-nguy' : dat ? 'text-[#166534]' : 'text-den')}>{dinhDangGt(c, lk)}</b></span>}
                  <span>· Mục tiêu {dinhDangMucTieu(c)}</span>
                  {truoc?.da_gui && <span>· Kỳ trước {c.kieu === 'co_khong' ? (truoc.gia_tri ? 'Có' : 'Không') : dinhDangGt(c, giaTriDong(c, truoc))}</span>}
                </div>
                {c.ghi_chu && <div className="flex gap-1.5 rounded-lg bg-nen-2 px-2.5 py-2 text-[11.5px] leading-snug text-mo-2"><Info className="mt-px h-3.5 w-3.5 shrink-0" />{c.ghi_chu}</div>}
                <input className={cx(lopO, 'min-h-9 text-[0.8125rem]')} placeholder="Ghi chú, nguyên nhân (nếu chưa đạt)" value={n.ghi_chu} onChange={(e) => doi('ghi_chu', e.target.value)} />
              </The>
            );
          })}
        </section>
      ))}
      {data && data.ct.length > 0 && (
        <div className="day-duoi sticky z-10 flex gap-2 rounded-2xl border border-vien bg-white/95 p-2 shadow-lg backdrop-blur">
          <Nut className="flex-1" dangChay={dang} onClick={() => luu(false)}>Lưu nháp</Nut>
          <Nut kieu="chinh" className="flex-[1.4]" icon={<Send className="h-4 w-4" />} dangChay={dang} onClick={() => luu(true)}>Gửi số liệu</Nut>
        </div>
      )}
    </div>
  );
}
