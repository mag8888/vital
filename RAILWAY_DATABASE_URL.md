# Настройка DATABASE_URL в Railway

## ✅ Готовая строка подключения

Скопируйте и вставьте эту строку в Railway:

```
mongodb+srv://smirenskaya5984_db_user:nwYsMppKRXCdqURM@cluster0.t28dfmk.mongodb.net/vital?appName=Cluster0&retryWrites=true&w=majority
```

## Как добавить в Railway:

1. Откройте https://railway.app/
2. Выберите ваш проект
3. Выберите сервис (vital-bot)
4. Перейдите в раздел **"Variables"**
5. Найдите переменную `DATABASE_URL` (или нажмите **"+ New Variable"**)
6. В поле **"Key"** введите: `DATABASE_URL`
7. В поле **"Value"** вставьте строку выше
8. Нажмите **"Save"**

Railway автоматически перезапустит сервис после сохранения.

## После обновления:

1. Подождите 1-2 минуты (Railway перезапускает сервис)
2. Проверьте логи в Railway:
   - Откройте **"Deployments"** → выберите последний деплой
   - Должны исчезнуть ошибки "replica set"
   - Должно появиться сообщение "Database URL configured"

## Если что-то не работает:

- Проверьте, что в MongoDB Atlas → Network Access разрешен доступ с любого IP (0.0.0.0/0)
- Убедитесь, что кластер не в режиме паузы
- Проверьте логи Railway на наличие ошибок подключения

