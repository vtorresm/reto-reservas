import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseSeedService } from './common/services/database-seed.service';
import { Reservation } from './entities/reservation.entity';
import { User } from './entities/user.entity';
import { Room } from './entities/room.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: +configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [Reservation, User, Room],
        synchronize: true, // Solo para dev
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ReservationsModule,
    UsersModule,
    RoomsModule,
  ],
  providers: [DatabaseSeedService],
})
export class AppModule {}
