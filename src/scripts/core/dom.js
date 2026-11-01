/*!
 * core/dom.js: safe DOM helpers + shared UI utilities (modularized
 * V11.1-M).
 *
 * Single responsibility: doc, el/qs/qsa/setText, toast, fetch dengan
 * timeout, heading builders, safeImage, SVG_NS. Tidak ada duplikasi
 * helper yang sama di feature modules.
 */
export const doc = document;

/* ======================================================================
 * Tiny DOM helpers (safe by construction)
 * ==================================================================== */
export function el(tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
export function qs(selector, scope) { return (scope || doc).querySelector(selector); }
export function qsa(selector, scope) { return Array.from((scope || doc).querySelectorAll(selector)); }
export function setText(selector, value, scope) {
  const node = qs(selector, scope);
  if (node && value !== undefined && value !== null) node.textContent = String(value);
}

/* Shared accessible toast (copy feedback 12.7 + Konami toast V4 §9.2).
   One status region, reused by every feature that needs polite feedback. */
let toastTimer = null;
export function showToast(message) {
  const toast = qs('#copy-toast');
  if (!toast || !message) return;
  toast.textContent = String(message);
  toast.classList.add('is-visible');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

/* V5 §3.6: every external fetch goes through this helper. 8 second
   timeout via AbortController, response.ok checked, and errors are
   always caught by the caller so a slow endpoint can never freeze
   the page or leave an unhandled rejection. */
export async function fetchWithTimeout(url, timeoutMs) {
  const limit = timeoutMs || 8000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), limit);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('Request failed: ' + response.status);
    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/** Build a heading with masked lines; `accent` substring is wrapped in <em>. */
export function buildHeading(node, lines, accent, withSparkle) {
  if (!node || !Array.isArray(lines)) return;
  node.textContent = '';
  lines.forEach((lineText, index) => {
    const mask = el('span', 'line-mask');
    const line = el('span', 'line');
    const text = String(lineText);
    const last = index === lines.length - 1;
    if (accent && text.includes(accent)) {
      const at = text.indexOf(accent);
      if (at > 0) line.appendChild(doc.createTextNode(text.slice(0, at)));
      const em = doc.createElement('em');
      em.textContent = accent;
      line.appendChild(em);
      if (at + accent.length < text.length) {
        line.appendChild(doc.createTextNode(text.slice(at + accent.length)));
      }
      if (withSparkle && last) {
        const spark = el('sup', 'sparkle', '✳');
        spark.setAttribute('aria-hidden', 'true');
        line.appendChild(spark);
      }
    } else {
      line.textContent = text;
    }
    mask.appendChild(line);
    node.appendChild(mask);
  });
}

export function buildTwoLineCardHeading(node, lines) {
  if (!node || !Array.isArray(lines)) return;
  node.textContent = '';
  lines.forEach((lineText, index) => {
    node.appendChild(doc.createTextNode(lineText));
    if (index < lines.length - 1) node.appendChild(doc.createElement('br'));
  });
}

/* ======================================================================
 * 1. RENDER: collections
 * ==================================================================== */
export function safeImage(value, fallback) {
  const url = String(value || '').trim();
  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;
  if (/^(\.\/|\/)?assets\/[a-z0-9_./-]+\.(svg|png|jpe?g|webp|gif)$/i.test(url)) return url;
  return fallback || 'assets/project-aqi.svg';
}

/* Namespace SVG bersama (dipakai ornamen global + scene arsip). */
export const SVG_NS = 'http://www.w3.org/2000/svg';
