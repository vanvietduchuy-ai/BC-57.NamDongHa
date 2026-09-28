// Quản trị hệ thống: chọn người quản lý chỉ tiêu cho từng lĩnh vực (Chuyển đổi số – NQ 57, Đề án 06)
//   cai_dat : thêm, sửa, ngừng chỉ tiêu, giao đơn vị cập nhật; theo dõi, nhắc
//   theo_doi: xem số liệu mọi đơn vị, nhắc đơn vị chậm
// Lĩnh vực chưa chọn ai: tài khoản của đơn vị đầu mối lĩnh vực được cài đặt (mặc định)
import { useState } from 'react';
import { Info, Plus, ShieldCheck, X } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { LV_CT, type LvChiTieu } from '../lib/chiTieu';
import { KHOI_DV } from './TaiKhoanHangLoat';
import { Chip, cx, DangTai, HopLoi, lopO, Nut, The } from './ui';

type Quyen = 'cai_dat' | 'theo_doi';
type Ql = { linh_vuc: LvChiTieu; nguoi_dung_id: string; quyen: Quyen };
type Nd = { id: string; ho_ten: string; chuc_vu: string | null; vai_tro: string; hoat_dong: boolean; don_vi: { ten: string; loai: string } | null };
const QUYEN: Record<Quyen, { ten: string; mo: string; nen: string; chu: string }> = {
  cai_dat: { ten: 'Cài đặt & theo dõi', mo: 'Thêm, sửa, ngừng chỉ tiêu; giao đơn vị; xem, nhắc', nen: 'bg-ink', chu: 'text-white' },
  theo_doi: { ten: 'Chỉ theo dõi', mo: 'Xem số liệu mọi đơn vị, nhắc đơn vị chậm', nen: 'bg-xanh-nhat', chu: 'text-xanh' },
};
const LV_DM: Record<LvChiTieu, string[]> = { chuyen_doi_so: ['nq57', 'khcn_dmst', 'chuyen_doi_so'], de_an_06: ['de_an_06'] };

export default function PhanQuyenChiTieu() {
  const [loi, setLoi] = useState<string | null>(null);
  const { data, dangTai, taiLai } = useDuLieu(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('chi_tieu_quan_ly').select('linh_vuc, nguoi_dung_id, quyen'),
      supabase.from('nguoi_dung').select('id, ho_ten, chuc_vu, vai_tro, hoat_dong, don_vi(ten, loai)').eq('hoat_dong', true).order('ho_ten'),
      supabase.from('dau_moi_linh_vuc').select('linh_vuc, don_vi(ten)'),
    ]);
    return { ql: (kq(a) ?? []) as Ql[], nd: (kq(b) ?? []) as unknown as Nd[], dm: (kq(c) ?? []) as unknown as { linh_vuc: string; don_vi: { ten: string } | null }[] };
  });
  const chay = async (p: PromiseLike<{ error: unknown }>) => { setLoi(null); const { error } = await p; if (error) setLoi(loiDe(error)); else void taiLai(); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-xl bg-nen-2 px-3 py-2.5 text-[0.8125rem] leading-snug text-mo-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Chọn tài khoản quản lý chỉ tiêu cho từng lĩnh vực. <b>Cài đặt & theo dõi</b>: thêm, sửa chỉ tiêu, giao đơn vị cập nhật, nhắc. <b>Chỉ theo dõi</b>: xem số liệu mọi đơn vị, nhắc.
          Lĩnh vực chưa chọn ai thì tài khoản của đơn vị đầu mối được cài đặt. Thường trực, lãnh đạo BCĐ luôn xem được số liệu.</span>
      </div>
      {loi && <HopLoi loi={loi} />}
      {dangTai && !data && <DangTai />}
      {data && (Object.keys(LV_CT) as LvChiTieu[]).map((lv) => {
        const ds = data.ql.filter((q) => q.linh_vuc === lv);
        const dauMoi = [...new Set(data.dm.filter((m) => LV_DM[lv].includes(m.linh_vuc)).map((m) => m.don_vi?.ten).filter(Boolean))].join(', ');
        return <TheLv key={lv} lv={lv} ds={ds} nd={data.nd} dauMoi={dauMoi} chay={chay} />;
      })}
    </div>
  );
}

function TheLv({ lv, ds, nd, dauMoi, chay }: { lv: LvChiTieu; ds: Ql[]; nd: Nd[]; dauMoi: string; chay: (p: PromiseLike<{ error: unknown }>) => void }) {
  const [chon, setChon] = useState(''); const [quyen, setQuyen] = useState<Quyen>('cai_dat');
  const conLai = nd.filter((n) => !ds.some((q) => q.nguoi_dung_id === n.id));
  const ten = (id: string) => nd.find((n) => n.id === id);
  return (
    <The className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-vien px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-[#8E1B22]" />
        <h2 className="m-0 flex-1 text-[0.9375rem] font-bold">{LV_CT[lv].ten}</h2>
        <Chip>{ds.length} người</Chip>
      </div>
      {!ds.length && (
        <div className="border-b border-[#F1EEE7] px-4 py-3 text-[0.8125rem] text-mo">
          Chưa chọn người quản lý — mặc định mọi tài khoản của <b className="text-mo-2">{dauMoi || 'đơn vị đầu mối'}</b> được cài đặt chỉ tiêu.
        </div>
      )}
      <ul className="m-0 list-none p-0">
        {ds.map((q) => {
          const n = ten(q.nguoi_dung_id);
          return (
            <li key={q.nguoi_dung_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#F1EEE7] px-4 py-2.5">
              <div className="flex min-w-0 flex-1 basis-48 flex-col">
                <span className="text-[0.875rem] font-semibold leading-snug">{n?.ho_ten ?? '(tài khoản đã khoá)'}</span>
                <span className="truncate text-xs text-mo">{[n?.chuc_vu, n?.don_vi?.ten].filter(Boolean).join(' · ')}</span>
              </div>
              <select aria-label="Quyền" className={cx(lopO, 'min-h-9 w-auto text-[0.8125rem]')} value={q.quyen}
                onChange={(e) => chay(supabase.from('chi_tieu_quan_ly').update({ quyen: e.target.value }).eq('linh_vuc', lv).eq('nguoi_dung_id', q.nguoi_dung_id))}>
                {(Object.keys(QUYEN) as Quyen[]).map((k) => <option key={k} value={k}>{QUYEN[k].ten}</option>)}
              </select>
              <button aria-label="Bỏ quyền" className="grid h-9 w-9 place-items-center rounded-lg text-mo hover:bg-nguy-nhat hover:text-nguy"
                onClick={() => { if (window.confirm(`Bỏ quyền quản lý chỉ tiêu ${LV_CT[lv].ngan} của ${n?.ho_ten ?? 'tài khoản này'}?`)) chay(supabase.from('chi_tieu_quan_ly').delete().eq('linh_vuc', lv).eq('nguoi_dung_id', q.nguoi_dung_id)); }}>
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 bg-nen-2 p-3 sm:flex-row sm:items-center">
        <select aria-label="Tài khoản" className={cx(lopO, 'min-h-10 flex-1 bg-white text-[0.8125rem]')} value={chon} onChange={(e) => setChon(e.target.value)}>
          <option value="">— Chọn tài khoản —</option>
          {KHOI_DV.map(([k, t, f]) => { const x = conLai.filter((n) => n.don_vi && f(n.don_vi.loai)); return x.length ? <optgroup key={k} label={t}>{x.map((n) => <option key={n.id} value={n.id}>{n.ho_ten} — {n.don_vi?.ten}</option>)}</optgroup> : null; })}
          {conLai.some((n) => !n.don_vi) && <optgroup label="Khác">{conLai.filter((n) => !n.don_vi).map((n) => <option key={n.id} value={n.id}>{n.ho_ten}</option>)}</optgroup>}
        </select>
        <div className="flex gap-2">
          <select aria-label="Quyền mới" className={cx(lopO, 'min-h-10 flex-1 bg-white text-[0.8125rem] sm:w-44 sm:flex-none')} value={quyen} onChange={(e) => setQuyen(e.target.value as Quyen)}>
            {(Object.keys(QUYEN) as Quyen[]).map((k) => <option key={k} value={k}>{QUYEN[k].ten}</option>)}
          </select>
          <Nut kieu="chinh" icon={<Plus className="h-4 w-4" />} disabled={!chon}
            onClick={() => { chay(supabase.from('chi_tieu_quan_ly').insert({ linh_vuc: lv, nguoi_dung_id: chon, quyen })); setChon(''); }}>Thêm</Nut>
        </div>
      </div>
    </The>
  );
}
