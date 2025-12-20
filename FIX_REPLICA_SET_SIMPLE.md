# Быстрое решение проблемы Replica Set

## Проблема
```
Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set.
```

## Простое решение: Использовать MongoDB Atlas (рекомендуется)

### Шаг 1: Создать MongoDB Atlas кластер

1. Перейдите на https://www.mongodb.com/cloud/atlas
2. Зарегистрируйтесь (если нет аккаунта)
3. Создайте бесплатный кластер M0:
   - Выберите облачный провайдер (AWS, Google Cloud, или Azure)
   - Выберите регион ближайший к вам
   - Нажмите "Create Cluster"

### Шаг 2: Настроить доступ

1. В боковом меню выберите **"Database Access"**
2. Нажмите **"Add New Database User"**
3. Выберите **"Password"** как метод аутентификации
4. Введите имя пользователя и пароль (сохраните их!)
5. В **"Database User Privileges"** выберите **"Atlas admin"** или **"Read and write to any database"**
6. Нажмите **"Add User"**

### Шаг 3: Разрешить доступ из Railway

1. В боковом меню выберите **"Network Access"**
2. Нажмите **"Add IP Address"**
3. Выберите **"Allow Access from Anywhere"** (0.0.0.0/0) для тестирования
   - Или добавьте конкретные IP адреса Railway
4. Нажмите **"Confirm"**

### Шаг 4: Получить строку подключения

1. В боковом меню выберите **"Database"** (или "Deployments")
2. Нажмите **"Connect"** на вашем кластере
3. Выберите **"Connect your application"**
4. Скопируйте строку подключения (выглядит как):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Шаг 5: Обновить DATABASE_URL в Railway

1. Откройте ваш проект на Railway
2. Перейдите в ваш сервис (vital-bot)
3. Откройте вкладку **"Variables"**
4. Найдите переменную `DATABASE_URL`
5. Замените её значение на строку подключения из Atlas
6. Добавьте имя базы данных в конец URL (после `/`):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vital?retryWrites=true&w=majority
   ```
   ⚠️ **Важно**: Замените `<username>` и `<password>` на реальные значения из шага 2

### Шаг 6: Перезапустить сервис

1. Railway автоматически перезапустит сервис при изменении переменных
2. Или перезапустите вручную через кнопку "Restart"

### Шаг 7: Проверить работу

После перезапуска проверьте логи - ошибки replica set должны исчезнуть!

---

## Преимущества MongoDB Atlas

✅ **Бесплатный план M0** (512MB storage)  
✅ **Автоматически настроен как replica set**  
✅ **Безопасное подключение**  
✅ **Глобальная доступность**  
✅ **Легко масштабировать**  

## Альтернатива: Настроить Replica Set на Railway

Если хотите использовать MongoDB на Railway, см. файл `MONGODB_REPLICA_SET_SETUP.md`



















