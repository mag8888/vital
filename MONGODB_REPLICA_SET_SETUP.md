# Настройка MongoDB Replica Set на Railway

## Проблема
Prisma требует replica set для работы с MongoDB, но на Railway MongoDB по умолчанию работает без replica set.

## Решение: Настроить MongoDB как Replica Set на Railway

### Шаг 1: Развернуть MongoDB Replica Set через Railway Template

1. Перейдите по ссылке: https://github.com/railwayapp-templates/mongo-replica-set
2. Нажмите кнопку **"Deploy to Railway"**
3. Railway автоматически создаст 3 сервиса MongoDB (mongo1, mongo2, mongo3)

### Шаг 2: Получить строку подключения

После развертывания:
1. Откройте каждый из 3 сервисов MongoDB
2. Найдите **Public Networking** или **Variables** секцию
3. Скопируйте строку подключения (MONGO_URL или MONGODB_URL)

### Шаг 3: Инициализировать Replica Set

1. Подключитесь к первому узлу MongoDB через Railway CLI:
```bash
railway run mongosh
```

Или используйте Mongo Shell напрямую, если у вас есть доступ.

2. Выполните команду инициализации:
```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1.railway.internal:27017" },
    { _id: 1, host: "mongo2.railway.internal:27017" },
    { _id: 2, host: "mongo3.railway.internal:27017" }
  ]
})
```

3. Проверьте статус:
```javascript
rs.status()
```

### Шаг 4: Обновить строку подключения

Измените `DATABASE_URL` в вашем основном сервисе, добавив параметры replica set:

```
mongodb://username:password@mongo1.railway.internal:27017,mongo2.railway.internal:27017,mongo3.railway.internal:27017/vital?replicaSet=rs0&authSource=admin
```

Или используйте публичные URL, если они доступны:
```
mongodb://username:password@mongo1-production.up.railway.app:27017,mongo2-production.up.railway.app:27017,mongo3-production.up.railway.app:27017/vital?replicaSet=rs0&authSource=admin
```

### Шаг 5: Перезапустить приложение

После обновления переменной `DATABASE_URL` перезапустите ваш основной сервис. Ошибки replica set должны исчезнуть.

---

## Альтернативное решение: Использовать MongoDB Atlas

Если настройка replica set на Railway кажется сложной, можно использовать MongoDB Atlas (бесплатный план M0):

1. Создайте аккаунт на https://www.mongodb.com/cloud/atlas
2. Создайте кластер (M0 - бесплатный)
3. В настройках кластера включите "Replica Set" (включено по умолчанию)
4. Получите строку подключения
5. Обновите `DATABASE_URL` в Railway

---

## Важные замечания

⚠️ **Внимание**: Replica Set на Railway потребует 3 сервиса MongoDB, что увеличит стоимость (около $5 x 3 = $15/месяц).

✅ **Рекомендация**: Для начала используйте MongoDB Atlas (бесплатный план M0), который уже настроен как replica set.

