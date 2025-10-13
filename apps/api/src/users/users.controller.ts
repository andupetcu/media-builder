import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequestUser } from '@media-builder/shared'
import { UsersService } from './users.service'

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.id)
  }
}
