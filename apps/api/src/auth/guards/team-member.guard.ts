import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Guard to check if user is a member of the team
 */
@Injectable()
export class TeamMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const teamId = request.params.teamId

    if (!user || !teamId) {
      throw new ForbiddenException('Missing user or team context')
    }

    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        orgMember: {
          userId: user.id,
        },
      },
      include: {
        orgMember: true,
      },
    })

    if (!teamMember) {
      throw new ForbiddenException('User is not a member of this team')
    }

    // Store team member info in request for later use
    request.teamMember = teamMember

    return true
  }
}
