import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@media-builder/shared'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Get org/team context from request params
    const orgId = request.params.orgId
    const teamId = request.params.teamId

    if (teamId) {
      // Check team role
      const teamMember = await this.prisma.teamMember.findFirst({
        where: {
          teamId,
          orgMember: {
            userId: user.id,
          },
        },
      })

      if (!teamMember) {
        throw new ForbiddenException('User is not a member of this team')
      }

      if (requiredRoles.includes(teamMember.role as Role)) {
        return true
      }
    } else if (orgId) {
      // Check org role
      const orgMember = await this.prisma.orgMember.findFirst({
        where: {
          orgId,
          userId: user.id,
        },
      })

      if (!orgMember) {
        throw new ForbiddenException('User is not a member of this organization')
      }

      if (requiredRoles.includes(orgMember.role as Role)) {
        return true
      }
    }

    throw new ForbiddenException('Insufficient permissions')
  }
}
