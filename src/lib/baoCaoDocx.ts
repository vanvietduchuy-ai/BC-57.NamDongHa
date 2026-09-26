// Hàm dựng .docx dùng chung — thể thức NĐ 30/2020 theo bộ thông số của Công an phường:
// A4, lề 2-2-3-2 cm, Times New Roman 14, căn đều, lùi đầu dòng 1 cm, giãn dòng 1,2, cách đoạn 6/6 pt.
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';

export const FONT = 'Times New Roman';
export const SZ = { body: 28, coQuan: 24, tieuNgu: 28, soKh: 26, ngayThang: 28, bang: 26, noiNhanLabel: 24, noiNhan: 22, chucDanh: 26, hoTen: 28 };
export const SPACING = { line: 288, lineRule: 'auto' as const, before: 120, after: 120 };

export const run = (text: string, o: Record<string, unknown> = {}) => new TextRun({ text, font: FONT, size: SZ.body, ...o });
export const body = (text: string, o: { run?: Record<string, unknown> } = {}) =>
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: SPACING, indent: { firstLine: 567 }, children: [run(text, o.run)] });
export const dash = (text: string) => body('- ' + text);
export const H = (text: string) => body(text, { run: { bold: true } });
export const Hsub = (text: string) => body(text, { run: { bold: true, italics: true } });
export const center = (children: TextRun[], spacing: Record<string, number> = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 288, lineRule: 'auto', before: 0, after: 0, ...spacing }, children });

export const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
export const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
export const cell = (children: Paragraph[], width: number) =>
  new TableCell({ borders: noBorders, verticalAlign: VerticalAlign.TOP, width: { size: width, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children });
// Bảng hai cột không viền cho phần đầu và phần ký: nhô ra lề trái 1 cm để quốc hiệu 13 pt nằm gọn một dòng
export const bang2Cot = (trai: Paragraph[], phai: Paragraph[]) => new Table({
  width: { size: 10200, type: WidthType.DXA }, columnWidths: [4300, 5900], layout: TableLayoutType.FIXED,
  indent: { size: -567, type: WidthType.DXA },
  borders: { ...noBorders, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: [new TableRow({ children: [cell(trai, 4300), cell(phai, 5900)] })],
});

export function bangVien(headers: string[], rows: string[][], doRong: number[], cotTrai: number[] = [1]) {
  const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const borders = { top: thin, bottom: thin, left: thin, right: thin };
  const mk = (t: string, bold: boolean, w: number, trai = false) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: trai ? AlignmentType.LEFT : AlignmentType.CENTER, children: [run(t, { size: SZ.bang, bold })] })],
  });
  return new Table({
    width: { size: doRong.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: doRong, layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, true, doRong[i])) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, false, doRong[i], cotTrai.includes(i))) })),
    ],
  });
}

export async function taiXuongDocx(doc: Document, tenFile: string) {
  const blob = await Packer.toBlob(doc);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = tenFile;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}


export const TRANG_A4 = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } };
