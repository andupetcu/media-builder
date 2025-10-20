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
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TeamMemberGuard } from '../auth/guards/team-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '@media-builder/shared';

@Controller('teams/:teamId/templates')
@UseGuards(TeamMemberGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: RequestUser,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templatesService.create(teamId, user.id, createTemplateDto);
  }

  @Get()
  findAll(
    @Param('teamId') teamId: string,
    @Query('query') query?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('sizeQuery') sizeQuery?: string,
  ) {
    return this.templatesService.findAll(
      teamId,
      query,
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 30,
      sizeQuery,
    );
  }

  @Get(':id')
  findOne(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.templatesService.findOne(id, teamId);
  }

  @Get(':id/json')
  async getJson(@Param('teamId') teamId: string, @Param('id') id: string) {
    const template = await this.templatesService.findOne(id, teamId);
    return template.doc;
  }

  @Patch(':id')
  update(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, teamId, updateTemplateDto);
  }

  @Delete(':id')
  remove(@Param('teamId') teamId: string, @Param('id') id: string) {
    return this.templatesService.remove(id, teamId);
  }
}
