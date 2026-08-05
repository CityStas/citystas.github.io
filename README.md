# БАЗА Скейтборды — статичный сайт

Статичная копия сайта с админкой для товаров.

## Структура

- `index.html` — главная
- `shop/` — каталог товаров
- `product/{id}/` — страницы товаров
- `decks/`, `video/`, `payment_ship/`, `contacts/`, `politica/`, `оплата-доставка/` — страницы
- `content/products.json` — **товары и настройки** (единый источник данных)
- `admin/` — админка Decap CMS
- `generate.mjs` — пересобирает каталог из products.json (Node.js)
- `wp-content/` — стили, картинки, скрипты

## Как менять товары

### Через админку (рекомендуется)

1. Открой `https://bazaskate.shop/admin/`
2. Войди через GitHub
3. В разделе «Настройки» редактируй товары:
   - Название, цена, фото, описание
   - Ссылка на Авито (общая или своя для товара)
4. Сохрани — Decap CMS создаст коммит в GitHub, Vercel автоматически пересоберёт сайт

### Вручную

1. Отредактируй `content/products.json`
2. Запусти `npm run build` (или `node generate.mjs`)
3. Закоммить и запушь

## Деплой на Vercel

1. Зарегистрируйся на [vercel.com](https://vercel.com) (через GitHub)
2. Нажми **Add New → Project**
3. Импортируй репозиторий `CityStas/bazaskate.shop`
4. Настройки:
   - Build Command: `npm run build`
   - Output Directory: `.`
5. Deploy
6. В настройках проекта: **Domains** → добавь `bazaskate.shop`
7. У регистратора домена пропиши DNS:
   - A-запись: `76.76.21.21`
   - Или CNAME: `cname.vercel-dns.com`

## Настройка админки

Для работы админки на Vercel нужен прокси-сервер oAuth:

1. Создай приложение OAuth на GitHub (Settings → Developer settings → OAuth Apps):
   - Homepage URL: `https://bazaskate.shop/`
   - Authorization callback URL: `https://baza-oauth.vercel.app/api/callback`
2. Задеплой прокси: [decap-cms-oauth](https://github.com/decaporg/decap-cms-oauth) на Vercel
3. Запиши в `admin/config.yml`:
   - `base_url: https://твой-oauth-app.vercel.app`
   - `auth_endpoint: /auth`
   - `cms_url: /`