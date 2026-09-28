// Nhiệm vụ định kỳ: kết quả kỳ hiện tại, xác nhận hoàn thành kỳ, các kỳ đã hoàn thành
import { useState } from 'react';
import { CalendarClock, CheckCircle2, Undo2 } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { ngay, ngayGio } from '../lib/dinhDang';
import { hanNv, moTaDinhKy, tenKyNv, type NhiemVu } from '../lib/nhiemVu';
import { ChipHan, HopLoi, lopO, Nut, The, TieuDeThe, cx } from './ui';

export type KyNv = { ma_ky: string; xong_luc: string; ghi_chu: string | null; boi_ten?: string | null };

export default function TheoDoiDinhKy({ n, ds, xacNhanDuoc, xong }: { n: NhiemVu; ds: KyNv[]; xacNhanDuoc: boolean; xong: () => void }) {
  const [ghiChu, setGhiChu] = useState('');
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  if (!n.dinh_ky) return null;
  const chay = async (xongKy: boolean, ma?: string) => {
    if (!xongKy && !window.confirm(`Bỏ xác nhận hoàn thành kỳ ${tenKyNv(ma ?? n.ky_ma)}?`)) return;
    setDang(true); setLoi(null);
    const { error } = await supabase.rpc('nhiem_vu_xac_nhan_ky', { p_nv: n.id, p_xong: xongKy, p_ghi_chu: ghiChu || null, p_ma_ky: ma ?? null });
    setDang(false);
    if (error) setLoi(loiDe(error)); else { setGhiChu(''); xong(); }
  };
  // Kỳ trước chỉ tính khi nhiệm vụ được giao trước ngày bắt đầu kỳ hiện tại
  const batDau = batDauKy(n.ky_ma, n.ky_han);
  const truocChuaXong = !!n.ky_truoc_ma && !n.ky_truoc_xong && !!batDau && new Date(n.tao_luc) < batDau;
  return (
    <The className="flex flex-col gap-3 p-4">
      <TieuDeThe phai={<span className="flex items-center gap-1.5 text-[0.8125rem] text-mo"><CalendarClock className="h-4 w-4" />{moTaDinhKy(n.dinh_ky, n.han_trong_ky)}</span>}>Theo dõi định kỳ</TieuDeThe>
      <div className={cx('flex flex-wrap items-center gap-3 rounded-xl px-3 py-3', n.ky_xong ? 'bg-[#DCFCE7]' : 'bg-nen-2')}>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.8125rem] text-mo">Kỳ hiện tại</span>
          <span className="text-[0.9375rem] font-bold first-letter:uppercase">{tenKyNv(n.ky_ma)}</span>
          <span className="text-xs text-mo">Hạn {n.ky_han ? ngay(n.ky_han) : '—'}</span>
        </div>
        {n.ky_xong
          ? <span className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-[#166534]"><CheckCircle2 className="h-5 w-5" />Đã hoàn thành</span>
          : n.ky_han && <ChipHan han={hanNv(n.ky_han)} />}
      </div>
      {truocChuaXong && <div className="rounded-xl bg-cam-nhat px-3 py-2 text-[0.8125rem] text-cam-dam">Kỳ trước ({tenKyNv(n.ky_truoc_ma)}) chưa được xác nhận hoàn thành.</div>}
      {xacNhanDuoc && !n.ky_xong && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={cx(lopO, 'w-full flex-1')} placeholder="Kết quả kỳ này (không bắt buộc)" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} aria-label="Kết quả kỳ này" />
          <Nut kieu="chinh" icon={<CheckCircle2 className="h-4 w-4" />} dangChay={dang} onClick={() => void chay(true)} ngan="Xác nhận xong">Xác nhận hoàn thành kỳ này</Nut>
        </div>
      )}
      {xacNhanDuoc && truocChuaXong && (
        <button type="button" onClick={() => void chay(true, n.ky_truoc_ma!)} className="self-start text-[0.8125rem] font-semibold text-[#8E1B22] hover:underline">Xác nhận kỳ trước ({tenKyNv(n.ky_truoc_ma)}) đã hoàn thành</button>
      )}
      {loi && <HopLoi loi={loi} />}
      {ds.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {ds.map((k) => (
            <li key={k.ma_ky} className="flex items-start gap-2.5 border-t border-[#F1EEE7] py-2.5 text-[0.8125rem] first:border-0">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold first-letter:uppercase">{tenKyNv(k.ma_ky)}</span>
                <span className="text-xs text-mo">Xong {ngayGio(k.xong_luc)}{k.boi_ten ? ` · ${k.boi_ten}` : ''}{k.ghi_chu ? ` · ${k.ghi_chu}` : ''}</span>
              </span>
              {xacNhanDuoc && <button type="button" onClick={() => void chay(false, k.ma_ky)} aria-label={`Bỏ xác nhận ${tenKyNv(k.ma_ky)}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-mo hover:bg-nen"><Undo2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
    </The>
  );
}

function batDauKy(ma: string | null, han: string | null): Date | null {
  if (!ma) return null;
  let m = ma.match(/^(\d{4})-(\d{2})$/); if (m) return new Date(+m[1], +m[2] - 1, 1);
  m = ma.match(/^(\d{4})-Q(\d)$/); if (m) return new Date(+m[1], (+m[2] - 1) * 3, 1);
  m = ma.match(/^(\d{4})$/); if (m) return new Date(+m[1], 0, 1);
  if (han) { const d = new Date(han); d.setDate(d.getDate() - 6); return d; }
  return null;
}
