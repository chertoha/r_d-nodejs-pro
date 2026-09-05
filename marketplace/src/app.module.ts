import { Module } from "@nestjs/common"
import { AppController } from "./app.controller"
import { ConfigModule } from "@nestjs/config"
import { validate } from "@/config/env.schema"
import { DatabaseModule } from "./database/database.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    DatabaseModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
