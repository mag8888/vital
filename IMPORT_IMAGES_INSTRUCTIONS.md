# Импорт изображений для товаров из инвойса

## Запуск импорта изображений

### Вариант 1: Через Railway Shell (рекомендуется)

1. Откройте https://railway.app
2. Перейдите в проект Vital
3. Откройте Shell/Terminal
4. Выполните:

```bash
cd vital
npm run build
node scripts/import-invoice-images-now.js
```

### Вариант 2: Через Railway CLI

```bash
cd /Users/ADMIN/Vital/vital
railway login
railway link
railway run npm run import-invoice-images-now
```

## Что будет сделано:

1. ✅ Прочитает все товары из `INVOICE_DATA.txt`
2. ✅ Сопоставит товары с базой данных (по SKU или названию)
3. ✅ Найдет товары на сайте https://siambotanicals.com
4. ✅ Извлечет изображения высокого качества
5. ✅ Загрузит на Cloudinary (если настроено) или сохранит прямые URL
6. ✅ Обновит изображения в базе данных

## Важно:

⚠️ Сначала выполните импорт товаров из инвойса, чтобы товары были в базе данных!

## Порядок выполнения:

1. **Миграция БД**: `npx prisma db push` (через Railway Shell)
2. **Импорт товаров**: `npm run import-invoice-now` (через Railway Shell)
3. **Импорт изображений**: `npm run import-invoice-images-now` (через Railway Shell)

## Результаты:

- Количество найденных изображений
- Количество обновленных товаров
- Список ошибок (если есть)
- Товары, не найденные в базе данных


