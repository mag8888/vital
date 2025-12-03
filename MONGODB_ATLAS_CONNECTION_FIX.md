# Исправление подключения к MongoDB Atlas

## Проблема

Ошибка при подключении:
```
Server selection timeout: No available servers
I/O error: received fatal alert: InternalError
```

## Причины

1. **SSL/TLS проблемы** - MongoDB Atlas требует SSL/TLS подключения
2. **IP Whitelist** - IP адреса Railway не разрешены в MongoDB Atlas
3. **Timeout настройки** - слишком короткие таймауты для сетевого подключения

## Решение

### Шаг 1: Разрешить все IP адреса в MongoDB Atlas

1. Откройте [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Перейдите в ваш кластер
3. Нажмите **"Network Access"** (или "IP Access List")
4. Нажмите **"Add IP Address"**
5. Выберите **"Allow Access from Anywhere"** (0.0.0.0/0)
6. Или добавьте кнопку **"Add Current IP Address"** для вашего текущего IP

**⚠️ Внимание:** Разрешение всех IP (0.0.0.0/0) безопасно только если:
- Используется сильный пароль
- Используется аутентификация
- База данных имеет ограниченные права доступа

### Шаг 2: Проверьте Connection String

Убедитесь, что connection string правильный:

```
mongodb+srv://smirenskaya5984_db_user:nwYsMppKRXCdqURM@cluster0.t28dfmk.mongodb.net/vital?appName=Cluster0&retryWrites=true&w=majority
```

### Шаг 3: Обновите DATABASE_URL в Railway

1. Откройте Railway Dashboard
2. Выберите ваш проект
3. Перейдите в **"Variables"**
4. Найдите `DATABASE_URL`
5. Установите значение (с увеличенными таймаутами):

```
mongodb+srv://smirenskaya5984_db_user:nwYsMppKRXCdqURM@cluster0.t28dfmk.mongodb.net/vital?appName=Cluster0&retryWrites=true&w=majority&authSource=admin&tls=true&connectTimeoutMS=30000&socketTimeoutMS=30000&serverSelectionTimeoutMS=30000
```

### Шаг 4: Проверьте пароль

Убедитесь, что пароль правильный и не содержит специальных символов, которые нужно экранировать.

Если пароль содержит специальные символы (например, `@`, `#`, `%`, `&`), замените их на URL-encoded версии:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`

### Шаг 5: Перезапустите приложение в Railway

1. В Railway Dashboard перейдите в **"Deployments"**
2. Нажмите **"Redeploy"** на последнем деплое
3. Или просто сделайте пустой коммит:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

## Проверка подключения

После обновления проверьте логи Railway. Должны увидеть:
- ✅ `Database connected`
- ✅ `Initial data ensured`
- ✅ Нет ошибок "Server selection timeout"

## Если проблема не решена

1. **Проверьте кластер в MongoDB Atlas:**
   - Убедитесь, что кластер запущен (не в режиме паузы)
   - Проверьте статус кластера (должен быть "Running")

2. **Создайте нового пользователя:**
   - В MongoDB Atlas → Database Access
   - Создайте нового пользователя с правами "Read and write to any database"
   - Используйте простой пароль без специальных символов

3. **Попробуйте другую connection string:**
   - В MongoDB Atlas → Connect → Connect your application
   - Выберите "Node.js" и версию "5.5 or later"
   - Скопируйте connection string
   - Замените `<password>` на реальный пароль
   - Добавьте `/vital` перед `?`

## Дополнительные параметры для connection string

Если проблемы продолжаются, добавьте эти параметры:

```
&readPreference=primary&readPreferenceTags=&ssl=true&tls=true&tlsAllowInvalidCertificates=false&tlsAllowInvalidHostnames=false
```

**⚠️ Внимание:** Не используйте `tlsAllowInvalidCertificates=true` в production - это только для тестирования!








