# ⚠️ Проблема с Plazma API

## Текущая ситуация

Plazma API возвращает ошибки:
- `Cannot GET /api/external/products` 
- `Cannot GET /api/external/catalog`

## Диагностика

### 1. Проверьте доступность Plazma API

```bash
# Проверка test endpoint (работает)
curl "https://vital-production-82b0.up.railway.app/webapp/api/plazma/test"

# Проверка products endpoint (не работает)
curl "https://vital-production-82b0.up.railway.app/webapp/api/plazma/products?limit=2"
```

### 2. Проверьте правильность API ключа

В Railway проверьте переменную окружения:
- `PLAZMA_API_KEY` или `EXTERNAL_API_KEY`
- Должен совпадать с ключом на стороне Plazma

### 3. Проверьте правильность URL

В Railway проверьте:
- `PLAZMA_API_URL` (опционально)
- По умолчанию: `https://plazma-production.up.railway.app/api/external`

### 4. Проверьте, реализованы ли endpoint'ы на стороне Plazma

Нужно проверить на стороне Plazma:
- Существует ли endpoint `/api/external/products`?
- Существует ли endpoint `/api/external/catalog`?
- Какой правильный путь к API?

## Решение

### Вариант 1: Проверить документацию Plazma

1. Откройте документацию Plazma API
2. Проверьте правильные пути к endpoint'ам
3. Обновите `PLAZMA_API_URL` в Railway, если путь другой

### Вариант 2: Временно отключить Plazma секцию

Если API недоступен, можно временно скрыть секцию "Рекомендуем" до тех пор, пока API не будет настроен.

### Вариант 3: Проверить с разработчиками Plazma

Свяжитесь с разработчиками Plazma API и уточните:
- Правильные пути к endpoint'ам
- Правильный формат API ключа
- Доступность API для внешних запросов

## Текущий код

Код уже включает fallback механизм:
1. Пробует `/products`
2. При 404 пробует `/catalog`
3. Извлекает товары из категорий

Но оба endpoint'а возвращают ошибку, что означает, что либо:
- API не настроен
- Endpoint'ы не реализованы
- Путь неправильный

## Следующие шаги

1. Проверьте логи Railway - должны быть сообщения о попытках запроса к Plazma API
2. Проверьте переменные окружения в Railway
3. Свяжитесь с разработчиками Plazma для уточнения API


