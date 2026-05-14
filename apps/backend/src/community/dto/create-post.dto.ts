import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PostType {
  achievement = 'achievement',
  milestone = 'milestone',
  question = 'question',
  tip = 'tip',
  motivation = 'motivation',
}

export class CreatePostDto {
  @IsEnum(PostType)
  type: PostType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tags?: string;
}
