/** @type {import('tailwindcss').Config} */
// Tailwind LOCAL (ronda 5, 2026-11-17): reemplaza el Play CDN 3.4.17.
// Misma configuración que el <script> tailwind.config inline que había
// en index.html (fontFamily mono/display). El build es:
//   npm run build  →  public/css/tailwind.min.css
// El contenido escaneado es index.html + app.js + js/*.js (las clases
// dinámicas de app.js son literales en el fuente: constantes CHIP y
// classList; showToast vive en js/api.js desde el módulo 2, ronda 5:
// sin './public/js/*.js' el próximo build borraría sus clases).
module.exports = {
  content: ['./public/index.html', './public/app.js', './public/js/*.js'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Chakra Petch"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
