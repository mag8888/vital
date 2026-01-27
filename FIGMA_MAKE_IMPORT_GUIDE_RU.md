# Импорт фронтенда из Figma Make в этот репозиторий (Vite/React) и подключение к Solia

По скриншоту из Figma Make у вас генерируется проект **Vite + React + TypeScript + Tailwind** (видно `vite.config.ts`, `src/`, `tailwind.css`).

В этом репо фронт мини‑аппа обслуживается Express‑роутером `src/webapp/webapp.ts` по пути **`/webapp`**, а API — по **`/webapp/api/*`**.

## 1) Как забрать код из Figma Make

1. Откройте проект в Figma Make → вкладка **Code** (как на вашем скрине).
2. Нажмите **иконку скачивания** (стрелка вниз справа сверху в панели кода) и скачайте архив/экспорт кода.
3. Распакуйте архив локально.

## 2) Куда класть в этом репо

Рекомендуемая схема для этого репо:

- `webapp-make/` — исходники (Vite/React проект из Figma Make)
- `webapp/` — **только build‑выход** (`index.html`, `assets/*`), который отдаётся по `/webapp`

То есть:
1. Создайте папку `webapp-make/` и положите туда файлы из экспорта (где `package.json`, `vite.config.ts`, `src/`).
2. `webapp/` оставьте как “папку деплоя” (туда будет собираться результат).

## 3) Настроить Vite под `/webapp`

В `webapp-make/vite.config.ts` нужно 2 вещи:

- **`base: '/webapp/'`** — чтобы ассеты ссылались как `/webapp/assets/...`, а не `/assets/...`
- **`build.outDir: '../webapp'`** — чтобы `vite build` складывал результат туда, откуда Express его уже раздаёт

Пример (ориентир):

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/webapp/',
  plugins: [react()],
  build: {
    outDir: '../webapp',
    emptyOutDir: true,
  },
})
```

## 4) Подключение к Solia — как правильно

**Лучший вариант — НЕ ходить в Solia напрямую из браузера**, а проксировать через ваш бекенд:

- фронт вызывает `/webapp/api/solia/*`
- бекенд вызывает Solia с ключом/секретом на сервере

Причины:
- ключ Solia не попадает в клиент
- нет проблем с CORS
- можно централизованно логировать/ретраить/валидировать

### Минимальный контракт на фронте

На фронте делайте API base через env:
- `VITE_API_BASE=/webapp/api`

и используйте:
- `fetch(`${import.meta.env.VITE_API_BASE}/solia/...`)`

## 5) Что нужно от вас, чтобы я подключил Solia в коде

Напишите 3 вещи:
1. **Что такое Solia** (URL API / SDK / платежка / что именно интегрируем)
2. **Базовый URL** Solia (например `https://api.solia.com`)
3. **Тип авторизации** (API key? Bearer token? подпись? OAuth?) и какие эндпоинты нужны (минимум 2–3 операции).

