// Bảng đổ xuống chọn nhiều đơn vị: tìm nhanh, chọn tất cả, chọn cả khối (Công an phường, trường, phòng ban…)
import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { khongDau } from '../lib/nhiemVu';
import { KHOI_DV } from './TaiKhoanHangLoat';
import { cx, lopO } from './ui';

export type DvChon = { id: string; ten: string; loai: string };

function OTick({ on, mot }: { on: boolean; mot?: boolean }) {
  return (
    <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px]', on || mot ? 'border-[#8E1B22] bg-[#8E1B22] text-white' : 'border-[#B9B2A4] bg-white')}>
      {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : mot ? <span className="h-0.5 w-2.5 rounded bg-white" /> : null}
    </span>
  );
}

export default function ChonDonVi({ ds, chon, doi, nhan = 'Nơi nhận', goiY = 'Chọn đơn vị nhận' }: {
  ds: DvChon[]; chon: string[]; doi: (ids: string[]) => void; nhan?: string; goiY?: string;
}) {
  const [mo, setMo] = useState(false);
  const [tim, setTim] = useState('');
  const t = khongDau(tim.trim());
  const nhom = useMemo(() => KHOI_DV.map(([k, ten, f]) => [k, ten, ds.filter((d) => f(d.loai))] as const)
    .filter(([, , x]) => x.length), [ds]);
  const tatCa = ds.length > 0 && chon.length === ds.length;
  const batTat = (ids: string[], on: boolean) => doi(on ? [...new Set([...chon, ...ids])] : chon.filter((x) => !ids.includes(x)));
  // Tóm tắt: khối chọn đủ ghi tên khối, còn lại ghi tên đơn vị
  const tenChon = nhom.flatMap(([, ten, x]) => {
    const co = x.filter((d) => chon.includes(d.id));
    return co.length === x.length && x.length > 1 ? [`${ten} (${x.length})`] : co.map((d) => d.ten.replace(' – Công an phường', ''));
  });
  const tomTat = tatCa ? 'Tất cả phòng, đơn vị' : tenChon.length <= 2 ? tenChon.join(', ') : `${tenChon.slice(0, 2).join(', ')} +${tenChon.length - 2}`;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-semibold text-mo-2">{nhan} <span className="so font-normal text-mo">({chon.length}/{ds.length})</span></span>
      <button type="button" aria-expanded={mo} onClick={() => setMo(!mo)}
        className={cx(lopO, 'flex items-center gap-2 text-left', mo && 'border-ink ring-2 ring-ink/10')}>
        <span className={cx('min-w-0 flex-1 truncate', !chon.length && 'text-mo')}>{chon.length ? tomTat : goiY}</span>
        {chon.length > 0 && <span className="so shrink-0 rounded-full bg-[#8E1B22] px-2 py-0.5 text-[11.5px] font-bold text-white">{chon.length}</span>}
        <ChevronDown className={cx('h-5 w-5 shrink-0 text-mo transition-transform', mo && 'rotate-180')} />
      </button>
      {mo && (
        <div className="bat-len flex flex-col overflow-hidden rounded-2xl border border-vien bg-white shadow-[0_12px_32px_-16px_rgba(60,10,12,0.35)]">
          <div className="flex items-center gap-2 border-b border-vien p-2">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-mo" />
              <input className="h-10 w-full rounded-xl bg-nen-2 pl-9 pr-3 text-[0.875rem] outline-none" placeholder="Tìm đơn vị…" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm đơn vị" />
            </label>
            {chon.length > 0 && <button type="button" onClick={() => doi([])} className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[0.8125rem] font-semibold text-mo-2 hover:bg-nen-2"><X className="h-4 w-4" />Bỏ chọn</button>}
          </div>
          <div className="max-h-[340px] overflow-y-auto overscroll-contain py-1">
            {!t && (
              <button type="button" onClick={() => doi(tatCa ? [] : ds.map((d) => d.id))} className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-[0.875rem] font-bold hover:bg-nen-2">
                <OTick on={tatCa} mot={!tatCa && chon.length > 0} />Tất cả phòng, đơn vị
              </button>
            )}
            {nhom.map(([k, ten, x]) => {
              const hien = x.filter((d) => !t || khongDau(d.ten).includes(t));
              if (!hien.length) return null;
              const n = x.filter((d) => chon.includes(d.id)).length;
              return (
                <div key={k} className="flex flex-col">
                  <button type="button" onClick={() => batTat(x.map((d) => d.id), n < x.length)}
                    className="mt-1 flex min-h-10 items-center gap-3 border-t border-[#F1EEE7] bg-nen-2/60 px-3 text-left text-[0.75rem] font-bold uppercase tracking-wide text-mo-2">
                    <OTick on={n === x.length} mot={n > 0 && n < x.length} /><span className="flex-1">{ten}</span><span className="so normal-case text-mo">{n}/{x.length}</span>
                  </button>
                  {hien.map((d) => { const on = chon.includes(d.id); return (
                    <button key={d.id} type="button" aria-pressed={on} onClick={() => batTat([d.id], !on)}
                      className={cx('flex min-h-11 w-full items-center gap-3 pl-6 pr-3 text-left text-[0.875rem] hover:bg-nen-2', on && 'font-semibold')}>
                      <OTick on={on} /><span className="min-w-0 flex-1">{d.ten}</span>
                    </button>
                  ); })}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-vien bg-nen-2 px-3 py-2">
            <span className="text-[0.8125rem] text-mo-2">Đã chọn <b className="so text-den">{chon.length}</b> đơn vị</span>
            <button type="button" onClick={() => { setMo(false); setTim(''); }} className="h-9 rounded-xl bg-ink px-4 text-[0.8125rem] font-bold text-white">Xong</button>
          </div>
        </div>
      )}
    </div>
  );
}
