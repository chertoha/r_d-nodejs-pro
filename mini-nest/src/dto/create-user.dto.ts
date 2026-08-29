import { z } from "zod"

// Class validator version
// export class CreateUserDto {
//   @IsString()
//   @MinLength(5)
//   name: string

//   @IsEmail()
//   email: string
// }

export const CreateUserSchema = z.object({
  name: z.string().min(5),
  email: z.email(),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>
