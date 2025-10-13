import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto, RegisterDto, TokensResponseDto } from '@media-builder/shared'
import { randomBytes } from 'crypto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return null
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return null
    }

    return { id: user.id, email: user.email, name: user.name }
  }

  async login(dto: LoginDto): Promise<TokensResponseDto> {
    const user = await this.validateUser(dto.email, dto.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return this.generateTokens(user.id, user.email)
  }

  async register(dto: RegisterDto): Promise<TokensResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existing) {
      throw new UnauthorizedException('User already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
    })

    return this.generateTokens(user.id, user.email)
  }

  async refresh(refreshToken: string): Promise<TokensResponseDto> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!token || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Revoke old token
    await this.prisma.refreshToken.delete({ where: { id: token.id } })

    return this.generateTokens(token.user.id, token.user.email)
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    })
  }

  private async generateTokens(userId: string, email: string): Promise<TokensResponseDto> {
    const payload = { sub: userId, email }

    const accessToken = this.jwtService.sign(payload)

    const refreshToken = randomBytes(32).toString('hex')
    const refreshExpires = this.config.get('REFRESH_EXPIRES', '7d')
    const expiresAt = this.calculateExpiry(refreshExpires)

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    })

    return { accessToken, refreshToken }
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([dhm])$/)
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
    }

    const [, value, unit] = match
    const num = parseInt(value, 10)

    const ms = {
      m: num * 60 * 1000,
      h: num * 60 * 60 * 1000,
      d: num * 24 * 60 * 60 * 1000,
    }[unit]

    return new Date(Date.now() + (ms || 0))
  }
}
