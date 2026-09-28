// Hộp "Nhắc đơn vị": thông báo trên web + (nếu máy chủ đã cấu hình) nhắn Zalo, gọi điện tới SĐT cán bộ đơn vị
import { useEffect, useState, type ReactNode } from 'react';
import { Bell, MessageCircle, PhoneCall } from 'lucide-react';
import { goiChucNang, loiDe, supabase } from '../lib/supabase';
import { ngayGioDu } from '../lib/dinhDang';
import { cx, HopLoi, HopThoai, Nut } from './ui';

export type DonViNhac = { nop_id: string; don_vi_id: string; don_vi: string };
type KenhMayChu = { zalo: boolean; goi: boolean };
type KetQua = { zalo: number; goi: number; da_nhac_hom_nay: string[]; chua_co_sdt: string[]; loi: string[] };

let kenhDaBiet: Promise<KenhMayChu> | null = null;
const kenhMayChu = () => (kenhDaBiet ??= goiChucNang<KenhMayChu>('nhac-dien-thoai', { loai: 'tinh_trang' }).catch(() => ({ zalo: false, goi: false })));

export function HopNhac({ mo, dong, tenKy, hanNop, ds, xong }: { mo: boolean; dong: () => void; tenKy: string; hanNop: string; ds: DonViNhac[]; xong: (thongBao: string) => void }) {
  const [chon, setChon] = useState<string[]>([]);
  const [kenh, setKenh] = useState<KenhMayChu | null>(null);
  const [zalo, setZalo] = useState(false);
  const [goi, setGoi] = useState(false);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!mo) return;
    setChon(ds.map((x) => x.nop_id)); setLoi(null); setGoi(false);
    void kenhMayChu().then((k) => { setKenh(k); setZalo(k.zalo); });
  }, [mo, ds]);

  const gui = async () => {
    const dsChon = ds.filter((x) => chon.includes(x.nop_id));
    if (!dsChon.length) return;
    setDang(true); setLoi(null);
    try {
      const { error } = await supabase.from('thong_bao').insert(dsChon.map((x) => ({
        don_vi_id: x.don_vi_id, tieu_de: `Nhắc nộp: ${tenKy}`, noi_dung: `Hạn ${ngayGioDu(hanNop)}. Đề nghị đơn vị gửi văn bản báo cáo đúng hạn.`, duong_dan: `/viec-can-nop/${x.nop_id}`,
      })));
      if (error) throw error;
      const phan = [`Đã nhắc ${dsChon.length} đơn vị trên web`];
      const k = [zalo && 'zalo', goi && 'goi'].filter(Boolean) as string[];
      if (k.length) {
        const r = await goiChucNang<KetQua>('nhac-dien-thoai', { nop_ids: dsChon.map((x) => x.nop_id), kenh: k });
        if (zalo) phan.push(`Zalo ${r.zalo} người`);
        if (goi) phan.push(`gọi ${r.goi} người`);
        if (r.chua_co_sdt.length) phan.push(`chưa có SĐT: ${r.chua_co_sdt.join(', ')}`);
        if (r.da_nhac_hom_nay.length) phan.push(`hôm nay đã nhắc: ${r.da_nhac_hom_nay.join(', ')}`);
        if (r.loi.length) phan.push(`lỗi ${r.loi.length}: ${r.loi.slice(0, 2).join('; ')}`);
      }
      xong(phan.join(' · ') + '.');
      dong();
    } catch (e) { setLoi(loiDe(e)); } finally { setDang(false); }
  };

  const oKenh = (bat: boolean, dat: (v: boolean) => void, co: boolean | undefined, icon: ReactNode, ten: string, phu: string) => (
    <label className={cx('flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2', bat && co ? 'border-xanh/40 bg-xanh-nhat/50' : 'border-vien', !co && 'opacity-55')}>
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#A4161A]" disabled={!co} checked={bat && !!co} onChange={(e) => dat(e.target.checked)} />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nen text-mo-2">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[0.875rem] font-semibold">{ten}</span>
        <span className="text-xs text-mo">{co === false ? 'Chưa cấu hình trên máy chủ' : phu}</span>
      </span>
    </label>
  );

  return (
    <HopThoai mo={mo} dong={dong} tieuDe={`Nhắc: ${tenKy}`}>
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-1 rounded-xl border border-vien p-3">
          <legend className="px-1 text-[0.8125rem] font-semibold text-mo-2">Đơn vị chưa gửi ({chon.length}/{ds.length})</legend>
          <div className="grid max-h-56 grid-cols-1 gap-x-3 overflow-y-auto sm:grid-cols-2">
            {ds.map((x) => (
              <label key={x.nop_id} className="flex min-h-10 items-center gap-2 text-[0.875rem]">
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#A4161A]" checked={chon.includes(x.nop_id)}
                  onChange={(e) => setChon(e.target.checked ? [...chon, x.nop_id] : chon.filter((y) => y !== x.nop_id))} />
                <span className="min-w-0 truncate">{x.don_vi}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          {oKenh(true, () => undefined, true, <Bell className="h-4 w-4" />, 'Thông báo trên web, điện thoại', 'Luôn gửi')}
          {oKenh(zalo, setZalo, kenh?.zalo, <MessageCircle className="h-4 w-4" />, 'Nhắn Zalo', 'Tin Zalo tới SĐT cán bộ đơn vị')}
          {oKenh(goi, setGoi, kenh?.goi, <PhoneCall className="h-4 w-4" />, 'Gọi điện tự động', 'Máy đọc lời nhắc, 1 lần/ngày')}
        </div>
        {loi && <HopLoi loi={loi} />}
        <div className="flex justify-end gap-2">
          <Nut onClick={dong}>Huỷ</Nut>
          <Nut kieu="chinh" icon={<Bell className="h-4 w-4" />} dangChay={dang} disabled={!chon.length} onClick={gui}>Nhắc {chon.length} đơn vị</Nut>
        </div>
      </div>
    </HopThoai>
  );
}
