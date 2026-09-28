// Mở / tải tệp lưu trên Google Drive qua Edge Function drive-tai-ve:
// máy chủ kiểm tra quyền theo tài khoản web rồi đọc tệp bằng tài khoản Google của hệ thống,
// nên cán bộ đơn vị không cần quyền trên Drive và Drive không phải chia sẻ công khai.
import { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { CHE_DO_THU, KHOA_ANON, supabase, tokenThu, URL_SUPABASE } from '../lib/supabase';
import { cx } from './ui';

export type LoaiTepDrive = 'tep' | 'van_ban' | 'sao_luu';

export async function layTepDrive(loai: LoaiTepDrive, id: string): Promise<Blob> {
  const token = CHE_DO_THU ? tokenThu() : (await supabase.auth.getSession()).data.session?.access_token;
  const r = await fetch(`${URL_SUPABASE}/functions/v1/drive-tai-ve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token ?? KHOA_ANON}`, apikey: KHOA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ loai, id }),
  });
  if (!r.ok) {
    let m = `Lỗi ${r.status}`;
    try { m = (await r.json()).loi ?? m; } catch { /* không phải JSON */ }
    throw new Error(m);
  }
  return await r.blob();
}

// Xem: mở tab mới (PDF, ảnh hiện ngay; Word/Excel tải về). Tải: lưu tệp với đúng tên.
export async function moTepDrive(loai: LoaiTepDrive, id: string, ten: string, cheDo: 'xem' | 'tai' = 'xem', duPhong?: string | null) {
  const cua = cheDo === 'xem' ? window.open('', '_blank') : null;   // mở ngay khi bấm để trình duyệt không chặn cửa sổ
  try {
    const blob = await layTepDrive(loai, id);
    const url = URL.createObjectURL(blob);
    const xemDuoc = /pdf|image|text|json/.test(blob.type);
    if (cua && xemDuoc) cua.location.href = url;
    else {
      cua?.close();
      const a = document.createElement('a'); a.href = url; a.download = ten; a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    // Tệp gắn bằng liên kết ngoài (không nằm trong Drive của hệ thống): mở thẳng liên kết
    if (duPhong) { if (cua) cua.location.href = duPhong; else window.open(duPhong, '_blank'); return; }
    cua?.close();
    window.alert(`Không mở được tệp: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function NutTepDrive({ loai, id, ten, nhan, cheDo = 'xem', duPhong, className }: {
  loai: LoaiTepDrive; id: string; ten: string; nhan?: string; cheDo?: 'xem' | 'tai'; duPhong?: string | null; className?: string;
}) {
  const [dang, setDang] = useState(false);
  const Icon = cheDo === 'tai' ? Download : ExternalLink;
  return (
    <button type="button" disabled={dang}
      onClick={async () => { setDang(true); try { await moTepDrive(loai, id, ten, cheDo, duPhong); } finally { setDang(false); } }}
      className={cx('inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-semibold text-[#8E1B22] hover:bg-nen disabled:opacity-60', className)}>
      <Icon className="h-4 w-4" />{dang ? 'Đang mở…' : (nhan ?? (cheDo === 'tai' ? 'Tải về' : 'Mở'))}
    </button>
  );
}

// Xem trước PDF trong khung (blob URL qua máy chủ). id = id bản ghi (van_ban, tep…), bat = tệp đã nằm trên Drive
export function useXemTruocDrive(loai: LoaiTepDrive, id: string | null | undefined, bat = true) {
  const [url, setUrl] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    if (!id || !bat) { setUrl(null); return; }
    let huy = false, u: string | null = null;
    setLoi(null);
    layTepDrive(loai, id).then((b) => { if (huy) return; u = URL.createObjectURL(b); setUrl(u); })
      .catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : String(e)); });
    return () => { huy = true; if (u) URL.revokeObjectURL(u); };
  }, [loai, id, bat]);
  return { url, loi };
}
