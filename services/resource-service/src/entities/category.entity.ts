import {
  Entity,
  ObjectId,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('categories')
@Index(['name'], { unique: true })
@Index(['parentCategory'])
export class Category {
  @ObjectIdColumn()
  id: ObjectId;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'parent_category_id', nullable: true })
  parentCategoryId?: ObjectId;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    color?: string;
    icon?: string;
    features?: string[];
    requirements?: string[];
    restrictions?: string[];
  };

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isRootCategory(): boolean {
    return !this.parentCategoryId;
  }

  getHierarchyPath(): string[] {
    // Este método se implementaría con una relación a la categoría padre
    // Por simplicidad, retornamos solo el nombre actual
    return [this.name];
  }

  toPublicJSON() {
    const { createdBy, updatedBy, ...publicData } = this;
    return publicData;
  }
}