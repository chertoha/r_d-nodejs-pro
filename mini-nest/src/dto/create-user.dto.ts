import { IsEmail, IsString, MinLength } from "class-validator"

export class CreateUserDto {
  @IsString()
  @MinLength(5)
  name: string

  @IsEmail()
  email: string
}
