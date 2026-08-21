# Docker Homework

Simple Express.js API with PostgreSQL, packaged with Docker and Docker Compose.

## Run in development mode

Development mode uses `docker-compose.override.yml` automatically.

It enables:

- bind mount for source files;
- hot reload with Nodemon;
- port `3000` exposed to the host;
- `builder` stage of the Dockerfile.

```bash
docker compose up --build
```

Run in background:

```bash
docker compose up -d --build
```

The API is available at:

```text
http://localhost:3000
```

Healthcheck endpoint:

```text
http://localhost:3000/health
```

Users endpoint:

```text
http://localhost:3000/users
```

Stop containers:

```bash
docker compose down
```

---

## Run without development override

To run only the base `docker-compose.yml` configuration:

```bash
docker compose -f docker-compose.yml up --build
```

Or in background:

```bash
docker compose -f docker-compose.yml up -d --build
```

This configuration uses the final `runner` stage of the multi-stage Dockerfile and does not use source bind mounts or Nodemon.

---

## Docker image size comparison

Two images were built to compare the multi-stage build with a simple single-stage build.

Multi-stage production image:

```bash
docker build -f Dockerfile -t express-good .
```

Single-stage image:

```bash
docker build -f Dockerfile-bad -t express-bad .
```

Image sizes:

| Image                 | Build type   | Disk usage | Content size |
| --------------------- | ------------ | ---------: | -----------: |
| `express-good:latest` | Multi-stage  |     328 MB |      80.2 MB |
| `express-bad:latest`  | Single-stage |     371 MB |      92.7 MB |

The multi-stage image is smaller because the final image contains only the Node.js runtime and the built `dist` artifact, while build tools, development dependencies, `node_modules`, and source files remain in the builder stage.

---

## PostgreSQL persistence

PostgreSQL data is stored in a named Docker volume:

```yaml
volumes:
  pgdata:
```

To verify that the data persists after the containers are recreated, first start with a clean database by removing the existing containers and volume:

```bash
docker compose down -v
docker compose up -d
```

Initially, the users table is empty:

```bash
curl http://localhost:3000/users
```

Expected response:

```json
[]
```

Seed the database:

```bash
curl -X POST http://localhost:3000/seed
```

Expected response:

```json
{ "message": "Database seeded successfully" }
```

Verify that the users were created:

```bash
curl http://localhost:3000/users
```

The response contains the seeded users.

Then stop and remove the containers without removing the named volume:

```bash
docker compose down
```

Start the stack again:

```bash
docker compose up -d
```

Without calling the `/seed` endpoint again, request the users:

```bash
curl http://localhost:3000/users
```

The previously created users are still returned, which confirms that the PostgreSQL data persisted in the `pgdata` volume after the containers were recreated.

To remove the PostgreSQL data together with the containers:

```bash
docker compose down -v
```

---

## Healthcheck

Check container status:

```bash
docker compose ps
```

Or inspect the API container health status directly:

```bash
docker inspect --format '{{.State.Health.Status}}' <api-container>
```

After startup, the API container should report:

```text
healthy
```
