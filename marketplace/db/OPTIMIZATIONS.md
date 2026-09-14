# Оптимізація запитів: EXPLAIN до/після

Виміряно локально на `postgres:17-alpine` (docker-compose, чистий volume),
після `db/schema.sql` -> `db/seed.sql` (`users` 15 000, `products` 120 000,
`orders` 120 000, `order_items` ~239 696).

## q1 — пошук замовлень власника за період

```sql
SELECT id, status, total, created_at
FROM orders
WHERE user_id = 1
  AND created_at BETWEEN now() - interval '180 days' AND now()
ORDER BY created_at DESC
```

### До індексів

```
                                                       QUERY PLAN
-------------------------------------------------------------------------------------------------------------------------
 Gather Merge  (cost=3837.73..3837.84 rows=1 width=30) (actual time=3.403..4.669 rows=5 loops=1)
   Workers Planned: 1
   Workers Launched: 1
   Buffers: shared hit=1110
   ->  Sort  (cost=2837.72..2837.72 rows=1 width=30) (actual time=2.053..2.053 rows=2 loops=2)
         Sort Key: created_at DESC
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=1110
         Worker 0:  Sort Method: quicksort  Memory: 25kB
         ->  Parallel Seq Scan on orders  (cost=0.00..2837.71 rows=1 width=30) (actual time=0.441..1.994 rows=2 loops=2)
               Filter: ((user_id = 1) AND (created_at <= now()) AND (created_at >= (now() - '180 days'::interval)))
               Rows Removed by Filter: 59998
               Buffers: shared hit=1073
 Planning:
   Buffers: shared hit=103
 Planning Time: 0.378 ms
 Execution Time: 4.709 ms
(17 rows)
```

### Після `idx_orders_user_created` (user_id, created_at)

```
                                                              QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=12.25..12.26 rows=2 width=30) (actual time=0.073..0.074 rows=5 loops=1)
   Sort Key: created_at DESC
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=11 read=3
   ->  Bitmap Heap Scan on orders  (cost=4.45..12.24 rows=2 width=30) (actual time=0.036..0.054 rows=5 loops=1)
         Recheck Cond: ((user_id = 1) AND (created_at >= (now() - '180 days'::interval)) AND (created_at <= now()))
         Heap Blocks: exact=5
         Buffers: shared hit=8 read=3
         ->  Bitmap Index Scan on idx_orders_user_created  (cost=0.00..4.45 rows=2 width=0) (actual time=0.027..0.027 rows=5 loops=1)
               Index Cond: ((user_id = 1) AND (created_at >= (now() - '180 days'::interval)) AND (created_at <= now()))
               Buffers: shared hit=3 read=3
 Planning:
   Buffers: shared hit=140 read=2
 Planning Time: 0.552 ms
 Execution Time: 0.110 ms
(15 rows)
```

`Parallel Seq Scan on orders` (перебір усіх 120 000 рядків) зник, замість нього — `Bitmap Index Scan using idx_orders_user_created`, що одразу знаходить лише рядки конкретного власника за потрібний період; buffers впали з ~1213 до ~14 (shared hit), execution time — з 4.7 мс до 0.11 мс (~43x).

## q2 — фільтр по статусу (мінорний статус "pending")

```sql
SELECT id, user_id, total, created_at
FROM orders
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 50
```

### До індексів

```
                                                       QUERY PLAN
------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=2971.76..2971.89 rows=50 width=30) (actual time=4.552..4.556 rows=50 loops=1)
   Buffers: shared hit=1076
   ->  Sort  (cost=2971.76..3001.77 rows=12004 width=30) (actual time=4.551..4.552 rows=50 loops=1)
         Sort Key: created_at DESC
         Sort Method: top-N heapsort  Memory: 30kB
         Buffers: shared hit=1076
         ->  Seq Scan on orders  (cost=0.00..2573.00 rows=12004 width=30) (actual time=0.006..3.828 rows=11946 loops=1)
               Filter: (status = 'pending'::text)
               Rows Removed by Filter: 108054
               Buffers: shared hit=1073
 Planning:
   Buffers: shared hit=92
 Planning Time: 0.342 ms
 Execution Time: 4.588 ms
(14 rows)
```

### Після `idx_orders_pending_created` (partial, `WHERE status = 'pending'`)

```
                                                                        QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=0.29..19.61 rows=50 width=30) (actual time=0.030..0.153 rows=50 loops=1)
   Buffers: shared hit=50 read=2
   ->  Index Scan Backward using idx_orders_pending_created on orders  (cost=0.29..4611.06 rows=11932 width=30) (actual time=0.029..0.150 rows=50 loops=1)
         Buffers: shared hit=50 read=2
 Planning:
   Buffers: shared hit=125
 Planning Time: 0.474 ms
 Execution Time: 0.176 ms
(8 rows)
```

`Seq Scan` + окремий `Sort` по всій таблиці (108 054 рядки відкинуто фільтром) зникли; `Index Scan Backward using idx_orders_pending_created` віддає вже відсортовані рядки напряму з партіального індексу (він містить тільки статус `pending`, ~10% таблиці), тому `LIMIT 50` зупиняється майже одразу. Execution time: 4.59 мс -> 0.18 мс (~26x).

## q3 — пошук користувача без урахування регістру (логін по email)

```sql
SELECT id, email, full_name
FROM users
WHERE lower(email) = lower('user9999@example.com')
```

### До індексів

```
                                            QUERY PLAN
---------------------------------------------------------------------------------------------------
 Seq Scan on users  (cost=0.00..411.00 rows=75 width=55) (actual time=1.321..2.053 rows=1 loops=1)
   Filter: (lower(email) = 'user9999@example.com'::text)
   Rows Removed by Filter: 14999
   Buffers: shared hit=186
 Planning:
   Buffers: shared hit=84
 Planning Time: 0.363 ms
 Execution Time: 2.068 ms
(8 rows)
```

### Після `idx_users_email_lower` (expression, `lower(email)`)

```
                                                          QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------
 Index Scan using idx_users_email_lower on users  (cost=0.29..8.30 rows=1 width=55) (actual time=0.019..0.020 rows=1 loops=1)
   Index Cond: (lower(email) = 'user9999@example.com'::text)
   Buffers: shared hit=1 read=2
 Planning:
   Buffers: shared hit=103 read=1
 Planning Time: 0.439 ms
 Execution Time: 0.040 ms
(7 rows)
```

Звичайний btree по `email` тут би не спрацював — умова фільтрує по `lower(email)`, а не по самій колонці. Expression-індекс `idx_users_email_lower` зберігає вже обчислені значення `lower(email)`, тому `Seq Scan` замінився на `Index Scan using idx_users_email_lower`: execution time 2.07 мс -> 0.04 мс (~52x).

## q4 — повнотекстовий пошук по каталогу

```sql
SELECT id, name, ts_rank(search_vector, plainto_tsquery('simple', 'шкіряні кросівки')) AS rank
FROM products
WHERE search_vector @@ plainto_tsquery('simple', 'шкіряні кросівки')
ORDER BY rank DESC, id
LIMIT 20
```

Фраза «шкіряні кросівки» зустрічається у 2467 з 120 000 товарів (~2%) — достатньо рідко, щоб індекс мав сенс, і достатньо часто, щоб не залежати від випадковості одного рядка.

### До індексів

```
                                                       QUERY PLAN
------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=10787.51..10787.56 rows=20 width=57) (actual time=25.766..25.768 rows=20 loops=1)
   Buffers: shared hit=9292
   ->  Sort  (cost=10787.51..10787.64 rows=52 width=57) (actual time=25.765..25.766 rows=20 loops=1)
         Sort Key: (ts_rank(search_vector, '''шкіряні'' & ''кросівки'''::tsquery)) DESC, id
         Sort Method: top-N heapsort  Memory: 27kB
         Buffers: shared hit=9292
         ->  Seq Scan on products  (cost=0.00..10786.13 rows=52 width=57) (actual time=0.022..25.514 rows=2467 loops=1)
               Filter: (search_vector @@ '''шкіряні'' & ''кросівки'''::tsquery)
               Rows Removed by Filter: 117533
               Buffers: shared hit=9286
 Planning:
   Buffers: shared hit=127
 Planning Time: 0.552 ms
 Execution Time: 25.795 ms
(14 rows)
```

### Після `idx_products_search_vector` (GIN, tsvector) — третій прогін (перший після `CREATE INDEX` "холодний")

```
                                                                     QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------------------------------
 Limit  (cost=201.65..201.70 rows=20 width=57) (actual time=4.019..4.021 rows=20 loops=1)
   Buffers: shared hit=2216
   ->  Sort  (cost=201.65..201.77 rows=47 width=57) (actual time=4.018..4.019 rows=20 loops=1)
         Sort Key: (ts_rank(search_vector, '''шкіряні'' & ''кросівки'''::tsquery)) DESC, id
         Sort Method: top-N heapsort  Memory: 27kB
         Buffers: shared hit=2216
         ->  Bitmap Heap Scan on products  (cost=21.73..200.40 rows=47 width=57) (actual time=0.568..3.812 rows=2467 loops=1)
               Recheck Cond: (search_vector @@ '''шкіряні'' & ''кросівки'''::tsquery)
               Heap Blocks: exact=2203
               Buffers: shared hit=2210
               ->  Bitmap Index Scan on idx_products_search_vector  (cost=0.00..21.71 rows=47 width=0) (actual time=0.415..0.415 rows=2467 loops=1)
                     Index Cond: (search_vector @@ '''шкіряні'' & ''кросівки'''::tsquery)
                     Buffers: shared hit=7
 Planning:
   Buffers: shared hit=151
 Planning Time: 0.583 ms
 Execution Time: 4.075 ms
(17 rows)
```

`Seq Scan` (перебір усіх 120 000 рядків, 9286 buffers) замінився на `Bitmap Index Scan on idx_products_search_vector`, що за 7 buffers знаходить самі TID-и 2467 підходящих рядків, а потім `Bitmap Heap Scan` читає лише їх. Execution time: 25.8 мс -> 4.1 мс (~6.3x) — менше, ніж у q1-q3, бо `Heap Blocks: exact=2203` майже дорівнює кількості знайдених рядків (2467): дані вставлялись у випадковому порядку, тому 2467 співпадінь розкидані по 2203 різних сторінках таблиці — GIN економить на переборі "зайвих" 117 533 рядків, але не на heap-fetch для самих співпадінь (BUFFERS впали в ~4.2 рази, з 9419 до 2367).

## Морфологія

```sql
SELECT count(*) FROM products WHERE search_vector @@ plainto_tsquery('simple', 'кросівки');  -- 2467
SELECT count(*) FROM products WHERE search_vector @@ plainto_tsquery('simple', 'кросівок');   -- 1184
```

`to_tsvector('simple', ...)` не робить жодного морфологічного аналізу — це буквальна токенізація й приведення до нижнього регістру, без словника. Тому `'кросівки'` (називний відмінок) і `'кросівок'` (родовий відмінок) — це для `simple`-конфігу два зовсім різних, ніяк не пов'язаних токени, і рахунки збігів відрізняються (2467 проти 1184), хоча йдеться про той самий товар у мові користувача. `SELECT count(*) FROM pg_ts_config;` показує, що вбудованої конфігурації `ukrainian` у стандартному Postgres немає (`\dF` — тільки `simple` та мовні конфіги на кшталт `english`/`russian`/`german` тощо); підміна `simple` на `russian` не виправить ситуацію, а лише створить ілюзію "працює" — це стемер іншої мови, який працюватиме над українськими словами непередбачувано (десь випадково збіжиться через спільне слов'янське коріння, десь ні), тобто буде самообманом, а не рішенням: повноцінна українська морфологія в Postgres потребує стороннього словника/розширення, а не заміни ключового слова конфігу.

## Вартість `search_vector` (додатково)

Виміряно `pg_total_relation_size`/`pg_relation_size` на тій самій таблиці `products` (120 000 рядків) з генерованою `search_vector` і без неї:

| | без `search_vector` | з `search_vector` (heap) | + GIN індекс |
|---|---|---|---|
| розмір | 35 MB | 73 MB | +3.5 MB (`idx_products_search_vector`) |

Збережена `tsvector`-колонка більш ніж подвоює розмір таблиці (35 MB -> 73 MB) — Postgres зберігає одразу і сирі `name`/`description`, і вже пораховане, доволі важке `tsvector`-представлення для кожного рядка. Це нормальна плата за швидкий пошук: `INSERT`/`UPDATE` цих колонок тепер завжди перераховують `search_vector`, а самі рядки стають важчими на диску.
