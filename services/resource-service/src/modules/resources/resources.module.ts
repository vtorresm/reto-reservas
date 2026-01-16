import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { Resource, ResourceSchema } from '../../entities/resource.entity';
import { Category, CategorySchema } from '../../entities/category.entity';
import { Availability, AvailabilitySchema } from '../../entities/availability.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource.name, schema: ResourceSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Availability.name, schema: AvailabilitySchema },
    ]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}