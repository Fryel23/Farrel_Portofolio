/*!
 * scripts/data/csv-parser.mjs — Parser CSV RFC 4180 murni (tanpa dependency).
 *
 * Single responsibility: mengubah teks CSV menjadi array baris (array string).
 * Mendukung: field berkutip, kutip ganda ter-escape (""), koma/baris baru di
 * dalam kutip, CRLF. Tidak mengubah nilai (tanpa trim otomatis — normalisasi
 * eksplisit dilakukan pemanggil dan dicatat di audit).
 *
 * Dipakai build script dataset Cirebon; tidak dipakai browser.
 */

/**
 * @param {string} text isi CSV
 * @returns {string[][]} baris → kolom
 */
export function parseCsv(text) {
  if (typeof text !== 'string') throw new TypeError('parseCsv: input harus string');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field); field = '';
    } else if (char === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (char === '\r') {
      /* diabaikan: CRLF ditangani oleh \n */
    } else {
      field += char;
    }
  }
  /* Baris terakhir tanpa newline */
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Rapikan whitespace: newline/spasi beruntuk → satu spasi, trim ujung. */
export function collapseWhitespace(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}
