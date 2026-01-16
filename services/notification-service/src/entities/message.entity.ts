import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  DELETED = 'deleted',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'status'])
@Index(['type', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'sender_name' })
  senderName: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  attachments?: Array<{
    type: 'image' | 'file' | 'link';
    url: string;
    name: string;
    size?: number;
    mimeType?: string;
  }>;

  @Column({ name: 'reply_to_id', nullable: true })
  replyToId?: string;

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt?: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy?: string;

  @Column({ name: 'read_by', type: 'json', nullable: true })
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;

  @Column({ name: 'delivered_to', type: 'json', nullable: true })
  deliveredTo?: string[];

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
    editedCount?: number;
    originalContent?: string;
  };

  @Column({ name: 'reactions', type: 'json', nullable: true })
  reactions?: Array<{
    emoji: string;
    userId: string;
    userName: string;
    reactedAt: Date;
  }>;

  @Column({ name: 'mentions', type: 'json', nullable: true })
  mentions?: Array<{
    userId: string;
    userName: string;
    position: number;
  }>;

  @Column({ name: 'is_system_message', default: false })
  isSystemMessage: boolean;

  @Column({ name: 'is_announcement', default: false })
  isAnnouncement: boolean;

  @Column({ name: 'pinned', default: false })
  pinned: boolean;

  @Column({ name: 'pinned_by', nullable: true })
  pinnedBy?: string;

  @Column({ name: 'pinned_at', type: 'timestamp', nullable: true })
  pinnedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'thread_id', nullable: true })
  threadId?: string;

  @Column({ name: 'parent_message_id', nullable: true })
  parentMessageId?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  isReadBy(userId: string): boolean {
    return this.readBy?.some(read => read.userId === userId) || false;
  }

  markAsRead(userId: string): void {
    if (!this.readBy) {
      this.readBy = [];
    }

    const existingRead = this.readBy.find(read => read.userId === userId);
    if (!existingRead) {
      this.readBy.push({
        userId,
        readAt: new Date(),
      });
    }

    if (this.status === MessageStatus.DELIVERED) {
      this.status = MessageStatus.READ;
    }

    this.updatedBy = userId;
  }

  markAsDelivered(userIds: string[]): void {
    this.deliveredTo = userIds;
    this.status = MessageStatus.DELIVERED;
    this.updatedBy = 'system';
  }

  addReaction(emoji: string, userId: string, userName: string): void {
    if (!this.reactions) {
      this.reactions = [];
    }

    // Remover reacción anterior del mismo usuario si existe
    this.reactions = this.reactions.filter(reaction => reaction.userId !== userId);

    // Agregar nueva reacción
    this.reactions.push({
      emoji,
      userId,
      userName,
      reactedAt: new Date(),
    });

    this.updatedBy = userId;
  }

  removeReaction(userId: string): void {
    if (this.reactions) {
      this.reactions = this.reactions.filter(reaction => reaction.userId !== userId);
      this.updatedBy = userId;
    }
  }

  edit(newContent: string, editedBy: string): void {
    if (this.metadata) {
      if (!this.metadata.originalContent) {
        this.metadata.originalContent = this.content;
      }
      this.metadata.editedCount = (this.metadata.editedCount || 0) + 1;
    }

    this.content = newContent;
    this.isEdited = true;
    this.editedAt = new Date();
    this.updatedBy = editedBy;
  }

  softDelete(deletedBy: string): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.updatedBy = deletedBy;
  }

  pin(pinnedBy: string): void {
    this.pinned = true;
    this.pinnedBy = pinnedBy;
    this.pinnedAt = new Date();
    this.updatedBy = pinnedBy;
  }

  unpin(): void {
    this.pinned = false;
    this.pinnedBy = undefined;
    this.pinnedAt = undefined;
    this.updatedBy = 'system';
  }

  getReactionCount(emoji?: string): number {
    if (!this.reactions) return 0;

    if (emoji) {
      return this.reactions.filter(reaction => reaction.emoji === emoji).length;
    }

    return this.reactions.length;
  }

  getUniqueReactionEmojis(): string[] {
    if (!this.reactions) return [];

    const emojis = this.reactions.map(reaction => reaction.emoji);
    return [...new Set(emojis)];
  }

  hasMention(userId: string): boolean {
    return this.mentions?.some(mention => mention.userId === userId) || false;
  }

  toPublicJSON() {
    const { createdBy, updatedBy, metadata, ...publicData } = this;
    return publicData;
  }

  static createMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    createdBy?: string,
  ): Message {
    const message = new Message();
    message.conversationId = conversationId;
    message.senderId = senderId;
    message.senderName = senderName;
    message.content = content;
    message.type = type;
    message.status = MessageStatus.SENT;
    message.createdBy = createdBy;

    return message;
  }

  static createSystemMessage(
    conversationId: string,
    content: string,
    createdBy?: string,
  ): Message {
    const message = Message.createMessage(
      conversationId,
      'system',
      'Sistema',
      content,
      MessageType.SYSTEM,
      createdBy,
    );

    message.isSystemMessage = true;

    return message;
  }
}