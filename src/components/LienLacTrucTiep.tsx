// Liên hệ trực tiếp cán bộ đơn vị bằng điện thoại / SMS / Zalo cá nhân của chính người nhắc (không qua Zalo OA, không gọi tự động)
import { useEffect, useState } from 'react';
import { MessageCircle, MessageSquareText, PhoneCall } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { DangTai, HopLoi, lopO } from './ui';
import { hienSdt } from './LienHe';

export type LienLac = { don_vi_id: string; nguoi_dung_id: string; ho_ten: string; chuc_vu: string | null; so_dien_thoai: string };

export const linkGoi = (s: string) => `tel:${s}`;
export const linkSms = (s: string, nd: string) => `sms:${s}${/iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(nd)}`;
export const linkZalo = (s: string) => `https://zalo.me/${s}`;

const nutLink = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-vien bg-white text-mo-2 active:bg-nen hover:bg-nen';

export function LienLacDonVi({ ds, noiDung }: { ds: { id: string; ten: string }[]; noiDung: string }) {
  const [lh, setLh] = useState<LienLac[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [nd, setNd] = useState(noiDung);
  const [tin, setTin] = useState<string | null>(null);
  const khoa = ds.map((x) => x.id).join(',');

  useEffect(() => {
    let huy = false;
    setLh(null); setLoi(null);
    void supabase.rpc('sdt_lien_he_don_vi', { p_don_vi: ds.map((x) => x.id) }).then(({ data, error }) => {
      if (huy) return;
      if (error) setLoi(loiDe(error)); else setLh((data ?? []) as LienLac[]);
    });
    return () => { huy = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoa]);

  const chepZalo = () => {
    try { void navigator.clipboard?.writeText(nd); setTin('Đã sao chép lời nhắc, dán vào Zalo để gửi.'); } catch { /* bỏ qua */ }
  };

  if (loi) return <HopLoi loi={loi} />;
  if (!lh) return <DangTai />;
  const theoDv = ds.map((d) => ({ d, nguoi: lh.filter((x) => x.don_vi_id === d.id) }));

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[0.8125rem] font-semibold text-mo-2">Lời nhắc (gửi bằng SMS hoặc Zalo)</span>
        <textarea className={`${lopO} min-h-28`} value={nd} onChange={(e) => setNd(e.target.value)} />
      </label>
      <p className="m-0 text-xs text-mo">Bấm biểu tượng để gọi, nhắn SMS hoặc mở Zalo cá nhân bằng chính điện thoại của bạn.</p>
      {tin && <div role="status" className="rounded-xl bg-xanh-nhat px-3 py-2 text-xs font-semibold text-xanh">{tin}</div>}
      <div className="flex flex-col gap-2">
        {theoDv.map(({ d, nguoi }) => (
          <div key={d.id} className="flex flex-col gap-1 rounded-xl border border-vien p-2.5">
            <span className="text-[0.8125rem] font-bold">{d.ten}</span>
            {nguoi.length === 0 && <span className="text-xs text-nguy">Chưa có số điện thoại</span>}
            {nguoi.map((x) => (
              <div key={x.nguoi_dung_id} className="flex items-center gap-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[0.875rem] font-semibold">{x.ho_ten}{x.chuc_vu ? <span className="font-normal text-mo"> · {x.chuc_vu}</span> : null}</span>
                  <span className="so text-xs text-mo-2">{hienSdt(x.so_dien_thoai)}</span>
                </span>
                <a href={linkGoi(x.so_dien_thoai)} aria-label={`Gọi ${x.ho_ten}`} className={nutLink}><PhoneCall className="h-[18px] w-[18px]" /></a>
                <a href={linkSms(x.so_dien_thoai, nd)} aria-label={`Nhắn SMS ${x.ho_ten}`} className={nutLink}><MessageSquareText className="h-[18px] w-[18px]" /></a>
                <a href={linkZalo(x.so_dien_thoai)} target="_blank" rel="noopener noreferrer" onClick={chepZalo} aria-label={`Zalo ${x.ho_ten}`} className={nutLink}><MessageCircle className="h-[18px] w-[18px] text-xanh" /></a>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
