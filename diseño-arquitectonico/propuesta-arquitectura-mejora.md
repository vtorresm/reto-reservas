# Arquitectura Actual - Sistema de Reservas de Salas

## Descripción de la Implementación Actual

Esta documentación describe la arquitectura actualmente implementada en el sistema de reservas de salas, basada en la revisión del código existente.

## Módulos Implementados Actualmente

### 1. **Módulo de Autenticación (Auth)**
- **Funcionalidades implementadas**:
  - Registro de usuarios (username, email, password)
  - Login de usuarios con generación de JWT
- **Endpoints**:
  - POST /auth/register
  - POST /auth/login
- **Tecnologías**: NestJS, JWT, bcryptjs

### 2. **Módulo de Usuarios (Users)**
- **Funcionalidades implementadas**:
  - Listar todos los usuarios
- **Endpoints**:
  - GET /users
- **Tecnologías**: NestJS, TypeORM

### 3. **Módulo de Salas (Rooms)**
- **Funcionalidades implementadas**:
  - Listar todas las salas disponibles
- **Endpoints**:
  - GET /rooms
- **Tecnologías**: NestJS, TypeORM

### 4. **Módulo de Reservas (Reservations)**
- **Funcionalidades implementadas**:
  - Crear nueva reserva
  - Listar reservas (con filtro opcional por fecha)
  - Estados de reservas (pending, confirmed, cancelled, completed)
  - Notificaciones por email automáticas
- **Endpoints**:
  - POST /reservations
  - GET /reservations?date=YYYY-MM-DD
  - PATCH /reservations/:id/status
- **Tecnologías**: NestJS, TypeORM, Nodemailer

## Comunicación entre Componentes

### Estrategias de Comunicación

1. **API Gateway ↔ Microservicios**:
   - **Protocolo**: HTTP/REST o gRPC
   - **Patrón**: Request-Response
   - **Beneficios**: Simplicidad, debugging fácil

2. **Microservicios ↔ Bases de Datos**:
   - **Patrón**: Directa con connection pooling
   - **Beneficios**: Baja latencia, control total

3. **Microservicios ↔ Microservicios**:
   - **Protocolo**: Message Queue (RabbitMQ o Apache Kafka)
   - **Patrón**: Event-Driven Architecture
   - **Eventos**: `user.created`, `reservation.confirmed`, `room.updated`, `reservation.status_changed`, `notification.email_sent`

4. **Sincronización de Datos**:
   - **Método**: Event Sourcing con Apache Kafka
   - **Beneficios**: Consistencia eventual, auditoría completa

## Modelo de Datos Básico

### Entidad: Usuario
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column()
  password: string; // Encriptada

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Entidad: Sala
```typescript
@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column()
  capacity: number;

  @Column({ type: 'json', nullable: true })
  resources: {
    projector: boolean;
    whiteboard: boolean;
    videoConference: boolean;
    airConditioning: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'time', nullable: true })
  availableFrom: string;

  @Column({ type: 'time', nullable: true })
  availableTo: string;
}
```

### Entidad: Reserva
```typescript
@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Room)
  room: Room;

  @Column('date')
  date: Date;

  @Column('time')
  startTime: string;

  @Column('time')
  endTime: string;

  @Column()
  purpose: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';

  @Column({ type: 'json', nullable: true })
  attendees: string[];

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Pipeline de CI/CD

### Estrategia General
- **Plataforma**: GitHub Actions, GitLab CI, o Jenkins
- **Filosofía**: Trunk-based development con despliegues automáticos
- **Ambientes**: Development, Staging, Production

### Etapas del Pipeline

1. **Commit/Push**:
   - Validación de sintaxis y tipos
   - Ejecutar tests unitarios
   - Análisis de código (ESLint, SonarQube)
   - Build de la aplicación

2. **Pull Request**:
   - Tests de integración
   - Tests end-to-end (si aplica)
   - Análisis de seguridad (SAST)
   - Revisión de código automatizada

3. **Merge a Main**:
   - Deploy automático a staging
   - Tests de smoke en staging
   - Generación de imagen Docker
   - Push a registry

4. **Deploy a Producción**:
   - Despliegue azul-verde o rolling updates
   - Tests de salud post-deployment
   - Monitoreo de métricas
   - Rollback automático en caso de errores

### Configuración de Ambientes
```yaml
# Ejemplo básico de GitHub Actions
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v4
      - uses: aws-actions/eks-kubectl@v1
```

## Otras Consideraciones de Diseño

### Seguridad
- **Autenticación**: JWT con refresh tokens
- **Autorización**: RBAC con roles y permisos granulares
- **Encriptación**: Datos sensibles en reposo y en tránsito
- **CORS**: Configuración estricta para orígenes permitidos
- **Rate Limiting**: Prevención de ataques de fuerza bruta

### Sistema de Notificaciones por Email
- **Tecnologías**: Nodemailer, SendGrid o AWS SES
- **Eventos que triggeran emails**:
  - Confirmación de reserva creada
  - Cambio de estado de reserva (confirmada, cancelada, completada)
  - Recordatorio 24h antes de la reserva
  - Notificación de sala liberada por cancelación
- **Plantillas**: HTML templates personalizables por tipo de evento
- **Configuración**: SMTP configurable por ambiente
- **Logs**: Registro de emails enviados y fallidos para auditoría

### Escalabilidad
- **Bases de Datos**: Read replicas para consultas
- **Cache**: Redis para sesiones y datos frecuentes
- **CDN**: Para assets estáticos del frontend
- **Auto-scaling**: Basado en métricas de CPU y memoria

### Monitoreo y Observabilidad
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Métricas**: Prometheus y Grafana
- **Tracing**: Jaeger para distributed tracing
- **Alertas**: Slack/Email para incidentes críticos

### Resiliencia
- **Circuit Breaker**: Para fallos en servicios externos
- **Retry Policies**: Para operaciones transitorias
- **Health Checks**: Monitoreo de estado de servicios
- **Backup**: Estrategias de respaldo y recuperación

### Performance
- **Database Indexing**: Índices optimizados para consultas frecuentes
- **Query Optimization**: Consultas eficientes y paginación
- **Caching Strategy**: Cache inteligente de datos
- **Lazy Loading**: Carga diferida de recursos

### Mantenibilidad
- **Documentación**: API docs con Swagger/OpenAPI
- **Testing**: Cobertura alta de tests unitarios e integración
- **Code Quality**: Linting, formatting y estándares
- **Versioning**: Semantic versioning para APIs

## Ventajas de esta Arquitectura

1. **Escalabilidad**: Cada microservicio puede escalar independientemente
2. **Mantenibilidad**: Código más limpio y fácil de mantener
3. **Resiliencia**: Fallo en un servicio no afecta a otros
4. **Flexibilidad**: Fácil agregar nuevas funcionalidades
5. **Tecnología**: Posibilidad de usar diferentes tecnologías por servicio
6. **Equipo**: Diferentes equipos pueden trabajar en servicios distintos

## Migración desde Arquitectura Actual

### Fase 1: Análisis y Planificación
- Identificar bounded contexts
- Definir contratos entre servicios
- Planificar estrategia de migración incremental

### Fase 2: Extracción de Servicios
- Extraer servicio de usuarios
- Implementar servicio de notificaciones por email
- Implementar API Gateway
- Configurar comunicación asíncrona

### Fase 3: Completar Migración
- Extraer servicios de salas y reservas
- Implementar servicios adicionales
- Optimizar y estabilizar

### Fase 4: Optimización
- Implementar caching avanzado
- Optimizar consultas de base de datos
- Ajustar auto-scaling

## Conclusión

Esta arquitectura de microservicios proporciona una base sólida y escalable para el sistema de reservas de salas, permitiendo crecimiento futuro y mantenibilidad a largo plazo. La inversión inicial en infraestructura se ve compensada por los beneficios en escalabilidad, resiliencia y velocidad de desarrollo.

**Tiempo estimado de implementación**: 3-6 meses
**Equipo recomendado**: 2-3 desarrolladores full-stack
**Riesgos principales**: Complejidad inicial, curva de aprendizaje