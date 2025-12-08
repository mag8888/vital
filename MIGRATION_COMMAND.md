# Команда для миграции

## Скопируйте и выполните эту команду в Railway Shell:

```bash
cd /workspace/vital && npx prisma generate && npx prisma db push
```

Или если вы в корне проекта:

```bash
cd vital && npx prisma generate && npx prisma db push
```

## Или используйте скрипт:

```bash
cd vital && bash scripts/run-migration.sh
```

## Что будет выполнено:

1. Генерация Prisma Client с новыми полями
2. Применение изменений схемы к MongoDB:
   - Добавление полей `purchasePrice`, `sku`, `lowStockThreshold` в коллекцию Product
   - Создание коллекции Settings

## После успешной миграции:

Откройте админку и настройте импорт:
- Страница настроек: https://vital-production-82b0.up.railway.app/admin/invoice-settings
- Страница импорта: https://vital-production-82b0.up.railway.app/admin/invoice-import



