
-- 1. Users: ~15 000 buyers/sellers. id = 1 is pinned to 'buyer' so that
--    db/queries/q1.sql (owner search) always has a real, existing owner.
INSERT INTO users (email, full_name, role, created_at)
SELECT
    'user' || i || '@example.com',
    'Користувач ' || i,
    CASE
        WHEN i = 1 THEN 'buyer'
        WHEN random() < 0.2 THEN 'seller'
        ELSE 'buyer'
    END,
    now() - (random() * interval '730 days')
FROM generate_series(1, 15000) AS s(i);

-- 2. Products: ~120 000 rows across 5 categories.
--    ~10% of "взуття" (shoes) rows get the exact phrase "Шкіряні кросівки"
--    in the name -> ~2% of the whole catalog matches db/queries/q4.sql.
--    ~1% of ALL rows (any category) get a marketing sentence mentioning
--    the genitive plural "кросівок" -> used for the ## Морфологія section.
WITH seller_pool AS (
    SELECT array_agg(id) AS ids FROM users WHERE role = 'seller'
)
INSERT INTO products (seller_id, name, description, price, stock, category, created_at)
SELECT
    seller_pool.ids[1 + floor(random() * array_length(seller_pool.ids, 1))::int],
    p.name,
    p.description,
    p.price,
    p.stock,
    p.category,
    now() - (random() * interval '730 days')
FROM generate_series(1, 120000) AS s(i)
CROSS JOIN seller_pool
CROSS JOIN LATERAL (
    SELECT
        s.i AS _row,
        (ARRAY['взуття', 'сумки', 'електроніка', 'одяг', 'меблі'])[1 + floor(random() * 5)::int] AS category,
        (ARRAY['Оріон', 'Вертекс', 'Прайм', 'Атлас', 'Нордік', 'Соло', 'Вектор', 'Юніон', 'Стелла', 'Гала'])[1 + floor(random() * 10)::int] AS brand,
        (100 + floor(random() * 900))::int AS model,
        random() AS shoe_roll,
        random() AS morph_roll,
        (ARRAY['стильні', 'якісні', 'практичні', 'сучасні', 'класичні', 'елегантні', 'зручні', 'надійні'])[1 + floor(random() * 8)::int] AS adj,
        (ARRAY['черевики', 'туфлі', 'сандалі', 'чоботи', 'капці'])[1 + floor(random() * 5)::int] AS shoe_noun,
        (ARRAY['сумка', 'рюкзак', 'гаманець', 'клатч'])[1 + floor(random() * 4)::int] AS bag_noun,
        (ARRAY['смартфон', 'навушники', 'планшет', 'зарядний пристрій'])[1 + floor(random() * 4)::int] AS electronics_noun,
        (ARRAY['светр', 'куртка', 'сорочка', 'джинси'])[1 + floor(random() * 4)::int] AS clothes_noun,
        (ARRAY['стілець', 'стіл', 'шафа', 'полиця'])[1 + floor(random() * 4)::int] AS furniture_noun
) AS r
CROSS JOIN LATERAL (
    SELECT
        CASE r.category
            WHEN 'взуття' THEN
                CASE
                    WHEN r.shoe_roll < 0.10 THEN 'Шкіряні кросівки ' || r.brand || ' ' || r.model::text
                    ELSE initcap(r.adj) || ' ' || r.shoe_noun || ' ' || r.brand || ' ' || r.model::text
                END
            WHEN 'сумки' THEN initcap(r.adj) || ' ' || r.bag_noun || ' ' || r.brand || ' ' || r.model::text
            WHEN 'електроніка' THEN initcap(r.adj) || ' ' || r.electronics_noun || ' ' || r.brand || ' ' || r.model::text
            WHEN 'одяг' THEN initcap(r.adj) || ' ' || r.clothes_noun || ' ' || r.brand || ' ' || r.model::text
            ELSE initcap(r.adj) || ' ' || r.furniture_noun || ' ' || r.brand || ' ' || r.model::text
        END AS name,
        'Опис товару категорії ' || r.category || '. Матеріали перевірені, доставка по всій Україні. Модель ' || r.model::text || '.'
            || CASE WHEN r.morph_roll < 0.01 THEN ' Один із хітів продажів серед кросівок цього сезону.' ELSE '' END AS description,
        round((random() * 990 + 10)::numeric, 2) AS price,
        floor(random() * 200)::int AS stock,
        r.category AS category
) AS p;

-- 3. Orders: ~120 000 rows, skewed status distribution (not 20/20/20/20/20).
WITH buyer_pool AS (
    SELECT array_agg(id) AS ids FROM users WHERE role = 'buyer'
)
INSERT INTO orders (user_id, status, total, created_at)
SELECT
    buyer_pool.ids[1 + floor(random() * array_length(buyer_pool.ids, 1))::int],
    CASE
        WHEN rr.r < 0.55 THEN 'delivered'
        WHEN rr.r < 0.70 THEN 'shipped'
        WHEN rr.r < 0.85 THEN 'paid'
        WHEN rr.r < 0.95 THEN 'pending'
        ELSE 'cancelled'
    END,
    round((random() * 490 + 10)::numeric, 2),
    now() - (random() * interval '730 days')
FROM generate_series(1, 120000) AS s(i)
CROSS JOIN buyer_pool
-- s.i forces per-row (lateral) evaluation of random(), same reason as above.
CROSS JOIN LATERAL (SELECT s.i AS _row, random() AS r) AS rr;

-- 4. Order items: 1-4 line items per order (~250k-300k rows total).
WITH product_pool AS (
    SELECT array_agg(id) AS ids FROM products
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT
    o.id,
    product_pool.ids[1 + floor(random() * array_length(product_pool.ids, 1))::int],
    1 + floor(random() * 4)::int,
    round((random() * 195 + 5)::numeric, 2)
FROM orders o
CROSS JOIN product_pool
-- o.id forces this item-count draw to be re-evaluated per order; without it
-- Postgres computes one item_count value for the whole INSERT.
CROSS JOIN LATERAL (SELECT o.id AS _row, (1 + floor(random() * 3))::int AS item_count) AS ic
CROSS JOIN LATERAL generate_series(1, ic.item_count) AS gi(n);

-- VACUUM (not just ANALYZE) refreshes the visibility map, without which
-- Index Only Scans still fall back to heap fetches on freshly loaded data.
VACUUM (ANALYZE);
