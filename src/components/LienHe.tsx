// Số điện thoại tài khoản (điện thoại, Zalo cá nhân): để cán bộ Thường trực gọi, nhắn trực tiếp; bắt buộc có khi đăng nhập
import { useEffect, useState, type ReactNode } from 'react';
import { LogOut, Phone } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { loiDe, supabase } from '../lib/supabase';
import { HopLoi, HopThoai, LogoBcd, lopO, Nut, O } from './ui';

export type LienHe = { nguoi_dung_id: string; so_dien_thoai: string | null; nhan_zalo: boolean; nhan_goi: boolean };

export const hienSdt = (s: string | null | undefined) => (s ? s.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3') : '');

export async function luuLienHe(id: string, sdt: string) {
  const { data, error } = await supabase.rpc('cap_nhat_lien_he', { p_nguoi_dung: id, p_sdt: sdt, p_nhan_zalo: true, p_nhan_goi: true });
  if (error) throw error;
  return data as string | null;
}

export function HopLienHe({ mo, dong, nguoiDungId, ten, xong, dau, cuoi }: { mo: boolean; dong: () => void; nguoiDungId: string; ten: string; xong?: () => void; dau?: ReactNode; cuoi?: ReactNode }) {
  const [sdt, setSdt] = useState('');
  const [dang, setDang] = useState(false);
  const [daTai, setDaTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!mo) return;
    setLoi(null); setDaTai(false);
    void supabase.from('lien_he_nguoi_dung').select('so_dien_thoai').eq('nguoi_dung_id', nguoiDungId).maybeSingle()
      .then(({ data }) => { setSdt(hienSdt(data?.so_dien_thoai)); setDaTai(true); });
  }, [mo, nguoiDungId]);

  const luu = async () => {
    setDang(true); setLoi(null);
    try { await luuLienHe(nguoiDungId, sdt); xong?.(); dong(); } catch (e) { setLoi(loiDe(e)); } finally { setDang(false); }
  };

  return (
    <HopThoai mo={mo} dong={dong} tieuDe={dau ? 'Tài khoản' : `Số điện thoại · ${ten}`} rong="max-w-md">
      <div className="flex flex-col gap-3">
        {dau}
        <O nhan="Số điện thoại (dùng cho Zalo cá nhân)">
          <input className={lopO} disabled={!daTai} type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" value={sdt} onChange={(e) => setSdt(e.target.value)} />
        </O>
        <span className="text-xs text-mo">Để cán bộ Thường trực, đơn vị chủ trì gọi, nhắn SMS hoặc Zalo trực tiếp khi cần. Số này không hiển thị công khai.</span>
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

// Tài khoản chưa có SĐT? null = chưa biết (đang tải hoặc lỗi), không chặn
export function useThieuSdt(): boolean | null {
  const { hoSo } = useAuth();
  const [thieu, setThieu] = useState<boolean | null>(null);
  useEffect(() => {
    if (!hoSo) return;
    const tai = () => void supabase.from('lien_he_nguoi_dung').select('so_dien_thoai').eq('nguoi_dung_id', hoSo.id).maybeSingle()
      .then(({ data, error }) => setThieu(error ? null : !data?.so_dien_thoai));
    tai();
    window.addEventListener('bcd57-lien-he', tai);
    return () => window.removeEventListener('bcd57-lien-he', tai);
  }, [hoSo]);
  return thieu;
}

// Chặn toàn màn hình: đăng nhập xong phải nhập SĐT mới dùng tiếp (chỉ có thể đăng xuất)
export function CongBatBuocSdt({ nguoiDungId, ten, dangXuat }: { nguoiDungId: string; ten: string; dangXuat: () => void }) {
  const [sdt, setSdt] = useState('');
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const luu = async () => {
    if (!sdt.trim()) { setLoi('Nhập số điện thoại để tiếp tục.'); return; }
    setDang(true); setLoi(null);
    try { await luuLienHe(nguoiDungId, sdt); window.dispatchEvent(new Event('bcd57-lien-he')); } catch (e) { setLoi(loiDe(e)); } finally { setDang(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Nhập số điện thoại" className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-nen p-4">
      <form onSubmit={(e) => { e.preventDefault(); void luu(); }} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-vien bg-white p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <LogoBcd className="h-11 w-11" />
          <div className="flex min-w-0 flex-col"><span className="text-[1rem] font-bold leading-snug">Nhập số điện thoại</span><span className="truncate text-xs text-mo">{ten}</span></div>
        </div>
        <p className="m-0 text-[0.875rem] text-mo-2">Tài khoản của bạn chưa có số điện thoại. Vui lòng nhập số đang dùng (cũng là số Zalo cá nhân) để Ban Chỉ đạo liên hệ, nhắc việc trực tiếp.</p>
        <O nhan="Số điện thoại">
          <input className={lopO} type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="0912 345 678" value={sdt} onChange={(e) => setSdt(e.target.value)} />
        </O>
        {loi && <HopLoi loi={loi} />}
        <Nut kieu="chinh" type="submit" className="w-full" icon={<Phone className="h-4 w-4" />} dangChay={dang}>Lưu và tiếp tục</Nut>
        <button type="button" onClick={dangXuat} className="flex min-h-10 items-center justify-center gap-2 text-[0.8125rem] font-semibold text-mo"><LogOut className="h-4 w-4" />Đăng xuất</button>
      </form>
    </div>
  );
}
