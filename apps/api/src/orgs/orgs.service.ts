import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class OrgsService {
  constructor(private prisma: PrismaService) {}

  async findUserOrgs(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: {
        org: true,
      },
    })

    return memberships.map((m: any) => ({
      ...m.org,
      role: m.role,
    }))
  }
}
