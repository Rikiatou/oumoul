import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('community')
@UseGuards(AuthGuard('jwt'))
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ── Posts ────────────────────────────────────────────────────────────────────

  @Get('posts')
  getPosts(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getPosts(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('posts')
  createPost(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(req.user.userId, dto);
  }

  @Delete('posts/:id')
  deletePost(@Req() req: any, @Param('id') id: string) {
    return this.communityService.deletePost(req.user.userId, id);
  }

  // ── Likes ────────────────────────────────────────────────────────────────────

  @Post('posts/:id/like')
  toggleLike(@Req() req: any, @Param('id') id: string) {
    return this.communityService.toggleLike(req.user.userId, id);
  }

  // ── Challenges ───────────────────────────────────────────────────────────────

  @Get('challenges')
  getChallenges(@Req() req: any) {
    return this.communityService.getChallenges(req.user.userId);
  }

  @Post('challenges/:id/join')
  toggleChallenge(@Req() req: any, @Param('id') id: string) {
    return this.communityService.toggleChallenge(req.user.userId, id);
  }
}
