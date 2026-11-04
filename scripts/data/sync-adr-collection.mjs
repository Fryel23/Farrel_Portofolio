/*!
 * scripts/data/sync-adr-collection.mjs - Deterministic ADR collection sync (V13.0-A).
 *
 * Membaca berkas laporan historis dari allowlist ADR_MANIFEST, menghitung
 * provenance dari raw source bytes, menormalisasi U+2014 hanya pada salinan,
 * dan menulis/memeriksa src/content/adr/*.md tanpa memodifikasi sumber asli.
 *
 * Penggunaan:
 *   node scripts/data/sync-adr-collection.mjs --check
 *   node scripts/data/sync-adr-collection.mjs --write
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  ADR_MANIFEST,
  countWordsUtf8,
  countPhysicalLines,
  normalizeAdrCopyContent,
} from '../../src/lib/adr-taxonomy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '../..');
export const DEFAULT_ADR_DIR = path.join(DEFAULT_PROJECT_ROOT, 'src/content/adr');

/**
 * Memastikan path sumber relatif, tidak mengandung traversal keluar root,
 * dan tetap berada di dalam root proyek setelah resolusi realpath.
 * @param {string} projectRoot
 * @param {string} relativeSourcePath
 * @param {string} adrId
 */
export function resolveSafeSourcePath(projectRoot, relativeSourcePath, adrId) {
  if (typeof relativeSourcePath !== 'string' || relativeSourcePath.trim() === '') {
    throw new Error(`[ADR SYNC] Empty sourcePath for record "${adrId}".`);
  }
  if (path.isAbsolute(relativeSourcePath) || relativeSourcePath.startsWith('\\\\')) {
    throw new Error(`[ADR SYNC] Absolute sourcePath is forbidden for record "${adrId}": ${relativeSourcePath}`);
  }
  const normalizedRel = path.posix.normalize(relativeSourcePath.replace(/\\/g, '/'));
  if (normalizedRel.startsWith('..') || normalizedRel.includes('/../')) {
    throw new Error(`[ADR SYNC] Path traversal is forbidden for record "${adrId}": ${relativeSourcePath}`);
  }
  const rootReal = fs.realpathSync(projectRoot);
  const candidateFull = path.resolve(rootReal, normalizedRel);
  if (!fs.existsSync(candidateFull)) {
    throw new Error(`[ADR SYNC] Missing source file for record "${adrId}" at path "${normalizedRel}".`);
  }
  const candidateReal = fs.realpathSync(candidateFull);
  const relFromRoot = path.relative(rootReal, candidateReal);
  if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
    throw new Error(`[ADR SYNC] Source file escapes project root for record "${adrId}": ${normalizedRel}`);
  }
  return {
    fullPath: candidateReal,
    relativePath: relFromRoot.replace(/\\/g, '/'),
  };
}

/**
 * Merender blok YAML frontmatter secara deterministik.
 * @param {Object} frontmatter
 */
export function serializeAdrFrontmatter(frontmatter) {
  const lines = ['---'];
  lines.push(`adrId: ${JSON.stringify(frontmatter.adrId)}`);
  lines.push(`versionTag: ${JSON.stringify(frontmatter.versionTag)}`);
  lines.push(`sequenceOrder: ${frontmatter.sequenceOrder}`);
  lines.push(`title: ${JSON.stringify(frontmatter.title)}`);
  lines.push(`summary: ${JSON.stringify(frontmatter.summary)}`);
  lines.push(`category: ${JSON.stringify(frontmatter.category)}`);
  lines.push(`recordType: ${JSON.stringify(frontmatter.recordType)}`);
  lines.push(`recordStatus: ${JSON.stringify(frontmatter.recordStatus)}`);
  if (frontmatter.publishedAt) {
    lines.push(`publishedAt: ${JSON.stringify(frontmatter.publishedAt)}`);
  }
  lines.push(`targetRoutes: ${JSON.stringify(frontmatter.targetRoutes)}`);
  lines.push(`relatedWorkIds: ${JSON.stringify(frontmatter.relatedWorkIds)}`);
  lines.push('keyMetrics:');
  for (const metric of frontmatter.keyMetrics) {
    lines.push(`  - label: ${JSON.stringify(metric.label)}`);
    lines.push(`    value: ${JSON.stringify(metric.value)}`);
    if (metric.unit !== undefined) {
      lines.push(`    unit: ${JSON.stringify(metric.unit)}`);
    }
    if (metric.evidenceSection !== undefined) {
      lines.push(`    evidenceSection: ${JSON.stringify(metric.evidenceSection)}`);
    }
  }
  lines.push('provenance:');
  lines.push(`  sourcePath: ${JSON.stringify(frontmatter.provenance.sourcePath)}`);
  lines.push(`  sourceFilename: ${JSON.stringify(frontmatter.provenance.sourceFilename)}`);
  lines.push(`  sourceSha256: ${JSON.stringify(frontmatter.provenance.sourceSha256)}`);
  lines.push(`  sourceBytes: ${frontmatter.provenance.sourceBytes}`);
  lines.push(`  sourceWordCount: ${frontmatter.provenance.sourceWordCount}`);
  lines.push(`  sourceLineCount: ${frontmatter.provenance.sourceLineCount}`);
  lines.push(`  normalizedContentSha256: ${JSON.stringify(frontmatter.provenance.normalizedContentSha256)}`);
  lines.push(`  normalizationCount: ${frontmatter.provenance.normalizationCount}`);
  lines.push('---');
  return lines.join('\n');
}

/**
 * Memisahkan frontmatter dan body dari isi file koleksi ADR.
 * @param {string} fileContent
 */
export function extractAdrBodyFromMarkdown(fileContent) {
  if (!fileContent.startsWith('---\n')) return fileContent;
  const endMarkerIndex = fileContent.indexOf('\n---\n', 4);
  if (endMarkerIndex === -1) return fileContent;
  return fileContent.slice(endMarkerIndex + 5);
}

/**
 * Membangun seluruh entri koleksi ADR yang diharapkan di memori secara deterministik.
 * @param {string} [projectRoot]
 * @param {readonly Object[]} [manifest]
 */
export function buildExpectedAdrEntries(projectRoot = DEFAULT_PROJECT_ROOT, manifest = ADR_MANIFEST) {
  const sortedManifest = [...manifest].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const results = [];

  for (const item of sortedManifest) {
    const resolved = resolveSafeSourcePath(projectRoot, item.sourcePath, item.adrId);
    const rawBuffer = fs.readFileSync(resolved.fullPath);
    const sourceSha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
    const sourceBytes = rawBuffer.byteLength;
    const rawText = rawBuffer.toString('utf8');
    const sourceWordCount = countWordsUtf8(rawText);
    const sourceLineCount = countPhysicalLines(rawText);

    const { normalizedText, normalizationCount } = normalizeAdrCopyContent(rawText);
    const normalizedContentSha256 = crypto
      .createHash('sha256')
      .update(Buffer.from(normalizedText, 'utf8'))
      .digest('hex');

    const frontmatter = {
      adrId: item.adrId,
      versionTag: item.versionTag,
      sequenceOrder: item.sequenceOrder,
      title: item.title,
      summary: item.summary,
      category: item.category,
      recordType: item.recordType,
      recordStatus: item.recordStatus,
      ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      targetRoutes: [...item.targetRoutes],
      relatedWorkIds: [...item.relatedWorkIds],
      keyMetrics: item.keyMetrics.map((m) => ({ ...m })),
      provenance: {
        sourcePath: resolved.relativePath,
        sourceFilename: item.sourceFilename,
        sourceSha256,
        sourceBytes,
        sourceWordCount,
        sourceLineCount,
        normalizedContentSha256,
        normalizationCount,
      },
    };

    const frontmatterYaml = serializeAdrFrontmatter(frontmatter);
    const fullMarkdown = `${frontmatterYaml}\n${normalizedText}`;
    const outputSha256 = crypto
      .createHash('sha256')
      .update(Buffer.from(fullMarkdown, 'utf8'))
      .digest('hex');

    results.push({
      adrId: item.adrId,
      slug: item.slug,
      filename: `${item.slug}.md`,
      frontmatter,
      normalizedText,
      fullMarkdown,
      outputSha256,
    });
  }

  return results;
}

/**
 * Menulis seluruh file koleksi ADR ke outDir secara deterministik.
 * @param {string} [projectRoot]
 * @param {string} [outDir]
 * @param {readonly Object[]} [manifest]
 */
export function writeAdrCollectionSync(
  projectRoot = DEFAULT_PROJECT_ROOT,
  outDir = DEFAULT_ADR_DIR,
  manifest = ADR_MANIFEST
) {
  const expected = buildExpectedAdrEntries(projectRoot, manifest);
  fs.mkdirSync(outDir, { recursive: true });

  const expectedFilenames = new Set(expected.map((entry) => entry.filename));
  for (const existing of fs.readdirSync(outDir)) {
    if (existing.endsWith('.md') && !expectedFilenames.has(existing)) {
      fs.unlinkSync(path.join(outDir, existing));
    }
  }

  for (const entry of expected) {
    const destPath = path.join(outDir, entry.filename);
    fs.writeFileSync(destPath, entry.fullMarkdown, 'utf8');
  }

  return expected;
}

/**
 * Memeriksa apakah isi outDir sama persis dengan hasil buildExpectedAdrEntries
 * tanpa menulis atau mengubah satu pun file.
 * @param {string} [projectRoot]
 * @param {string} [outDir]
 * @param {readonly Object[]} [manifest]
 */
export function checkAdrCollectionSync(
  projectRoot = DEFAULT_PROJECT_ROOT,
  outDir = DEFAULT_ADR_DIR,
  manifest = ADR_MANIFEST
) {
  const expected = buildExpectedAdrEntries(projectRoot, manifest);
  const drifts = [];

  if (!fs.existsSync(outDir)) {
    return {
      ok: false,
      drifts: [`Output directory does not exist: ${outDir}`],
      expectedCount: expected.length,
    };
  }

  const expectedByFilename = new Map(expected.map((e) => [e.filename, e]));
  const actualFiles = fs
    .readdirSync(outDir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  for (const actualName of actualFiles) {
    if (!expectedByFilename.has(actualName)) {
      drifts.push(`Unexpected file in ADR collection: ${actualName}`);
    }
  }

  for (const entry of expected) {
    const filePath = path.join(outDir, entry.filename);
    if (!fs.existsSync(filePath)) {
      drifts.push(`Missing generated ADR file: ${entry.filename}`);
      continue;
    }
    const actualContent = fs.readFileSync(filePath, 'utf8');
    if (actualContent !== entry.fullMarkdown) {
      drifts.push(`Content drift detected in ADR file: ${entry.filename}`);
    }
  }

  return {
    ok: drifts.length === 0,
    drifts,
    expectedCount: expected.length,
  };
}

function runCli() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || (args[0] !== '--check' && args[0] !== '--write')) {
    console.error(
      'Usage: node scripts/data/sync-adr-collection.mjs <--check|--write>\n' +
        '  --check  Validate that src/content/adr/*.md matches source reports without writing.\n' +
        '  --write  Generate or update src/content/adr/*.md deterministically from ADR_MANIFEST.'
    );
    process.exit(1);
  }

  const mode = args[0];
  try {
    if (mode === '--write') {
      const entries = writeAdrCollectionSync();
      console.log(`[ADR SYNC] Wrote ${entries.length} ADR entries to src/content/adr/.`);
      process.exit(0);
    } else {
      const checkResult = checkAdrCollectionSync();
      if (!checkResult.ok) {
        console.error('[ADR SYNC] Collection drift detected:');
        for (const msg of checkResult.drifts) {
          console.error(`  - ${msg}`);
        }
        process.exit(1);
      }
      console.log(`[ADR SYNC] OK: ${checkResult.expectedCount} ADR entries verified in sync.`);
      process.exit(0);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
