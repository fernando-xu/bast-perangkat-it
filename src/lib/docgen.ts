import { readFile } from "node:fs/promises";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { FormData, FormDef, ImageValue, TemplateHelpers } from "@/forms/types";
import { formatTanggal } from "./schema";

const TEMPLATES = path.join(process.cwd(), "templates");
const EMU_PER_CM = 360000;

type PendingImage = { rId: string; file: string; data: Buffer };

function makeHelpers(images: PendingImage[]): TemplateHelpers {
  let docPr = 9000;
  const num = (v: unknown) => {
    const n = Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    tanggal: (iso) => formatTanggal(String(iso ?? "")),
    cb: (c) => (c ? "☒" : "☐"),
    num,
    rupiah: (v) => {
      if (v === "" || v === null || v === undefined) return "";
      return `Rp ${num(v).toLocaleString("id-ID")}`;
    },
    images: (imgs, maxWcm = 8, maxHcm = 6) => {
      const list = (Array.isArray(imgs) ? imgs : []) as ImageValue[];
      if (!list.length) return "<w:p/>";
      return list
        .map((img) => {
          const m = /^data:image\/(jpeg|png);base64,(.*)$/.exec(img.src);
          if (!m) return "";
          const ext = m[1] === "png" ? "png" : "jpeg";
          const id = images.length + 1;
          const rId = `rIdFormImg${id}`;
          images.push({ rId, file: `media/form_img${id}.${ext}`, data: Buffer.from(m[2], "base64") });
          const scale = Math.min((maxWcm * EMU_PER_CM) / img.w, (maxHcm * EMU_PER_CM) / img.h);
          const cx = Math.round(img.w * scale);
          const cy = Math.round(img.h * scale);
          const pid = ++docPr;
          return `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${pid}" name="Gambar ${pid}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${pid}" name="Gambar ${pid}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
        })
        .join("");
    },
  };
}

function attachImages(zip: PizZip, images: PendingImage[]) {
  if (!images.length) return;
  const relsPath = "word/_rels/document.xml.rels";
  let rels = zip.file(relsPath)!.asText();
  const relXml = images
    .map(
      (i) =>
        `<Relationship Id="${i.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${i.file}"/>`,
    )
    .join("");
  rels = rels.replace("</Relationships>", `${relXml}</Relationships>`);
  zip.file(relsPath, rels);
  for (const i of images) zip.file(`word/${i.file}`, i.data);
  let ct = zip.file("[Content_Types].xml")!.asText();
  for (const [ext, mime] of [
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
  ])
    if (!new RegExp(`Extension="${ext}"`, "i").test(ct))
      ct = ct.replace(/(<Types[^>]*>)/,`$1<Default Extension="${ext}" ContentType="${mime}"/>`);
  zip.file("[Content_Types].xml", ct);
}

/** Fill the form's DOCX template with docxtemplater. */
export async function renderFormDocx(def: FormDef, data: FormData): Promise<Buffer> {
  const zip = new PizZip(await readFile(path.join(TEMPLATES, def.template(data))));
  const images: PendingImage[] = [];
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(def.toTemplate(data, makeHelpers(images)));
  const out = doc.getZip();
  attachImages(out, images);
  return out.generate({ type: "nodebuffer", compression: "DEFLATE" });
}
