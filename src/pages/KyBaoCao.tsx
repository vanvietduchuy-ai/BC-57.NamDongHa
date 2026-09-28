import { useEffect, useState } from 'react';
import { useManRong } from '../lib/manHinh';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase, loiDe } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { laDauMoi, useAuth, laQuanTri } from '../lib/auth';
import LichDinhKy from '../components/LichDinhKy';
import { ngay, ngayGio, tenNgan } from '../lib/dinhDang';
import TheoDoiDonVi from '../components/TheoDoiDonVi';
import KyBaoCaoChiTiet from './KyBaoCaoChiTiet';
import { Chip, DangTai, HopLoi, HopThoai, lopO, Nut, O, Rong, TieuDeTrang, cx } from '../components/ui';

type Dong = { ky_id: string; chu_tri_don_vi_id: string | null; don_vi_giao: string | null; ten: string; loai: string; han_nop: string; han_gui_tinh: string | null; trang_thai_ky: string; so_don_vi: number; da_nop: number; da_duyet: number; can_bo_sung: number; chua_nop: number; nop_tre: number };
type MauBieu = { id: string; ten: string };
const LOAI: Record<string, string> = { thang: 'THÁNG', quy: 'QUÝ', sau_thang: '6 THÁNG', nam: 'NĂM', dot_xuat: 'ĐỘT XUẤT' };

type Tab = 'dinh_ky' | 'dot_xuat' | 'khoa' | 'theo_doi' | 'lich';

export default function KyBaoCao() {
  const rong = useManRong();
  const [chonKy, setChonKy] = useState<string | null>(null);
  const [khe, setKhe] = useState<HTMLDivElement | null>(null);
  const { hoSo } = useAuth();
  const dauMoi = hoSo?.vai_tro === 'don_vi' && laDauMoi(hoSo);         // đầu mối: chỉ kỳ mình giao
  const chuTri = dauMoi ? hoSo!.don_vi_id : null;
  const quanTri = laQuanTri(hoSo);
  const taoDuoc = quanTri || dauMoi;
  const [params, setParams] = useSearchParams();
  const tabUrl = params.get('tab');
  const [tab, setTab] = useState<Tab>(() => (['theo_doi', 'lich', 'dot_xuat', 'khoa'].includes(tabUrl ?? '') ? tabUrl as Tab : 'dinh_ky'));
  const [giao, setGiao] = useState<string>('tat_ca');
  const [taoMo, setTaoMo] = useState(params.get('tao') === '1');
  const { data, loi, dangTai, taiLai } = useDuLieu(async () => {
    const [a, b] = await Promise.all([
      (chuTri ? supabase.from('v_tinh_hinh_nop').select('*').eq('cap', 'don_vi').eq('chu_tri_don_vi_id', chuTri) : supabase.from('v_tinh_hinh_nop').select('*').eq('cap', 'don_vi'))
        .order('han_nop', { ascending: false }).limit(300),
      supabase.from('mau_bieu').select('id, ten').eq('hoat_dong', true),
    ]);
    const ky = (kq(a) ?? []) as Dong[];
    // Ngày bắt đầu kỳ (định kỳ) để ghi "Kỳ 15/9 – 14/10"
    const ids = ky.filter((k) => k.trang_thai_ky === 'mo').map((k) => k.ky_id);
    const tu = ids.length ? ((await supabase.from('ky_bao_cao').select('id, tu_ngay, den_ngay, yeu_cau').in('id', ids)).data ?? []) as { id: string; tu_ngay: string | null; den_ngay: string | null; yeu_cau: string | null }[] : [];
    return { ky, mau: (kq(b) ?? []) as MauBieu[], tu: new Map(tu.map((x) => [x.id, x])) };
  });

  const tatCa = data?.ky ?? [];
  const dsGiao = [...new Map(tatCa.map((k) => [k.chu_tri_don_vi_id ?? 'tt', k.don_vi_giao ?? 'Thường trực'])).entries()];
  const hopGiao = (k: Dong) => giao === 'tat_ca' || (k.chu_tri_don_vi_id ?? 'tt') === giao;
  const moDk = tatCa.filter((k) => k.trang_thai_ky === 'mo' && k.loai !== 'dot_xuat' && hopGiao(k));
  const moDx = tatCa.filter((k) => k.trang_thai_ky === 'mo' && k.loai === 'dot_xuat' && hopGiao(k));
  const khoa = tatCa.filter((k) => k.trang_thai_ky === 'khoa' && hopGiao(k));
  const ds = (tab === 'dinh_ky' ? moDk : tab === 'dot_xuat' ? moDx : tab === 'khoa' ? khoa : []).slice();
  if (tab !== 'khoa') ds.sort((a, b) => a.han_nop.localeCompare(b.han_nop));
  const dangChon = ds.find((k) => k.ky_id === chonKy)?.ky_id ?? ds[0]?.ky_id ?? null;
  const laDs = tab === 'dinh_ky' || tab === 'dot_xuat' || tab === 'khoa';
  const chiTiet = rong && laDs && !!dangChon;
  const nutTao = taoDuoc && <Nut kieu="chinh" icon={<Plus className="h-4 w-4" />} onClick={() => setTaoMo(true)} ngan="Đột xuất">Tạo kỳ báo cáo đột xuất</Nut>;
  const datTab = (t: Tab) => { setTab(t); setParams(t === 'dinh_ky' ? {} : { tab: t }, { replace: true }); };
  const TABS: [Tab, string][] = [
    ['dinh_ky', `Định kỳ · ${moDk.length}`], ['dot_xuat', `Đột xuất · ${moDx.length}`], ['theo_doi', 'Theo dõi đơn vị'],
    ...(taoDuoc ? [['lich', 'Lịch định kỳ'] as [Tab, string]] : []), ['khoa', `Đã khoá sổ · ${khoa.length}`],
  ];

  const TheKy = ({ k, chon }: { k: Dong; chon?: boolean }) => {
    const tt = data?.tu.get(k.ky_id);
    const dx = k.loai === 'dot_xuat';
    const conNgay = Math.ceil((Date.parse(k.han_nop) - Date.now()) / 86_400_000);
    return (
      <>
        <div className="flex items-center gap-2">
          <span className={cx('min-w-0 flex-1 truncate text-[11.5px] font-bold tracking-[1px]', dx ? 'text-cam' : 'text-xanh')}>{LOAI[k.loai] ?? k.loai}{!dauMoi && k.chu_tri_don_vi_id ? ` · ${tenNgan(k.don_vi_giao).toUpperCase()} GIAO` : ''}</span>
          {k.trang_thai_ky === 'mo'
            ? <span className={cx('mono shrink-0 text-[0.75rem] font-bold', conNgay <= 0 ? 'text-nguy' : dx ? 'text-cam' : 'text-xanh')}>{conNgay <= 0 ? 'quá hạn' : `${conNgay} ngày`}</span>
            : <Chip>Đã khoá</Chip>}
        </div>
        <span className={cx('text-[0.9375rem] font-bold leading-snug', chon !== undefined && 'text-den')}>{k.ten}</span>
        <span className="text-[0.7812rem] leading-snug text-mo">
          {tt?.tu_ngay ? `Kỳ ${ngay(tt.tu_ngay).replace(/\/\d{4}$/, '')} – ${ngay(tt.den_ngay).replace(/\/\d{4}$/, '')} · ` : dx && tt?.yeu_cau ? `${tt.yeu_cau.split('\n')[0].slice(0, 48)} · ` : ''}hạn {ngayGio(k.han_nop)}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEEBE3]"><div className={cx('thanh-chay h-1.5 rounded-full', dx ? 'bg-[#F59E0B]' : 'bg-xanh')} style={{ width: `${(k.da_nop / Math.max(1, k.so_don_vi)) * 100}%` }} /></div>
          <span className="mono shrink-0 text-[11.5px] font-bold text-mo-2">{k.da_nop}/{k.so_don_vi}</span>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Tiêu đề: màn hình rộng lấy theo kỳ đang chọn (khung chi tiết gắn vào đây) */}
      {chiTiet ? <div ref={setKhe} className="contents" /> : (
        <TieuDeTrang ten={dauMoi ? 'Theo dõi kỳ báo cáo đơn vị giao' : 'Theo dõi kỳ báo cáo'} tren={dauMoi ? hoSo?.don_vi?.ten : undefined} phai={nutTao} />
      )}
      <div role="tablist" className="-mt-1 flex gap-1 overflow-x-auto border-b border-vien">
        {TABS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => datTab(k)}
            className={cx('h-11 whitespace-nowrap px-4 text-[0.9062rem]', tab === k ? 'border-b-2 border-ink font-bold text-den' : 'font-medium text-mo hover:text-den')}>{t}</button>
        ))}
      </div>
      {loi && <HopLoi loi={loi} taiLai={taiLai} />}
      {dangTai && !data && <DangTai />}

      {tab === 'theo_doi' && <TheoDoiDonVi chuTri={chuTri} />}
      {tab === 'lich' && taoDuoc && <LichDinhKy chuTri={chuTri} hanMacDinh={chuTri ? 5 : 8} />}
      {laDs && data && (
        <div className={cx('grid grid-cols-1 items-start gap-5', rong && 'grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]')}>
          <div className={cx('flex flex-col gap-3', rong && 'sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pb-1 pr-1')}>
            {!dauMoi && dsGiao.length > 1 && (
              <select className={cx(lopO, 'w-full bg-white')} value={giao} onChange={(e) => setGiao(e.target.value)} aria-label="Đơn vị giao">
                <option value="tat_ca">Mọi đơn vị giao</option>
                {dsGiao.map(([id, ten]) => <option key={id} value={id}>{tenNgan(ten)} giao</option>)}
              </select>
            )}
            {ds.length === 0 ? <Rong>Không có kỳ báo cáo.</Rong> : (
              <ul className={cx('xep-hang grid gap-3', rong ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')} aria-label="Danh sách kỳ báo cáo">
                {ds.map((k) => (
                  <li key={k.ky_id}>
                    {rong ? (
                      <button type="button" onClick={() => setChonKy(k.ky_id)} aria-current={k.ky_id === dangChon}
                        className={cx('flex w-full flex-col gap-2.5 rounded-2xl bg-white p-4 text-left transition', k.ky_id === dangChon ? 'border-2 border-ink p-[15px]' : 'border border-vien hover:border-vien-2')}>
                        <TheKy k={k} chon={k.ky_id === dangChon} />
                      </button>
                    ) : (
                      <Link to={`/ky-bao-cao/${k.ky_id}`} className="the-noi flex flex-col gap-2.5 rounded-2xl border border-vien bg-white p-4 text-den"><TheKy k={k} /></Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {taoDuoc && tab !== 'khoa' && (
              <div className="rounded-2xl bg-nen-3 px-4 py-3 text-[0.8125rem] leading-relaxed text-mo-2">
                Lịch mở kỳ, hạn nộp và nhắc hạn cấu hình ở tab <button type="button" onClick={() => datTab('lich')} className="font-semibold text-[#8E1B22]">Lịch định kỳ</button>.
              </div>
            )}
          </div>
          {chiTiet && <div className="flex min-w-0 flex-col gap-4"><KyBaoCaoChiTiet key={dangChon} kyId={dangChon!} nhung khe={khe} themNut={nutTao} sauXoa={() => { setChonKy(null); void taiLai(); }} /></div>}
        </div>
      )}

      <TaoKyDotXuat mo={taoMo} dong={() => { setTaoMo(false); if (params.get('tao')) setParams({}); }} mauBieu={data?.mau ?? []} chuTri={chuTri} />
    </>
  );
}

// Thường trực: giao 2 đầu mối (Tổ CSKV, Phòng VH-XH). Đầu mối: giao các phòng, đơn vị.
function TaoKyDotXuat({ mo, dong, mauBieu, chuTri }: { mo: boolean; dong: () => void; mauBieu: MauBieu[]; chuTri: string | null }) {
  const nav = useNavigate();
  const [ten, setTen] = useState('');
  const [hanNgay, setHanNgay] = useState('');
  const [hanGio, setHanGio] = useState('17:00');
  const [canCu, setCanCu] = useState('');
  const [chon, setChon] = useState<string[]>([]);
  const [donVi, setDonVi] = useState<{ id: string; ten: string }[]>([]);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!mo) return;
    void (async () => {
      const [a, b] = await Promise.all([
        supabase.from('don_vi').select('id, ten, phai_bao_cao, nop_cho_dau_moi').eq('hoat_dong', true).order('thu_tu'),
        supabase.from('dau_moi_linh_vuc').select('don_vi_id'),
      ]);
      const dm = ((b.data ?? []) as { don_vi_id: string }[]).map((x) => x.don_vi_id);
      const d = ((a.data ?? []) as { id: string; ten: string; phai_bao_cao: boolean; nop_cho_dau_moi: string | null }[])
        .filter((x) => (chuTri ? x.id !== chuTri && (x.phai_bao_cao || x.nop_cho_dau_moi === chuTri) : dm.includes(x.id)));
      setDonVi(d); setChon(d.map((x) => x.id));
    })();
  }, [mo]); // eslint-disable-line react-hooks/exhaustive-deps
  // Báo cáo đột xuất: nộp văn bản PDF đã ký, đóng dấu (mẫu chung)
  const mau = mauBieu.find((m) => m.ten.includes('đột xuất'))?.id ?? null;

  const tao = async () => {
    setLoi(null);
    if (!ten.trim() || !hanNgay || chon.length === 0) { setLoi('Nhập tên, hạn nộp và chọn ít nhất 1 đơn vị'); return; }
    setDangChay(true);
    try {
      const han = new Date(`${hanNgay}T${hanGio}:00+07:00`).toISOString();
      const { data: ky, error } = await supabase.from('ky_bao_cao')
        .insert({ ten: ten.trim(), loai: 'dot_xuat', mau_bieu_id: mau, han_nop: han, trang_thai: 'nhap', chu_tri_don_vi_id: chuTri, tu_ngay: null, den_ngay: null, yeu_cau: canCu.trim() || null })
        .select('id').single();
      if (error) throw error;
      const r1 = await supabase.rpc('mo_ky', { p_ky_id: ky.id, p_don_vi: chon });
      if (r1.error) throw r1.error;
      const r2 = await supabase.from('ky_bao_cao').update({ trang_thai: 'mo' }).eq('id', ky.id);
      if (r2.error) throw r2.error;
      dong(); nav(`/ky-bao-cao/${ky.id}`);
    } catch (e) { setLoi(loiDe(e)); } finally { setDangChay(false); }
  };

  return (
    <HopThoai mo={mo} dong={dong} tieuDe="Tạo kỳ báo cáo đột xuất">
      <div className="flex flex-col gap-3.5">
        {loi && <HopLoi loi={loi} />}
        <O nhan="Tên báo cáo"><input className={lopO} value={ten} onChange={(e) => setTen(e.target.value)} placeholder="VD: Tình hình DVC trực tuyến toàn trình" /></O>
        <div className="grid grid-cols-2 gap-3">
          <O nhan="Hạn nộp (ngày)"><input className={lopO} type="date" value={hanNgay} onChange={(e) => setHanNgay(e.target.value)} /></O>
          <O nhan="Giờ"><input className={lopO} type="time" value={hanGio} onChange={(e) => setHanGio(e.target.value)} /></O>
        </div>
        <O nhan="Nội dung yêu cầu"><textarea className={cx(lopO, 'min-h-20 py-2')} value={canCu} onChange={(e) => setCanCu(e.target.value)} placeholder="Theo văn bản số … của Công an tỉnh" /></O>
        <fieldset className="flex flex-col gap-2 rounded-xl border border-vien p-3">
          <legend className="px-1 text-[0.8125rem] font-semibold text-mo-2">Đơn vị phải nộp ({chon.length})</legend>
          {donVi.map((d) => (
            <label key={d.id} className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-ink" checked={chon.includes(d.id)} onChange={(e) => setChon(e.target.checked ? [...chon, d.id] : chon.filter((x) => x !== d.id))} />{d.ten}
            </label>
          ))}
        </fieldset>
        <Nut kieu="chinh" dangChay={dangChay} onClick={tao}>Tạo và gửi cho đơn vị</Nut>
      </div>
    </HopThoai>
  );
}
