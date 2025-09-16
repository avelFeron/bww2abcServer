const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

const { runBww2Abc } = require('../utils/runBww2Abc');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB / fichier
});

router.post('/', upload.array('files', 50), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Aucun fichier reçu.' });

  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'bww2abc-'));
  try {
    const tasks = req.files.map(async (file) => {
      const origName = path.parse(file.originalname).name;
      const inPath = path.join(tmpDir, `${origName}.bww`);
      await fsp.writeFile(inPath, file.buffer, 'utf8');

      const abc = await runBww2Abc(inPath);
      return { name: `${origName}.abc`, content: abc };
    });

    const results = await Promise.all(tasks);

    if (results.length === 1) {
      const { name, content } = results[0];
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      return res.send(content);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="converted_abc.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);

    for (const { name, content } of results) {
      archive.append(content, { name });
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  } finally {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
});

module.exports = router;

