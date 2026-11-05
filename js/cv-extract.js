/* =============================================================================
   CV file extraction, entirely in the browser (no upload, no server, no API key).

   - PDF  → vendored pdf.js (vendor/pdfjs, loaded on demand). Handles WPS / Word /
            Google Docs / LibreOffice exports, including CID (Identity-H) fonts.
            Pages with images but no text are reported as scanned (no OCR here).
   - DOCX → the .docx zip is read with the browser's DecompressionStream and the
            text is taken from word/document.xml (+ headers), keeping paragraphs,
            list bullets, tabs and table cells.
   - DOC  → the legacy binary format can't be parsed reliably in the browser, so
            the user gets conversion steps instead of a fake "success".
   - TXT / MD → read as UTF-8 text.

   Every result says what was read and what may be missing. Nothing here ever
   returns ok:true for an empty or unreadable file.
   ========================================================================== */
"use strict";

const CVX_MAX_BYTES = 10 * 1024 * 1024;
const CVX_MIN_WORDS = 40;
const CVX_FORMATS = { pdf:"PDF", docx:"Word (.docx)", doc:"Word 97–2003 (.doc)", txt:"Plain text" };
const CVX_CONVERT = "Open the file in Word, WPS Office, LibreOffice or Google Docs and save it as .docx, or export it as PDF, then upload that file. You can also copy all the text and use Paste text.";

function cvxError(code, message, extra){ return Object.assign({ ok:false, code, message }, extra||{}); }
function cvxWords(t){ return (String(t||"").match(/[\p{L}\p{N}][\p{L}\p{N}’'.+#&-]*/gu)||[]).length; }

/* Detect the real format from the first bytes; the extension alone is not trusted. */
function cvxSniff(bytes, name){
  const ext=(String(name||"").toLowerCase().match(/\.([a-z0-9]+)$/)||[])[1]||"";
  const b=bytes.subarray(0, 8), str=String.fromCharCode.apply(null, Array.from(b));
  if(str.startsWith("%PDF-") || (ext==="pdf" && /%PDF-/.test(String.fromCharCode.apply(null, Array.from(bytes.subarray(0, 1024)))))) return "pdf";
  if(b[0]===0x50 && b[1]===0x4b && (b[2]===3 || b[2]===5)) return ext==="docx"||ext==="docm"||ext==="dotx"||!ext ? "docx" : ext==="odt" ? "odt" : ext==="pages" ? "pages" : "zip";
  if(b[0]===0xd0 && b[1]===0xcf && b[2]===0x11 && b[3]===0xe0) return "doc";
  if(str.startsWith("{\\rtf")) return "rtf";
  if(["txt","md","text","markdown"].includes(ext)) return "txt";
  if(ext==="doc") return "doc";
  return ext ? "unsupported:"+ext : "unknown";
}

/* Text quality: share of characters that are readable letters, digits, punctuation or spaces. */
function cvxQuality(text){
  const t=String(text||""), chars=t.replace(/\s/g,"");
  if(!chars.length) return { bad:0, ratio:1, chars:0 };
  const bad=(chars.match(/[�-\u0000-\u0008\u000E-\u001F]/g)||[]).length;
  return { bad, ratio:1-bad/chars.length, chars:chars.length };
}
function cvxTidy(text){
  return String(text||"").replace(/\r\n?/g,"\n").replace(/ /g," ").replace(/[​­]/g,"")
    .replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").replace(/[]/g,"•").trim();
}

/* ---------- PDF -------------------------------------------------------------- */
let cvxPdfLib=null;
async function cvxLoadPdf(){
  if(cvxPdfLib) return cvxPdfLib;
  const base=new URL("vendor/pdfjs/", document.baseURI).href;
  const lib=await import(base+"pdf.min.mjs");
  lib.GlobalWorkerOptions.workerSrc=base+"pdf.worker.min.mjs";
  cvxPdfLib={ lib, base }; return cvxPdfLib;
}
/* Rebuild reading-order lines from pdf.js text items: content order, new line on a y change. */
function cvxPdfLines(items){
  const out=[]; let line="", lastY=null, lastXEnd=null, lastH=10, jumpsUp=0, broke=false;
  items.forEach(it=>{
    if(typeof it.str!=="string") return;
    const x=it.transform[4], y=it.transform[5], h=Math.abs(it.transform[3])||it.height||lastH;
    if(lastY!==null && Math.abs(y-lastY)>Math.max(2, Math.min(h,lastH)*0.45)){
      if(y-lastY>lastH*3) jumpsUp++;
      if(!broke){ out.push(line); line=""; } lastXEnd=null;
    }
    if(it.str) broke=false;
    if(it.str){
      if(line && lastXEnd!==null && x-lastXEnd>h*0.18 && !/\s$/.test(line) && !/^\s/.test(it.str)) line+=(x-lastXEnd>h*2.5?"  ":" ");
      line+=it.str; lastXEnd=x+(it.width||0); lastY=y; lastH=h;
    }
    if(it.hasEOL && !broke){ out.push(line); line=""; lastXEnd=null; broke=true; }
  });
  if(line) out.push(line);
  // Re-join lines that a PDF wrapped mid-sentence: the next line starts in lower case and the previous one didn't end a sentence.
  const lines=[];
  out.map(l=>l.replace(/\s{3,}/g,"  ").trimEnd()).filter(l=>l.trim()).forEach(l=>{
    const prev=lines[lines.length-1];
    if(prev && /^\s*[a-z(]/.test(l) && !/[.:;!?]$/.test(prev) && !/^\s*[-•*·▪●◦]\s*$/.test(prev)) lines[lines.length-1]=prev+" "+l.trim();
    else lines.push(l);
  });
  return { lines, jumpsUp };
}
async function cvxPdf(bytes, onStep){
  let P;
  try{ P=await cvxLoadPdf(); }catch(e){ return cvxError("pdf_reader", "The PDF reader couldn't be loaded. Check your connection and retry, or use Paste text."); }
  const { lib, base }=P;
  let doc;
  try{
    doc=await lib.getDocument({ data:bytes, isEvalSupported:false, disableFontFace:true, useSystemFonts:false, cMapUrl:base+"cmaps/", cMapPacked:true, stopAtErrors:false }).promise;
  }catch(e){
    if(e && e.name==="PasswordException") return cvxError("pdf_password", "This PDF is password-protected. Save an unprotected copy (or export it again without a password) and upload that, or use Paste text.");
    return cvxError("pdf_corrupt", "This PDF couldn't be opened. It may be damaged or not a real PDF. Export it again from your editor, or use Paste text.");
  }
  const pages=[], OPS=lib.OPS, imgOps=new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat].filter(x=>x!=null));
  let scanned=0, emptyPages=0, columns=0;
  const n=Math.min(doc.numPages, 30);
  for(let i=1;i<=n;i++){
    onStep && onStep(`Reading page ${i} of ${n}…`);
    const page=await doc.getPage(i);
    const tc=await page.getTextContent({ disableNormalization:false });
    const { lines, jumpsUp }=cvxPdfLines(tc.items);
    const text=lines.join("\n"), w=cvxWords(text);
    if(jumpsUp>=2) columns++;
    if(w<8){
      let hasImg=false;
      try{ const ol=await page.getOperatorList(); hasImg=ol.fnArray.some(f=>imgOps.has(f)); }catch(e){}
      if(hasImg) scanned++; else emptyPages++;
    }
    pages.push(text); page.cleanup();
  }
  const truncated=doc.numPages>n; await doc.destroy();
  const text=cvxTidy(pages.join("\n\n")), q=cvxQuality(text), words=cvxWords(text), limitations=[];
  if(scanned && words<CVX_MIN_WORDS) return cvxError("pdf_scanned", `This PDF looks scanned or image-only (${scanned} of ${n} page${n>1?"s":""} contain${scanned===1?"s":""} an image but no selectable text). This browser-based version can't read text from images (no OCR). Export the original document as a text PDF or .docx, or copy the text and use Paste text.`, { pages:n, scanned });
  if(q.chars && q.ratio<0.6) return cvxError("pdf_garbled", "The text in this PDF couldn't be decoded (its fonts have no character mapping). Export it again from the original editor (for WPS: File → Export to PDF, or save as .docx), or use Paste text.", { pages:n });
  if(words<CVX_MIN_WORDS) return cvxError("too_little_text", `Only ${words} readable word${words===1?"":"s"} were found in this PDF, which isn't enough to analyse a resume. Check that it's the right file, or use Paste text.`, { pages:n, words });
  if(scanned) limitations.push(`${scanned} page${scanned>1?"s":""} look${scanned===1?"s":""} scanned (image only) and could not be read. Add that content in the review box below.`);
  if(q.ratio<0.97) limitations.push(`${q.bad} character${q.bad>1?"s":""} couldn't be decoded and may show as symbols. Correct them below.`);
  if(columns) limitations.push("Parts of this PDF use columns or text boxes. Check that sections are in the right order.");
  if(truncated) limitations.push(`Only the first ${n} pages were read.`);
  limitations.push("Only the text is read. Fonts, colours, columns and other visual formatting are not assessed.");
  return { ok:true, format:"pdf", text, pages:n, words, scanned, status:scanned||q.ratio<0.97?"partial":"complete", limitations };
}

/* ---------- DOCX (zip + WordprocessingML) ------------------------------------ */
async function cvxInflate(data){
  if(typeof DecompressionStream==="undefined") throw new Error("no_inflate");
  const ds=new DecompressionStream("deflate-raw"), w=ds.writable.getWriter(); w.write(data); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
async function cvxUnzip(bytes, want){
  const dv=new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0, bytes.length-65557);i--) if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  if(eocd<0) throw new Error("zip");
  const count=dv.getUint16(eocd+10,true); let p=dv.getUint32(eocd+16,true); const out={};
  for(let k=0;k<count && p+46<=bytes.length;k++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), off=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(bytes.subarray(p+46, p+46+nl)); p+=46+nl+xl+cl;
    if(!want(name)) continue;
    const start=off+30+dv.getUint16(off+26,true)+dv.getUint16(off+28,true), raw=bytes.subarray(start, start+csize);
    out[name]= method===0 ? raw : method===8 ? await cvxInflate(raw) : null;
  }
  return out;
}
function cvxDocxText(xml){
  const doc=new DOMParser().parseFromString(xml, "application/xml");
  if(doc.getElementsByTagName("parsererror").length) throw new Error("xml");
  const lines=[];
  const runText=node=>{ let s="";
    node.childNodes.forEach(c=>{ const n=c.localName;
      if(!n) return;
      if(n==="t") s+=c.textContent; else if(n==="tab") s+="\t"; else if(n==="br"||n==="cr") s+="\n"; else if(n==="noBreakHyphen") s+="-";
      else if(n==="Fallback"||n==="instrText"||n==="delText"||n==="rPr"||n==="pPr") return;
      else if(n==="txbxContent") { walk(c); }
      else s+=runText(c); });
    return s; };
  const para=p=>{ const pPr=Array.from(p.childNodes).find(c=>c.localName==="pPr");
    const list=pPr && Array.from(pPr.getElementsByTagName("*")).some(c=>c.localName==="numPr");
    const t=runText(p).replace(/[ \t]+$/,""); if(t.trim()) lines.push((list && !/^\s*[-•*·▪●◦]/.test(t)?"• ":"")+t); else lines.push(""); };
  function walk(node){
    node.childNodes.forEach(c=>{ const n=c.localName; if(!n) return;
      if(n==="p") para(c);
      else if(n==="tbl") Array.from(c.childNodes).filter(r=>r.localName==="tr").forEach(tr=>{
        const cells=Array.from(tr.childNodes).filter(x=>x.localName==="tc").map(tc=>{ const keep=lines.length; walk(tc); const got=lines.splice(keep).filter(x=>x.trim()); return got; });
        if(cells.every(x=>x.length<=1)) { const row=cells.map(x=>x.join(" ").trim()).filter(Boolean).join(" | "); if(row) lines.push(row); }
        else cells.forEach(x=>x.forEach(l=>lines.push(l)));
      });
      else if(n==="Fallback") return;
      else walk(c); });
  }
  const body=Array.from(doc.getElementsByTagName("*")).find(e=>e.localName==="body")||doc.documentElement;
  walk(body);
  return lines.join("\n");
}
async function cvxDocx(bytes){
  let files;
  try{ files=await cvxUnzip(bytes, n=>n==="word/document.xml"||/^word\/header\d*\.xml$/.test(n)); }
  catch(e){ return e.message==="no_inflate" ? cvxError("docx_browser", "This browser can't open .docx files. Update your browser, export the resume as PDF, or use Paste text.")
    : cvxError("docx_corrupt", "This .docx file couldn't be opened. It may be damaged. Save it again from your editor, or use Paste text."); }
  if(!files["word/document.xml"]) return cvxError("docx_corrupt", "This file isn't a valid Word document (no document text found). Save it again as .docx, or use Paste text.");
  let text="";
  try{
    const dec=new TextDecoder("utf-8");
    const heads=Object.keys(files).filter(n=>n!=="word/document.xml" && files[n]).sort().map(n=>cvxDocxText(dec.decode(files[n]))).filter(t=>t.trim());
    text=cvxTidy(Array.from(new Set(heads)).concat([cvxDocxText(dec.decode(files["word/document.xml"]))]).join("\n"));
  }catch(e){ return cvxError("docx_corrupt", "The text inside this Word document couldn't be read. Save it again as .docx or export it as PDF."); }
  const words=cvxWords(text);
  if(words<CVX_MIN_WORDS) return cvxError("too_little_text", `Only ${words} readable word${words===1?"":"s"} were found in this document. If your resume is an image inside Word, it can't be read here: use the original text, or Paste text.`, { words });
  return { ok:true, format:"docx", text, pages:null, words, status:"complete",
    limitations:["Only the text is read. Fonts, colours, columns, images and other visual formatting are not assessed.","Text in headers is included; footers, comments and tracked deletions are not."] };
}

/* ---------- Entry point -------------------------------------------------------- */
async function cvxExtract(file, onStep){
  if(!file) return cvxError("no_file", "No file was selected.");
  if(file.size===0) return cvxError("empty", "This file is empty (0 bytes). Choose your resume file again.");
  if(file.size>CVX_MAX_BYTES) return cvxError("too_large", `This file is ${(file.size/1048576).toFixed(1)} MB. The limit is 10 MB. Remove large images or export a text-only PDF, then try again.`);
  onStep && onStep("Reading file…");
  let bytes;
  try{ bytes=new Uint8Array(await file.arrayBuffer()); }catch(e){ return cvxError("read", "The file couldn't be read by your browser. Try again, or use Paste text."); }
  const kind=cvxSniff(bytes, file.name);
  if(kind==="doc") return cvxError("doc_legacy", "Legacy Word (.doc) files can't be read reliably in the browser. "+CVX_CONVERT);
  if(kind==="rtf"||kind==="odt"||kind==="pages"||kind==="zip"||kind.startsWith("unsupported")||kind==="unknown")
    return cvxError("unsupported", "This file type isn't supported. Upload a PDF or .docx file (10 MB max). "+CVX_CONVERT);
  onStep && onStep("Extracting text…");
  if(kind==="pdf") return cvxPdf(bytes, onStep);
  if(kind==="docx") return cvxDocx(bytes);
  const text=cvxTidy(new TextDecoder("utf-8").decode(bytes)), words=cvxWords(text), q=cvxQuality(text);
  if(q.chars && q.ratio<0.8) return cvxError("unreadable", "This text file contains unreadable characters. Save it as UTF-8 text, or use Paste text.");
  if(words<CVX_MIN_WORDS) return cvxError("too_little_text", `Only ${words} readable word${words===1?"":"s"} were found in this file, which isn't enough to analyse a resume.`, { words });
  return { ok:true, format:"txt", text, pages:null, words, status:"complete", limitations:["Plain text has no formatting, so only wording and structure are assessed."] };
}
