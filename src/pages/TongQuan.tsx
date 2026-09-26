// Theo dõi báo cáo — Thường trực / lãnh đạo xem tất cả; đầu mối (chuTri) xem các kỳ mình giao. Gồm: (1) kỳ báo cáo đang phải nộp (định kỳ, đột xuất) và đơn vị chưa nộp,
// (2) đánh giá từng đơn vị trong năm: thực hiện tốt / chậm / chưa thực hiện. Báo cáo tính bằng văn bản đã gửi.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { useAuth, laQuanTri } from '../lib/auth';
import { ngayGioDu, tenNgan, thuNgay } from '../lib/dinhDang';
import { chuoiKyTiepTheo, type LichDk } from '../lib/lichDinhKy';
import { HopNhac, type DonViNhac } from '../components/HopNhac';
import { Chip, ChipHan, DangTai, HopLoi, Nut, Rong, The, TieuDeThe, TieuDeTrang, cx } from '../components/ui';

type KyMo = { ky_id: string; chu_tri_don_vi_id: string | null; don_vi_giao: string | null; ten: string; loai: string; han_nop: string; so_don_vi: number; da_nop: number; da_duyet: number; can_bo_sung: number; chua_nop: number };
type Dong = { nop_id: string; ky_id: string; don_vi_id: string; don_vi: string; thu_tu: number; ky: string; loai: string; trang_thai: string; han: string; nop_luc: string | null; dung_han: boolean | null; tre_ngay: number };

type DanhGia = { id: string; ten: string; thu_tu: number; phai: number; dungHan: number; tre: number; khong: number; loai: 'tot' | 'cham' | 'chua' | 'chua_han' };
const XEP_LOAI: Record<DanhGia['loai'], [string, string, string]> = {
  tot: ['Thực hiện tốt', 'bg-[#DCFCE7]', 'text-[#166534]'],
  cham: ['Còn chậm', 'bg-cam-nhat', 'text-cam-dam'],
  chua: ['Chưa thực hiện', 'bg-nguy-nhat', 'text-nguy'],
  chua_han: ['Chưa đến hạn', 'bg-nen-3', 'text-mo'],
};

async function tai(chuTri: string | null) {
  const nam = new Date().getFullYear();
  let qKy = supabase.from('v_tinh_hinh_nop').select('ky_id, chu_tri_don_vi_id, don_vi_giao, ten, loai, han_nop, so_don_vi, da_nop, da_duyet, can_bo_sung, chua_nop').eq('trang_thai_ky', 'mo').eq('cap', 'don_vi');
  let qNop = supabase.from('v_theo_doi_nop').select('nop_id, ky_id, don_vi_id, don_vi, thu_tu, ky, loai, trang_thai, han, nop_luc, dung_han, tre_ngay')
    .eq('cap', 'don_vi').gte('han', `${nam}-01-01T00:00:00+07:00`).lte('han', `${nam}-12-31T23:59:59+07:00`);
  let qLich = supabase.from('lich_ky').select('id, ten, loai, hoat_dong, quy_tac').in('loai', ['thang', 'quy', 'sau_thang', 'nam']);
  if (chuTri) { qKy = qKy.eq('chu_tri_don_vi_id', chuTri); qNop = qNop.eq('chu_tri_don_vi_id', chuTri); qLich = qLich.eq('don_vi_id', chuTri); }
  else qLich = qLich.is('don_vi_id', null);
  const [a, b, c, d] = await Promise.all([
    qKy.order('han_nop'),
    qNop,
    qLich,
    supabase.from('nhiem_vu').select('id', { count: 'exact', head: true }).eq('trang_thai_giao', 'de_xuat'),
  ]);
  return { nam, kyMo: (kq(a) ?? []) as KyMo[], dong: (kq(b) ?? []) as Dong[], chuoi: chuoiKyTiepTheo((kq(c) ?? []) as LichDk[], 2), choDuyet: d.count ?? 0 };
}

const daGui = (x: Dong) => !!x.nop_luc && ['da_nop', 'da_duyet', 'can_bo_sung'].includes(x.trang_thai);

function danhGia(dong: Dong[]): DanhGia[] {
  const bayGio = Date.now();
  const m = new Map<string, DanhGia>();
  for (const x of dong) {
    const g = m.get(x.don_vi_id) ?? { id: x.don_vi_id, ten: x.don_vi, thu_tu: x.thu_tu, phai: 0, dungHan: 0, tre: 0, khong: 0, loai: 'chua_han' as const };
    const denHan = Date.parse(x.han) < bayGio;
    if (daGui(x)) { g.phai++; if (x.dung_han) g.dungHan++; else g.tre++; }
    else if (denHan) { g.phai++; g.khong++; }
    m.set(x.don_vi_id, g);
  }
  const ds = [...m.values()].map((g) => ({ ...g, loai: (g.khong ? 'chua' : g.tre ? 'cham' : g.phai ? 'tot' : 'chua_han') as DanhGia['loai'] }));
  const thuTu = { chua: 0, cham: 1, tot: 2, chua_han: 3 };
  return ds.sort((a, b) => thuTu[a.loai] - thuTu[b.loai] || b.khong - a.khong || b.tre - a.tre || a.thu_tu - b.thu_tu);
}

export default function TongQuan({ chuTri = null }: { chuTri?: string | null }) {
  const { hoSo } = useAuth();
  const quanTri = laQuanTri(hoSo);
  const nhacDuoc = quanTri || !!chuTri;
  const { data, loi, dangTai, taiLai } = useDuLieu(() => tai(chuTri), [chuTri]);
  const [tb, setTb] = useState<string | null>(null);
  const [nhacKy, setNhacKy] = useState<{ k: KyMo; ds: DonViNhac[] } | null>(null);
  if (loi) return <HopLoi loi={loi} taiLai={taiLai} />;
  if (dangTai && !data) return <DangTai />;
  if (!data) return null;

  const chuaNopCua = (kyId: string) => data.dong.filter((x) => x.ky_id === kyId && !daGui(x)).sort((a, b) => a.thu_tu - b.thu_tu);
  const nhac = (k: KyMo) => setNhacKy({ k, ds: chuaNopCua(k.ky_id).map((x) => ({ nop_id: x.nop_id, don_vi_id: x.don_vi_id, don_vi: x.don_vi })) });
  const dg = danhGia(data.dong);
  const dem = (l: DanhGia['loai']) => dg.filter((x) => x.loai === l).length;
  const tiepTheo = data.chuoi.find((k) => !data.kyMo.some((m) => m.ten === k.ten));

  return (
    <>
      <TieuDeTrang tren={chuTri ? `${thuNgay()} · Đầu mối: ${hoSo?.don_vi?.ten}` : `${thuNgay()} · ${hoSo?.ho_ten}`} ten={chuTri ? 'Theo dõi các phòng, đơn vị' : 'Theo dõi báo cáo'}
        phai={nhacDuoc && <Link to="/ky-bao-cao?tao=1" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Báo cáo đột xuất</Link>} />
      {tb && <div role="status" className="rounded-xl bg-xanh-nhat px-4 py-3 text-sm text-xanh">{tb}</div>}
      {hoSo?.vai_tro === 'lanh_dao' && data.choDuyet > 0 && (
        <Link to="/nhiem-vu?tab=cho_duyet" className="rounded-xl bg-cam-nhat px-4 py-3 text-[13px] text-cam-dam"><b>{data.choDuyet} nhiệm vụ</b> chờ đồng chí duyệt giao →</Link>
      )}

      {/* 1. Đang phải nộp */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="m-0 text-[17px] font-bold">Đang phải nộp · {data.kyMo.length}</h2>
          {tiepTheo && <span className="text-[13px] text-mo">Kỳ tiếp theo: <b className="text-den">{tiepTheo.ten}</b></span>}
        </div>
        {data.kyMo.length === 0 ? <Rong>Không có kỳ báo cáo nào đang mở.</Rong> : (
          <div className="xep-hang grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.kyMo.map((k) => {
              const chua = chuaNopCua(k.ky_id);
              return (
                <The key={k.ky_id} className="the-noi flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <span className={cx('shrink-0 whitespace-nowrap text-[11px] font-bold tracking-wider', k.loai === 'dot_xuat' ? 'text-cam' : 'text-xanh')}>{k.loai === 'dot_xuat' ? 'ĐỘT XUẤT' : 'ĐỊNH KỲ'}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-mo">{!chuTri && `${tenNgan(k.don_vi_giao)} giao`}</span>
                    <ChipHan han={k.han_nop} />
                  </div>
                  <Link to={`/ky-bao-cao/${k.ky_id}`} className="flex items-center gap-2 text-den">
                    <span className="flex-1 text-[16px] font-bold leading-snug">{k.ten}</span><ChevronRight className="h-4 w-4 text-mo" />
                  </Link>
                  <span className="text-xs text-mo">Hạn {ngayGioDu(k.han_nop)}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEEBE3]"><div className="thanh-chay h-2 rounded-full bg-xanh" style={{ width: `${(k.da_nop / Math.max(1, k.so_don_vi)) * 100}%` }} /></div>
                    <span className="so text-sm font-bold">{k.da_nop}/{k.so_don_vi}</span>
                  </div>
                  {chua.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-mo-2">Chưa gửi văn bản ({chua.length}):</span>
                      <div className="flex flex-wrap gap-1.5">{chua.map((x) => <Chip key={x.nop_id} nen={x.trang_thai === 'can_bo_sung' ? 'bg-cam-nhat' : 'bg-nen-3'} chu={x.trang_thai === 'can_bo_sung' ? 'text-cam-dam' : 'text-mo-2'}>{x.don_vi}{x.trang_thai === 'can_bo_sung' ? ' · bổ sung' : ''}</Chip>)}</div>
                      {nhacDuoc && <div><Nut icon={<Bell className="h-4 w-4" />} onClick={() => nhac(k)}>Nhắc {chua.length} đơn vị</Nut></div>}
                    </div>
                  ) : <span className="text-[13px] font-semibold text-[#166534]">Tất cả đơn vị đã gửi.</span>}
                </The>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Đánh giá đơn vị */}
      <The className="flex flex-col gap-3 p-4 sm:p-5">
        <TieuDeThe phai={<Link to="/ky-bao-cao?tab=theo_doi" className="text-[13px] font-semibold text-[#A4161A]">Chi tiết</Link>}>{chuTri ? 'Đánh giá các phòng, đơn vị' : 'Đánh giá thực hiện báo cáo'} năm {data.nam}</TieuDeThe>
        <div className="flex flex-wrap gap-2 text-[13px]">
          {(['tot', 'cham', 'chua'] as const).map((l) => <Chip key={l} nen={XEP_LOAI[l][1]} chu={XEP_LOAI[l][2]} className="px-3 py-1">{XEP_LOAI[l][0]}: {dem(l)}</Chip>)}
        </div>
        {dg.length === 0 ? <Rong>Chưa có kỳ báo cáo nào trong năm.</Rong> : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[560px] text-[13.5px]">
              <thead className="text-left text-[11px] tracking-wide text-mo">
                <tr><th className="px-4 py-2 sm:px-2">ĐƠN VỊ</th><th className="px-2 text-center">ĐẾN HẠN</th><th className="px-2 text-center">ĐÚNG HẠN</th><th className="px-2 text-center">TRỄ</th><th className="px-2 text-center">KHÔNG NỘP</th><th className="px-2">XẾP LOẠI</th></tr>
              </thead>
              <tbody className="xep-hang">
                {dg.map((g) => (
                  <tr key={g.id} className="border-t border-[#F1EEE7]">
                    <td className="px-4 py-2.5 font-semibold sm:px-2">{g.ten}</td>
                    <td className="so px-2 text-center">{g.phai}</td>
                    <td className="so px-2 text-center text-[#166534]">{g.dungHan}</td>
                    <td className={cx('so px-2 text-center', g.tre ? 'font-bold text-cam-dam' : 'text-mo')}>{g.tre}</td>
                    <td className={cx('so px-2 text-center', g.khong ? 'font-bold text-nguy' : 'text-mo')}>{g.khong}</td>
                    <td className="px-2"><Chip nen={XEP_LOAI[g.loai][1]} chu={XEP_LOAI[g.loai][2]}>{XEP_LOAI[g.loai][0]}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </The>
      <HopNhac mo={!!nhacKy} dong={() => setNhacKy(null)} tenKy={nhacKy?.k.ten ?? ''} hanNop={nhacKy?.k.han_nop ?? ''} ds={nhacKy?.ds ?? []} xong={setTb} />
    </>
  );
}
