# Marketplace API

Marketplace course project built with NestJS, PostgreSQL and OpenAPI.

The API currently contains two resources:

- Products
- Orders

The OpenAPI specification is located at:

```text
openapi/openapi.yaml
```

## Install

```bash
npm install
```

## OpenAPI contract

The API contract uses OpenAPI 3.0.3 and defines:

```text
GET  /products
POST /products
GET  /products/{id}
POST /orders
GET  /orders/{id}
```

`GET /products` uses cursor pagination.

`POST /orders` requires the `Idempotency-Key` header.

Error responses use `application/problem+json`.

Validate the specification:

```bash
npx @redocly/cli@2.46.0 lint openapi/openapi.yaml
```

The contract validation server uses Express 4 with `express-openapi-validator`.

Run it with:

```bash
npm run start:contract
```

## Configuration

Application configuration is defined and validated with Zod in:

```text
src/config/env.schema.ts
```

Invalid configuration causes the application to fail immediately on startup. Application code accesses configuration through typed `ConfigService<Env, true>`.

### Environment variables

| Variable           | Required | Default | Description                                         |
| ------------------ | -------- | ------- | --------------------------------------------------- |
| `PORT`             | No       | `3000`  | NestJS HTTP server port                             |
| `DB_HOST`          | Yes      | —       | PostgreSQL host                                     |
| `DB_PORT`          | No       | `5432`  | PostgreSQL port                                     |
| `DB_NAME`          | Yes      | —       | PostgreSQL database name                            |
| `DB_USER`          | Yes      | —       | PostgreSQL user                                     |
| `DB_PASSWORD_FILE` | Yes      | —       | Path to the file containing the PostgreSQL password |
| `DATABASE_URL`     | No       | —       | Single connection-string form of the vars above. Source: derived from the same secrets storage (`DB_HOST/PORT/NAME/USER` + `secrets/db_password`) — not read by `DatabaseService`, kept for tooling that expects one connection string (e.g. future TypeORM migrations) |

Create local configuration from the example:

```bash
cp .env.example .env
```

Check that `.env.example` is synchronized with the Zod schema:

```bash
npm run check:env
```

The real `.env` is ignored by Git and excluded from the Docker image.

## Database secret

The PostgreSQL password is stored in:

```text
secrets/db_password
```

The password itself is never stored in an environment variable. `DB_PASSWORD_FILE` contains only the path to the secret file.

The `secrets/` directory is ignored by Git and excluded from the Docker image.

Before the first start, create the secret:

```bash
mkdir -p secrets
printf 'marketplace_dev_password' > secrets/db_password
```

`pg.Pool` reads this file through an asynchronous `password` callback whenever a new database connection is created.

## Run

Start the NestJS application and PostgreSQL:

```bash
docker compose up --build
```

The API is available at:

```text
http://localhost:3000
```

Check the application:

```bash
curl http://localhost:3000/health
```

Check the database connection:

```bash
curl http://localhost:3000/health/db
```

Stop the containers:

```bash
docker compose down
```

For local development with watch mode:

```bash
npm run start:dev
```

## Database schema, seed & query optimization (HW #12)

Domain tables, seed data and query-optimization work live in `db/`:

| File                                  | Purpose                                                    |
| -------------------------------------- | ----------------------------------------------------------- |
| `db/schema.sql`                       | tables, constraints, generated `search_vector` column      |
| `db/seed.sql`                         | realistic-volume seed data + `VACUUM (ANALYZE)`             |
| `db/queries/q1.sql` .. `db/queries/q4.sql` | one real API query per file                            |
| `db/indexes.sql`                      | all optimization indexes, including the GIN full-text index |
| `db/OPTIMIZATIONS.md`                 | `EXPLAIN (ANALYZE, BUFFERS)` before/after for each query    |

Main table (≥100 000 rows): `orders`. Full-text search table (≥100 000 rows): `products`.

Raise a clean database (creates the dev secret file, then starts only the `db` service):

```bash
mkdir -p secrets && printf 'marketplace_dev_password' > secrets/db_password && docker compose up -d --wait db
```

Connect to it:

```bash
docker compose exec db psql -U user -d r_d__marketplace
```

Full verification cycle (clean volume -> schema -> seed -> EXPLAIN before -> indexes -> EXPLAIN after):

```bash
docker compose down -v
docker compose up -d --wait db
docker compose exec -T db psql -U user -d r_d__marketplace < db/schema.sql
docker compose exec -T db psql -U user -d r_d__marketplace < db/seed.sql

# before indexes: every query below must contain "Seq Scan"
for q in q1 q2 q3 q4; do
  docker compose exec -T db psql -U user -d r_d__marketplace \
    -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/$q.sql)"
done

docker compose exec -T db psql -U user -d r_d__marketplace < db/indexes.sql
docker compose exec -T db psql -U user -d r_d__marketplace -c "ANALYZE;"

# after indexes: no "Seq Scan"; q4 uses a cold GIN on the first run after
# CREATE INDEX, so run it 2-3 times and read the last one
for q in q1 q2 q3 q4; do
  docker compose exec -T db psql -U user -d r_d__marketplace \
    -c "EXPLAIN (ANALYZE, BUFFERS) $(cat db/queries/$q.sql)"
done
```

## ORM: TypeORM (HW #13)

The HW #12 SQL schema now also lives in code as TypeORM entities, migrations and scripts:

| File / dir             | Purpose                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `src/entities/`         | `User`, `Product`, `Order`, `OrderItem` entities            |
| `src/migrations/`       | generated migration(s), read and adjusted by hand           |
| `src/data-source.ts`    | `DataSource` with `synchronize: false`, reads `process.env` |
| `src/seed.ts`           | deterministic, idempotent seed (6 users, 8 products, 4 orders, 8 order items) |
| `src/demo-nplus1.ts`    | N+1 demo: naive query-in-a-loop vs `relations`/`leftJoinAndSelect` |
| `src/report.ts`         | revenue-by-category report via `createQueryBuilder().getRawMany()` |

`order_items` is an explicit join entity (not `@ManyToMany`): the order <-> product association carries its own data (`quantity`, `unit_price_cents` at the time of purchase).

Money is stored as `integer` minor units (cents) — `price_cents`, `total_cents`, `unit_price_cents` — not `numeric`/`float`, so results always come back as plain JS numbers instead of the strings `pg` returns for `numeric`.

### onDelete choices

| Relation                        | onDelete  | Why                                                                 |
| -------------------------------- | --------- | -------------------------------------------------------------------- |
| `products.seller_id -> users.id` | `RESTRICT` | A seller's catalog must not vanish silently when the account is deleted |
| `orders.user_id -> users.id`     | `RESTRICT` | Order history is a financial record; it must outlive the user row  |
| `order_items.product_id -> products.id` | `RESTRICT` | A product that was ever sold must stay referenceable from past order items |
| `order_items.order_id -> orders.id` | `CASCADE`  | A line item has no meaning without its order -- a fully owned child record |

### Build & migrations

```bash
npm run build
npm run migrate
npm run migrate:show
npm run migrate:revert
```

`migration:generate` runs against the compiled `DataSource`:

```bash
npx typeorm migration:generate -d dist/data-source.js src/migrations/Name
npm run build
```

### Seed

```bash
npm run seed
npm run seed
```

The second run prints `... already seeded ... -- skipping` and leaves row counts unchanged. Verify directly:

```bash
docker compose exec db psql -U user -d r_d__marketplace \
  -c "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM products) AS products, (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM order_items) AS order_items"
```

### N+1: demonstrated and fixed

```bash
npm run demo:nplus1
```

Measured on the graph `order -> items -> product` (2 relation levels) against the seeded data:

| Strategy                          | Queries |
| ----------------------------------- | ------- |
| naive (query in a loop)            | 13 (for 4 orders) |
| `relations` / `leftJoinAndSelect`  | 1       |

The naive path fetches all orders, then queries `order_items` per order, then queries `products` per item -- one query per iteration at every level. The fixed path asks for `relations: { items: { product: true } }`, which TypeORM resolves as a single `LEFT JOIN` query regardless of how many orders or items exist.

### Report

```bash
npm run report
```

Prints revenue and units sold grouped by product category, computed from `order_items.unit_price_cents` (the price actually charged at purchase time, not the product's current price).

### Repository vs QueryBuilder

`Repository`/`find()` covers anything expressible as filter + relations + pagination -- the common case, and the one that keeps intent readable. `createQueryBuilder()` comes out once a query needs a `GROUP BY`/aggregate, a join condition `find()` can't express, or raw SQL functions -- the report above (`SUM(...) GROUP BY category`) has no `find()` equivalent, since `find()` always returns entity rows, never aggregated ones.

### Connection: from storage, no new env file

`src/data-source.ts` has no hardcoded host/password -- every value comes from `process.env`, populated by `scripts/with-secrets.sh` (the HW #11 wrapper). Every script that touches the database (`migrate`, `migrate:show`, `migrate:revert`, `seed`, `demo:nplus1`, `report`) is prefixed with `bash scripts/with-secrets.sh dev ...`.

With `SKIP_VAULT` unset, the wrapper prefers a real `infisical` CLI if one is on `PATH`, otherwise falls back to a local, gitignored `.secrets/infisical.env` (created by hand, one `KEY=value` per line: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Neither file is tracked by Git.

## Grading

The grader has no access to the secrets storage above, so it runs with `SKIP_VAULT=1` and the dev credentials already present in `docker-compose.yml`:

```bash
docker compose up -d --wait
export DB_HOST=127.0.0.1 DB_PORT=5433 DB_USER=user DB_PASSWORD=marketplace_dev_password DB_NAME=r_d__marketplace
export SKIP_VAULT=1
```

After that, every command from the acceptance criteria works as written: `npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run migrate`, `npm run migrate:show`, `npm run migrate:revert`, `npm run seed`, `npm run demo:nplus1`, `npm run report`.

On a completely fresh clone, `secrets/db_password` does not exist yet either (see "Database secret" above) -- create it before `docker compose up`:

```bash
mkdir -p secrets && printf 'marketplace_dev_password' > secrets/db_password
```

## Database password rotation

The PostgreSQL password can be rotated without restarting the NestJS application.

With the application running, check its current uptime:

```bash
curl http://localhost:3000/health
```

Rotate the password:

```bash
bash scripts/rotate.sh
```

The script:

1. changes the PostgreSQL role password with `ALTER ROLE`;
2. updates `secrets/db_password`;
3. terminates old PostgreSQL connections with `pg_terminate_backend`.

On the next database connection, `pg.Pool` reads the new password from the secret file.

Verify database access:

```bash
curl http://localhost:3000/health/db
```

Then check uptime again:

```bash
curl http://localhost:3000/health
```

The database request should succeed and uptime should continue increasing, proving that the application was not restarted.

## Security

Real configuration and secrets are excluded from Git and Docker images:

```text
.env
secrets/
```

The Docker image contains `.env.example` as the configuration contract, but never contains `.env` or `secrets/db_password`.
