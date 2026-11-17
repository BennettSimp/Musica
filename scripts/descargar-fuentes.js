// Descarga las 10 fuentes woff2 en tiempo de build y verifica su hash.
// Por qué existe: el conector de GitHub no puede subir archivos binarios,
// así que las fuentes NO se guardan en el repo; Vercel las descarga al
// compilar y las sirve desde el mismo origen (/fonts/...). Si Google Fonts
// cambiara un archivo, el build falla en vez de servir otra fuente.
// Uso: `node scripts/descargar-fuentes.js` (lo llama `npm run build`).
// Sin dependencias: solo módulos de Node.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const DIR = path.join(__dirname, '..', 'public', 'fonts');

// Las 10 fuentes exactas que usa tailwind.css (Chakra Petch 500/700 y
// JetBrains Mono 400/700, latin + latin-ext + cyrillic). JetBrains Mono
// 400 y 700 son el mismo archivo de fuente variable, por eso comparten hash.
const FUENTES = [
  { archivo: 'chakra-petch-500-latin-ext.woff2', url: 'https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkebIl1SZ_F7AY.woff2', sha256: '5e6545c4da21734334bcf06853ef74df582737ae23682f8278fe9f1ba70908cc' },
  { archivo: 'chakra-petch-500-latin.woff2', url: 'https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkebIl1R5_F.woff2', sha256: '36ad966cb653de70ba37355c41003b02de8940b2df6cbcd46480a6ad8cadd65d' },
  { archivo: 'chakra-petch-700-latin-ext.woff2', url: 'https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkeJI91SZ_F7AY.woff2', sha256: '3b237255d05e401601c1c566a5d65aeb1a65c65eea514e2ec0130cc9de0b5a96' },
  { archivo: 'chakra-petch-700-latin.woff2', url: 'https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkeJI91R5_F.woff2', sha256: 'ce5095dc1cb200aaa939e38067a0677018d10e9f26ec38cdcf1557ac524fc775' },
  { archivo: 'jetbrains-mono-400-cyrillic.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxTcwhsk.woff2', sha256: 'e17cfd15fb96909d64095015f958207063a0c07191da3512df7d560a781aebdf' },
  { archivo: 'jetbrains-mono-400-latin-ext.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx7cwhsk.woff2', sha256: 'db5ff4db83e580426280e9337a58dc57d3a83784a1b03ad80914651594441d52' },
  { archivo: 'jetbrains-mono-400-latin.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2', sha256: '83c005d49d8a6a50474c73a5a36ac0468076e9c4a29da7bdb14995d80560a5be' },
  { archivo: 'jetbrains-mono-700-cyrillic.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxTcwhsk.woff2', sha256: 'e17cfd15fb96909d64095015f958207063a0c07191da3512df7d560a781aebdf' },
  { archivo: 'jetbrains-mono-700-latin-ext.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx7cwhsk.woff2', sha256: 'db5ff4db83e580426280e9337a58dc57d3a83784a1b03ad80914651594441d52' },
  { archivo: 'jetbrains-mono-700-latin.woff2', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2', sha256: '83c005d49d8a6a50474c73a5a36ac0468076e9c4a29da7bdb14995d80560a5be' },
];

function sha256De(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function descargar(url, intentos = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return descargar(res.headers.location, intentos).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' en ' + url));
      }
      const partes = [];
      res.on('data', (c) => partes.push(c));
      res.on('end', () => resolve(Buffer.concat(partes)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('tiempo agotado en ' + url)));
    req.on('error', (e) => {
      if (intentos > 1) return descargar(url, intentos - 1).then(resolve, reject);
      reject(e);
    });
  });
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  for (const f of FUENTES) {
    const destino = path.join(DIR, f.archivo);
    if (fs.existsSync(destino)) {
      const actual = sha256De(fs.readFileSync(destino));
      if (actual === f.sha256) {
        console.log('OK (ya estaba) ' + f.archivo);
        continue;
      }
      console.log('hash distinto, se vuelve a descargar ' + f.archivo);
    }
    const datos = await descargar(f.url);
    const hash = sha256De(datos);
    if (hash !== f.sha256) {
      throw new Error('HASH NO COINCIDE en ' + f.archivo + ': esperado ' + f.sha256 + ', recibido ' + hash);
    }
    fs.writeFileSync(destino, datos);
    console.log('OK ' + f.archivo + ' (' + datos.length + ' B)');
  }
  console.log('Fuentes listas: ' + FUENTES.length + '/10 en public/fonts/');
}

main().catch((e) => {
  console.error('ERROR descargando fuentes: ' + e.message);
  process.exit(1);
});
