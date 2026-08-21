import "reflect-metadata"
import { Injectable } from "./decorators/injectable.js"
import { INJECTABLE_TOKEN, NOTIFICATION_SENDER } from "./tokens.js"
import { Container } from "./container.js"
import { Inject } from "./decorators/inject.js"

console.log("Mini Nest started")

interface NotificationSender {
  send(message: string): void
}

@Injectable()
class NotificationService {
  constructor(
    @Inject(NOTIFICATION_SENDER)
    private readonly sender: NotificationSender,
  ) {}

  notify(message: string) {
    this.sender.send(message)
  }
}

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

@Injectable()
class CircularDependencyA {}

@Injectable()
class CircularDependencyB {}

const consoleSender: NotificationSender = {
  send(message: string) {
    console.log(message)
  },
}

const container = new Container()
container.register(NOTIFICATION_SENDER, consoleSender)

const userService = container.resolve(UserService)
const userService2 = container.resolve(UserService)

const users = userService.getUsers()

const logger = container.resolve(Logger)
const logger2 = container.resolve(Logger)

logger.log(`Users: ${JSON.stringify(users, null, 2)}`)

console.log("Logger instances are the same:", logger === logger2)
console.log("UserService instances are the same:", userService === userService2)

Reflect.defineMetadata("design:paramtypes", [CircularDependencyB], CircularDependencyA)

Reflect.defineMetadata("design:paramtypes", [CircularDependencyA], CircularDependencyB)

// const circularDependencyA = container.resolve(CircularDependencyA)
// const circularDependencyB = container.resolve(CircularDependencyB)

const notificationService = container.resolve(NotificationService)

notificationService.notify("Notification has sent!")
