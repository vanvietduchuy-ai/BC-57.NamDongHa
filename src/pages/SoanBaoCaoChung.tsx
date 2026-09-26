// Thường trực BCĐ soạn báo cáo chung (gửi Công an tỉnh qua PV01) trên trang A4:
// căn cứ báo cáo văn bản (PDF đã ký) của các đầu mối lĩnh vực; đầu mối chưa gửi thì liệt kê báo cáo đơn vị.
// Bản nháp lập từ dữ liệu mới nhất (lib/tongHop): tình hình gửi báo cáo, nội dung đọc từ PDF.
// Ký xong: gắn bản PDF đã ký, đóng dấu -> vào sổ công văn đi, lưu Google Drive.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { loiDe, supabase } from '../lib/supabase';
import { kq, useDuLieu } from '../lib/useDuLieu';
import { useAuth, laQuanTri } from '../lib/auth';
import { LV_CDS, type MoHinhA4 } from '../lib/baoCaoA4';
import { lapBaoCaoChung, type DuLieuTH } from '../lib/tongHop';
import { META_TRONG, soKyHieu, type MetaVb } from '../lib/docPdf';
import { Chip, DangTai, HopLoi, HopThoai, Nut, The, TieuDeThe, TieuDeTrang } from '../components/ui';
import KhungSoanA4 from '../components/KhungSoanA4';
import OVanBanPdf, { COT_VB_NOP, kiemTraMeta, taiPdfLenDrive, ThongTinVanBan, type VanBanDaNop } from '../components/VanBanPdf';
import { TT_NOP } from './KyBaoCaoChiTiet';

type Ky = { id: string; ten: string; loai: string; tu_ngay: string | null; den_ngay: string | null; han_nop: string; ban_tong_hop: MoHinhA4 | null; van_ban_gui_id: string | null };
type Vb = VanBanDaNop & { noi_dung: string | null };
type Bai = { don_vi_id: string; trang_thai: string; don_vi: { ten: string; thu_tu: number }; van_ban: Vb | null };

async function taiNguon(kyId: string) {
  const [k, con, dm, cfg] = await Promise.all([
    supabase.from('ky_bao_cao').select('id, ten, loai, tu_ngay, den_ngay, han_nop, ban_tong_hop, van_ban_gui_id').eq('id', kyId).single(),
    supabase.from('ky_bao_cao').select('id').eq('ky_cha_id', kyId).eq('cap', 'linh_vuc').maybeSingle(),
    supabase.from('dau_moi_linh_vuc').select('linh_vuc, don_vi_id'),
    supabase.from('cau_hinh').select('gia_tri').eq('khoa', 'nguoi_ky_bao_cao').maybeSingle(),
  ]);
  const ky = kq(k) as Ky;
  const cot = `don_vi_id, trang_thai, don_vi(ten, thu_tu), van_ban!nop_bao_cao_van_ban_id_fkey(${COT_VB_NOP}, noi_dung)`;
  const [a, b, g] = await Promise.all([
    supabase.from('nop_bao_cao').select(cot).eq('ky_id', kyId),
    con.data ? supabase.from('nop_bao_cao').select(cot).eq('ky_id', (con.data as { id: string }).id) : Promise.resolve({ data: [], error: null }),
    ky.van_ban_gui_id ? supabase.from('van_ban').select(COT_VB_NOP).eq('id', ky.van_ban_gui_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const sx = (x: Bai[]) => x.sort((p, q) => p.don_vi.thu_tu - q.don_vi.thu_tu);
  return {
    ky, donVi: sx((kq(a) ?? []) as unknown as Bai[]), linhVuc: sx((kq(b) ?? []) as unknown as Bai[]),
    dm: (kq(dm) ?? []) as { linh_vuc: string; don_vi_id: string }[],
    nguoiKy: cfg.data?.gia_tri as { chuc_danh: string; ho_ten: string } | undefined,
    banGui: (g.data ?? null) as VanBanDaNop | null,
  };
}
const daGui = (b?: Bai) => !!b && ['da_nop', 'da_duyet'].includes(b.trang_thai);

// Lập dự thảo từ dữ liệu mới nhất (cùng cách với bản hệ thống tự sinh khi quá hạn)
async function taoMoi(kyId: string): Promise<MoHinhA4> {
  const { data, error } = await supabase.rpc('du_lieu_tong_hop', { p_ky: kyId });
  if (error) throw error;
  return lapBaoCaoChung(data as DuLieuTH).m as MoHinhA4;
}

export default function SoanBaoCaoChung() {
  const { id } = useParams();
  const { hoSo } = useAuth();
  const quanTri = laQuanTri(hoSo);
  const { data, loi, dangTai, taiLai } = useDuLieu(() => taiNguon(id!), [id]);
  const [m, setM] = useState<MoHinhA4 | null>(null);
  const [moGan, setMoGan] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.ky.ban_tong_hop) setM(data.ky.ban_tong_hop);
    else void taoMoi(data.ky.id).then(setM);
  }, [data]);

  if (loi) return <HopLoi loi={loi} taiLai={taiLai} />;
  if ((dangTai && !data) || !data || !m) return <DangTai />;

  const tenDv = (lv: (x: string) => boolean) => data.dm.find((x) => lv(x.linh_vuc))?.don_vi_id;
  const nguon = [
    ...(data.dm.some((x) => LV_CDS.includes(x.linh_vuc)) ? [{ ten: 'NQ 57, CĐS', b: [...data.linhVuc, ...data.donVi].find((b) => b.don_vi_id === tenDv((x) => LV_CDS.includes(x))) }] : []),
    ...(data.dm.some((x) => x.linh_vuc === 'de_an_06') ? [{ ten: 'Đề án 06', b: [...data.linhVuc, ...data.donVi].find((b) => b.don_vi_id === tenDv((x) => x === 'de_an_06')) }] : []),
  ];

  return (
    <>
      <TieuDeTrang tren={<><Link to={`/ky-bao-cao/${data.ky.id}`} className="text-mo">{data.ky.ten}</Link> / Báo cáo chung</>}
        ten="Báo cáo gửi Công an tỉnh (PV01)"
        phai={quanTri && !data.banGui && <Nut kieu="chinh" icon={<FileUp className="h-4 w-4" />} onClick={() => setMoGan(true)}>Gắn bản đã ký (PDF)</Nut>} />
      {data.banGui && (
        <The className="flex flex-col gap-3 border-[#16A34A]/40 p-4">
          <TieuDeThe phai={<Chip nen="bg-[#DCFCE7]" chu="text-[#166534]">Đã vào sổ đi</Chip>}>Bản đã ký, đóng dấu gửi Công an tỉnh</TieuDeThe>
          <ThongTinVanBan vb={data.banGui} xemTruoc={false} />
        </The>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-vien bg-white px-4 py-3 text-[13px]">
        <span className="font-bold">Căn cứ</span>
        {nguon.map((x) => (
          <span key={x.ten} className="flex items-center gap-1.5">{x.ten}: {x.b?.don_vi.ten ?? '—'}
            {x.b ? <Chip nen={TT_NOP[x.b.trang_thai].nen} chu={TT_NOP[x.b.trang_thai].chu}>{TT_NOP[x.b.trang_thai].nhan}</Chip> : null}
            {x.b?.van_ban && <b className="so">{x.b.van_ban.so_ky_hieu}</b>}
          </span>
        ))}
        <span className="text-mo">{data.donVi.filter(daGui).length}/{data.donVi.length} đơn vị đã nộp</span>
      </div>
      <KhungSoanA4 m={m} setM={(f) => setM((x) => (x ? f(x) : x))} suaDuoc={quanTri && !data.banGui} moi={!data.ky.ban_tong_hop}
        tenFile={`Bao cao PV01 - ${data.ky.ten}`}
        taoLai={async () => setM(await taoMoi(id!))}
        luu={async (x) => { const { error } = await supabase.from('ky_bao_cao').update({ ban_tong_hop: x }).eq('id', data.ky.id); if (error) throw error; }} />
      {quanTri && <GanBanKy mo={moGan} dong={() => setMoGan(false)} kyId={data.ky.id} m={m} xong={() => { setMoGan(false); void taiLai(); }} />}
    </>
  );
}

// Gắn PDF đã ký, đóng dấu của báo cáo gửi Công an tỉnh -> kho văn bản (Báo cáo gửi cấp trên) + sổ công văn đi
function GanBanKy({ mo, dong, kyId, m, xong }: { mo: boolean; dong: () => void; kyId: string; m: MoHinhA4; xong: () => void }) {
  const macDinh = (): MetaVb => ({ ...META_TRONG, loai: 'bao_cao', ky_hieu: m.kh, trich_yeu: m.trichYeu, co_quan_ban_hanh: 'Công an phường Nam Đông Hà', nguoi_ky: m.hoTen, chuc_vu_nguoi_ky: m.chucDanh });
  const [meta, setMeta] = useState<MetaVb>(macDinh);
  const [tep, setTep] = useState<File | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const luu = async () => {
    setLoi(null);
    if (!tep) { setLoi('Chọn tệp PDF đã ký, đóng dấu'); return; }
    const l = kiemTraMeta(meta); if (l) { setLoi(l); return; }
    setDangChay(true);
    try {
      const len = await taiPdfLenDrive(tep, 'van_ban', { thuMuc: 'Báo cáo gửi cấp trên' });
      const r = await supabase.from('van_ban').insert({
        so_van_ban: meta.so_van_ban || null, ky_hieu: meta.ky_hieu || null, so_ky_hieu: soKyHieu(meta.so_van_ban, meta.ky_hieu) || null,
        ngay_ban_hanh: meta.ngay_ban_hanh || null, trich_yeu: meta.trich_yeu.trim(), co_quan_ban_hanh: meta.co_quan_ban_hanh || 'Công an phường Nam Đông Hà',
        loai: meta.loai, thu_muc: 'bao_cao_gui_cap_tren', trang_thai: 'ban_hanh', nguoi_ky: meta.nguoi_ky || null, chuc_vu_nguoi_ky: meta.chuc_vu_nguoi_ky || null,
        drive_file_id: len.drive_file_id, drive_url: len.url, ten_tep: tep.name, noi_dung: meta.noi_dung || null,
      }).select('id').single();
      if (r.error) throw r.error;
      const u = await supabase.from('ky_bao_cao').update({ van_ban_gui_id: r.data.id }).eq('id', kyId);
      if (u.error) throw u.error;
      xong();
    } catch (e) { setLoi(loiDe(e)); } finally { setDangChay(false); }
  };
  return (
    <HopThoai mo={mo} dong={dong} tieuDe="Gắn bản đã ký gửi Công an tỉnh" rong="max-w-[1000px]">
      <div className="flex flex-col gap-3">
        <OVanBanPdf meta={meta} doiMeta={setMeta} tep={tep} chonTep={(f, x) => { setTep(f); setMeta({ ...x, co_quan_ban_hanh: x.co_quan_ban_hanh || 'Công an phường Nam Đông Hà' }); }} hienCoQuan />
        {loi && <HopLoi loi={loi} />}
        <div className="flex justify-end gap-2"><Nut onClick={dong}>Huỷ</Nut><Nut kieu="chinh" dangChay={dangChay} onClick={luu}>Lưu, vào sổ đi</Nut></div>
      </div>
    </HopThoai>
  );
}
