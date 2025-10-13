import { IsEmail, IsString, MinLength } from 'class-validator'

// Auth DTOs
export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string
}

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsString()
  @MinLength(2)
  name!: string
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string
}

// Response DTOs
export class TokensResponseDto {
  accessToken!: string
  refreshToken!: string
}

export class UserResponseDto {
  id!: string
  email!: string
  name!: string
  avatarUrl?: string | null
  createdAt!: Date
}
