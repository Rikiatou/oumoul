import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RecitationService } from './recitation.service';

@ApiTags('recitation')
@Controller('recitation')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RecitationController {
  constructor(private readonly service: RecitationService) {}

  @Post('check')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio'))
  async check(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string },
    @Body('referenceTranslit') referenceTranslit: string,
  ) {
    if (!file) throw new BadRequestException('Audio file is required');
    if (!referenceTranslit) throw new BadRequestException('referenceTranslit is required');

    return this.service.checkRecitation(
      file.buffer,
      file.mimetype || 'audio/m4a',
      referenceTranslit,
    );
  }
}
