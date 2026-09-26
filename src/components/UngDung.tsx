import { useCallback, useEffect, useState } from 'react';
import { BellRing, Download, MessageCircle, Share, SquarePlus, X } from 'lucide-react';
import { batDay, guiThuDay, laIOS, tatDay, trangThaiDay, useCaiDat, type TrangThaiDay } from '../lib/ungDung';
import { loiDe, supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { cx, HopThoai, LogoBcd, Nut } from './ui';

const KHOA_AN = 'bcd57-an-goi-y';
const daAn = (loai: string) => { try { return Date.now() - Number(localStorage.getItem(`${KHOA_AN}-${loai}`) ?? 0) < 14 * 86_400_000; } catch { return false; } };
const an = (loai: string) => { try { localStorage.setItem(`${KHOA_AN}-${loai}`, String(Date.now())); } catch { /* bỏ qua */ } };

export function useTrangThaiDay() {
  const [tt, setTt] = useState<TrangThaiDay | null>(null);
  const tai = useCallback(() => { void trangThaiDay().then(setTt).catch(() => setTt('khong_ho_tro')); }, []);
  useEffect(() => { tai(); }, [tai]);
  return [tt, tai] as const;
}

export function HuongDanIOS({ mo, dong }: { mo: boolean; dong: () => void }) {
  const buoc = [
    { icon: <Share className="h-5 w-5 text-xanh" />, chu: <>Bấm nút <b>Chia sẻ</b> ở thanh dưới của Safari</> },
    { icon: <SquarePlus className="h-5 w-5" />, chu: <>Chọn <b>Thêm vào MH chính</b> (kéo xuống nếu chưa thấy)</> },
    { icon: <span className="text-[13px] font-bold text-xanh">Thêm</span>, chu: <>Bấm <b>Thêm</b> ở góc trên</> },
    { icon: <LogoBcd className="h-6 w-6 rounded-md" />, chu: <>Mở <b>BCĐ 57</b> từ màn hình chính, bật thông báo</> },
  ];
  return (
    <HopThoai mo={mo} dong={dong} tieuDe="Cài ra màn hình iPhone">
      <ol className="xep-hang m-0 flex list-none flex-col gap-2 p-0">
        {buoc.map((b, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-nen-2 p-3 text-[14px]">
            <span className="so flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-do text-[13px] font-bold text-white">{i + 1}</span>
            <span className="flex-1">{b.chu}</span>
            <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-vien bg-white px-1.5">{b.icon}</span>
          </li>
        ))}
      </ol>
      <p className="mb-0 mt-3 text-xs text-mo">Dùng Safari, iOS 16.4 trở lên.</p>
    </HopThoai>
  );
}

// Thẻ gợi ý nổi: cài ứng dụng, sau đó bật thông báo
// Tài khoản chưa có SĐT nhận nhắc việc
function useThieuSdt() {
  const { hoSo } = useAuth();
  const [thieu, setThieu] = useState(false);
  useEffect(() => {
    if (!hoSo) return;
    const tai = () => void supabase.from('lien_he_nguoi_dung').select('so_dien_thoai').eq('nguoi_dung_id', hoSo.id).maybeSingle()
      .then(({ data, error }) => setThieu(!error && !data?.so_dien_thoai));
    tai();
    window.addEventListener('bcd57-lien-he', tai);
    return () => window.removeEventListener('bcd57-lien-he', tai);
  }, [hoSo]);
  return thieu;
}

export function GoiYUngDung({ moLienHe }: { moLienHe: () => void }) {
  const { kieu, cai } = useCaiDat();
  const [tt, taiTt] = useTrangThaiDay();
  const thieuSdt = useThieuSdt();
  const [, lamMoi] = useState(0);
  const [huongDan, setHuongDan] = useState(false);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const loai = kieu && !daAn('cai') ? 'cai' : tt === 'chua_bat' && !daAn('day') ? 'day' : thieuSdt && !daAn('sdt') ? 'sdt' : null;
  if (!loai) return <HuongDanIOS mo={huongDan} dong={() => setHuongDan(false)} />;

  const dong = () => { an(loai); lamMoi((x) => x + 1); };
  const bam = async () => {
    setLoi(null);
    if (loai === 'sdt') { moLienHe(); return; }
    if (loai === 'cai') { if (kieu === 'ios') setHuongDan(true); else await cai(); return; }
    setDang(true);
    try { await batDay(); taiTt(); } catch (e) { setLoi(loiDe(e)); } finally { setDang(false); }
  };

  return (
    <>
      <div role="status" className="truot-len fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-vien bg-white/95 p-3 shadow-[0_12px_40px_-12px_rgba(60,10,12,0.35)] backdrop-blur lg:inset-x-auto lg:bottom-6 lg:right-6">
        {loai === 'cai' ? <LogoBcd className="h-11 w-11" /> : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-do/10 text-do">{loai === 'sdt' ? <MessageCircle className="h-5 w-5" /> : <BellRing className="lac-chuong h-5 w-5" />}</span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-bold">{loai === 'cai' ? 'Cài BCĐ 57 ra màn hình chính' : loai === 'day' ? 'Bật thông báo trên máy này' : 'Thêm số điện thoại'}</span>
          <span className={cx('text-xs', loi ? 'text-nguy' : 'text-mo')}>{loi ?? (loai === 'cai' ? 'Mở nhanh như ứng dụng, nhận nhắc hạn' : loai === 'day' ? 'Nhận nhắc hạn kể cả khi không mở web' : 'Nhận nhắc việc qua Zalo, cuộc gọi')}</span>
        </div>
        <Nut kieu="chinh" className="min-h-10 px-3" dangChay={dang} onClick={bam} icon={loai === 'cai' ? <Download className="h-4 w-4" /> : undefined}>
          {loai === 'cai' ? (kieu === 'ios' ? 'Cách cài' : 'Cài') : loai === 'day' ? 'Bật' : 'Thêm'}
        </Nut>
        <button onClick={dong} aria-label="Để sau" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-mo hover:bg-nen"><X className="h-4 w-4" /></button>
      </div>
      <HuongDanIOS mo={huongDan} dong={() => setHuongDan(false)} />
    </>
  );
}

// Dòng cài đặt ở cuối hộp thông báo (chuông)
export function CaiDatThongBao() {
  const { kieu, cai } = useCaiDat();
  const [tt, taiTt] = useTrangThaiDay();
  const [dang, setDang] = useState(false);
  const [tin, setTin] = useState<string | null>(null);
  const [huongDan, setHuongDan] = useState(false);

  const chay = async (f: () => Promise<unknown>, ok?: string) => {
    setDang(true); setTin(null);
    try { await f(); if (ok) setTin(ok); } catch (e) { setTin(loiDe(e)); } finally { setDang(false); taiTt(); }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-vien bg-nen-2 px-4 py-3 text-[13px]">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 shrink-0 text-mo" />
        <span className="flex-1 font-semibold">Thông báo trên máy này</span>
        {tt === 'da_bat' && (
          <>
            <button disabled={dang} onClick={() => chay(guiThuDay, 'Đã gửi thử')} className="rounded-lg px-2 py-1 text-xs font-semibold text-do hover:bg-do/5">Gửi thử</button>
            <button disabled={dang} onClick={() => chay(tatDay)} className="rounded-lg px-2 py-1 text-xs font-semibold text-mo hover:bg-nen">Tắt</button>
          </>
        )}
        {tt === 'chua_bat' && <Nut kieu="chinh" className="min-h-8 rounded-lg px-3 text-xs" dangChay={dang} onClick={() => chay(batDay, 'Đã bật')}>Bật</Nut>}
        {tt === 'can_cai' && <Nut kieu="phu" className="min-h-8 rounded-lg px-3 text-xs" onClick={() => setHuongDan(true)}>Cài trước</Nut>}
      </div>
      {tt === 'bi_chan' && <span className="text-xs text-nguy">Trình duyệt đang chặn. Cho phép thông báo trong cài đặt trang web.</span>}
      {tt === 'khong_ho_tro' && <span className="text-xs text-mo">Trình duyệt này không hỗ trợ.</span>}
      {tt === 'da_bat' && !tin && <span className="text-xs text-mo">Đang bật · nhận cả khi không mở web</span>}
      {tin && <span className="text-xs text-mo">{tin}</span>}
      {kieu && (
        <button onClick={() => (kieu === 'ios' ? setHuongDan(true) : void cai())} className="flex items-center gap-2 text-left text-xs font-semibold text-do">
          <Download className="h-3.5 w-3.5" />{laIOS() ? 'Cài ra màn hình iPhone' : 'Cài ứng dụng ra màn hình chính'}
        </button>
      )}
      <HuongDanIOS mo={huongDan} dong={() => setHuongDan(false)} />
    </div>
  );
}
