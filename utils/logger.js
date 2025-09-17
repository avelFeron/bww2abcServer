const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', 'logs');

function ensureDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

function logLine(obj) {
  try {
    ensureDir();
    const d = new Date();
    const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const file = path.join(LOG_DIR, `access-${day}.log`);
    const line = JSON.stringify(obj) + '\n';
    fs.appendFile(file, line, { encoding: 'utf8' }, () => {});
  } catch {}
}

function parseForwardedFor(hdr) {
  if (!hdr || typeof hdr !== 'string') return [];
  return hdr.split(',').map(s => s.trim()).filter(Boolean);
}

function clientMeta(req) {
  const fwd = parseForwardedFor(req.headers['x-forwarded-for']);
  const ip = (fwd[0]) || req.ip || (req.socket && req.socket.remoteAddress) || undefined;
  return {
    ip,
    ips: fwd,
    ua: req.headers['user-agent'] || undefined,
    referer: req.headers['referer'] || req.headers['referrer'] || undefined,
    host: req.headers['host'] || undefined,
  };
}

function logConversion({ req, filenames, totalBytes, status, error }) {
  const meta = clientMeta(req);
  logLine({
    ts: new Date().toISOString(),
    type: 'conversion',
    method: req.method,
    path: req.originalUrl || req.url,
    ip: meta.ip,
    ips: meta.ips,
    ua: meta.ua,
    referer: meta.referer,
    host: meta.host,
    filenames,
    count: Array.isArray(filenames) ? filenames.length : undefined,
    bytesIn: typeof totalBytes === 'number' ? totalBytes : undefined,
    status,
    error: error ? String(error.message || error) : undefined,
  });
}

module.exports = { logConversion, clientMeta };

