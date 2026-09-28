// Số điện thoại tài khoản: nhận nhắc việc qua Zalo, cuộc gọi tự động
import { useEffect, useState, type ReactNode } from 'react';
import { MessageCircle, PhoneCall } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { HopLoi, HopThoai, lopO, Nut, O } from './ui';

export type LienHe = { nguoi_dung_id: string; so_dien_thoai: string | null; nhan_zalo: boolean; nhan_goi: boolean };

export const hienSdt = (s: string | null | undefined) => (s ? s.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3') : '');

export async function luuLienHe(id: string, sdt: string, zalo = true, goi = true) {
  const { data, error } = await supabase.rpc('cap_nhat_lien_he', { p_nguoi_dung: id, p_sdt: sdt, p_nhan_zalo: zalo, p_nhan_goi: goi });
  if (error) throw error;
  return data as string | null;
}

function Chon({ bat, dat, icon, chu }: { bat: boolean; dat: (v: boolean) => void; icon: ReactNode; chu: string }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-vien px-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-nen text-mo-2">{icon}</span>
      <span className="flex-1 text-[0.875rem] font-medium">{chu}</span>
      <input type="checkbox" role="switch" className="h-5 w-5 shrink-0 accent-[#A4161A]" checked={bat} onChange={(e) => dat(e.target.checked)} />
    </label>
  );
}

export function HopLienHe({ mo, dong, nguoiDungId, ten, xong, dau, cuoi }: { mo: boolean; dong: () => void; nguoiDungId: string; ten: string; xong?: () => void; dau?: ReactNode; cuoi?: ReactNode }) {
  const [sdt, setSdt] = useState('');
  const [zalo, setZalo] = useState(true);
  const [goi, setGoi] = useState(true);
  const [dang, setDang] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!mo) return;
    setLoi(null); setDaTai(false);
    void supabase.from('lien_he_nguoi_dung').select('so_dien_thoai, nhan_zalo, nhan_goi').eq('nguoi_dung_id', nguoiDungId).maybeSingle()
      .then(({ data }) => { setSdt(hienSdt(data?.so_dien_thoai)); setZalo(data?.nhan_zalo ?? true); setGoi(data?.nhan_goi ?? true); setDaTai(true); });
  }, [mo, nguoiDungId]);

  const luu = async () => {
    setDang(true); setLoi(null);
    try { await luuLienHe(nguoiDungId, sdt, zalo, goi); xong?.(); dong(); } catch (e) { setLoi(loiDe(e)); } finally { setDang(false); }
  };

  return (
    <HopThoai mo={mo} dong={dong} tieuDe={dau ? 'Tài khoản' : `Số điện thoại · ${ten}`} rong="max-w-md">
      <div className="flex flex-col gap-3">
        {dau}
        <O nhan="Số điện thoại (Zalo)">
          <input className={lopO} disabled={!daTai} type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" value={sdt} onChange={(e) => setSdt(e.target.value)} />
        </O>
        <Chon bat={zalo} dat={setZalo} icon={<MessageCircle className="h-4 w-4" />} chu="Nhận nhắc việc qua Zalo" />
        <Chon bat={goi} dat={setGoi} icon={<PhoneCall className="h-4 w-4" />} chu="Nhận cuộc gọi nhắc hạn" />
        <span className="text-xs text-mo">Chỉ Thường trực và chủ tài khoản xem được số này.</span>
        {loi && <HopLoi loi={loi} />}
        <div className="flex justify-end gap-2">
          <Nut onClick={dong}>Huỷ</Nut>
          <Nut kieu="chinh" dangChay={dang} disabled={!daTai} onClick={luu}>Lưu</Nut>
        </div>
        {cuoi}
      </div>
    </HopThoai>
  );
}
