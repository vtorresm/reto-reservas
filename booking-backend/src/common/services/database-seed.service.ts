import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Room } from '../../entities/room.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class DatabaseSeedService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    // Agregar un pequeño retraso para asegurar que TypeORM esté completamente inicializado
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.seedData();
  }

  private async seedData() {
    try {
      const roomRepository = this.connection.getRepository(Room);
      const userRepository = this.connection.getRepository(User);

      // Seed rooms
      const roomCount = await roomRepository.count();
      if (roomCount === 0) {
        await roomRepository.save([{ name: 'Sala A' }, { name: 'Sala B' }]);
        console.log('✅ Salas iniciales creadas');
      }

      // Seed users
      const userCount = await userRepository.count();
      if (userCount === 0) {
        await userRepository.save({
          username: 'user1',
          email: 'user1@example.com',
        });
        console.log('✅ Usuario inicial creado');
      }
    } catch (error) {
      console.error('❌ Error durante el seeding:', error);
    }
  }
}
