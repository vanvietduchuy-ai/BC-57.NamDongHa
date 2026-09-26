import { Link } from 'react-router-dom';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { useAuth } from '../lib/auth';
import { ngayGio, tenNgan } from '../lib/dinhDang';
import { TT_NOP } from './KyBaoCaoChiTiet';
import { hanNv, type TrangThaiNv } from '../lib/nhiemVu';
import { Chip, ChipHan, DangTai, DongHo, HopLoi, NhanGap, Rong, The, TieuDeThe, cx } from '../components/ui';

export type Viec = { nop_id: string; don_vi_id: string; trang_thai: string; ky_id: string; ten: string; loai: string; han_nop: string; qua_han: boolean; cap?: string; don_vi_giao?: string | null };
// Nhãn loại việc kèm đơn vị giao (Thường trực BCĐ / đầu mối)
export const nhanViec = (v: Pick<Viec, 'loai' | 'cap' | 'don_vi_giao'>): [string, string] => {
  const [nhan, mau] = v.cap === 'linh_vuc' ? ['TỔNG HỢP GỬI THƯỜNG TRỰC', 'text-[#A4161A]'] : [NHAN_LOAI[v.loai]?.[0] ?? v.loai, NHAN_LOAI[v.loai]?.[1] ?? ''];
  return [v.don_vi_giao ? `${nhan} · ${tenNgan(v.don_vi_giao).toUpperCase()}` : nhan, mau];
};
export const NHAN_LOAI: Record<string, [string, string]> = {
  dot_xuat: ['ĐỘT XUẤT', 'text-cam'], thang: ['ĐỊNH KỲ', 'text-xanh'],
  quy: ['ĐỊNH KỲ', 'text-xanh'], sau_thang: ['ĐỊNH KỲ', 'text-xanh'], nam: ['ĐỊNH KỲ', 'text-xanh'],
};

type NvDv = { id: string; ma: string | null; ten: string; han: string | null; trang_thai: TrangThaiNv; phan_tram: number; qua_han: boolean; con_ngay: number | null; chu_tri_don_vi_id: string | null };

type DaGui = { id: string; trang_thai: string; nop_luc: string; ky_bao_cao: { ten: string } };

export default function TrangChuDonVi() {
  const { hoSo } = useAuth();
  const { data, loi, dangTai, taiLai } = useDuLieu(async () => {
    const dv = hoSo!.don_vi_id!;
    const [a, b, c] = await Promise.all([
      supabase.from('v_viec_can_nop').select('*').eq('don_vi_id', dv).order('han_nop'),
      supabase.from('nop_bao_cao').select('id, trang_thai, nop_luc, ky_bao_cao(ten)').eq('don_vi_id', dv).not('nop_luc', 'is', null).order('nop_luc', { ascending: false }).limit(5),
      supabase.from('v_nhiem_vu').select('id, ma, ten, han, trang_thai, phan_tram, qua_han, con_ngay, chu_tri_don_vi_id, phoi_hop_ids').neq('trang_thai', 'hoan_thanh').neq('trang_thai', 'tam_dung').order('han', { nullsFirst: false }),
    ]);
    const nv = ((kq(c) ?? []) as (NvDv & { phoi_hop_ids: string[] | null })[]).filter((n) => n.chu_tri_don_vi_id === dv || (n.phoi_hop_ids ?? []).includes(dv));
    return { viec: (kq(a) ?? []) as Viec[], daGui: (kq(b) ?? []) as unknown as DaGui[], nv };
  });
  if (loi) return <HopLoi loi={loi} taiLai={taiLai} />;
  if (dangTai && !data) return <DangTai />;
  if (!data) return null;
  const gan = data.viec[0];

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-mo">Xin chào, {hoSo?.ho_ten}</span>
        <h1 className="m-0 text-[22px] font-extrabold">{hoSo?.don_vi?.ten}</h1>
      </div>

      {gan ? (
        <section className="noi-len-hero flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-ink-2 via-ink to-ink-3 p-5 text-white shadow-[0_18px_40px_-20px_rgba(92,10,14,0.6)]">
          <div className="flex items-center gap-2">
            <span className="min-w-0 truncate rounded-full bg-ink-2 px-3 py-1 text-[11px] font-bold tracking-wider text-[#FDE68A]">{nhanViec(gan)[0]}</span>
            <span className="flex-1" /><NhanGap han={gan.han_nop} />
          </div>
          <div className="flex flex-col gap-1"><span className="text-lg font-bold">{gan.ten}</span><span className="text-xs text-[#E9CBC7]">Hạn {ngayGio(gan.han_nop)}{gan.trang_thai === 'can_bo_sung' && ' · cần bổ sung'}</span></div>
          <DongHo han={gan.han_nop} />
          <Link to={`/viec-can-nop/${gan.nop_id}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-bold text-den"><ArrowUp className="h-4 w-4" />Nộp báo cáo ngay</Link>
        </section>
      ) : <Rong>Đã nộp đủ.</Rong>}

      {data.viec.length > 1 && (
        <The className="flex flex-col gap-1 p-4">
          <TieuDeThe phai={<Link to="/viec-can-nop" className="text-[13px] font-semibold text-[#A4161A]">Tất cả</Link>}>Việc cần nộp khác</TieuDeThe>
          {data.viec.slice(1, 5).map((v) => (
            <Link key={v.nop_id} to={`/viec-can-nop/${v.nop_id}`} className="-mx-2 flex items-center gap-3 rounded-xl border-t border-[#F1EEE7] px-2 py-3 text-den transition-colors first:border-0 hover:bg-nen-2">
              <div className="flex min-w-0 flex-1 flex-col"><span className={cx('truncate text-[11px] font-bold tracking-wider', nhanViec(v)[1])}>{nhanViec(v)[0]}</span><span className="text-sm font-semibold leading-snug">{v.ten}</span></div>
              <ChipHan han={v.han_nop} /><ChevronRight className="h-4 w-4 text-mo" />
            </Link>
          ))}
        </The>
      )}

      <The className="flex flex-col gap-1 p-4">
        <TieuDeThe phai={<Link to="/nhiem-vu" className="text-[13px] font-semibold text-[#A4161A]">Tất cả</Link>}>Nhiệm vụ đang thực hiện</TieuDeThe>
        {data.nv.length === 0 && <span className="py-2 text-sm text-mo">Không có nhiệm vụ.</span>}
        {data.nv.slice(0, 5).map((n) => (
          <Link key={n.id} to={`/nhiem-vu/${n.id}`} className="-mx-2 flex items-center gap-3 rounded-xl border-t border-[#F1EEE7] px-2 py-3 text-den transition-colors first:border-0 hover:bg-nen-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[11px] font-bold tracking-wider text-mo">{n.chu_tri_don_vi_id === hoSo?.don_vi_id ? 'CHỦ TRÌ' : 'PHỐI HỢP'} · <span className="so">{n.phan_tram}%</span></span>
              <span className="line-clamp-2 text-sm font-semibold">{n.ten}</span>
            </div>
            {n.han ? <ChipHan han={hanNv(n.han)} /> : <span className="text-xs text-mo">Chưa chốt hạn</span>}<ChevronRight className="h-4 w-4 shrink-0 text-mo" />
          </Link>
        ))}
      </The>

      <The className="flex flex-col gap-1 p-4">
        <TieuDeThe>Báo cáo đã gửi gần đây</TieuDeThe>
        {data.daGui.length === 0 && <span className="py-2 text-sm text-mo">Chưa gửi báo cáo nào.</span>}
        {data.daGui.map((n) => {
          const t = TT_NOP[n.trang_thai] ?? TT_NOP.da_nop;
          return (
            <Link key={n.id} to={`/viec-can-nop/${n.id}`} className="-mx-2 flex items-center gap-3 rounded-xl border-t border-[#F1EEE7] px-2 py-3 text-den transition-colors first:border-0 hover:bg-nen-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-sm font-semibold">{n.ky_bao_cao.ten}</span><span className="text-xs text-mo">Gửi {ngayGio(n.nop_luc)}</span></div>
              <Chip nen={t.nen} chu={t.chu}>{t.nhan}</Chip><ChevronRight className="h-4 w-4 shrink-0 text-mo" />
            </Link>
          );
        })}
      </The>
    </>
  );
}
