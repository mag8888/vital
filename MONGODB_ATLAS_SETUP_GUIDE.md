# Настройка MongoDB Atlas для проекта

## Учетные данные

✅ **Пользователь базы данных**: `smirenskaya5984_db_user`  
✅ **Пароль**: `nwYsMppKRXCdqURM`

## Шаг 1: Получить строку подключения из Atlas

1. Откройте MongoDB Atlas: https://cloud.mongodb.com/
2. Войдите в свой аккаунт
3. Выберите ваш кластер
4. Нажмите кнопку **"Connect"**
5. Выберите **"Connect your application"**
6. Скопируйте строку подключения (выглядит примерно так):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Шаг 2: Сформировать полную строку подключения

Замените в строке подключения:
- `<username>` → `smirenskaya5984_db_user`
- `<password>` → `nwYsMppKRXCdqURM`
- Добавьте имя базы данных `/vital` перед `?`

**Итоговая строка должна выглядеть так:**
```
mongodb+srv://smirenskaya5984_db_user:nwYsMppKRXCdqURM@cluster0.xxxxx.mongodb.net/vital?retryWrites=true&w=majority
```

⚠️ **Важно**: Замените `cluster0.xxxxx.mongodb.net` на реальный адрес вашего кластера из Atlas!

## Шаг 3: Обновить DATABASE_URL в Railway

1. Откройте Railway: https://railway.app/
2. Выберите ваш проект
3. Выберите сервис с ботом (vital-bot)
4. Перейдите во вкладку **"Variables"**
5. Найдите переменную `DATABASE_URL`
6. Замените её значение на полную строку подключения из шага 2
7. Railway автоматически перезапустит сервис

## Шаг 4: Проверить работу

После перезапуска проверьте логи Railway:
- Должны исчезнуть ошибки "replica set"
- Должны появиться сообщения об успешном подключении
- Приложение должно работать без ошибок БД

## Шаг 5: Применить индексы

После успешного подключения нужно применить индексы:

```bash
cd vital
npx prisma db push
```

Или в Railway можно добавить команду в build:
```bash
npx prisma generate && npx prisma db push
```

---

## Быстрый способ: Если у вас уже есть строка подключения

Если вы уже скопировали строку подключения из Atlas, просто:

1. Замените `<username>` и `<password>` на:
   - Username: `smirenskaya5984_db_user`
   - Password: `nwYsMppKRXCdqURM`

2. Добавьте `/vital` перед `?`:
   ```
   mongodb+srv://smirenskaya5984_db_user:nwYsMppKRXCdqURM@ВАШ_КЛАСТЕР/vital?retryWrites=true&w=majority
   ```

3. Обновите `DATABASE_URL` в Railway

---

## Важные замечания

⚠️ **Безопасность**: Пароль хранится в переменных окружения Railway - это безопасно  
⚠️ **База данных**: Имя базы `vital` будет создано автоматически при первом подключении  
✅ **Replica Set**: Atlas автоматически настроен как replica set - ошибки должны исчезнуть  
✅ **Индексы**: После подключения примените индексы командой `npx prisma db push`








