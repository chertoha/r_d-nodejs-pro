import "reflect-metadata"
import { Controller } from "./decorators/controller.js"
import { Get, Post } from "./decorators/methods.js"
import { Body, Param, Query } from "./decorators/params.js"
import { CreateUserDto } from "./dto/create-user.dto.js"
import { UserService } from "./services/user.service.js"
import { createApp } from "./create-app.js"

@Controller("users")
class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    console.log("user list")
  }

  @Get("/:id")
  getUser(@Query("page") page: string, @Param("id") id: unknown) {
    if (id) {
      console.log(`user with id=${id}`)
    }

    if (page) {
      console.log(`page=${page}`)
    }
  }

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto)
  }

  temp() {}
}

@Controller("posts")
class PostController {
  @Get()
  getPosts() {
    console.log("post list")
  }

  @Get("/:id")
  getPost(@Query("page") query: any, @Param("id") page: number) {
    if (query?.id) {
      console.log(`post with id=${query.id}`)
    }

    if (page) {
      console.log(`page=${page}`)
    }
  }

  @Post()
  createPost(@Body() body: unknown) {
    if (body) {
      console.log("body", body)
    }
  }
}

const app = createApp([UserController, PostController])

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000")
})
