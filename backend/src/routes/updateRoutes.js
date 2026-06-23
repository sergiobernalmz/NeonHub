const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPDATES_DIR = path.join(__dirname, '../../public/updates');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
    cb(null, UPDATES_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }
});

const authDeploy = (req, res, next) => {
  const key = process.env.DEPLOY_API_KEY;
  if (!key || req.headers['x-deploy-key'] !== key) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.post('/upload', authDeploy, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  console.log(`[Deploy] Uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
  res.json({ success: true, file: req.file.originalname, size: req.file.size });
});

// Almacén temporal de chunks en memoria
const chunks = new Map();

const uploadChunk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/upload-chunk', authDeploy, uploadChunk.single('chunk'), (req, res) => {
  const { filename, chunkIndex, totalChunks } = req.body;

  if (!filename || chunkIndex === undefined || !totalChunks) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const idx = parseInt(chunkIndex);
  const total = parseInt(totalChunks);

  if (!chunks.has(filename)) {
    chunks.set(filename, new Array(total));
  }
  chunks.get(filename)[idx] = req.file.buffer;

  console.log(`[Deploy] Chunk ${idx + 1}/${total} de ${filename}`);

  if (idx === total - 1) {
    const fileChunks = chunks.get(filename);

    if (fileChunks.some(c => !c)) {
      return res.status(400).json({ error: 'Faltan chunks anteriores' });
    }

    const fullFile = Buffer.concat(fileChunks);
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPDATES_DIR, filename), fullFile);
    chunks.delete(filename);

    if (filename.endsWith('.exe')) {
      const base = filename.replace(/\.exe$/, '');
      const old = fs.readdirSync(UPDATES_DIR).filter(f =>
        (f.endsWith('.exe') || f.endsWith('.blockmap')) &&
        f !== filename && f !== `${base}.exe.blockmap`
      );
      old.forEach(f => {
        try { fs.unlinkSync(path.join(UPDATES_DIR, f)); } catch (e) { console.error('[Deploy] Error borrando antiguo:', e.message); }
      });
      if (old.length) console.log(`[Deploy] 🗑️  Eliminados ${old.length} archivos anteriores`);
    }

    console.log(`[Deploy] ✅ Archivo completo: ${filename} (${fullFile.length} bytes)`);
    return res.json({ success: true, file: filename, size: fullFile.length, complete: true });
  }

  res.json({ success: true, chunkIndex: idx, complete: false });
});

module.exports = router;
