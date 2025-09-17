const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

const { runBww2Abc } = require('../utils/runBww2Abc');
const { logConversion } = require('../utils/logger');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB / fichier
});

router.post('/', upload.array('files', 50), async (req, res) => {
  if (!req.files || !req.files.length) {
    logConversion({ req, filenames: [], totalBytes: 0, status: 400, error: 'No files received' });
    return res.status(400).json({ error: 'Aucun fichier reçu.' });
  }

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'bww2abc-'));
  try {
    let totalBytes = 0;
    const filenames = [];

    const tasks = req.files.map(async (file) => {
      const origName = path.parse(file.originalname).name;
      const inPath = path.join(tmpDir, `${origName}.bww`);
      await fsp.writeFile(inPath, file.buffer, 'utf8');

      filenames.push(file.originalname);
      totalBytes += (file.buffer ? file.buffer.length : 0);

      const abc = await runBww2Abc(inPath);
      return { name: `${origName}.abc`, content: abc };
    });

    const results = await Promise.all(tasks);

    if (results.length === 1) {
      const { name, content } = results[0];
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      logConversion({ req, filenames, totalBytes, status: 200 });
      return res.send(content);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="converted_abc.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    for (const { name, content } of results) {
      archive.append(content, { name });
    }

    await archive.finalize();
    logConversion({ req, filenames, totalBytes, status: 200 });
  } catch (err) {
    console.error(err);
    const filenames = (req.files || []).map(f => f.originalname);
    const totalBytes = (req.files || []).reduce((a, f) => a + (f.buffer ? f.buffer.length : 0), 0);
    logConversion({ req, filenames, totalBytes, status: 500, error: err });
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    try { await fsp.rm(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

module.exports = router;

