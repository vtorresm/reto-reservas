import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class DatabaseConfigService implements MongooseOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017');
    const database = this.configService.get<string>('MONGODB_DATABASE', 'coworking_resources');
    const username = this.configService.get<string>('MONGODB_USER');
    const password = this.configService.get<string>('MONGODB_PASSWORD');
    const authSource = this.configService.get<string>('MONGODB_AUTH_SOURCE', 'admin');

    // Construir URI de conexión
    let connectionUri = `${uri}/${database}`;

    if (username && password) {
      connectionUri = `${uri}/${database}`;
      // Nota: En producción, usar variables de entorno o secretos de Kubernetes
    }

    return {
      uri: connectionUri,

      // Configuración de conexión
      maxPoolSize: this.configService.get<number>('MONGODB_MAX_POOL_SIZE', 10),
      minPoolSize: this.configService.get<number>('MONGODB_MIN_POOL_SIZE', 2),
      maxIdleTimeMS: this.configService.get<number>('MONGODB_MAX_IDLE_TIME', 30000),
      serverSelectionTimeoutMS: this.configService.get<number>('MONGODB_SERVER_SELECTION_TIMEOUT', 5000),
      socketTimeoutMS: this.configService.get<number>('MONGODB_SOCKET_TIMEOUT', 45000),
      bufferCommands: false,
      bufferMaxEntries: 0,

      // Configuración de reintento
      retryWrites: true,
      retryReads: true,
      maxCommitTimeMS: 10000,

      // Configuración SSL (producción)
      ssl: this.configService.get<string>('NODE_ENV') === 'production',
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,

      // Configuración de autenticación
      authSource,

      // Configuración de replicación (si aplica)
      replicaSet: this.configService.get<string>('MONGODB_REPLICA_SET'),

      // Configuración de logging
      loggerLevel: this.configService.get<string>('NODE_ENV') === 'development' ? 'debug' : 'error',

      // Configuración de conexión directa vs cluster
      directConnection: this.configService.get<boolean>('MONGODB_DIRECT_CONNECTION', false),

      // Configuración de heartbeat
      heartbeatFrequencyMS: 10000,
      serverMonitoringMode: 'auto',

      // Configuración de escritura
      writeConcern: {
        w: this.configService.get<string>('NODE_ENV') === 'production' ? 'majority' : 1,
        j: this.configService.get<string>('NODE_ENV') === 'production',
        wtimeoutMS: 5000,
      },

      // Configuración de lectura
      readPreference: this.configService.get<string>('MONGODB_READ_PREFERENCE', 'primaryPreferred'),

      // Configuración de compresión
      compressors: ['zlib', 'snappy'],

      // Configuración de timeout
      connectTimeoutMS: 15000,
      waitQueueTimeoutMS: 5000,

      // Configuración de buffer
      maxConnecting: 5,
      maxIdleTimeMS: 30000,

      // Configuración de eventos
      monitorCommands: this.configService.get<string>('NODE_ENV') === 'development',
    };
  }
}