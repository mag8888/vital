# ⚡ Быстрая настройка переменных окружения

## Для Railway / Production

Добавьте следующие переменные в настройках вашего проекта:

### ✅ Обязательные (4 переменные):

1. **BOT_TOKEN** - Токен Telegram бота от @BotFather
2. **DATABASE_URL** - Строка подключения PostgreSQL (Railway создает автоматически)
3. **ADMIN_EMAIL** - Email для входа в админ-панель
4. **ADMIN_PASSWORD** - Пароль для админ-панели

### 📋 Рекомендуемые:

- **PUBLIC_BASE_URL** - URL вашего приложения (например: `https://vital-production.up.railway.app`)
- **ADMIN_CHAT_ID** - Ваш Telegram Chat ID для уведомлений
- **SESSION_SECRET** - Секрет для сессий (сгенерируйте случайную строку)

### 💳 Для оплаты (опционально):

- **LAVA_SECRET_KEY** - Секретный ключ Lava API
- **LAVA_WEBHOOK_SECRET** - Секрет для Lava webhook

---

## Как получить BOT_TOKEN:

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен (формат: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

## Как получить ADMIN_CHAT_ID:

1. Откройте [@userinfobot](https://t.me/userinfobot) в Telegram
2. Отправьте `/start`
3. Скопируйте ваш `Id`

---

## Как получить DATABASE_URL (Railway):

1. В Railway создайте PostgreSQL сервис
2. Railway автоматически создаст переменную `DATABASE_URL`
3. Или скопируйте Connection String из настроек базы данных

---

## Пример минимальной конфигурации для Railway:

```
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
DATABASE_URL=postgresql://postgres:password@host.railway.app:5432/railway
ADMIN_EMAIL=admin@vital.com
ADMIN_PASSWORD=YourSecurePassword123!
PUBLIC_BASE_URL=https://vital-production.up.railway.app
ADMIN_CHAT_ID=123456789
SESSION_SECRET=your-random-secret-string-here
```

---

📚 **Подробная инструкция:** см. файл `ENV_SETUP.md`


