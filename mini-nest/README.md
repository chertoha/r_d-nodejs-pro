# Mini Nest

A small IoC container built from scratch with TypeScript and `reflect-metadata`.

The project demonstrates how dependency injection works under the hood in frameworks such as NestJS: constructor metadata is read at runtime and used to recursively build a dependency graph.

## Features

- `@Injectable()` class decorator
- Dependency resolution using `design:paramtypes`
- Recursive dependency graph resolution
- Singleton scope by default
- Transient scope
- `@Inject(token)` for explicit dependency injection
- Custom provider registration by token
- Circular dependency detection
- Automated tests using `node:test`
- Multi-stage Docker build

## Project structure

```text
src/
├── decorators/
│   ├── injectable.ts
│   └── inject.ts
├── container.ts
├── tokens.ts
└── index.ts

test/
└── container.test.ts
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

## Tests

The tests cover:

- recursive dependency resolution (`A -> B -> C`);
- singleton scope;
- transient scope;
- explicit dependency injection with `@Inject(token)`;
- circular dependency detection.

Build the project and run the tests locally:

```bash
npm run build
npm test
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

## Як це працює

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
