#!/bin/bash

# Скрипт для запуска автотестов админ-панели

echo "🚀 Запуск автотестов для админ-панели..."
echo ""

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js для запуска тестов."
    exit 1
fi

# Устанавливаем переменные окружения по умолчанию
export TEST_BASE_URL=${TEST_BASE_URL:-"http://localhost:3000"}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin123"}

echo "📋 Конфигурация:"
echo "   BASE_URL: $TEST_BASE_URL"
echo "   ADMIN_PASSWORD: ${ADMIN_PASSWORD:0:3}***"
echo ""

# Запускаем тесты
node tests/admin.test.js

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Все тесты пройдены успешно!"
else
    echo ""
    echo "❌ Некоторые тесты провалены"
fi

exit $exit_code
