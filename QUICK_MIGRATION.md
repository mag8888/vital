# Быстрая миграция базы данных

## Вариант 1: Через Railway CLI (самый простой)

```bash
cd /Users/ADMIN/Vital/vital
railway run npm run migrate:deploy
```

## Вариант 2: Через Railway Web UI

1. Откройте https://railway.app
2. Выберите проект Vital
3. Откройте вкладку "Deployments" или используйте Railway Shell
4. Выполните команду: `npx prisma db push`

## Вариант 3: Через Railway Shell в браузере

1. Откройте проект в Railway
2. Перейдите в раздел "Deployments"
3. Выберите последний deployment
4. Откройте "Shell" или "Terminal"
5. Выполните: `npx prisma db push`

## Что будет сделано:

✅ Добавлены поля в модель Product:
   - `purchasePrice` - закупочная цена в БАТ
   - `sku` - код товара
   - `lowStockThreshold` - порог низкого остатка (по умолчанию 3)

✅ Создана модель Settings для хранения настроек импорта

## После миграции:

1. Откройте админку: https://vital-production-82b0.up.railway.app/admin/invoice-settings
2. Настройте курс обмена (2.45) и мультипликатор (8)
3. Начните импортировать товары из инвойса



