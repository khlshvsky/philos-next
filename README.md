# Философский канон — Next.js

121 главная книга по философии. Next.js + Vercel.

## Стек

- **Next.js 16** (App Router, Static Site Generation)
- **Vercel** — деплой
- **Wikipedia API** — обложки книг
- **localStorage** — прогресс и рецензии (этап 1)
- **Supabase** — авторизация и публичные рецензии (этап 2)

## Структура

```
app/
├── page.tsx              — главная: список книг
├── book/[id]/
│   ├── page.tsx          — сервер: метаданные, статик пармсы
│   └── BookDetail.tsx    — клиент: обложка, прогресс, рецензия
components/
├── WikiCover.tsx         — обложка с Wikipedia + fallback-инициалы
└── EraTag.tsx            — бейдж эпохи
lib/
└── books.js              — данные: 121 книга
```

## Запуск

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
```

## Деплой на Vercel

```bash
npm i -g vercel
vercel
```

Или через vercel.com — импортировать репозиторий GitHub.
