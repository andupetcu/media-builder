import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { DesignStatus, slugify } from '@media-builder/shared'
import { Prisma } from '@prisma/client'

interface CreateDesignDto {
  name: string
  width?: number
  height?: number
  unit?: string
}

interface UpdateDesignDto {
  name?: string
  status?: DesignStatus
  doc?: any
  thumbnail?: string
}

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name)

  constructor(private prisma: PrismaService) {}

  async findTeamDesigns(teamId: string, status?: DesignStatus) {
    return this.prisma.design.findMany({
      where: {
        teamId,
        ...(status && { status }),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        thumbnail: true,
        width: true,
        height: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })
  }

  async findById(id: string, teamId: string) {
    const design = await this.prisma.design.findFirst({
      where: { id, teamId },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        versions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!design) {
      throw new NotFoundException('Design not found')
    }

    return design
  }

  async createDesign(teamId: string, userId: string, dto: CreateDesignDto) {
    const slug = slugify(dto.name)

    const design = await this.prisma.design.create({
      data: {
        teamId,
        createdBy: userId,
        name: dto.name,
        slug,
        width: dto.width || 1920,
        height: dto.height || 1080,
        unit: dto.unit || 'px',
        doc: {
          pages: [
            {
              id: 'page1',
              children: [],
            },
          ],
        },
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    this.logger.log(`Created design ${design.id}: ${design.name}`)
    return design
  }

  async updateDesign(id: string, teamId: string, dto: UpdateDesignDto) {
    const design = await this.findById(id, teamId)

    const updateData: any = {}

    if (dto.name) {
      updateData.name = dto.name
      updateData.slug = slugify(dto.name)
    }
    if (dto.status) {
      updateData.status = dto.status
    }
    if (dto.doc) {
      updateData.doc = dto.doc
    }
    if (dto.thumbnail !== undefined) {
      updateData.thumbnail = dto.thumbnail
    }

    const updated = await this.prisma.design.update({
      where: { id: design.id },
      data: updateData,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    this.logger.log(`Updated design ${design.id}`)
    return updated
  }

  async deleteDesign(id: string, teamId: string) {
    const design = await this.findById(id, teamId)

    await this.prisma.design.delete({
      where: { id: design.id },
    })

    this.logger.log(`Deleted design ${design.id}`)
  }

  async saveVersion(designId: string, teamId: string, label?: string) {
    const design = await this.findById(designId, teamId)

    const version = await this.prisma.version.create({
      data: {
        designId: design.id,
        label,
        doc: design.doc as Prisma.InputJsonValue,
      },
    })

    this.logger.log(`Created version ${version.id} for design ${design.id}`)
    return version
  }

  async getVersions(designId: string, teamId: string) {
    await this.findById(designId, teamId) // Verify access

    return this.prisma.version.findMany({
      where: { designId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async restoreVersion(designId: string, versionId: string, teamId: string) {
    const design = await this.findById(designId, teamId)

    const version = await this.prisma.version.findFirst({
      where: { id: versionId, designId },
    })

    if (!version) {
      throw new NotFoundException('Version not found')
    }

    const updated = await this.prisma.design.update({
      where: { id: design.id },
      data: { doc: version.doc as Prisma.InputJsonValue },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    this.logger.log(`Restored design ${design.id} to version ${version.id}`)
    return updated
  }

  /**
   * Export design as JSON template
   */
  async exportAsTemplate(designId: string, teamId: string) {
    const design = await this.findById(designId, teamId)

    // Create a clean template JSON structure
    const template = {
      name: design.name,
      description: `Template created from design: ${design.name}`,
      width: design.width,
      height: design.height,
      unit: design.unit,
      doc: design.doc,
      metadata: {
        originalDesignId: design.id,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
        createdBy: design.createdByUser.name,
        version: '1.0.0',
        tags: [],
      },
    }

    this.logger.log(`Exported design ${design.id} as template`)
    return template
  }

  /**
   * Export multiple designs as templates
   */
  async exportMultipleAsTemplates(teamId: string, designIds?: string[]) {
    const whereClause: any = { teamId }

    if (designIds && designIds.length > 0) {
      whereClause.id = { in: designIds }
    }

    const designs = await this.prisma.design.findMany({
      where: whereClause,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const templates = designs.map(design => ({
      name: design.name,
      description: `Template created from design: ${design.name}`,
      width: design.width,
      height: design.height,
      unit: design.unit,
      doc: design.doc,
      metadata: {
        originalDesignId: design.id,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
        createdBy: design.createdByUser.name,
        version: '1.0.0',
        tags: [],
      },
    }))

    this.logger.log(`Exported ${templates.length} designs as templates for team ${teamId}`)
    return {
      templates,
      count: templates.length,
      exportedAt: new Date().toISOString(),
    }
  }

  /**
   * Get design JSON only (for API usage)
   */
  async getDesignJson(designId: string, teamId: string) {
    const design = await this.findById(designId, teamId)
    return design.doc
  }
}
