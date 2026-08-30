# Marketplace API

OpenAPI contract for the Marketplace course project.

The API currently defines two resources:

- Products
- Orders

The OpenAPI specification is located at:

```text
openapi/openapi.yaml
```

## Contract validation approach

This homework uses **Option B — runtime validation**.

The application uses:

- Express 4
- `express-openapi-validator`
- OpenAPI 3.0.3

Incoming requests and outgoing responses are validated against `openapi/openapi.yaml`.

OpenAPI validation errors are returned using `application/problem+json`.

## Install

Install dependencies:

```bash
npm install
```

## Run

Start the contract server:

```bash
npm start
```

The server runs at:

```text
http://localhost:3000
```

The server uses in-memory data, so all created products and orders are lost after restart.

## OpenAPI validation

Validate the OpenAPI specification with Redocly CLI:

```bash
npx @redocly/cli@2.46.0 lint openapi/openapi.yaml
```

Warnings are allowed. The command must finish with exit code `0`.

## Check API operations and resources

Bundle the OpenAPI specification:

```bash
npx @redocly/cli@2.46.0 bundle openapi/openapi.yaml -o spec.json
```

Check the number of operations and resources and validate the `Idempotency-Key` declaration:

```bash
node -e "const s=require('./spec.json'),M=['get','post','put','patch','delete']; const ops=Object.entries(s.paths).flatMap(([p,v])=>Object.keys(v).filter(m=>M.includes(m)).map(m=>[p,m])); const idem=ops.flatMap(([p,m])=>s.paths[p][m].parameters??[]).find(x=>x.in==='header'&&/idempotency-key/i.test(x.name)); console.log('operations:',ops.length,'resources:',new Set(Object.keys(s.paths).map(p=>p.split('/')[1])).size); console.log('Idempotency-Key: required =',idem?.required,'description length =',(idem?.description??'').trim().length)"
```

Expected:

```text
operations: 5
resources: 2
Idempotency-Key: required = true
description length >= 40
```

## Check required OpenAPI features

Check `Idempotency-Key`:

```bash
grep -c 'Idempotency-Key' openapi/openapi.yaml
```

Expected value: at least `1`.

Check cursor pagination:

```bash
grep -c 'next_cursor' openapi/openapi.yaml
```

Expected value: at least `1`.

Check Problem Details responses:

```bash
grep -c 'application/problem+json' openapi/openapi.yaml
```

Expected value: at least `2`.

## Runtime contract validation

Start the server before running the following checks:

```bash
npm start
```

Run the requests below from another terminal.

### Missing Idempotency-Key

A request without the required `Idempotency-Key` header must be rejected by the OpenAPI validator:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"prod-1","quantity":1}]}'
```

Expected:

```text
HTTP 400
Content-Type: application/problem+json
```

The response detail should contain:

```text
request/headers must have required property 'idempotency-key'
```

### Invalid request body

An order must contain at least one item:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-1" \
  -d '{"items":[]}'
```

Expected:

```text
HTTP 400
Content-Type: application/problem+json
```

The response detail should contain:

```text
request/body/items must NOT have fewer than 1 items
```

### Valid request

Create a valid order:

```bash
curl -i -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-1" \
  -d '{"items":[{"product_id":"prod-1","quantity":2}]}'
```

Expected:

```text
HTTP 201
Content-Type: application/json
```

Example response:

```json
{
  "id": "order-1",
  "items": [
    {
      "product_id": "prod-1",
      "quantity": 2
    }
  ],
  "total_cents": 17800,
  "status": "created"
}
```

## API operations

The current OpenAPI contract contains five operations:

```text
GET  /products
POST /products
GET  /products/{id}
POST /orders
GET  /orders/{id}
```

`GET /products` uses cursor pagination with `limit`, `cursor`, and `next_cursor`.

`POST /orders` requires the `Idempotency-Key` header.

All documented `4xx` responses use the `application/problem+json` media type.
