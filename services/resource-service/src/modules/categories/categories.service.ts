import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createCategoryDto: any): Promise<Category> {
    try {
      this.logger.log(`Creando nueva categoría: ${createCategoryDto.name}`);

      // Verificar si el nombre ya existe
      const existingCategory = await this.categoryModel.findOne({
        name: createCategoryDto.name
      });

      if (existingCategory) {
        throw new BadRequestException(`Ya existe una categoría con el nombre: ${createCategoryDto.name}`);
      }

      const category = new this.categoryModel(createCategoryDto);
      return await category.save();
    } catch (error) {
      this.logger.error(`Error creando categoría: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<Category[]> {
    try {
      return await this.categoryModel
        .find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error obteniendo categorías: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Category> {
    try {
      const category = await this.categoryModel.findById(id).exec();

      if (!category) {
        throw new NotFoundException(`Categoría no encontrada: ${id}`);
      }

      return category;
    } catch (error) {
      this.logger.error(`Error obteniendo categoría ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateCategoryDto: any): Promise<Category> {
    try {
      this.logger.log(`Actualizando categoría: ${id}`);

      const category = await this.categoryModel
        .findByIdAndUpdate(id, updateCategoryDto, { new: true, runValidators: true })
        .exec();

      if (!category) {
        throw new NotFoundException(`Categoría no encontrada: ${id}`);
      }

      return category;
    } catch (error) {
      this.logger.error(`Error actualizando categoría ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Eliminando categoría: ${id}`);

      const category = await this.categoryModel.findByIdAndDelete(id).exec();

      if (!category) {
        throw new NotFoundException(`Categoría no encontrada: ${id}`);
      }
    } catch (error) {
      this.logger.error(`Error eliminando categoría ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    try {
      const categories = await this.categoryModel
        .find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .exec();

      // Construir jerarquía (simplificada)
      return categories;
    } catch (error) {
      this.logger.error(`Error obteniendo jerarquía de categorías: ${error.message}`, error.stack);
      throw error;
    }
  }
}