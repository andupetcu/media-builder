import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Body,
  BadRequestException,
  Req,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { TeamMemberGuard } from '../auth/guards/team-member.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RequestUser, AssetKind } from '@media-builder/shared'
import { AssetsService } from './assets.service'
import { StorageService } from '../storage/storage.service'
import { diskStorage } from 'multer'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'

@ApiTags('uploads')
@Controller('teams/:teamId/uploads')
@UseGuards(TeamMemberGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(
    private assetsService: AssetsService,
    private storage: StorageService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload asset file (multipart)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        kind: {
          type: 'string',
          enum: Object.values(AssetKind),
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
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
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB max
      },
      fileFilter: (_req, file, cb) => {
        // Validate mime type
        const allowedTypes = [
          'image/',
          'video/',
          'audio/',
          'font/',
          'application/pdf',
        ]
        if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
          cb(null, true)
        } else {
          cb(new BadRequestException('Invalid file type'), false)
        }
      },
    })
  )
  async uploadFile(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind?: AssetKind,
    @Body('tags') tags?: string | string[],
    @Req() req?: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    // Get org ID from team member
    const orgMember = req.teamMember?.orgMember || req.orgMember
    if (!orgMember) {
      throw new BadRequestException('Could not determine organization')
    }

    // Determine asset kind from mime type if not provided
    let assetKind = kind
    if (!assetKind) {
      if (file.mimetype.startsWith('image/')) {
        assetKind = AssetKind.IMAGE
      } else if (file.mimetype.startsWith('video/')) {
        assetKind = AssetKind.VIDEO
      } else if (file.mimetype.startsWith('audio/')) {
        assetKind = AssetKind.AUDIO
      } else if (file.mimetype.includes('font')) {
        assetKind = AssetKind.FONT
      } else {
        throw new BadRequestException('Could not determine asset kind')
      }
    }

    // Parse tags
    let assetTags: string[] = []
    if (tags) {
      assetTags = Array.isArray(tags) ? tags : [tags]
    }

    // Hash the file
    const hash = await this.storage.hashFile(file.path)

    // Get team info to extract orgId
    const team = await this.assetsService['prisma'].team.findUnique({
      where: { id: teamId },
      select: { orgId: true },
    })

    if (!team) {
      throw new BadRequestException('Team not found')
    }

    // Create asset
    const asset = await this.assetsService.createAsset(
      teamId,
      user.id,
      team.orgId,
      assetKind,
      file.originalname,
      file.mimetype,
      BigInt(file.size),
      hash,
      file.path,
      assetTags
    )

    // Convert BigInt to string for JSON serialization
    return {
      ...asset,
      sizeBytes: asset.sizeBytes.toString(),
    }
  }
}
