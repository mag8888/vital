# Решение проблемы аутентификации MongoDB на Railway

## Проблема

Ошибка: `SCRAM failure: Authentication failed`

Это означает, что MongoDB не может аутентифицировать пользователя с предоставленными credentials.

## Возможные причины и решения

### 1. Неправильные credentials в Railway

**Проверьте:**
- В Railway Dashboard → MongoDB Service → Variables
- Убедитесь, что `DATABASE_URL` или `MONGO_PUBLIC_URL` содержит правильные credentials

**Формат connection string должен быть:**
```
mongodb://username:password@host:port/database?options
```

### 2. Пароль содержит специальные символы

Если пароль содержит специальные символы (`, @, :, /, ?, #, [, ], %`), их нужно URL-кодировать:

**Примеры экранирования:**
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `[` → `%5B`
- `]` → `%5D`
- `%` → `%25`

**Проверьте пароль:**
1. Скопируйте connection string из Railway
2. Проверьте, правильно ли экранирован пароль
3. Если нет - используйте URL encoder или замените специальные символы

### 3. Неправильное имя базы данных

Railway MongoDB может требовать указания правильной базы данных для аутентификации.

**Проверьте:**
- Connection string должен содержать `/database_name` перед `?`
- Или используйте параметр `authSource` в query string

### 4. Проверка connection string

**Формат должен быть:**
```
mongodb://mongo:password@host.railway.app:port/vital?retryWrites=true&w=majority
```

**Где:**
- `mongo` - username (обычно для Railway)
- `password` - пароль из Railway
- `host.railway.app` - хост Railway MongoDB
- `port` - порт (обычно 27017)
- `vital` - имя базы данных
- `?retryWrites=true&w=majority` - параметры подключения

### 5. Сброс credentials в Railway

Если проблема не решается:

1. В Railway Dashboard → MongoDB Service
2. Перейдите в Settings
3. Найдите опцию сброса пароля или credentials
4. Обновите `DATABASE_URL` или `MONGO_PUBLIC_URL` с новыми credentials

### 6. Проверка через MongoDB Compass

Попробуйте подключиться к MongoDB через MongoDB Compass:

1. Скачайте MongoDB Compass
2. Используйте connection string из Railway
3. Проверьте, подключается ли

Если не подключается - проблема в credentials или connection string.

## Что было исправлено в коде

1. ✅ Улучшена нормализация connection string
2. ✅ Добавлен параметр `authSource` для правильной аутентификации
3. ✅ Улучшена обработка ошибок
4. ✅ Увеличены таймауты подключения

## Временное решение

Если проблема не решается сразу, можете:

1. Создать новую MongoDB базу данных в Railway
2. Скопировать новый connection string
3. Обновить переменную окружения `DATABASE_URL`
4. Перезапустить сервис

## Логирование

Код теперь логирует:
- Начало connection string (без пароля)
- Нормализованную версию (без пароля)
- Предупреждения о проблемах с форматом

**Пример лога:**
```
Database URL configured: mongodb://mongo@...
✅ Database URL normalized: mongodb://mongo@...
```

Если видите предупреждения - проверьте формат connection string.









