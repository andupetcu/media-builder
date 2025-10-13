import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async findOrgTeams(orgId: string, userId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        orgId,
        members: {
          some: {
            orgMember: {
              userId,
            },
          },
        },
      },
    })

    return teams
  }
}
