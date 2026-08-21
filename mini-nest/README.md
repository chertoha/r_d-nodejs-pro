# Mini Nest

A small NestJS-like framework built from scratch with TypeScript and `reflect-metadata`.

The project demonstrates how dependency injection, routing, controller parameters, and DTO validation work under the hood in frameworks such as NestJS.

The project is implemented directly on top of Node.js without NestJS, Express, or Fastify.

## Features

### IoC Container

- `@Injectable()` class decorator
- Dependency resolution using `design:paramtypes`
- Recursive dependency graph resolution
- Singleton scope by default
- Transient scope
- `@Inject(token)` for explicit dependency injection
- Custom provider registration by token
- Circular dependency detection

### HTTP Routing

- `@Controller(prefix)` class decorator
- `@Get(path)` and `@Post(path)` method decorators
- `@Body()`, `@Param(name)`, and `@Query(name)` parameter decorators
- Dynamic routes such as `/users/:id`
- Controller resolution through the IoC container
- HTTP dispatcher built directly on `node:http`
- JSON response serialization

### Validation

- DTO validation using `class-validator`
- Plain request body transformation using `class-transformer`
- Valid request bodies are passed to handlers as DTO instances
- Validation errors return HTTP 400 with field and constraint details

### Testing and Docker

- Automated tests using `node:test`
- HTTP integration tests using the built-in `fetch`
- Multi-stage Docker build
- Tests can be executed inside Docker

## Project structure

```text
src/
├── constants/
│   └── http-status.enum.ts
├── decorators/
│   ├── controller.ts
│   ├── inject.ts
│   ├── injectable.ts
│   ├── methods.ts
│   └── params.ts
├── dto/
│   └── create-user.dto.ts
├── pipes/
│   └── validation.pipe.ts
├── services/
├── types/
├── utils/
│   └── resolvePath.ts
├── container.ts
├── create-app.ts
├── dispatcher.ts
├── router.ts
├── tokens.ts
└── index.ts

test/
├── container.test.ts
└── controller.test.ts
```

## Requirements

- Node.js 22+
- npm
- Docker and Docker Compose for containerized execution

## Install dependencies

```bash
npm ci
```

## Build

Compile the TypeScript source and tests:

```bash
npm run build
```

Compiled files are written to the `dist` directory.

## Run

Build the project first:

```bash
npm run build
```

Then start it:

```bash
npm start
```

For development with automatic TypeScript compilation and application restart:

```bash
npm run dev
```

The HTTP server runs on:

```text
http://localhost:3000
```

## Tests

The tests cover:

- recursive dependency resolution (`A -> B -> C`);
- singleton scope;
- transient scope;
- explicit dependency injection with `@Inject(token)`;
- circular dependency detection;
- route matching;
- `@Param()` parameter extraction;
- `@Query()` parameter extraction;
- correct parameter positions;
- invalid DTO validation;
- transformation of a valid request body into a DTO instance;
- singleton service injection into controllers.

Build the project and run the tests locally:

```bash
npm run build
npm test
```

Or use:

```bash
npm run test:local
```

## Run tests with Docker

The project uses a multi-stage Docker build.

The builder stage installs all dependencies and compiles the TypeScript source and tests. The runner stage contains the compiled JavaScript and production dependencies only.

Run the tests inside Docker:

```bash
docker compose run --rm api npm test
```

Build and start the application:

```bash
docker compose up --build
```

Stop the containers:

```bash
docker compose down
```

# Part 1 — IoC Container

## Як працює dependency injection

TypeScript can emit runtime metadata for decorated classes when both `experimentalDecorators` and `emitDecoratorMetadata` are enabled in `tsconfig.json`.

For example:

```ts
@Injectable()
class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly logger: Logger,
  ) {}
}
```

With `emitDecoratorMetadata` enabled, TypeScript emits metadata describing the constructor parameter types. The container reads this metadata using:

```ts
Reflect.getMetadata("design:paramtypes", UserService)
```

For the example above, the metadata contains the runtime constructors for `UserRepository` and `Logger`. The container recursively resolves these classes, resolves their own dependencies, and finally creates `UserService`.

Without `emitDecoratorMetadata`, TypeScript does not emit `design:paramtypes`, so the container cannot discover constructor dependencies automatically.

TypeScript interfaces do not exist at runtime. A constructor parameter typed with an interface is represented as `Object` in `design:paramtypes`, so the container cannot determine which implementation should be injected from the type alone.

For these cases, `@Inject(token)` stores an explicit runtime token for the constructor parameter:

```ts
constructor(
  @Inject(CONFIG_TOKEN)
  private readonly settings: AppSettings,
) {}
```

A value can then be registered under that token:

```ts
container.register(CONFIG_TOKEN, settings)
```

During resolution, the explicit token takes precedence over the type from `design:paramtypes`.

## Scopes

`@Injectable()` uses singleton scope by default:

```ts
@Injectable()
class Logger {}
```

The same instance is returned for every resolution:

```ts
container.resolve(Logger) === container.resolve(Logger)
```

A transient dependency can be declared explicitly:

```ts
@Injectable({ scope: "transient" })
class UserService {}
```

A new instance is created on every `resolve()` call.

## Circular dependencies

The container tracks the current dependency resolution path.

If a dependency graph contains a cycle such as:

```text
A -> B -> A
```

the container stops resolution and throws a descriptive error instead of eventually failing with a stack overflow:

```text
Circular dependency detected: A -> B -> A
```

# Part 2 — HTTP Routing and Validation

## Controllers and routes

Controllers define a common route prefix using `@Controller()`:

```ts
@Controller("users")
class UserController {
  @Get()
  getUsers() {
    return { users: [] }
  }

  @Get("/:id")
  getUser(@Param("id") id: string) {
    return { id }
  }
}
```

`@Get()` and `@Post()` store route information in method metadata.

The router reads the controller prefix and method metadata during application initialization and combines them into a complete route.

For example:

```ts
@Controller("users")
```

together with:

```ts
@Get("/:id")
```

creates:

```text
GET /users/:id
```

A request to:

```text
GET /users/42
```

therefore matches the route and produces the path parameter:

```text
id = "42"
```

## Parameter decorators

`@Body()`, `@Param(name)`, and `@Query(name)` do not read values from the HTTP request directly.

Instead, each parameter decorator stores metadata describing where the value should come from.

For example:

```ts
@Get("/:id")
getUser(
  @Query("page") page: string,
  @Param("id") id: string,
) {
  return {
    id,
    page,
  }
}
```

### Як parameter decorator знає, куди підставити значення

A TypeScript parameter decorator receives `parameterIndex`, which contains the position of the decorated parameter in the method arguments.

For the method above, the decorators store metadata equivalent to:

```text
0 -> { type: "query", name: "page" }
1 -> { type: "param", name: "id" }
```

For a request:

```text
GET /users/42?page=5
```

the dispatcher reads this metadata and builds the arguments array using the stored indexes:

```ts
args[index] = value
```

The resulting array is:

```ts
;["5", "42"]
```

The handler is then called with:

```ts
handler.call(controllerInstance, ...args)
```

which is equivalent to:

```ts
controller.getUser("5", "42")
```

This is why the order in which `@Body()`, `@Param()`, and `@Query()` are used does not matter. Each decorator stores the exact argument index where its value must be placed.

## HTTP Dispatcher

The HTTP server is built directly on top of `node:http`.

For every request, the dispatcher:

1. checks the HTTP method;
2. parses the request URL;
3. finds the matching route;
4. reads the request body when required;
5. builds the handler arguments using parameter metadata;
6. validates and transforms the DTO when `@Body()` is used;
7. resolves the controller through the IoC container;
8. calls the controller handler;
9. serializes the result to JSON.

Controllers are resolved through the same IoC container implemented in Part 1. This allows controllers to receive services through constructor injection:

```ts
@Controller("users")
class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body)
  }
}
```

## DTO Validation

Request body validation is implemented using `class-transformer` and `class-validator`.

Example:

```ts
export class CreateUserDto {
  @IsString()
  @MinLength(5)
  name: string

  @IsEmail()
  email: string
}
```

Before validation, the plain JSON body is transformed into a DTO instance:

```ts
const instance = plainToInstance(dtoClass, value)
```

The instance is then validated:

```ts
const errors = await validate(instance)
```

If validation succeeds, the DTO instance is passed to the controller method.

Therefore:

```ts
body instanceof CreateUserDto
```

is `true` inside the handler.

If validation fails, the server returns HTTP 400 with all validation errors:

```json
{
  "errors": [
    {
      "field": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ]
}
```

## Example requests

Get users:

```bash
curl -i "http://localhost:3000/users"
```

Get a user with path and query parameters:

```bash
curl -i "http://localhost:3000/users/42?page=5"
```

Create a valid user:

```bash
curl -i -X POST "http://localhost:3000/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Anton","email":"anton@test.com"}'
```

Example response:

```http
HTTP/1.1 201 Created
content-type: application/json
```

Send invalid data:

```bash
curl -i -X POST "http://localhost:3000/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Anton","email":"not-an-email"}'
```

The server responds with HTTP `400 Bad Request` and validation details.
