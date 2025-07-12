import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID, MinLength,IsEmail } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString({message:'parent id must be a valid uuid'})
  parent_id?: string;
}