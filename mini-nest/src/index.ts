import "reflect-metadata"
import { Injectable } from "./decorators/injectable.js"
import { INJECTABLE_TOKEN } from "./tokens.js"
import { Container } from "./container.js"

console.log("Mini Nest started")

@Injectable()
class Config {
  readonly port = 3000
  readonly host = "localhost"
}

@Injectable()
class Logger {
  constructor(private readonly config: Config) {}

  log(message: string) {
    console.log(`[${new Date().toISOString()}][${this.config.host}:${this.config.port}] ${message}`)
  }
}

@Injectable()
class UserRepository {
  constructor(private readonly logger: Logger) {}

  findUsers() {
    this.logger.log("Fetching users from the database...")

    return [
      { id: 1, name: "John Doe" },
      { id: 2, name: "Jane Smith" },
    ]
  }
}

@Injectable({ scope: "transient" })
class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger,
  ) {}

  getUsers() {
    this.logger.log("Getting users...")
    return this.userRepository.findUsers()
  }
}

const container = new Container()

const userService = container.resolve(UserService)
const userService2 = container.resolve(UserService)

const users = userService.getUsers()

const logger = container.resolve(Logger)
const logger2 = container.resolve(Logger)

logger.log(`Users: ${JSON.stringify(users, null, 2)}`)

console.log("Logger instances are the same:", logger === logger2)
console.log("UserService instances are the same:", userService === userService2)
