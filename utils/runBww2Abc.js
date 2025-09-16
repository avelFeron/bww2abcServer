const path = require('path');
const { execFile } = require('child_process');

const BWW2ABC_SCRIPT = path.resolve(__dirname, '..', 'bww2abc.js');

function runBww2Abc(inputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [BWW2ABC_SCRIPT, inputPath],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const details = (stderr || '').trim();
          return reject(new Error(`Conversion échouée pour ${path.basename(inputPath)}.\n${details}`));
        }
        resolve(stdout);
      }
    );
  });
}

module.exports = { runBww2Abc };

