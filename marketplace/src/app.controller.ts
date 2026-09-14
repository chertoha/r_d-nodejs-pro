import { Controller, Get } from "@nestjs/common"
import { DatabaseService } from "./database/database.service"

@Controller()
export class AppController {
  constructor(private readonly database: DatabaseService) {}

  @Get("health")
  getHealth() {
    return {
      status: "ok",
      uptime: process.uptime(),
    }
  }

  @Get("health/db")
  async getDatabaseHealth() {
    const result = await this.database.query(
      "SELECT current_database() AS database, current_user AS user",
    )

    return {
      status: "ok",
      database: result.rows[0].database,
      user: result.rows[0].user,
    }
  }
}
