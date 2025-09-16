#!/usr/bin/env node
/* server.js */
const express = require('express');
const multer  = require('multer');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const archiver = require('archiver');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB / fichier

const PORT = process.env.PORT || 3000;
const BWW2ABC_SCRIPT = path.resolve(__dirname, 'bww2abc.js'); // ton script CLI tel quel

// Petite page statique (drag & drop) :
app.get('/', (req, res) => {
  res.type('html').send(INDEX_HTML);
});

// Endpoint de conversion
app.post('/convert', upload.array('files', 50), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Aucun fichier reçu.' });

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'bww2abc-'));
  try {
    // Écrire chaque fichier en tmp, lancer le script, récupérer stdout .abc
    const tasks = req.files.map(async (file) => {
      const origName = path.parse(file.originalname).name;
      const inPath   = path.join(tmpDir, `${origName}.bww`);
      await fsp.writeFile(inPath, file.buffer, 'utf8');

      const abc = await runBww2Abc(inPath);
      return { name: `${origName}.abc`, content: abc };
    });

    const results = await Promise.all(tasks);

    if (results.length === 1) {
      // Un seul fichier -> renvoyer le .abc directement
      const { name, content } = results[0];
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      return res.send(content);
    }

    // Plusieurs fichiers -> zip
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="converted_abc.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    for (const { name, content } of results) {
      archive.append(content, { name });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    // Nettoyage
    try { await fsp.rm(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

app.listen(PORT, () => {
  console.log(`✅ bww2abc server prêt sur http://localhost:${PORT}`);
});

// --- helpers ---
function runBww2Abc(inputPath) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [BWW2ABC_SCRIPT, inputPath], { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const details = (stderr || '').trim();
        return reject(new Error(`Conversion échouée pour ${path.basename(inputPath)}.\n${details}`));
      }
      resolve(stdout);
    });
  });
}

// --- page unique (frontend minimal) ---
const INDEX_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>bww2abc — Convertisseur web</title>
<style>
  :root { --bg:#0b1020; --card:#121933; --text:#eef1ff; --muted:#9aa3c7; --accent:#5aa1ff; }
  html,body{height:100%;}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;background:linear-gradient(135deg,#0b1020,#141a39);}
  .wrap{max-width:860px;margin:0 auto;padding:32px}
  .card{background:var(--card);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35);padding:28px;color:var(--text)}
  h1{margin:0 0 8px;font-size:28px}
  p{margin:0 0 16px;color:var(--muted)}
  .drop{margin-top:16px;border:2px dashed #2c3a70;border-radius:16px;min-height:180px;display:flex;align-items:center;justify-content:center;gap:12px;flex-direction:column;transition:.2s background,.2s border-color}
  .drop.drag{background:#0d1440;border-color:var(--accent)}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:var(--accent);color:#05122b;border:none;cursor:pointer;font-weight:600}
  .btn:disabled{opacity:.6;cursor:not-allowed}
  input[type=file]{display:none}
  .list{margin-top:18px;display:grid;gap:8px}
  .item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0e1533;border-radius:10px}
  .name{color:var(--text)}
  .status{color:var(--muted);font-size:13px}
  .footer{margin-top:22px;display:flex;gap:10px;flex-wrap:wrap}
  .hint{font-size:12px;color:#7e89b8}
  .links a{color:var(--accent)}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Convertir des fichiers <code>.bww</code> en <code>.abc</code></h1>
      <p>Déposez un ou plusieurs fichiers .bww ci-dessous, ou cliquez pour choisir.</p>

      <label class="drop" id="drop">
        <strong>Glissez-déposez ici</strong>
        <span class="hint">ou</span>
        <button class="btn" id="pick">Choisir des fichiers</button>
        <input id="file" type="file" accept=".bww" multiple>
      </label>

      <div class="list" id="list"></div>

      <div class="footer">
        <button class="btn" id="convert" disabled>Convertir</button>
        <span class="hint">Les fichiers convertis seront téléchargés automatiquement (ZIP si plusieurs).</span>
      </div>

      <p class="hint links" style="margin-top:10px">
        Référence bww2abc originale : <a href="http://moinejf.free.fr/" target="_blank" rel="noreferrer">moinejf.free.fr</a>
      </p>
    </div>
  </div>

<script>
const fileInput = document.getElementById('file');
const pickBtn = document.getElementById('pick');
const drop = document.getElementById('drop');
const list = document.getElementById('list');
const convertBtn = document.getElementById('convert');

let files = [];

pickBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => addFiles(e.target.files));

['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, (e)=>{e.preventDefault();drop.classList.add('drag');}));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, (e)=>{e.preventDefault();drop.classList.remove('drag');}));
drop.addEventListener('drop', (e) => {
  addFiles(e.dataTransfer.files);
});

function addFiles(fileList) {
  const incoming = Array.from(fileList).filter(f => /\.bww$/i.test(f.name));
  files.push(...incoming);
  renderList();
}

function renderList() {
  list.innerHTML = '';
  files.forEach((f,i) => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = \`
      <span class="name">\${f.name}</span>
      <span class="status" id="st-\${i}">en attente</span>
    \`;
    list.appendChild(row);
  });
  convertBtn.disabled = files.length === 0;
}

convertBtn.addEventListener('click', async () => {
  if (!files.length) return;
  convertBtn.disabled = true;
  try {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f, f.name));

    // MAJ statut UI
    files.forEach((_,i)=>document.getElementById('st-'+i).textContent='envoi…');

    const resp = await fetch('/convert', { method:'POST', body: fd });
    if (!resp.ok) {
      const err = await safeJson(resp);
      alert('Erreur: ' + (err?.error || resp.statusText));
      return;
    }

    const blob = await resp.blob();
    // s'il y a 1 fichier côté serveur, il renvoie text/plain; sinon application/zip
    const contentType = resp.headers.get('Content-Type') || '';
    const many = contentType.includes('application/zip');

    const dlName = many ? 'converted_abc.zip'
                        : (files[0].name.replace(/\\.bww$/i, '') + '.abc');

    // MAJ statut UI
    files.forEach((_,i)=>document.getElementById('st-'+i).textContent='converti ✔');

    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: dlName });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('Erreur: ' + e.message);
  } finally {
    convertBtn.disabled = false;
  }
});

async function safeJson(resp) {
  try { return await resp.json(); } catch { return null; }
}
</script>
</body>
</html>`;
