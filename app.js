const $ = s => document.querySelector(s), IMG = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];
const ext = n => (n.split('.').pop() || '').toLowerCase();
const MAP = {
  pdf: ['png', 'jpg', 'txt', 'pptx'],
  docx: ['pdf', 'txt', 'html'],
  pptx: ['pdf', 'txt'],
  xlsx: ['csv', 'json', 'html', 'pdf'],
  xls: ['xlsx', 'csv', 'json', 'html', 'pdf'],
  csv: ['xlsx', 'json', 'html', 'pdf'],
  json: ['csv', 'xlsx', 'txt'],
  txt: ['pdf'],
  md: ['pdf', 'txt'],
  html: ['pdf', 'txt']
};
const ICON = { pdf: '📕', docx: '📘', pptx: '📙', xlsx: '📗', xls: '📗', csv: '📊', json: '🧩', txt: '📝', md: '📝', html: '🌐' };
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const targets = e => IMG.includes(e) ? ['png', 'jpg', 'webp', 'pdf', 'pptx'].filter(x => x !== (e === 'jpeg' ? 'jpg' : e)) : MAP[e];
const size = b => b < 1024 ? b + ' Б' : b < 1048576 ? (b / 1024).toFixed(1) + ' КБ' : (b / 1048576).toFixed(1) + ' МБ';
let F = null, T = null;

/* hero pairs */
const P = [['PPTX', 'PDF'], ['PDF', 'JPG'], ['DOCX', 'PDF'], ['PNG', 'PDF'], ['XLSX', 'CSV'], ['PDF', 'PPTX']];
let k = 0;
setInterval(() => {
  k = (k + 1) % P.length;
  const h = $('#hp');
  h.classList.remove('flip');
  void h.offsetWidth;
  h.innerHTML = '<span>' + P[k][0] + '</span><em>→</em><span>' + P[k][1] + '</span>';
  h.classList.add('flip');
}, 2300);

/* helpers */
const toBlob = (c, m, q) => new Promise(r => c.toBlob(r, m, q || .92));
const mk = (t, m) => new Blob([t], { type: m + ';charset=utf-8' });
const prog = x => { $('#bar').style.width = Math.round(x * 100) + '%'; };

function textCanvases(text, land) {
  const W = land ? 1754 : 1240, H = land ? 1240 : 1754, m = 90, fs = 28, lh = 40, c0 = document.createElement('canvas').getContext('2d');
  c0.font = fs + 'px sans-serif';
  const lines = [];
  String(text).split('\n').forEach(p => {
    if (!p.trim()) { lines.push(''); return; }
    let cur = '';
    p.split(' ').forEach(w => {
      const t = cur ? cur + ' ' + w : w;
      if (c0.measureText(t).width > W - 2 * m && cur) { lines.push(cur); cur = w; }
      else cur = t;
    });
    lines.push(cur);
  });
  const per = Math.floor((H - 2 * m) / lh), out = [];
  for (let i = 0; i < Math.max(lines.length, 1); i += per) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#1a1030'; x.font = fs + 'px sans-serif'; x.textBaseline = 'top';
    lines.slice(i, i + per).forEach((l, j) => x.fillText(l, m, m + j * lh));
    out.push(c);
  }
  return out;
}

function toPdf(cs) {
  const { jsPDF } = window.jspdf; let d;
  cs.forEach((c, i) => {
    const w = c.width, h = c.height, o = w > h ? 'l' : 'p';
    if (i === 0) d = new jsPDF({ unit: 'px', format: [w, h], orientation: o });
    else d.addPage([w, h], o);
    d.addImage(c.toDataURL('image/jpeg', .85), 'JPEG', 0, 0, w, h);
  });
  return d.output('blob');
}

function toPptx(cs) {
  const p = new PptxGenJS();
  cs.forEach(c => {
    const s = p.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addImage({ data: c.toDataURL('image/jpeg', .9), x: 0, y: 0, w: 10, h: 5.625, sizing: { type: 'contain', w: 10, h: 5.625 } });
  });
  return p.write({ outputType: 'blob' });
}

function loadImg(f) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Не удалось открыть картинку'));
    i.src = URL.createObjectURL(f);
  });
}

function imgCanvas(i, white) {
  const c = document.createElement('canvas');
  c.width = i.naturalWidth; c.height = i.naturalHeight;
  const x = c.getContext('2d');
  if (white) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(i, 0, 0);
  return c;
}

async function pdfDoc(f) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
}

async function pdfPages(f) {
  const d = await pdfDoc(f), out = [];
  for (let i = 1; i <= d.numPages; i++) {
    const p = await d.getPage(i), v = p.getViewport({ scale: 2 }), c = document.createElement('canvas');
    c.width = v.width; c.height = v.height;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: x, viewport: v }).promise;
    out.push(c);
    prog(.1 + .8 * i / d.numPages);
  }
  return out;
}

async function pdfText(f) {
  const d = await pdfDoc(f); let t = '';
  for (let i = 1; i <= d.numPages; i++) {
    const c = await (await d.getPage(i)).getTextContent();
    t += c.items.map(s => s.str + (s.hasEOL ? '\n' : ' ')).join('') + '\n\n';
    prog(.1 + .8 * i / d.numPages);
  }
  return t;
}

async function pptxSlides(f) {
  const z = await JSZip.loadAsync(await f.arrayBuffer()), out = [];
  const names = Object.keys(z.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => a.match(/\d+/)[0] - b.match(/\d+/)[0]);
  for (const n of names) {
    const d = new DOMParser().parseFromString(await z.file(n).async('string'), 'text/xml');
    out.push([...d.getElementsByTagName('a:p')].map(p => [...p.getElementsByTagName('a:t')].map(t => t.textContent).join('')).filter(Boolean).join('\n'));
  }
  if (!out.length) throw new Error('В презентации не нашлось слайдов');
  return out;
}

const zip = async (arr) => {
  const z = new JSZip();
  arr.forEach(([n, b]) => z.file(n, b));
  return z.generateAsync({ type: 'blob' });
};

/* main conversion */
async function run(f, t) {
  const e = ext(f.name), base = f.name.replace(/\.[^.]+$/, ''); let b; prog(.1);
  if (IMG.includes(e)) {
    const i = await loadImg(f), c = imgCanvas(i, t !== 'png' && t !== 'webp');
    b = MIME[t] ? await toBlob(c, MIME[t]) : t === 'pdf' ? toPdf([imgCanvas(i, true)]) : await toPptx([imgCanvas(i, true)]);
  } else if (e === 'pdf') {
    if (t === 'txt') b = mk(await pdfText(f), 'text/plain');
    else {
      const cs = await pdfPages(f);
      if (t === 'pptx') b = await toPptx(cs);
      else {
        const bs = await Promise.all(cs.map(c => toBlob(c, MIME[t])));
        if (bs.length === 1) b = bs[0];
        else return { blob: await zip(bs.map((x, i) => [base + '-' + (i + 1) + '.' + t, x])), name: base + '.zip' };
      }
    }
  } else if (e === 'docx') {
    const ab = await f.arrayBuffer();
    if (t === 'html') b = mk('<meta charset="utf-8">' + (await mammoth.convertToHtml({ arrayBuffer: ab })).value, 'text/html');
    else {
      const v = (await mammoth.extractRawText({ arrayBuffer: ab })).value;
      b = t === 'txt' ? mk(v, 'text/plain') : toPdf(textCanvases(v));
    }
  } else if (e === 'pptx') {
    const s = (await pptxSlides(f)).map((x, i) => 'Слайд ' + (i + 1) + '\n\n' + x);
    b = t === 'txt' ? mk(s.join('\n\n\n'), 'text/plain') : toPdf(s.flatMap(x => textCanvases(x, true)));
  } else if (['xlsx', 'xls', 'csv'].includes(e)) {
    const wb = e === 'csv' ? XLSX.read(await f.text(), { type: 'string' }) : XLSX.read(await f.arrayBuffer()), ws = wb.Sheets[wb.SheetNames[0]];
    if (t === 'csv') b = mk('\ufeff' + XLSX.utils.sheet_to_csv(ws), 'text/csv');
    else if (t === 'json') b = mk(JSON.stringify(XLSX.utils.sheet_to_json(ws), null, 2), 'application/json');
    else if (t === 'html') b = mk('<meta charset="utf-8">' + XLSX.utils.sheet_to_html(ws), 'text/html');
    else if (t === 'xlsx') b = new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' });
    else b = toPdf(textCanvases(XLSX.utils.sheet_to_csv(ws, { FS: '   |   ' }), true));
  } else if (e === 'json') {
    const d = JSON.parse(await f.text());
    if (t === 'txt') b = mk(JSON.stringify(d, null, 2), 'text/plain');
    else {
      const ws = XLSX.utils.json_to_sheet(Array.isArray(d) ? d : [d]);
      if (t === 'csv') b = mk('\ufeff' + XLSX.utils.sheet_to_csv(ws), 'text/csv');
      else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Лист1');
        b = new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' });
      }
    }
  } else {
    let v = await f.text();
    if (e === 'html') v = new DOMParser().parseFromString(v, 'text/html').body.textContent.replace(/\n\s*\n+/g, '\n\n').trim();
    b = t === 'pdf' ? toPdf(textCanvases(v)) : mk(v, 'text/plain');
  }
  prog(1);
  return { blob: b, name: base + '.' + t };
}

/* UI */
function note() {
  const e = ext(F.name);
  $('#note').textContent = e === 'pptx' ? 'Из презентации переносится текст слайдов — картинки и оформление пока нет.' : T === 'pptx' ? 'Каждая страница станет слайдом-картинкой.' : e === 'pdf' && (T === 'png' || T === 'jpg') ? 'Страниц несколько — получишь ZIP-архив.' : '';
}

function pick(f) {
  if (!f) return;
  const e = ext(f.name), o = targets(e); F = f; T = null;
  $('#drop').hidden = true; $('#res').hidden = true; $('#panel').hidden = false; $('#panel').classList.remove('busy'); prog(0);
  $('#ic').textContent = IMG.includes(e) ? '🖼️' : ICON[e] || '📄';
  $('#fn').textContent = f.name; $('#fs').textContent = size(f.size);
  $('#go').disabled = true; $('#note').textContent = '';
  const ch = $('#chips'); ch.innerHTML = '';
  if (!o) {
    $('#note').innerHTML = '<span class="err">Формат .' + e.replace(/[^a-z0-9]/g, '') + ' пока не поддерживается. Попробуй PDF, DOCX, PPTX, XLSX, CSV, JSON, TXT или картинку.</span>';
    return;
  }
  o.forEach(t => {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = t.toUpperCase();
    b.onclick = () => {
      T = t;
      ch.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      $('#go').disabled = false;
      note();
    };
    ch.append(b);
  });
}

function reset() {
  F = null; T = null; $('#inp').value = '';
  $('#panel').hidden = true; $('#res').hidden = true; $('#drop').hidden = false;
}

function boom() {
  const w = $('#conf'), c = ['#ff3d8b', '#ff9d2e', '#b6f23a', '#2ee6d6', '#7b5cff'];
  w.innerHTML = '';
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('s');
    s.style.cssText = '--x:' + ((Math.random() - .5) * 640) + 'px;--y:' + (-220 - Math.random() * 320) + 'px;--r:' + (Math.random() * 720) + 'deg;background:' + c[i % 5] + ';animation-delay:' + (Math.random() * .2) + 's';
    w.append(s);
  }
  setTimeout(() => w.innerHTML = '', 2200);
}

$('#go').onclick = async () => {
  $('#panel').classList.add('busy'); prog(.05);
  try {
    const r = await run(F, T), u = URL.createObjectURL(r.blob), res = $('#res');
    res.innerHTML = '<div class="big">🎉</div><h2>Готово!</h2><p></p><a class="dl" download>Скачать</a><button class="again">Конвертировать другой файл</button>';
    res.querySelector('p').textContent = r.name + ' · ' + size(r.blob.size);
    const a = res.querySelector('a'); a.href = u; a.download = r.name;
    res.querySelector('.again').onclick = reset;
    $('#panel').hidden = true; res.hidden = false; boom();
  } catch (err) {
    const res = $('#res');
    res.innerHTML = '<div class="big">😵</div><h2>Не получилось</h2><p class="err"></p><button class="again">Попробовать снова</button>';
    res.querySelector('p').textContent = (err && err.message) || 'Файл повреждён или защищён паролем';
    res.querySelector('.again').onclick = reset;
    $('#panel').hidden = true; res.hidden = false;
  }
};

const drop = $('#drop'), inp = $('#inp');
drop.onclick = () => inp.click();
drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
inp.onchange = () => pick(inp.files[0]);
$('#x').onclick = reset;
['dragenter', 'dragover'].forEach(v => drop.addEventListener(v, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(v => drop.addEventListener(v, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => pick(e.dataTransfer.files[0]));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); if (!drop.hidden) return; });

/* Theme switcher */
const themeBtn = $('#themeBtn');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
};

/* PWA Install Prompt & Service Worker */
let deferredPrompt = null;
const installBtn = $('#installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.onclick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
