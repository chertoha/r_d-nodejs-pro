import { Injectable } from "../decorators/injectable.js"
import { CreateUserDto } from "../dto/create-user.dto.js"

@Injectable()
export class UserService {
  createUser(createUserDto: CreateUserDto) {
    const { name, email } = createUserDto

    return {
      success: true,
      user: {
        name,
        email,
      },
    }
  }
}
