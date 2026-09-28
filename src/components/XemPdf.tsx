// Xem trước PDF đủ mọi trang (vẽ bằng pdf.js) — iPhone/iPad trong khung iframe chỉ hiện trang đầu
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { cx } from './ui';

type Pdf = { numPages: number; getPage: (n: number) => Promise<PdfTrang>; destroy: () => Promise<void> };
type PdfTrang = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

async function moPdf(url: string): Promise<Pdf> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const du = new Uint8Array(await (await fetch(url)).arrayBuffer());
  return pdfjs.getDocument({ data: du }).promise as unknown as Promise<Pdf>;
}

// url: blob URL của tệp PDF; cao: chiều cao khung cuộn
export default function XemPdf({ url, cao = 'h-[480px] lg:h-[560px]', className }: { url: string; cao?: string; className?: string }) {
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [trang, setTrang] = useState(1);
  const khung = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let huy = false; let p: Pdf | null = null;
    setPdf(null); setLoi(null); setTrang(1);
    moPdf(url).then((x) => { p = x; if (huy) void x.destroy(); else setPdf(x); })
      .catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : String(e)); });
    return () => { huy = true; if (p) void p.destroy(); };
  }, [url]);

  // Trang đang xem (theo vị trí cuộn)
  const theoCuon = () => {
    const k = khung.current; if (!k) return;
    const ds = [...k.querySelectorAll<HTMLElement>('[data-trang]')];
    const giua = k.scrollTop + k.clientHeight / 3;
    const hien = ds.filter((d) => d.offsetTop <= giua).pop();
    if (hien) setTrang(Number(hien.dataset.trang));
  };

  return (
    <div className={cx('relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-vien bg-[#E9E6DF]', className)}>
      <div ref={khung} onScroll={theoCuon} className={cx('flex flex-col items-center gap-3 overflow-y-auto overscroll-contain p-2 sm:p-3', cao)}>
        {loi ? <div className="m-auto p-4 text-center text-[0.8125rem] text-mo">Không hiển thị được văn bản ({loi}).</div>
          : !pdf ? <div className="m-auto flex items-center gap-2 text-[0.8125rem] text-mo"><Loader2 className="h-4 w-4 animate-spin" />Đang mở văn bản…</div>
          : Array.from({ length: pdf.numPages }, (_, i) => <TrangPdf key={i} pdf={pdf} so={i + 1} khung={khung} />)}
      </div>
      {pdf && (
        <div className="flex items-center gap-2 border-t border-vien bg-white px-3 py-1.5 text-[0.75rem] text-mo">
          <span className="mono font-semibold text-den">Trang {trang}/{pdf.numPages}</span>
          <span className="flex-1">{pdf.numPages > 1 ? '· cuộn để xem các trang' : ''}</span>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 font-semibold text-[#8E1B22]"><ExternalLink className="h-3.5 w-3.5" />Mở toàn màn hình</a>
        </div>
      )}
    </div>
  );
}

// Một trang: chỉ vẽ khi cuộn tới gần (đỡ tốn bộ nhớ trên điện thoại)
function TrangPdf({ pdf, so, khung }: { pdf: Pdf; so: number; khung: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [tiLe, setTiLe] = useState(1.414);
  const [ve, setVe] = useState(so <= 2);

  useEffect(() => {
    if (ve || !ref.current) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) setVe(true); }, { root: khung.current, rootMargin: '600px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ve, khung]);

  useEffect(() => {
    if (!ve) return;
    let huy = false;
    (async () => {
      const p = await pdf.getPage(so);
      const goc = p.getViewport({ scale: 1 });
      setTiLe(goc.height / goc.width);
      const rong = ref.current?.clientWidth || 360;
      const vp = p.getViewport({ scale: (rong / goc.width) * Math.min(window.devicePixelRatio || 1, 2.5) });
      const c = cv.current; if (!c || huy) return;
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d'); if (!ctx) return;
      await p.render({ canvasContext: ctx, viewport: vp }).promise;
    })().catch(() => undefined);
    return () => { huy = true; };
  }, [ve, pdf, so]);

  return (
    <div ref={ref} data-trang={so} className="relative w-full max-w-[820px] shrink-0 bg-white shadow-sm" style={{ aspectRatio: `1 / ${tiLe}` }}>
      <canvas ref={cv} className="block h-full w-full" aria-label={`Trang ${so}`} />
      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-den/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">{so}/{pdf.numPages}</span>
    </div>
  );
}
