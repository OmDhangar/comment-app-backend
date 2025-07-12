// src/comments/dto/update-comment.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}