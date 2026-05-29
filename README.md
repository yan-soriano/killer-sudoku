# Killer Sudoku

React + Tailwind + Supabase

## Быстрый старт

### 1. Supabase
1. Создай проект на [supabase.com](https://supabase.com)
2. Перейди в **SQL Editor** → вставь содержимое `supabase_schema.sql` → нажми Run
3. Скопируй Project URL и anon key из Settings → API

### 2. Переменные окружения
Создай файл `.env` в корне проекта:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. Запуск
```bash
npm install
npm run dev
```

Открой http://localhost:5173

## Деплой (Vercel)
1. Залей проект на GitHub
2. На vercel.com → Import → выбери репо
3. Добавь те же env vars в настройках проекта
4. Deploy

## Структура
```
src/
  lib/
    supabase.js   — клиент Supabase
    api.js        — auth, game sessions, stats
    sudoku.js     — генератор головоломок
  store/
    AppContext.jsx — глобальное состояние
  pages/
    Onboarding.jsx
    Hub.jsx
    GameScreen.jsx
    ResultScreen.jsx
    Settings.jsx
  App.jsx
  main.jsx
```

## Управление в игре
- **Клик** на ячейку → выбрать
- **1–9** (клавиатура или кнопки) → ввести число
- **Backspace/Delete** → стереть
- **D** → переключить режим черновика
