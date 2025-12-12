import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(teamId: string, userId: string, createTemplateDto: CreateTemplateDto) {
    return this.prisma.template.create({
      data: {
        teamId,
        createdBy: userId,
        name: createTemplateDto.name,
        description: createTemplateDto.description,
        doc: createTemplateDto.doc,
        thumbnail: createTemplateDto.thumbnail,
        width: createTemplateDto.width,
        height: createTemplateDto.height,
        tags: createTemplateDto.tags || [],
        isPublic: createTemplateDto.isPublic || false,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async findAll(teamId: string, query?: string, page = 1, perPage = 30, sizeQuery?: string) {
    const where: any = {
      teamId,
    }

    // Search by query
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ]
    }

    // Filter by size if sizeQuery provided (e.g., "width=1920&height=1080")
    if (sizeQuery) {
      const sizeParams = new URLSearchParams(sizeQuery)
      const width = sizeParams.get('width')
      const height = sizeParams.get('height')

      if (width) where.width = parseInt(width)
      if (height) where.height = parseInt(height)
    }

    const skip = (page - 1) * perPage

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.template.count({ where }),
    ])

    return {
      items: templates,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }
  }

  async findOne(id: string, teamId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`)
    }

    if (template.teamId !== teamId) {
      throw new ForbiddenException('You do not have access to this template')
    }

    return template
  }

  async update(id: string, teamId: string, updateTemplateDto: UpdateTemplateDto) {
    // Check if template exists and belongs to team
    await this.findOne(id, teamId)

    return this.prisma.template.update({
      where: { id },
      data: updateTemplateDto,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  async remove(id: string, teamId: string) {
    // Check if template exists and belongs to team
    await this.findOne(id, teamId)

    return this.prisma.template.delete({
      where: { id },
    })
  }
}
