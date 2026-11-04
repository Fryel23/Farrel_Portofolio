/* Static import graph builder — records relative-import edges for src/scripts and src/data.
   Usage: node v11.1-research/modularization/import-graph.mjs [outfile] */
import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk('src/scripts');
const graph = {}; // file -> [{ spec, resolved }]
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const edges = [];
  const re = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    let resolved = null;
    if (spec.startsWith('.')) {
      const abs = path.resolve(path.dirname(f), spec);
      for (const cand of [abs, abs + '.js', abs + '.mjs', path.join(abs, 'index.js')]) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) { resolved = path.relative('src', cand); break; }
      }
    } else {
      resolved = '(external:' + spec + ')';
    }
    edges.push({ spec, resolved: resolved ? resolved.replace(/\\/g, '/') : 'UNRESOLVED' });
  }
  graph[path.relative('src', f).replace(/\\/g, '/')] = edges;
}

// Cycle detection over local edges (DFS)
const local = {};
for (const [f, edges] of Object.entries(graph)) local[f] = edges.filter((e) => e.resolved && !e.resolved.startsWith('(external')).map((e) => e.resolved);
const cycles = [];
const state = {}; // 0 fresh, 1 in-stack, 2 done
const stack = [];
function dfs(n) {
  state[n] = 1; stack.push(n);
  for (const nx of local[n] || []) {
    if (state[nx] === 1) cycles.push([...stack.slice(stack.indexOf(nx)), nx]);
    else if (!state[nx]) dfs(nx);
  }
  stack.pop(); state[n] = 2;
}
Object.keys(local).forEach((f) => { if (!state[f]) dfs(f); });

const out = process.argv[2] || 'v11.1-research/modularization/import-graph.json';
fs.writeFileSync(out, JSON.stringify({ graph, cycles }, null, 2));
console.log('files:', Object.keys(graph).length, '| unresolved:',
  Object.values(graph).flat().filter((e) => e.resolved === 'UNRESOLVED').length,
  '| cycles:', cycles.length);
if (cycles.length) console.log(JSON.stringify(cycles, null, 1));
