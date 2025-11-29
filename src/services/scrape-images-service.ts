/**
 * Сервис для сбора недостающих фотографий продуктов
 * с сайта Siam Botanicals
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isCloudinaryConfigured } from './cloudinary-service.js';

const prisma = new PrismaClient();

export interface ProductFromSite {
  title: string;
  slug: string;
  imageUrl: string | null;
  productUrl: string;
}

export interface ScrapeResult {
  updated: number;
  skipped: number;
  failed: number;
  notFound: number;
  total: number;
}

/**
 * Парсит страницу магазина и извлекает информацию о продуктах
 */
export async function scrapeShopPage(page: number = 1): Promise<{
  products: ProductFromSite[];
  hasNextPage: boolean;
}> {
  const url = `https://siambotanicals.com/shop/${page > 1 ? `page/${page}/` : ''}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const products: ProductFromSite[] = [];
    
    // Парсим HTML для поиска продуктов
    const productPattern = /<li[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    const productMatches = [...html.matchAll(productPattern)];
    
    const articlePattern = /<article[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const articleMatches = [...html.matchAll(articlePattern)];
    
    const allMatches = [...productMatches, ...articleMatches];
    
    for (const match of allMatches) {
      const productHtml = match[1];
      
      const linkMatch = productHtml.match(/<a[^>]*href="([^"]*\/product\/[^"]+)"[^>]*>/i);
      if (!linkMatch) continue;
      
      const productUrl = linkMatch[1];
      if (!productUrl.includes('/product/')) continue;
      
      const slugMatch = productUrl.match(/\/product\/([^\/]+)\/?/);
      const slug = slugMatch ? slugMatch[1] : null;
      if (!slug) continue;
      
      const titleMatch = productHtml.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ||
                        productHtml.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ||
                        productHtml.match(/<a[^>]*class="[^"]*woocommerce-LoopProduct-link[^"]*"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i);
      
      let title = '';
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      
      const imageMatch = productHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*(?:attachment-woocommerce_thumbnail|wp-post-image)[^"]*"/i) ||
                        productHtml.match(/<img[^>]*class="[^"]*(?:attachment-woocommerce_thumbnail|wp-post-image)[^"]*"[^>]*src="([^"]+)"/i) ||
                        productHtml.match(/<img[^>]*data-src="([^"]+)"[^>]*>/i) ||
                        productHtml.match(/<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i);
      
      let imageUrl: string | null = null;
      if (imageMatch && imageMatch[1]) {
        imageUrl = imageMatch[1];
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }
        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png)/i, '.$1');
        imageUrl = imageUrl.split('?')[0];
      }
      
      if (title && slug) {
        products.push({
          title: title,
          slug: slug,
          imageUrl: imageUrl,
          productUrl: productUrl.startsWith('http') ? productUrl : `https://siambotanicals.com${productUrl}`
        });
      }
    }
    
    const hasNextPage = html.includes('next page-numbers') || 
                       html.includes('next page') ||
                       html.includes('→') ||
                       (page === 1 && products.length > 0);
    
    return { products, hasNextPage };
  } catch (error: any) {
    console.error(`❌ Ошибка парсинга страницы ${page}: ${error.message || error}`);
    return { products: [], hasNextPage: false };
  }
}

/**
 * Извлекает изображение со страницы продукта
 */
export async function extractImageFromProductPage(productUrl: string): Promise<string | null> {
  try {
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    
    const patterns = [
      /<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*attachment-woocommerce_single[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*data-large_image="([^"]+)"/i,
      /<img[^>]*data-src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i,
      /<img[^>]*src="([^"]*\/wp-content\/uploads\/[^"]+\.(jpg|jpeg|png))"[^>]*>/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imageUrl = match[1];
        
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://siambotanicals.com' + imageUrl;
        }

        imageUrl = imageUrl.replace(/-\d+x\d+\.(jpg|jpeg|png)/i, '.$1');
        imageUrl = imageUrl.split('?')[0];
        
        return imageUrl;
      }
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

/**
 * Загружает изображение на Cloudinary или возвращает прямой URL
 */
export async function downloadAndUploadImage(imageUrl: string, productId: string, productTitle: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000),
      method: 'HEAD'
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return null;
    }
  } catch (error: any) {
    return null;
  }

  if (isCloudinaryConfigured()) {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        return imageUrl;
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      if (imageBuffer.length === 0) {
        return imageUrl;
      }
      
      const safeTitle = productTitle.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      const result = await uploadImage(imageBuffer, {
        folder: 'vital/products',
        publicId: `siam-${safeTitle}-${Date.now()}`,
        resourceType: 'image'
      });

      return result.secureUrl;
    } catch (error: any) {
      return imageUrl;
    }
  } else {
    return imageUrl;
  }
}

/**
 * Находит продукт в базе данных по названию
 */
export async function findProductInDB(title: string, slug: string): Promise<{ id: string; title: string; imageUrl: string | null } | null> {
  const exactMatch = await prisma.product.findFirst({
    where: {
      title: {
        equals: title,
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      title: true,
      imageUrl: true
    }
  });
  
  if (exactMatch) {
    return exactMatch;
  }
  
  const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    const partialMatch = await prisma.product.findFirst({
      where: {
        OR: words.map(word => ({
          title: {
            contains: word,
            mode: 'insensitive'
          }
        }))
      },
      select: {
        id: true,
        title: true,
        imageUrl: true
      }
    });
    
    if (partialMatch) {
      return partialMatch;
    }
  }
  
  return null;
}

/**
 * Основная функция сбора недостающих фотографий
 */
export async function scrapeAllMissingImages(): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    updated: 0,
    skipped: 0,
    failed: 0,
    notFound: 0,
    total: 0
  };

  // Собираем все продукты со страниц магазина
  const allProductsFromSite: ProductFromSite[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  const maxPages = 20;

  while (hasMorePages && currentPage <= maxPages) {
    const { products, hasNextPage } = await scrapeShopPage(currentPage);
    allProductsFromSite.push(...products);
    
    hasMorePages = hasNextPage && products.length > 0;
    currentPage++;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  result.total = allProductsFromSite.length;

  // Обрабатываем каждый продукт
  for (const siteProduct of allProductsFromSite) {
    try {
      const dbProduct = await findProductInDB(siteProduct.title, siteProduct.slug);
      
      if (!dbProduct) {
        result.notFound++;
        continue;
      }
      
      if (dbProduct.imageUrl && dbProduct.imageUrl.trim() !== '') {
        result.skipped++;
        continue;
      }
      
      let imageUrl = siteProduct.imageUrl;
      
      if (!imageUrl) {
        imageUrl = await extractImageFromProductPage(siteProduct.productUrl);
      }
      
      if (!imageUrl) {
        result.failed++;
        continue;
      }
      
      const cloudinaryUrl = await downloadAndUploadImage(imageUrl, dbProduct.id, dbProduct.title);
      
      if (!cloudinaryUrl) {
        result.failed++;
        continue;
      }
      
      await prisma.product.update({
        where: { id: dbProduct.id },
        data: { imageUrl: cloudinaryUrl }
      });
      
      result.updated++;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      result.failed++;
    }
  }

  return result;
}

