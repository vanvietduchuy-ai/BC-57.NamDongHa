// Hộp "Nhắc đơn vị": thông báo trên web + gọi, nhắn SMS, Zalo cá nhân trực tiếp từ điện thoại của người nhắc
import { useEffect, useState } from 'react';
import { Bell, PhoneCall } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { ngayGioDu } from '../lib/dinhDang';
import { HopLoi, HopThoai, Nut } from './ui';
import { LienLacDonVi } from './LienLacTrucTiep';

export type DonViNhac = { nop_id: string; don_vi_id: string; don_vi: string };

export function HopNhac({ mo, dong, tenKy, hanNop, ds, xong }: { mo: boolean; dong: () => void; tenKy: string; hanNop: string; ds: DonViNhac[]; xong: (thongBao: string) => void }) {
  const [chon, setChon] = useState<string[]>([]);
  const [buoc, setBuoc] = useState<'chon' | 'lien_lac'>('chon');
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => { if (mo) { setChon(ds.map((x) => x.nop_id)); setLoi(null); setBuoc('chon'); } }, [mo, ds]);

  const dsChon = ds.filter((x) => chon.includes(x.nop_id));
  const gui = async () => {
    if (!dsChon.length) return;
    setDang(true); setLoi(null);
    try {
      const { error } = await supabase.from('thong_bao').insert(dsChon.map((x) => ({
        don_vi_id: x.don_vi_id, tieu_de: `Nhắc nộp: ${tenKy}`, noi_dung: `Hạn ${ngayGioDu(hanNop)}. Đề nghị đơn vị gửi văn bản báo cáo đúng hạn.`, duong_dan: `/viec-can-nop/${x.nop_id}`,
      })));
      if (error) throw error;
      xong(`Đã nhắc ${dsChon.length} đơn vị trên web.`);
      setBuoc('lien_lac');
    } catch (e) { setLoi(loiDe(e)); } finally { setDang(false); }
  };

  if (buoc === 'lien_lac') {
    return (
      <HopThoai mo={mo} dong={dong} tieuDe="Gọi, nhắn trực tiếp">
        <div className="flex flex-col gap-3">
          <LienLacDonVi ds={dsChon.map((x) => ({ id: x.don_vi_id, ten: x.don_vi }))}
            noiDung={`BCĐ 57 phường Nam Đông Hà nhắc: đơn vị chưa gửi "${tenKy}", hạn ${ngayGioDu(hanNop)}. Đề nghị gửi đúng hạn. Trân trọng.`} />
          <div className="flex justify-end"><Nut kieu="chinh" onClick={dong}>Xong</Nut></div>
        </div>
      </HopThoai>
    );
  }

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
        <p className="m-0 text-xs text-mo">Gửi thông báo trên web, điện thoại; sau đó gọi hoặc nhắn trực tiếp cán bộ đơn vị bằng điện thoại, Zalo cá nhân của bạn.</p>
        {loi && <HopLoi loi={loi} />}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Nut disabled={!chon.length} icon={<PhoneCall className="h-4 w-4" />} onClick={() => setBuoc('lien_lac')}>Chỉ gọi, nhắn trực tiếp</Nut>
          <Nut kieu="chinh" icon={<Bell className="h-4 w-4" />} dangChay={dang} disabled={!chon.length} onClick={gui}>Nhắc {chon.length} đơn vị</Nut>
        </div>
      </div>
    </HopThoai>
  );
}
