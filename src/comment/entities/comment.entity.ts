// comments/entities/comment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('uuid')
  author_id: string;

  @ManyToOne(() => User)
  author: User;

  @Column('uuid', { nullable: true })
  parent_id: string;

  @ManyToOne(() => Comment, { nullable: true })
  parent: Comment;

  @OneToMany(() => Comment, comment => comment.parent)
  replies: Comment[];

  @Column('uuid', { nullable: true })
  root_id: string;

  @ManyToOne(() => Comment, { nullable: true })
  root: Comment;

  @Column('integer', { default: 0 })
  depth: number;

  @Column('text', { nullable: true })
  path: string; // Materialized path: "1.2.3"

  @Column('boolean', { default: false })
  is_deleted: boolean;

  @Column('boolean', { default: false })
  is_edited: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('timestamp', { nullable: true })
  deleted_at: Date;
}