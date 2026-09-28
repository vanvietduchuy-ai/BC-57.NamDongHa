// Theo dõi chỉ tiêu Chuyển đổi số – NQ 57 / Đề án 06
//   · Đơn vị chủ trì (Phòng VH-XH: CĐS; Tổ CSKV: Đề án 06): cài đặt chỉ tiêu, giao đơn vị cập nhật, theo dõi, nhắc
//   · Thường trực, lãnh đạo BCĐ: xem số liệu cả 2 lĩnh vực, xuất Excel
import { useMemo, useState } from 'react';
import { BellRing, ChevronLeft, ChevronRight, Download, Pencil, Plus, Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { dauMoiCds, dauMoiDa06, laCQTTHoacLanhDao, useAuth } from '../lib/auth';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { loiDe, supabase } from '../lib/supabase';
import { ngayGio } from '../lib/dinhDang';
import {
  datMucTieu, dinhDangGt, dinhDangMucTieu, dauNam, giaTriDong, gopSoLieu, gtTheoKy, hanKy, KIEU_CT, kyLui, kyMacDinh, kyNay, LV_CT, tenKyCt, tenKyNgan, tienDo, vachMucTieu,
  type ChiTieu as Ct, type KieuChiTieu, type LvChiTieu, type SoLieu,
} from '../lib/chiTieu';
import { Chip, ChipHan, cx, DangTai, HopLoi, HopThoai, lopO, Nut, O, Rong, The, ThanhTyLe, TieuDeTrang } from '../components/ui';

type Dv = { id: string; ten: string; loai: string };
const SO_KY = 6;

export default function ChiTieu() {
  const { hoSo } = useAuth();
  const xemTatCa = laCQTTHoacLanhDao(hoSo);
  const cuaToi: LvChiTieu[] = [...(dauMoiCds(hoSo) ? ['chuyen_doi_so' as const] : []), ...(dauMoiDa06(hoSo) ? ['de_an_06' as const] : [])];
  const dsLv: LvChiTieu[] = xemTatCa ? ['chuyen_doi_so', 'de_an_06'] : cuaToi;
  const [lv, setLv] = useState<LvChiTieu>(dsLv[0] ?? 'chuyen_doi_so');
  const [ky, setKy] = useState(kyMacDinh());
  const chuTri = cuaToi.includes(lv);
  const [chon, setChon] = useState<Ct | null>(null);
  const [sua, setSua] = useState<Ct | 'moi' | null>(null);
  const [moNhac, setMoNhac] = useState(false);

  const kys = useMemo(() => Array.from({ length: SO_KY }, (_, i) => kyLui(ky, SO_KY - 1 - i)), [ky]);
  const { data, loi, dangTai, taiLai } = useDuLieu(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('chi_tieu').select('*').eq('linh_vuc', lv).eq('hoat_dong', true).order('thu_tu'),
      supabase.from('chi_tieu_so_lieu').select('chi_tieu_id, don_vi_id, ky, tu, mau, gia_tri, ghi_chu, da_gui, cap_nhat_luc').eq('linh_vuc', lv).gte('ky', [kys[0], dauNam(ky)].sort()[0]).lte('ky', ky),
      supabase.from('don_vi').select('id, ten, loai').eq('hoat_dong', true).order('thu_tu'),
    ]);
    return { ct: (kq(a) ?? []) as Ct[], sl: (kq(b) ?? []) as SoLieu[], dv: (kq(c) ?? []) as Dv[] };
  }, [lv, ky]);

  const tinh = useMemo(() => {
    if (!data) return null;
    const dong = data.ct.map((ct) => {
      const nay = { ...gopSoLieu(ct, data.sl.filter((s) => s.chi_tieu_id === ct.id && s.da_gui && s.ky === ky)), gt: gtTheoKy(ct, data.sl, ky) };
      // Luỹ kế tháng 1: không so với tháng 12 năm trước
      const truoc = { gt: ct.luy_ke && ky.endsWith('-01') ? null : gtTheoKy(ct, data.sl, kyLui(ky)) };
      const lichSu = kys.map((k) => (ct.luy_ke && k < dauNam(ky) ? null : gtTheoKy(ct, data.sl, k)));
      return { ct, nay, truoc, lichSu, dat: datMucTieu(ct, nay.gt) };
    });
    const dvGiao = [...new Set(data.ct.flatMap((c) => c.don_vi_ids))];
    const dvXong = dvGiao.filter((d) => data.ct.filter((c) => c.don_vi_ids.includes(d)).every((c) => data.sl.some((s) => s.chi_tieu_id === c.id && s.don_vi_id === d && s.ky === ky && s.da_gui)));
    const han = data.ct.length ? hanKy(ky, Math.min(...data.ct.map((c) => c.han_ngay))) : null;
    return { dong, dvGiao, dvXong, han };
  }, [data, ky, kys]);

  const nhom = useMemo(() => {
    const m = new Map<string, NonNullable<typeof tinh>['dong']>();
    tinh?.dong.forEach((d) => m.set(d.ct.nhom, [...(m.get(d.ct.nhom) ?? []), d]));
    return [...m.entries()];
  }, [tinh]);

  const xuatExcel = async () => {
    if (!data || !tinh) return;
    const X = await import('xlsx');
    const tenDv = new Map(data.dv.map((d) => [d.id, d.ten]));
    const h1 = [['Mã', 'Chỉ tiêu', 'Mục tiêu', ...kys.map(tenKyCt), 'Đạt']];
    tinh.dong.forEach((d) => h1.push([d.ct.ma, d.ct.ten, dinhDangMucTieu(d.ct), ...d.lichSu.map((g) => dinhDangGt(d.ct, g)), d.dat == null ? '' : d.dat ? 'Đạt' : 'Chưa đạt']));
    const h2 = [['Mã', 'Chỉ tiêu', 'Đơn vị', 'Tử số', 'Mẫu số', 'Giá trị tháng', 'Luỹ kế', 'Ghi chú', 'Cập nhật lúc']];
    data.ct.forEach((ct) => ct.don_vi_ids.forEach((dv) => {
      const s = data.sl.find((x) => x.chi_tieu_id === ct.id && x.don_vi_id === dv && x.ky === ky);
      h2.push([ct.ma, ct.ten, tenDv.get(dv) ?? '', String(s?.tu ?? ''), String(s?.mau ?? ''), s?.da_gui ? dinhDangGt(ct, giaTriDong(ct, s)) : 'Chưa cập nhật', ct.luy_ke ? dinhDangGt(ct, gtTheoKy(ct, data.sl, ky, dv)) : '', s?.ghi_chu ?? '', s?.cap_nhat_luc ? ngayGio(s.cap_nhat_luc) : '']);
    }));
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(h1), 'Tổng hợp');
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(h2), 'Theo đơn vị');
    X.writeFile(wb, `Chi tieu ${LV_CT[lv].ngan} ${tenKyCt(ky).replace('/', '-')}.xlsx`);
  };

  if (!dsLv.length) return <Rong>Tài khoản không theo dõi chỉ tiêu.</Rong>;
  return (
    <div className="flex flex-col gap-4">
      <TieuDeTrang tren={chuTri ? 'Đơn vị chủ trì theo dõi, đôn đốc' : 'Số liệu các đơn vị cập nhật'} ten="Chỉ tiêu số liệu"
        phai={<>
          <Nut icon={<Download className="h-4 w-4" />} onClick={xuatExcel} ngan="">Xuất Excel</Nut>
          {chuTri && <Nut kieu="chinh" icon={<Plus className="h-4 w-4" />} onClick={() => setSua('moi')} ngan="Thêm">Thêm chỉ tiêu</Nut>}
        </>} />

      {dsLv.length > 1 && (
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-nen-3 p-1">
          {dsLv.map((k) => <button key={k} role="tab" aria-selected={lv === k} onClick={() => setLv(k)}
            className={cx('min-h-10 rounded-lg text-[0.875rem] font-semibold', lv === k ? 'bg-white text-den shadow-sm' : 'text-mo')}>{LV_CT[k].ten}</button>)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button aria-label="Kỳ trước" onClick={() => setKy(kyLui(ky))} className="grid h-10 w-10 place-items-center rounded-xl border border-vien-2 bg-white"><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex min-w-0 flex-1 flex-col items-center leading-tight">
          <span className="text-[0.9375rem] font-bold">{tenKyCt(ky)}</span>
          <span className="truncate text-[11.5px] text-mo">Chủ trì: {LV_CT[lv].dauMoi}</span>
        </div>
        <button aria-label="Kỳ sau" disabled={ky >= kyNay()} onClick={() => setKy(kyLui(ky, -1))} className="grid h-10 w-10 place-items-center rounded-xl border border-vien-2 bg-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {loi && <HopLoi loi={loi} taiLai={taiLai} />}
      {dangTai && !data && <DangTai />}
      {data && tinh && (<>
        <The className="overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-vien">
            <Tong nhan="Chỉ tiêu" so={data.ct.length} />
            <Tong nhan="Đạt mục tiêu" so={tinh.dong.filter((d) => d.dat).length} mau="text-[#166534]" />
            <Tong nhan="Chưa đạt" so={tinh.dong.filter((d) => d.dat === false).length} mau="text-nguy" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-vien bg-nen-2 px-4 py-2.5">
            <div className="flex min-w-0 basis-full flex-col gap-1 sm:flex-1 sm:basis-auto">
              <span className="text-[0.8125rem]"><b className="so">{tinh.dvXong.length}/{tinh.dvGiao.length}</b> đơn vị đã cập nhật đủ số liệu</span>
              <ThanhTyLe tyLe={tinh.dvGiao.length ? tinh.dvXong.length / tinh.dvGiao.length : 0} mauThanh="bg-do" cao="h-1.5" />
            </div>
            <span className="flex-1 sm:hidden" />{tinh.dvGiao.length > 0 && tinh.dvXong.length === tinh.dvGiao.length ? <Chip nen="bg-[#DCFCE7]" chu="text-[#166534]">Đủ số liệu</Chip> : tinh.han && <ChipHan han={tinh.han} />}
            {chuTri && tinh.dvXong.length < tinh.dvGiao.length && <Nut kieu="nhe" icon={<BellRing className="h-4 w-4" />} onClick={() => setMoNhac(true)}>Nhắc</Nut>}
          </div>
        </The>

        {!data.ct.length && <Rong>{chuTri ? 'Chưa có chỉ tiêu. Bấm "Thêm chỉ tiêu" để cài đặt.' : 'Đơn vị chủ trì chưa cài đặt chỉ tiêu.'}</Rong>}
        {nhom.map(([ten, ds]) => (
          <section key={ten} className="flex flex-col gap-2">
            <h2 className="m-0 px-1 text-[11.5px] font-bold uppercase tracking-wide text-mo">{ten} · {ds.length}</h2>
            <The className="overflow-hidden">
              <ul className="m-0 list-none p-0">
                {ds.map((d) => {
                  const lech = d.nay.gt != null && d.truoc.gt != null ? d.nay.gt - d.truoc.gt : null;
                  const tot = lech == null || lech === 0 ? null : (lech > 0) === (d.ct.chieu === 'cao_hon_tot');
                  return (
                    <li key={d.ct.id} className="border-b border-[#F1EEE7] last:border-0">
                      <button onClick={() => setChon(d.ct)} className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-nen-2">
                        <div className="flex items-start gap-2">
                          <span className="so mt-0.5 shrink-0 rounded bg-nen-3 px-1.5 text-[10.5px] font-bold text-mo-2">{d.ct.ma}</span>
                          <span className="min-w-0 flex-1 text-[0.875rem] font-semibold leading-snug">{d.ct.ten}{d.ct.luy_ke && <span className="ml-1.5 whitespace-nowrap rounded bg-vang-nhat px-1.5 align-[1px] text-[10.5px] font-bold text-cam-dam">LUỸ KẾ</span>}</span>
                          <span className="flex shrink-0 flex-col items-end leading-tight">
                            <b className={cx('so text-[1.0625rem]', d.dat === false ? 'text-nguy' : d.dat ? 'text-[#166534]' : 'text-den')}>{dinhDangGt(d.ct, d.nay.gt)}</b>
                            {lech != null && lech !== 0 && <span className={cx('so flex items-center gap-0.5 text-[11px] font-semibold', tot ? 'text-[#166534]' : 'text-nguy')}>
                              {lech > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{lech > 0 ? '+' : ''}{d.ct.kieu === 'so' ? lech.toLocaleString('vi-VN') : `${lech.toFixed(1)} điểm`}</span>}
                          </span>
                        </div>
                        <ThanhTyLe tyLe={tienDo(d.ct, d.nay.gt)} vachGiao={vachMucTieu(d.ct)} cao="h-1.5"
                          mauThanh={d.dat === false ? 'bg-nguy' : d.dat ? 'bg-[#16A34A]' : 'bg-mo'} />
                        <div className="flex items-center gap-2 text-[11.5px] text-mo">
                          <span>Mục tiêu {dinhDangMucTieu(d.ct)}</span><span>·</span>
                          <span className={cx(d.nay.soDv < d.ct.don_vi_ids.length && 'font-semibold text-cam-dam')}>{d.nay.soDv}/{d.ct.don_vi_ids.length} đơn vị</span>
                          <span className="flex-1" />
                          <BieuDoNho gt={d.lichSu} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </The>
          </section>
        ))}
      </>)}

      {chon && data && <ChiTietCt ct={chon} ky={ky} kys={kys} sl={data.sl} dv={data.dv} dong={() => setChon(null)} sua={chuTri ? () => { setSua(chon); setChon(null); } : undefined} />}
      {sua && data && <FormChiTieu lv={lv} ct={sua === 'moi' ? null : sua} dv={data.dv} nhomCo={[...new Set(data.ct.map((c) => c.nhom))]} dong={() => setSua(null)} xong={() => { setSua(null); void taiLai(); }} />}
      {moNhac && data && tinh && <HopNhacCt lv={lv} ky={ky} han={tinh.han} ds={data.dv.filter((d) => tinh.dvGiao.includes(d.id) && !tinh.dvXong.includes(d.id))} dong={() => setMoNhac(false)} />}
    </div>
  );
}

function Tong({ nhan, so, mau = 'text-den' }: { nhan: string; so: number; mau?: string }) {
  return <div className="flex flex-col items-center gap-0.5 px-2 py-3"><b className={cx('so text-[1.5rem] leading-none', mau)}>{so}</b><span className="text-[11.5px] text-mo">{nhan}</span></div>;
}

// Biểu đồ cột nhỏ 6 kỳ
function BieuDoNho({ gt }: { gt: (number | null)[] }) {
  const max = Math.max(1, ...gt.map((g) => g ?? 0));
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {gt.map((g, i) => <span key={i} className={cx('w-[5px] rounded-sm', i === gt.length - 1 ? 'bg-do' : 'bg-[#D8CFC2]')} style={{ height: g == null ? 2 : Math.max(2, (g / max) * 16) }} />)}
    </span>
  );
}

// ---------- Chi tiết 1 chỉ tiêu: xu hướng + số liệu từng đơn vị ----------
function ChiTietCt({ ct, ky, kys, sl, dv, dong, sua }: { ct: Ct; ky: string; kys: string[]; sl: SoLieu[]; dv: Dv[]; dong: () => void; sua?: () => void }) {
  const lich = kys.map((k) => ({ k, gt: ct.luy_ke && k < dauNam(ky) ? null : gtTheoKy(ct, sl, k) }));
  const max = Math.max(ct.kieu === 'so' ? ct.muc_tieu ?? 0 : 100, ...lich.map((x) => x.gt ?? 0)) || 1;
  const muc = ct.muc_tieu != null ? ct.muc_tieu / max : null;
  const dong_ = ct.don_vi_ids.map((id) => ({ id, ten: dv.find((d) => d.id === id)?.ten ?? '—', s: sl.find((s) => s.chi_tieu_id === ct.id && s.don_vi_id === id && s.ky === ky) }))
    .map((x) => ({ ...x, gt: x.s?.da_gui ? gtTheoKy(ct, sl, ky, x.id) : null }))
    .sort((a, b) => (a.gt ?? -1) - (b.gt ?? -1));
  return (
    <HopThoai mo dong={dong} tieuDe={`${ct.ma} · ${tenKyCt(ky)}`} rong="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <b className="text-[1rem] leading-snug">{ct.ten}</b>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{KIEU_CT[ct.kieu].ten}</Chip>{ct.luy_ke && <Chip nen="bg-vang-nhat" chu="text-cam-dam">Luỹ kế từ tháng 1</Chip>}<Chip>Mục tiêu {dinhDangMucTieu(ct)}</Chip><Chip>Hạn: ngày {ct.han_ngay} tháng sau</Chip>
          </div>
          {ct.ghi_chu && <p className="m-0 text-[0.8125rem] text-mo">{ct.ghi_chu}</p>}
        </div>
        {/* Xu hướng 6 kỳ */}
        <The as="div" className="p-3">
          <div className="mb-1 text-[11.5px] font-semibold text-mo">{ct.luy_ke ? `Luỹ kế năm ${ky.slice(0, 4)} qua các tháng` : 'Xu hướng 6 kỳ gần nhất'}</div>
          <div className="relative flex h-32 items-end gap-2 border-b border-vien pt-5">
            {muc != null && <div className="absolute inset-x-0 border-t border-dashed border-ink" style={{ bottom: `${Math.min(1, muc) * 100}%` }}><span className="absolute -top-4 right-0 bg-white px-1 text-[10px] font-semibold text-ink">Mục tiêu</span></div>}
            {lich.map((x) => (
              <div key={x.k} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="so text-[10.5px] font-semibold">{x.gt == null ? '' : dinhDangGt(ct, x.gt, 0)}</span>
                <div className={cx('w-full max-w-9 rounded-t-md', x.k === ky ? 'bg-do' : 'bg-[#D8CFC2]')} style={{ height: `${x.gt == null ? 0 : Math.max(3, (x.gt / max) * 88)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">{lich.map((x) => <span key={x.k} className="flex-1 text-center text-[10.5px] text-mo">{tenKyNgan(x.k)}</span>)}</div>
        </The>
        {/* Theo đơn vị */}
        <div className="flex flex-col">
          <div className="mb-1 flex items-center text-[11.5px] font-semibold text-mo"><span className="flex-1">ĐƠN VỊ ({dong_.filter((x) => x.s?.da_gui).length}/{dong_.length} đã cập nhật)</span><span>{ct.kieu === 'ty_le' ? `${ct.nhan_tu ?? 'Tử'} / ${ct.nhan_mau ?? 'Mẫu'}` : 'Giá trị'}</span></div>
          <ul className="m-0 list-none rounded-xl border border-vien p-0">
            {dong_.map(({ id, ten, s, gt }) => {
              const dat = datMucTieu(ct, gt);
              return (
                <li key={id} className="flex items-center gap-2 border-b border-[#F1EEE7] px-3 py-2 last:border-0">
                  <span className="min-w-0 flex-1 text-[0.8125rem] font-medium leading-snug">{ten}</span>
                  {!s?.da_gui ? <Chip nen="bg-cam-nhat" chu="text-cam-dam">Chưa cập nhật</Chip> : <>
                    {ct.kieu === 'ty_le' && !ct.luy_ke && <span className="so text-[11.5px] text-mo">{s.tu?.toLocaleString('vi-VN')}/{s.mau?.toLocaleString('vi-VN')}</span>}
                    {ct.luy_ke && <span className="so text-[11.5px] text-mo">tháng {dinhDangGt(ct, giaTriDong(ct, s), 0)}</span>}
                    <b className={cx('so w-16 text-right text-[0.8125rem]', dat === false ? 'text-nguy' : dat ? 'text-[#166534]' : '')}>{ct.kieu === 'co_khong' ? (s.gia_tri ? 'Có' : 'Không') : dinhDangGt(ct, gt)}</b>
                  </>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          {sua && <Nut icon={<Pencil className="h-4 w-4" />} onClick={sua}>Sửa chỉ tiêu</Nut>}
          <Nut onClick={dong}>Đóng</Nut>
        </div>
      </div>
    </HopThoai>
  );
}

// ---------- Cài đặt chỉ tiêu (đơn vị chủ trì) ----------
function FormChiTieu({ lv, ct, dv, nhomCo, dong, xong }: { lv: LvChiTieu; ct: Ct | null; dv: Dv[]; nhomCo: string[]; dong: () => void; xong: () => void }) {
  const [f, setF] = useState({
    ma: ct?.ma ?? '', ten: ct?.ten ?? '', nhom: ct?.nhom ?? nhomCo[0] ?? '', kieu: (ct?.kieu ?? 'ty_le') as KieuChiTieu,
    don_vi_tinh: ct?.don_vi_tinh ?? '', nhan_tu: ct?.nhan_tu ?? '', nhan_mau: ct?.nhan_mau ?? '',
    muc_tieu: ct?.muc_tieu != null ? String(ct.muc_tieu) : '', chieu: ct?.chieu ?? 'cao_hon_tot', han_ngay: String(ct?.han_ngay ?? 5),
    ghi_chu: ct?.ghi_chu ?? '', don_vi_ids: ct?.don_vi_ids ?? [] as string[], luy_ke: ct?.luy_ke ?? false,
  });
  const [dang, setDang] = useState(false); const [loi, setLoi] = useState<string | null>(null);
  const dsDv = dv.filter((d) => !['co_quan_thuong_truc', 'lanh_dao_bcd'].includes(d.loai));
  const nhomDv: [string, Dv[]][] = [['Công an phường', dsDv.filter((d) => d.loai === 'cong_an')], ['Trường học', dsDv.filter((d) => d.loai === 'truong_hoc')], ['Phòng, ban, đoàn thể', dsDv.filter((d) => !['cong_an', 'truong_hoc'].includes(d.loai))]];
  const bat = (id: string) => setF({ ...f, don_vi_ids: f.don_vi_ids.includes(id) ? f.don_vi_ids.filter((x) => x !== id) : [...f.don_vi_ids, id] });
  const luu = async () => {
    setLoi(null);
    if (!f.ma.trim() || !f.ten.trim() || !f.nhom.trim()) { setLoi('Nhập mã, tên, nhóm chỉ tiêu'); return; }
    if (!f.don_vi_ids.length) { setLoi('Chọn đơn vị cập nhật số liệu'); return; }
    setDang(true);
    const ban = { linh_vuc: lv, ma: f.ma.trim().toUpperCase(), ten: f.ten.trim(), nhom: f.nhom.trim(), kieu: f.kieu, don_vi_tinh: f.don_vi_tinh || null,
      nhan_tu: f.nhan_tu || null, nhan_mau: f.nhan_mau || null, muc_tieu: f.muc_tieu === '' ? null : Number(f.muc_tieu.replace(',', '.')), chieu: f.chieu,
      han_ngay: Number(f.han_ngay) || 5, ghi_chu: f.ghi_chu || null, don_vi_ids: f.don_vi_ids, luy_ke: f.kieu !== 'co_khong' && f.luy_ke };
    const { error } = ct ? await supabase.from('chi_tieu').update(ban).eq('id', ct.id) : await supabase.from('chi_tieu').insert(ban);
    setDang(false);
    if (error) setLoi(loiDe(error)); else xong();
  };
  const ngung = async () => {
    if (!ct || !window.confirm('Ngừng theo dõi chỉ tiêu này? Số liệu cũ vẫn được giữ.')) return;
    const { error } = await supabase.from('chi_tieu').update({ hoat_dong: false }).eq('id', ct.id);
    if (error) setLoi(loiDe(error)); else xong();
  };
  return (
    <HopThoai mo dong={dong} tieuDe={ct ? 'Sửa chỉ tiêu' : `Thêm chỉ tiêu · ${LV_CT[lv].ngan}`} rong="max-w-2xl">
      <div className="flex flex-col gap-3">
        {loi && <HopLoi loi={loi} />}
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <O nhan="Mã"><input className={cx(lopO, 'so uppercase')} placeholder="DVC-01" value={f.ma} onChange={(e) => setF({ ...f, ma: e.target.value })} /></O>
          <O nhan="Nhóm"><input className={lopO} list="nhom-ct" placeholder="VD: Dịch vụ công trực tuyến" value={f.nhom} onChange={(e) => setF({ ...f, nhom: e.target.value })} />
            <datalist id="nhom-ct">{nhomCo.map((n) => <option key={n} value={n} />)}</datalist></O>
        </div>
        <O nhan="Tên chỉ tiêu"><textarea rows={2} className={cx(lopO, 'py-2')} value={f.ten} onChange={(e) => setF({ ...f, ten: e.target.value })} /></O>
        <O nhan="Loại số liệu" goiY={KIEU_CT[f.kieu].goiY}>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-nen-3 p-1">
            {(Object.keys(KIEU_CT) as KieuChiTieu[]).map((k) => <button key={k} type="button" aria-pressed={f.kieu === k} onClick={() => setF({ ...f, kieu: k })}
              className={cx('min-h-9 rounded-lg px-1 text-[0.8125rem] font-semibold leading-tight', f.kieu === k ? 'bg-white shadow-sm' : 'text-mo')}>{KIEU_CT[k].ten.split(' (')[0]}</button>)}
          </div>
        </O>
        {f.kieu === 'ty_le' && <div className="grid grid-cols-2 gap-3">
          <O nhan="Tử số là"><input className={lopO} placeholder="Hồ sơ nộp trực tuyến" value={f.nhan_tu} onChange={(e) => setF({ ...f, nhan_tu: e.target.value })} /></O>
          <O nhan="Mẫu số là"><input className={lopO} placeholder="Tổng hồ sơ tiếp nhận" value={f.nhan_mau} onChange={(e) => setF({ ...f, nhan_mau: e.target.value })} /></O>
        </div>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <O nhan="Mục tiêu"><div className="flex items-center gap-1"><input inputMode="decimal" className={cx(lopO, 'so w-full')} value={f.muc_tieu} onChange={(e) => setF({ ...f, muc_tieu: e.target.value })} />
            <span className="text-[0.8125rem] text-mo">{f.kieu === 'so' ? '' : '%'}</span></div></O>
          <O nhan="Đánh giá"><select className={lopO} value={f.chieu} onChange={(e) => setF({ ...f, chieu: e.target.value as Ct['chieu'] })}><option value="cao_hon_tot">Càng cao càng tốt</option><option value="thap_hon_tot">Càng thấp càng tốt</option></select></O>
          {f.kieu === 'so' && <O nhan="Đơn vị tính"><input className={lopO} placeholder="tài khoản" value={f.don_vi_tinh} onChange={(e) => setF({ ...f, don_vi_tinh: e.target.value })} /></O>}
          <O nhan="Hạn cập nhật"><div className="flex items-center gap-1"><span className="text-[0.8125rem] text-mo">Ngày</span><input inputMode="numeric" className={cx(lopO, 'so w-16')} value={f.han_ngay} onChange={(e) => setF({ ...f, han_ngay: e.target.value })} /></div></O>
        </div>
        {f.kieu !== 'co_khong' && (
          <label className="flex items-start gap-3 rounded-xl border border-vien bg-nen-2 px-3 py-2.5">
            <input type="checkbox" role="switch" className="mt-0.5 h-5 w-5 shrink-0 accent-ink" checked={f.luy_ke} onChange={(e) => setF({ ...f, luy_ke: e.target.checked })} />
            <span className="flex flex-col"><span className="text-[0.875rem] font-semibold">Tính luỹ kế từ đầu năm</span>
              <span className="text-[11.5px] leading-snug text-mo">{f.kieu === 'so' ? 'Đơn vị nhập số phát sinh trong tháng; hệ thống cộng dồn từ tháng 1 để so với mục tiêu năm.' : 'Đơn vị nhập tử số, mẫu số phát sinh trong tháng; tỷ lệ luỹ kế = tổng tử số / tổng mẫu số từ tháng 1.'}</span></span>
          </label>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center"><span className="flex-1 text-[0.8125rem] font-semibold">Đơn vị cập nhật số liệu <span className="font-normal text-mo">· {f.don_vi_ids.length} đơn vị</span></span>
            <button className="min-h-8 text-[0.8125rem] font-semibold text-[#8E1B22]" onClick={() => setF({ ...f, don_vi_ids: f.don_vi_ids.length === dsDv.length ? [] : dsDv.map((d) => d.id) })}>{f.don_vi_ids.length === dsDv.length ? 'Bỏ chọn' : 'Chọn tất cả'}</button></div>
          {nhomDv.filter(([, ds]) => ds.length).map(([ten, ds]) => (
            <div key={ten} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-mo">{ten}</span>
              <div className="flex flex-wrap gap-1.5">
                {ds.map((d) => <button key={d.id} type="button" aria-pressed={f.don_vi_ids.includes(d.id)} onClick={() => bat(d.id)}
                  className={cx('min-h-8 rounded-full border px-3 text-[0.8125rem]', f.don_vi_ids.includes(d.id) ? 'border-do bg-do text-white' : 'border-vien-2 bg-white text-mo-2')}>{d.ten.replace(' – Công an phường', '')}</button>)}
              </div>
            </div>
          ))}
        </div>
        <O nhan="Hướng dẫn cách tính (đơn vị xem khi nhập)"><textarea rows={2} className={cx(lopO, 'py-2')} value={f.ghi_chu} onChange={(e) => setF({ ...f, ghi_chu: e.target.value })} /></O>
        <div className="flex flex-wrap justify-end gap-2">
          {ct && <Nut kieu="nguy" className="mr-auto" onClick={ngung}>Ngừng theo dõi</Nut>}
          <Nut onClick={dong}>Huỷ</Nut>
          <Nut kieu="chinh" icon={<Settings2 className="h-4 w-4" />} dangChay={dang} onClick={luu}>Lưu chỉ tiêu</Nut>
        </div>
      </div>
    </HopThoai>
  );
}

// ---------- Nhắc đơn vị chưa cập nhật ----------
function HopNhacCt({ lv, ky, han, ds, dong }: { lv: LvChiTieu; ky: string; han: string | null; ds: Dv[]; dong: () => void }) {
  const [dang, setDang] = useState(false); const [loi, setLoi] = useState<string | null>(null); const [xong, setXong] = useState(false);
  const gui = async () => {
    setDang(true); setLoi(null);
    const { error } = await supabase.rpc('chi_tieu_nhac', { p_linh_vuc: lv, p_ky: ky });
    setDang(false); if (error) setLoi(loiDe(error)); else setXong(true);
  };
  return (
    <HopThoai mo dong={dong} tieuDe={`Nhắc cập nhật · ${tenKyCt(ky)}`}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[0.875rem]">{ds.length} đơn vị chưa cập nhật đủ số liệu{han ? `, hạn ${ngayGio(han)}` : ''}. Gửi thông báo (web, điện thoại) cho các đơn vị:</p>
        <ul className="m-0 flex list-none flex-col gap-1 rounded-xl border border-vien p-2">{ds.map((d) => <li key={d.id} className="px-1 text-[0.8125rem]">• {d.ten}</li>)}</ul>
        {loi && <HopLoi loi={loi} />}
        {xong ? <div className="rounded-xl bg-xanh-nhat px-3 py-2 text-[0.8125rem] font-semibold text-xanh">Đã gửi nhắc {ds.length} đơn vị.</div> : null}
        <div className="flex justify-end gap-2"><Nut onClick={dong}>Đóng</Nut>{!xong && <Nut kieu="chinh" icon={<BellRing className="h-4 w-4" />} dangChay={dang} onClick={gui}>Gửi nhắc</Nut>}</div>
      </div>
    </HopThoai>
  );
}
