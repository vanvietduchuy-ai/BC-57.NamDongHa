import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase, loiDe } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { laDauMoi, useAuth } from '../lib/auth';
import LichDinhKy from '../components/LichDinhKy';
import { ngay, ngayGioDu, tenNgan } from '../lib/dinhDang';
import TheoDoiDonVi from '../components/TheoDoiDonVi';
import { ChipHan, Chip, DangTai, HopLoi, HopThoai, lopO, Nut, O, Rong, TieuDeTrang, cx } from '../components/ui';

type Dong = { ky_id: string; chu_tri_don_vi_id: string | null; don_vi_giao: string | null; ten: string; loai: string; han_nop: string; han_gui_tinh: string | null; trang_thai_ky: string; so_don_vi: number; da_nop: number; da_duyet: number; can_bo_sung: number; chua_nop: number; nop_tre: number };
type MauBieu = { id: string; ten: string };
const LOAI: Record<string, string> = { thang: 'THÁNG', quy: 'QUÝ', sau_thang: '6 THÁNG', nam: 'NĂM', dot_xuat: 'ĐỘT XUẤT' };

export default function KyBaoCao() {
  const { hoSo } = useAuth();
  const dauMoi = hoSo?.vai_tro === 'don_vi' && laDauMoi(hoSo);         // đầu mối: chỉ kỳ mình giao
  const chuTri = dauMoi ? hoSo!.don_vi_id : null;
  const taoDuoc = hoSo?.vai_tro === 'quan_tri' || dauMoi;
  const [tab, setTab] = useState<'mo' | 'khoa' | 'theo_doi' | 'lich'>(() => (['theo_doi', 'lich'].includes(new URLSearchParams(window.location.search).get('tab') ?? '') ? new URLSearchParams(window.location.search).get('tab') as 'theo_doi' | 'lich' : 'mo'));
  const [giao, setGiao] = useState<string>('tat_ca');
  const [params, setParams] = useSearchParams();
  const [taoMo, setTaoMo] = useState(params.get('tao') === '1');
  const { data, loi, dangTai, taiLai } = useDuLieu(async () => {
    const [a, b] = await Promise.all([
      (chuTri ? supabase.from('v_tinh_hinh_nop').select('*').eq('cap', 'don_vi').eq('chu_tri_don_vi_id', chuTri) : supabase.from('v_tinh_hinh_nop').select('*').eq('cap', 'don_vi'))
        .order('han_nop', { ascending: false }).limit(300),
      supabase.from('mau_bieu').select('id, ten').eq('hoat_dong', true),
    ]);
    return { ky: (kq(a) ?? []) as Dong[], mau: (kq(b) ?? []) as MauBieu[] };
  });

  const dsGiao = [...new Map((data?.ky ?? []).map((k) => [k.chu_tri_don_vi_id ?? 'tt', k.don_vi_giao ?? 'Thường trực'])).entries()];
  const ds = (data?.ky ?? []).filter((k) => (tab === 'mo' ? k.trang_thai_ky === 'mo' : k.trang_thai_ky === 'khoa') && (giao === 'tat_ca' || (k.chu_tri_don_vi_id ?? 'tt') === giao));
  if (tab === 'mo') ds.sort((a, b) => a.han_nop.localeCompare(b.han_nop));

  return (
    <>
      <TieuDeTrang ten={dauMoi ? 'Kỳ báo cáo đơn vị giao' : 'Kỳ báo cáo'} tren={dauMoi ? hoSo?.don_vi?.ten : undefined}
        phai={taoDuoc && <Nut kieu="chinh" icon={<Plus className="h-4 w-4" />} onClick={() => setTaoMo(true)}>Tạo kỳ báo cáo đột xuất</Nut>} />
      <div role="tablist" className="flex gap-1.5 overflow-x-auto border-b border-vien">
        {([['mo', `Đang mở · ${(data?.ky ?? []).filter((k) => k.trang_thai_ky === 'mo').length}`], ['theo_doi', 'Theo dõi đơn vị'], ['khoa', 'Đã khoá sổ'], ...(dauMoi ? [['lich', 'Lịch định kỳ']] : [])] as [string, string][]).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k as typeof tab)}
            className={cx('h-11 whitespace-nowrap px-4 text-sm', tab === k ? 'border-b-[2.5px] border-ink font-bold' : 'font-medium text-mo')}>{t}</button>
        ))}
      </div>
      {loi && <HopLoi loi={loi} taiLai={taiLai} />}
      {dangTai && !data && <DangTai />}

      {tab === 'theo_doi' && <TheoDoiDonVi chuTri={chuTri} />}
      {tab === 'lich' && chuTri && <LichDinhKy chuTri={chuTri} hanMacDinh={5} />}
      {!dauMoi && (tab === 'mo' || tab === 'khoa') && dsGiao.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[['tat_ca', 'Tất cả'] as [string, string], ...dsGiao].map(([id, ten]) => (
            <button key={id} onClick={() => setGiao(id)} aria-pressed={giao === id}
              className={cx('min-h-9 rounded-lg border px-3 text-[13px]', giao === id ? 'border-ink bg-ink text-white' : 'border-vien bg-white text-den')}>{id === 'tat_ca' ? ten : `${tenNgan(ten)} giao`}</button>
          ))}
        </div>
      )}
      {(tab === 'mo' || tab === 'khoa') && data && (ds.length === 0 ? <Rong>Không có kỳ báo cáo.</Rong> : (
        <div className="xep-hang grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ds.map((k) => (
            <Link key={k.ky_id} to={`/ky-bao-cao/${k.ky_id}`} className="the-noi flex flex-col gap-2.5 rounded-2xl border border-vien bg-white p-4 text-den">
              <div className="flex items-center gap-2">
                <span className={cx('shrink-0 whitespace-nowrap text-[11px] font-bold tracking-wider', k.loai === 'dot_xuat' ? 'text-cam' : 'text-xanh')}>{LOAI[k.loai] ?? k.loai}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-mo">{!dauMoi && `· ${tenNgan(k.don_vi_giao)} giao`}</span>
                {k.trang_thai_ky === 'mo' ? <ChipHan han={k.han_nop} /> : <Chip>Đã khoá</Chip>}
              </div>
              <span className="text-[15px] font-bold">{k.ten}</span>
              <span className="text-xs text-mo">Hạn {ngayGioDu(k.han_nop)}{k.han_gui_tinh ? ` · gửi tỉnh trước ${ngay(k.han_gui_tinh)}` : ''}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#EEEBE3]"><div className="thanh-chay h-1.5 rounded-full bg-xanh" style={{ width: `${(k.da_nop / Math.max(1, k.so_don_vi)) * 100}%` }} /></div>
              <span className="text-xs text-mo">{k.da_nop}/{k.so_don_vi} đã nộp · {k.can_bo_sung} cần bổ sung · {k.nop_tre} nộp trễ</span>
            </Link>
          ))}
        </div>
      ))}

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
        supabase.from('don_vi').select('id, ten').eq('hoat_dong', true).eq('phai_bao_cao', true).order('thu_tu'),
        supabase.from('dau_moi_linh_vuc').select('don_vi_id'),
      ]);
      const dm = ((b.data ?? []) as { don_vi_id: string }[]).map((x) => x.don_vi_id);
      const d = ((a.data ?? []) as { id: string; ten: string }[]).filter((x) => (chuTri ? x.id !== chuTri : dm.includes(x.id)));
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
          <legend className="px-1 text-[13px] font-semibold text-mo-2">Đơn vị phải nộp ({chon.length})</legend>
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
