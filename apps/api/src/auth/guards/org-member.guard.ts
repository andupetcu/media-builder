import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Guard to check if user is a member of the organization
 */
@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const orgId = request.params.orgId

    if (!user || !orgId) {
      throw new ForbiddenException('Missing user or org context')
    }

    const orgMember = await this.prisma.orgMember.findFirst({
      where: {
        orgId,
        userId: user.id,
      },
    })

    if (!orgMember) {
      throw new ForbiddenException('User is not a member of this organization')
    }

    // Store org member info in request for later use
    request.orgMember = orgMember

    return true
  }
}
