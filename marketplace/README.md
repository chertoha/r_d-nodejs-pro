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
