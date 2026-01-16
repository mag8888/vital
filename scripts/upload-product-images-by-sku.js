/**
 * Upload product images to Cloudinary and update Product.imageUrl by SKU.
 *
 * Intended flow:
 *  1) Extract images from PDF into a folder (preferably named by SKU) OR prepare your images folder
 *  2) Run this script pointing at that folder
 *
 * Requirements:
 *  - DATABASE_URL (Mongo) must be set for Prisma
 *  - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET must be set
 *
 * Usage:
 *  node scripts/upload-product-images-by-sku.js --dir ./tmp/siam-pdf-images --dry-run
 *  node scripts/upload-product-images-by-sku.js --dir ./tmp/siam-pdf-images --apply
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const DIR = dirIdx !== -1 ? args[dirIdx + 1] : null;
const DRY_RUN = args.includes('--dry-run');
const APPLY = args.includes('--apply');

if (!DIR) {
  console.error('❌ Missing --dir argument');
  process.exit(1);
}

if (!APPLY) {
  console.log('ℹ️  По умолчанию изменения НЕ применяются. Чтобы применить — добавьте флаг --apply');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isCloudinaryConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function detectSkuFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '');
  const m = base.match(/\b[A-Z]{1,3}\d{4}-\d{2,4}\b/);
  return m ? m[0] : null;
}

async function uploadBuffer(buffer, publicId) {
  return await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'vital/products',
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  const absDir = path.resolve(process.cwd(), DIR);
  if (!fs.existsSync(absDir)) {
    console.error('❌ Directory not found:', absDir);
    process.exit(1);
  }

  const files = fs.readdirSync(absDir).filter(f => !f.startsWith('.') && !f.endsWith('.json'));
  console.log(`📁 Files: ${files.length} in ${absDir}`);

  let processed = 0;
  let updated = 0;
  let missingProduct = 0;
  let badName = 0;

  for (const file of files) {
    const sku = detectSkuFromFilename(file);
    if (!sku) {
      badName++;
      continue;
    }

    processed++;

    const product = await prisma.product.findFirst({
      where: { sku },
      select: { id: true, title: true, sku: true, imageUrl: true }
    });

    if (!product) {
      console.warn(`⚠️  SKU not found in DB: ${sku} (file: ${file})`);
      missingProduct++;
      continue;
    }

    const buf = fs.readFileSync(path.join(absDir, file));
    const publicId = `pdf-${sku}`;

    if (DRY_RUN || !APPLY) {
      console.log(`🔍 [${sku}] "${product.title}" <- ${file} (bytes: ${buf.length})`);
      continue;
    }

    const result = await uploadBuffer(buf, publicId);
    const url = result.secure_url;

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: url }
    });

    updated++;
    console.log(`✅ Updated image [${sku}] -> ${url}`);
  }

  console.log('\n--- SUMMARY ---');
  console.log('processed files:', processed);
  console.log('updated products:', updated);
  console.log('files w/o sku:', badName);
  console.log('missing products:', missingProduct);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Fatal:', e);
  try { await prisma.$disconnect(); } catch (_) {}
  process.exit(1);
});

