# Квадро Бургер

Двомовний сайт онлайн-замовлень для бургерної у Братиславі.

- Публічний сайт: `https://vladpadiak-lgtm.github.io/pizza/`
- Вхід адміністратора: `https://vladpadiak-lgtm.github.io/pizza/admin/`
- Українська та словацька мови
- Меню, категорії, кошик, доставка або самовивіз
- Захищена адмін-панель для товарів, цін і статусів замовлень
- Надсилання кожного нового замовлення на email через Resend

## Запуск локально

```bash
pnpm install
pnpm dev
```

Без налаштованої бази сайт працює у демонстраційному режимі: меню та кошик доступні, але відправлення замовлення й вхід адміністратора вимкнені.

## Підключення замовлень та адміністратора

1. Створити проєкт Supabase та виконати `supabase/schema.sql` у SQL Editor.
2. Створити користувача адміністратора в Supabase Authentication.
3. Додати його UUID у таблицю `public.admins`:

```sql
insert into public.admins (user_id) values ('UUID_КОРИСТУВАЧА');
```

4. Розгорнути функцію `supabase/functions/create-order`.
5. Додати секрети функції: `RESEND_API_KEY`, `ORDER_EMAIL`, `ORDER_FROM_EMAIL`, `ALLOWED_ORIGIN`.
6. У GitHub Actions secrets додати `VITE_SUPABASE_URL` та `VITE_SUPABASE_ANON_KEY`.
7. У Settings → Pages вибрати джерело **GitHub Actions**.

Адреса одержувача замовлень зберігається лише у серверному секреті `ORDER_EMAIL` і не потрапляє в код сайту.
