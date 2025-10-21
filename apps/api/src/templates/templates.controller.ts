import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { TemplatesService } from './templates.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { ImportPsdDto } from './dto/import-psd.dto'
import { StartChunkedUploadDto, FinishChunkedUploadDto } from './dto/chunked-upload.dto'
import { PsdConverterService } from './psd-converter.service'
import { ChunkedUploadService } from './chunked-upload.service'
import { TeamMemberGuard } from '../auth/guards/team-member.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequestUser } from '@media-builder/shared'
import { diskStorage } from 'multer'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'

@ApiTags('templates')
@Controller('teams/:teamId/templates')
@UseGuards(TeamMemberGuard)
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name)

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly psdConverter: PsdConverterService,
    private readonly chunkedUpload: ChunkedUploadService
  ) {}

  @Post('import-psd')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PSD file to import',
        },
        name: {
          type: 'string',
          description: 'Template name (optional, defaults to filename)',
        },
        description: {
          type: 'string',
          description: 'Template description',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Template tags',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether template is public',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, file, cb) => {
          const uniqueName = `${randomUUID()}-${file.originalname}`
          cb(null, uniqueName)
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
      },
      fileFilter: (_req, file, cb) => {
        // Validate PSD file
        if (
          file.originalname.toLowerCase().endsWith('.psd') ||
          file.mimetype === 'image/vnd.adobe.photoshop'
        ) {
          cb(null, true)
        } else {
          cb(new BadRequestException('File must be a PSD file'), false)
        }
      },
    })
  )
  async importPsd(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportPsdDto
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    // Read file buffer
    const { readFile, unlink } = await import('fs/promises')
    const buffer = await readFile(file.path)

    try {
      // Convert PSD to template
      const template = await this.psdConverter.convertPSDToTemplate(
        buffer,
        file.originalname,
        teamId,
        user.id,
        {
          name: dto.name,
          description: dto.description,
          tags: dto.tags,
          isPublic: dto.isPublic,
        }
      )

      return template
    } finally {
      // Always clean up uploaded PSD file, even if conversion fails
      await unlink(file.path).catch(err => {
        this.logger.warn(`Failed to delete uploaded PSD: ${err.message}`)
      })
      this.logger.log(`Cleaned up uploaded PSD file: ${file.originalname}`)
    }
  }

  @Post('import-psd/start')
  async startChunkedUpload(@Param('teamId') _teamId: string, @Body() dto: StartChunkedUploadDto) {
    // Validate PSD file
    if (!dto.filename.toLowerCase().endsWith('.psd')) {
      throw new BadRequestException('File must be a PSD file')
    }

    // Parse metadata
    const metadata = {
      name: dto.name,
      description: dto.description,
      tags: dto.tags ? JSON.parse(dto.tags) : undefined,
      isPublic: dto.isPublic ? dto.isPublic === 'true' : undefined,
    }

    const uploadId = await this.chunkedUpload.startUpload(
      dto.filename,
      dto.totalSize,
      dto.totalChunks,
      metadata
    )

    return {
      uploadId,
      message: 'Chunked upload started',
      totalChunks: dto.totalChunks,
    }
  }

  @Post('import-psd/chunk')
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, file, cb) => {
          const uniqueName = `${randomUUID()}-${file.originalname}`
          cb(null, uniqueName)
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max per chunk
      },
    })
  )
  async uploadChunk(
    @Param('teamId') _teamId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('uploadId') uploadId: string,
    @Body('chunkIndex') chunkIndexStr: string
  ) {
    if (!file) {
      throw new BadRequestException('No chunk uploaded')
    }

    const chunkIndex = parseInt(chunkIndexStr)

    // Read chunk file
    const { readFile, unlink } = await import('fs/promises')
    const chunkBuffer = await readFile(file.path)

    // Upload chunk
    await this.chunkedUpload.uploadChunk(uploadId, chunkIndex, chunkBuffer)

    // Clean up temp file
    await unlink(file.path).catch(() => {})

    // Get progress
    const progress = this.chunkedUpload.getProgress(uploadId)

    return {
      uploadId,
      chunkIndex,
      progress,
    }
  }

  @Post('import-psd/finish')
  async finishChunkedUpload(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: FinishChunkedUploadDto
  ) {
    // Assemble file
    const { filePath, filename, metadata } = await this.chunkedUpload.assembleFile(dto.uploadId)

    // Read assembled file
    const { readFile } = await import('fs/promises')
    const buffer = await readFile(filePath)

    try {
      // Convert PSD to template
      const template = await this.psdConverter.convertPSDToTemplate(
        buffer,
        filename,
        teamId,
        user.id,
        {
          name: metadata?.name || dto.name,
          description: metadata?.description || dto.description,
          tags: metadata?.tags || (dto.tags ? JSON.parse(dto.tags) : undefined),
          isPublic: metadata?.isPublic ?? (dto.isPublic ? dto.isPublic === 'true' : undefined),
        }
      )

      return template
    } finally {
      // Always clean up upload session and assembled PSD file
      await this.chunkedUpload.cleanupUpload(dto.uploadId)
      this.logger.log(`Cleaned up chunked upload session and PSD file: ${filename}`)
    }
  }

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @Body() createTemplateDto: CreateTemplateDto
  ) {
    return this.templatesService.create(teamId, user.id, createTemplateDto)
  }

  @Get()
  findAll(
    @Param('teamId') teamId: string,
    @Query('query') query?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('sizeQuery') sizeQuery?: string
  ) {
    return this.templatesService.findAll(
      teamId,
      query,
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 30,
      sizeQuery
    )
  }

  @Get(':id')
  findOne(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.templatesService.findOne(id, teamId)
  }

  @Get(':id/json')
  async getJson(@Param('teamId') teamId: string, @Param('id') id: string) {
    const template = await this.templatesService.findOne(id, teamId)
    return template.doc
  }

  @Patch(':id')
  update(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto
  ) {
    return this.templatesService.update(id, teamId, updateTemplateDto)
  }

  @Delete(':id')
  remove(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.templatesService.remove(id, teamId)
  }
}
