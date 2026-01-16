
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPathPrimary = path.join(__dirname, '../vital/каталог Siam Botanicals.pdf');
const pdfPathFallback = path.join(__dirname, '../webapp/catalogue Siam Botanicals.pdf');
const prisma = new PrismaClient();

// Flag to actually apply changes
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply'); // safer than default write

function normalizeWhitespace(s) {
  return String(s || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isAllCapsLine(line) {
  const s = String(line || '').trim();
  if (!s) return false;
  // Consider only letters (ru/en) + spaces
  const lettersOnly = s.replace(/[^A-Za-zА-ЯЁа-яё\s]/g, '');
  if (!lettersOnly.trim()) return false;
  // If there are no lowercase letters and the line is reasonably long, treat as header
  const hasLower = /[a-zа-яё]/.test(lettersOnly);
  const hasUpper = /[A-ZА-ЯЁ]/.test(lettersOnly);
  return hasUpper && !hasLower && lettersOnly.trim().length >= 6;
}

function extractFirstParagraph(text) {
  const t = normalizeWhitespace(text);
  if (!t) return '';
  const parts = t.split(/\n\s*\n/);
  return (parts[0] || '').trim();
}

function extractCatalogEntriesFromPdfText(pdfText) {
  const text = normalizeWhitespace(pdfText);
  // SKU examples in this PDF: FS1003-24, PB0011-180
  const skuRe = /\b[A-Z]{1,3}\d{4}-\d{2,4}\b/g;
  const matches = [];
  for (const m of text.matchAll(skuRe)) {
    matches.push({ sku: m[0], index: m.index ?? -1, length: m[0].length });
  }
  // Deduplicate by first occurrence order
  const seen = new Set();
  const skus = matches.filter(m => {
    if (!m.sku || m.index < 0) return false;
    if (seen.has(m.sku)) return false;
    seen.add(m.sku);
    return true;
  });

  const result = new Map();
  for (let i = 0; i < skus.length; i++) {
    const cur = skus[i];
    const prev = skus[i - 1];
    const blockStart = prev ? prev.index + prev.length : 0;
    const blockEnd = cur.index;
    if (blockEnd <= blockStart) continue;

    const blockRaw = text.substring(blockStart, blockEnd).trim();
    if (!blockRaw) continue;

    // Weight is usually on same line as SKU: "<SKU> ВЕС: 24 г"
    const afterSku = text.substring(cur.index, Math.min(text.length, cur.index + 80));
    const weightMatch = afterSku.match(new RegExp(`${cur.sku}\\s+ВЕС:\\s*([^\\n]+)`));
    const weight = weightMatch ? weightMatch[1].trim() : '';

    // Parse block lines
    const lines = blockRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const cleanedLines = [];
    for (const line of lines) {
      // Drop global section headers and marketing headers
      if (isAllCapsLine(line)) continue;
      cleanedLines.push(line);
    }

    const fullText = cleanedLines.join('\n').trim();
    if (fullText.length < 20) continue;

    // Ingredients: keep them inside description, but also useful to ensure title selection
    const ingredientsIdx = fullText.lastIndexOf('ИНГРЕДИЕНТЫ:');

    let title = '';
    let description = fullText;

    if (ingredientsIdx !== -1) {
      const before = fullText.slice(0, ingredientsIdx).trim();
      const beforeLines = before.split('\n').map(l => l.trim()).filter(Boolean);

      // Title heuristic: first line that isn't "ДЛЯ ..." (skin type header)
      for (const l of beforeLines) {
        if (/^ДЛЯ\b/i.test(l)) continue;
        title = l;
        break;
      }

      // If title is still empty, fallback to first non-empty line
      if (!title) title = beforeLines[0] || '';

      description = fullText;
    } else {
      // No ingredients: still try to find title similarly
      for (const l of cleanedLines) {
        if (/^ДЛЯ\b/i.test(l)) continue;
        title = l;
        break;
      }
      if (!title) title = cleanedLines[0] || '';
    }

    title = title.replace(/\s{2,}/g, ' ').trim();
    const summaryBase = extractFirstParagraph(description);
    const summary = normalizeWhitespace(`${weight ? `ВЕС: ${weight}\n` : ''}${summaryBase}`).slice(0, 200);

    result.set(cur.sku, {
      sku: cur.sku,
      title,
      summary,
      description: normalizeWhitespace(description),
      weight,
    });
  }

  return result;
}

async function syncProductsFromPdf() {
    console.log('🚀 Starting Product Sync from PDF (SKU Matching)...');
    if (DRY_RUN) console.log('🧪 DRY RUN MODE - No changes will be saved');
    if (!APPLY) console.log('ℹ️  По умолчанию изменения НЕ применяются. Чтобы применить — добавьте флаг --apply');

    // 1. Read PDF
    const pdfPath = fs.existsSync(pdfPathPrimary) ? pdfPathPrimary : pdfPathFallback;
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ PDF file not found at:', pdfPathPrimary, 'or', pdfPathFallback);
        process.exit(1);
    }

    console.log('📖 Reading PDF...');
    console.log('📄 Using PDF path:', pdfPath);
    const dataBuffer = fs.readFileSync(pdfPath);
    let pdfText = '';

    try {
        // Handle pdf-parse export quirks (sometimes object, sometimes function)
        let pdfParser = pdf;
        if (typeof pdfParser !== 'function' && pdfParser.default) {
            pdfParser = pdfParser.default;
        }

        if (typeof pdfParser !== 'function') {
            throw new Error('PDF Parser is not a function');
        }

        const data = await pdfParser(dataBuffer);
        pdfText = data.text;
        console.log(`✅ PDF parsed successfully. Length: ${pdfText.length} chars`);
    } catch (error) {
        console.error('❌ Error parsing PDF:', error);
        process.exit(1);
    }

    // 2. Parse catalog entries from PDF text
    console.log('🧩 Parsing catalog entries from PDF text...');
    const catalog = extractCatalogEntriesFromPdfText(pdfText);
    console.log(`✅ Parsed entries: ${catalog.size}`);

    // 2. Fetch Products with SKU
    console.log('📦 Fetching products with SKUs from database...');
    const products = await prisma.product.findMany({
        where: {
            sku: { not: null },
            isActive: true
        },
        select: { id: true, title: true, sku: true, summary: true, description: true, imageUrl: true }
    });
    console.log(`✅ Found ${products.length} active products with SKUs.`);

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    // 3. Match and Update
    for (const product of products) {
        const sku = product.sku;
        const entry = catalog.get(sku);

        if (!entry) {
            console.log(`⚠️  SKU not found in PDF: [${sku}] "${product.title}"`);
            notFoundCount++;
            continue;
        }

        const nextTitle = entry.title || product.title;
        const nextSummary = entry.summary || product.summary || '';
        const nextDescription = entry.description || product.description || '';

        const titleChanged = String(product.title || '').trim() !== String(nextTitle || '').trim();
        const summaryChanged = String(product.summary || '').trim() !== String(nextSummary || '').trim();
        const descChanged = String(product.description || '').trim() !== String(nextDescription || '').trim();

        if (!titleChanged && !summaryChanged && !descChanged) {
            skippedCount++;
            continue;
        }

        if (DRY_RUN || !APPLY) {
            console.log(`-----------------------------------------------------`);
            console.log(`🔍 [${sku}] "${product.title}"`);
            if (titleChanged) {
              console.log(`✏️  TITLE:\n- ${product.title}\n+ ${nextTitle}`);
            }
            if (summaryChanged) {
              console.log(`🧾 SUMMARY:\n- ${String(product.summary || '').slice(0, 180)}\n+ ${String(nextSummary || '').slice(0, 180)}`);
            }
            if (descChanged) {
              console.log(`📝 DESCRIPTION (first 280 chars):\n- ${String(product.description || '').slice(0, 280)}\n+ ${String(nextDescription || '').slice(0, 280)}`);
            }
            if (!product.imageUrl) {
              console.log(`🖼️  IMAGE: отсутствует (PDF не содержит URL, нужна отдельная стратегия синка фото)`);
            }
            console.log(`-----------------------------------------------------`);
        }

        if (APPLY && !DRY_RUN) {
            await prisma.product.update({
                where: { id: product.id },
                data: {
                  title: nextTitle,
                  summary: nextSummary,
                  description: nextDescription
                }
            });
            console.log(`✅ Updated [${sku}] "${nextTitle.substring(0, 40)}..."`);
        }

        updatedCount++;
    }

    console.log('\n-----------------------------------');
    console.log(`🎉 Sync Complete!`);
    console.log(`✅ Processed: ${updatedCount}`);
    console.log(`⚠️  Not Found: ${notFoundCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`ℹ️  APPLY: ${APPLY ? 'yes' : 'no'} | DRY_RUN: ${DRY_RUN ? 'yes' : 'no'}`);
    console.log('-----------------------------------');

    await prisma.$disconnect();
}

syncProductsFromPdf().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
