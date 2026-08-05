-- Quadro Burger database schema for Supabase.
-- Run once in the Supabase SQL editor, then add the first admin user id to public.admins.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  category text not null check (category in ('burger', 'combo', 'pizza', 'sides', 'drinks')),
  name_uk text not null,
  name_sk text not null,
  description_uk text not null default '',
  description_sk text not null default '',
  price_cents integer not null check (price_cents >= 0),
  emoji text not null default '🍽️',
  badge_uk text not null default '',
  badge_sk text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_name text not null,
  phone text not null,
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  address text not null default '',
  note text not null default '',
  locale text not null default 'uk' check (locale in ('uk', 'sk')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_cents integer not null check (delivery_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'new' check (status in ('new', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  customizations jsonb not null default '[]'::jsonb,
  item_note text not null default ''
);

alter table public.order_items add column if not exists customizations jsonb not null default '[]'::jsonb;
alter table public.order_items add column if not exists item_note text not null default '';

create index if not exists idx_products_active_category_order on public.products(active, category, sort_order);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_open_status on public.orders(status) where status not in ('delivered', 'cancelled');
create index if not exists idx_order_items_order_id on public.order_items(order_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.products enable row level security;
alter table public.admins enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public reads active products" on public.products;
create policy "Public reads active products" on public.products for select using (active = true);
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admin can read own role" on public.admins;
create policy "Admin can read own role" on public.admins for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins read order items" on public.order_items;
create policy "Admins read order items" on public.order_items for select to authenticated using (public.is_admin());

create or replace function public.publish_catalog(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 200 then
    raise exception 'Invalid catalog';
  end if;

  delete from public.products
  where id not in (select value->>'id' from jsonb_array_elements(items));

  insert into public.products (id, category, name_uk, name_sk, description_uk, description_sk, price_cents, emoji, badge_uk, badge_sk, active, sort_order, updated_at)
  select
    value->>'id', value->>'category', value->>'name_uk', value->>'name_sk',
    coalesce(value->>'description_uk', ''), coalesce(value->>'description_sk', ''),
    greatest(0, (value->>'price_cents')::integer), coalesce(value->>'emoji', '🍽️'),
    coalesce(value->>'badge_uk', ''), coalesce(value->>'badge_sk', ''),
    coalesce((value->>'active')::boolean, true), coalesce((value->>'sort_order')::integer, 0), now()
  from jsonb_array_elements(items)
  on conflict (id) do update set
    category = excluded.category, name_uk = excluded.name_uk, name_sk = excluded.name_sk,
    description_uk = excluded.description_uk, description_sk = excluded.description_sk,
    price_cents = excluded.price_cents, emoji = excluded.emoji, badge_uk = excluded.badge_uk,
    badge_sk = excluded.badge_sk, active = excluded.active, sort_order = excluded.sort_order, updated_at = now();
end;
$$;

revoke all on function public.publish_catalog(jsonb) from public, anon;
grant execute on function public.publish_catalog(jsonb) to authenticated;

insert into public.products (id, category, name_uk, name_sk, description_uk, description_sk, price_cents, emoji, badge_uk, badge_sk, active, sort_order) values
('quadro-burger','burger','Квадро Бургер','Quadro Burger','Дві яловичі котлети, подвійний чедер, бекон, огірок, цибуля та фірмовий соус.','Dve hovädzie placky, dvojitý čedar, slanina, uhorka, cibuľa a náš domáci dresing.',1290,'🍔','Фірмовий','Signature',true,10),
('classic-cheese','burger','Класік Чіз','Classic Cheese','Яловичина, чедер, салат, помідор, маринований огірок і бургер-соус.','Hovädzie mäso, čedar, šalát, paradajka, nakladaná uhorka a burgerový dresing.',890,'🍔','Хіт','Hit',true,20),
('chicken-crunch','burger','Чікен Кранч','Chicken Crunch','Хрустке курча, чедер, салат, огірок і медово-гірчичний соус.','Chrumkavé kurča, čedar, šalát, uhorka a medovo-horčicový dresing.',990,'🍗','','',true,30),
('veggie-burger','burger','Грін Бургер','Green Burger','Овочева котлета, чедер, рукола, помідор, цибуля та соус айвар.','Zeleninová placka, čedar, rukola, paradajka, cibuľa a ajvar dresing.',940,'🥬','Без м''яса','Bez mäsa',true,40),
('quad-menu','combo','Квадро Меню','Quadro Menu','Квадро Бургер, велика картопля фрі, соус та напій 0,5 л.','Quadro Burger, veľké hranolky, omáčka a nápoj 0,5 l.',1590,'🍔','Найвигідніше','Top ponuka',true,50),
('classic-menu','combo','Класік Меню','Classic Menu','Класік Чіз, картопля фрі, соус та напій 0,5 л.','Classic Cheese, hranolky, omáčka a nápoj 0,5 l.',1290,'🍟','','',true,60),
('chicken-menu','combo','Чікен Меню','Chicken Menu','Чікен Кранч, картопля фрі, соус та напій 0,5 л.','Chicken Crunch, hranolky, omáčka a nápoj 0,5 l.',1390,'🥤','','',true,70),
('pizza-margherita','pizza','Маргарита','Margherita','Томатний соус, моцарела, базилік та оливкова олія. 33 см.','Paradajková omáčka, mozzarella, bazalka a olivový olej. 33 cm.',890,'🍕','','',true,80),
('pizza-pepperoni','pizza','Пепероні','Pepperoni','Томатний соус, моцарела та пікантна салямі. 33 см.','Paradajková omáčka, mozzarella a pikantná saláma. 33 cm.',1090,'🍕','Хіт','Hit',true,90),
('pizza-quattro','pizza','Кватро Формаджі','Quattro Formaggi','Моцарела, горгонзола, пармезан та копчений сир. 33 см.','Mozzarella, gorgonzola, parmezán a údený syr. 33 cm.',1150,'🧀','','',true,100),
('pizza-diavola','pizza','Діавола','Diavola','Томатний соус, моцарела, гостра салямі, чилі та цибуля. 33 см.','Paradajková omáčka, mozzarella, pikantná saláma, chilli a cibuľa. 33 cm.',1150,'🌶️','Гостра','Pikantná',true,110),
('fries','sides','Картопля фрі','Hranolky','Подвійно обсмажена картопля з копченою паприкою.','Dvakrát vyprážané hranolky s údenou paprikou.',320,'🍟','','',true,120),
('loaded-fries','sides','Чедер Фрі','Cheddar Fries','Картопля фрі, чедерний соус, бекон і хрустка цибуля.','Hranolky, čedarová omáčka, slanina a chrumkavá cibuľka.',690,'🧀','','',true,130),
('onion-rings','sides','Цибулеві кільця','Cibuľové krúžky','Хрусткі цибулеві кільця з домашнім соусом.','Chrumkavé cibuľové krúžky s domácou omáčkou.',390,'🧅','','',true,140),
('kofola','drinks','Kofola 0,5 л','Kofola 0,5 l','Охолоджена Kofola Original.','Vychladená Kofola Original.',240,'🥤','','',true,150),
('cola','drinks','Coca-Cola 0,5 л','Coca-Cola 0,5 l','Original або Zero — вкажіть у коментарі.','Original alebo Zero — uveďte v poznámke.',240,'🥤','','',true,160),
('lemonade','drinks','Домашній лимонад','Domáca limonáda','Лимон, лайм, м''ята та содова. 0,4 л.','Citrón, limetka, mäta a sóda. 0,4 l.',320,'🍋','','',true,170),
('water','drinks','Мінеральна вода','Minerálna voda','Газована або негазована. 0,5 л.','Sýtená alebo nesýtená. 0,5 l.',190,'💧','','',true,180)
on conflict (id) do nothing;

analyze public.products;
analyze public.orders;
