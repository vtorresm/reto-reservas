# Arquitectura Actual - Sistema de Reservas de Salas

## Estructura Actual Implementada

### Backend (NestJS)
- **Módulos existentes**: auth, users, rooms, reservations
- **Entidades**: User, Room, Reservation
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT tokens

### Frontend (Angular)
- **Módulos existentes**: auth, reservations
- **UI**: Angular Material
- **Servicios**: Comunicación REST con backend

## Módulos Implementados Actualmente

### 1. **Módulo de Autenticación (Auth)**
- **Funcionalidades implementadas**:
  - Registro de usuarios (username, email, password)
  - Login de usuarios
  - Generación de JWT tokens
- **Endpoints**:
  - POST /auth/register
  - POST /auth/login

### 2. **Módulo de Usuarios (Users)**
- **Funcionalidades implementadas**:
  - Listar todos los usuarios
- **Endpoints**:
  - GET /users

### 3. **Módulo de Salas (Rooms)**
- **Funcionalidades implementadas**:
  - Listar todas las salas disponibles
- **Endpoints**:
  - GET /rooms

### 4. **Módulo de Reservas (Reservations)**
- **Funcionalidades implementadas**:
  - Crear nueva reserva
  - Listar reservas (con filtro opcional por fecha)
- **Endpoints**:
  - POST /reservations
  - GET /reservations?date=YYYY-MM-DD

## Comunicación entre Componentes

### Estrategia de Comunicación Actual
- **Cliente ↔ Backend**: HTTP/REST directo con autenticación JWT
- **Backend ↔ Base de Datos**: TypeORM con connection pooling
- **Módulos ↔ Módulos**: Inyección de dependencias de NestJS

### Flujo de Datos Típico
1. Cliente realiza petición HTTP al backend
2. Controlador recibe la petición y valida JWT (si es necesario)
3. Servicio procesa la lógica de negocio
4. Servicio interactúa con la base de datos usando TypeORM
5. Respuesta JSON fluye de vuelta al cliente

## Modelo de Datos Actual

### Usuario (users)
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  password: string;
}
```

### Sala (rooms)
```typescript
@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;
}
```

### Reserva (reservations)
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
}
```

## Pipeline de CI/CD

### Estrategia Propuesta
- **Plataforma**: GitHub Actions (gratuito y simple)
- **Triggers**: Push a main/develop, Pull Requests
- **Ambientes**: Development, Staging, Production

### Etapas del Pipeline

1. **Validación** (en cada commit):
   - Tests unitarios (Jest)
   - Tests de integración
   - Linting (ESLint)
   - Build verification

2. **Deploy a Staging** (merge a develop):
   - Build de imágenes Docker
   - Deploy automático a staging
   - Tests de smoke

3. **Deploy a Producción** (merge a main):
   - Promoción desde staging
   - Tests finales de salud
   - Rollback automático si falla

### Configuración Básica de GitHub Actions
```yaml
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

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v4
      - uses: aws-actions/eks-kubectl@v1
```

## Otras Consideraciones

### Seguridad
- Autenticación JWT stateless
- Guards por módulo y endpoint
- Validación y sanitización de datos
- Rate limiting por usuario
- CORS configurado apropiadamente

### Performance
- Implementar Redis para cache de sesiones
- Índices optimizados en base de datos
- Lazy loading en frontend
- Paginación para listados grandes

### Monitoreo
- Logs estructurados con Winston
- Health checks en cada módulo
- Métricas básicas (response time, error rate)
- Alertas para errores críticos

### Mantenibilidad
- Testing completo (unit + integration)
- Documentación de API con Swagger
- Code coverage mínimo 80%
- Linting y formatting automáticos

## Ventajas de esta Arquitectura

1. **Simplicidad**: Basada en la estructura actual de NestJS
2. **Escalabilidad**: Fácil agregar nuevos módulos
3. **Mantenibilidad**: Código modular y bien estructurado
4. **Performance**: Optimizaciones integradas
5. **DevOps**: Pipeline CI/CD completo y automatizado

## Siguientes Pasos

1. **Implementar API Gateway** como módulo NestJS
2. **Mejorar validaciones** con class-validator
3. **Agregar Redis** para cache y sesiones
4. **Configurar GitHub Actions** para CI/CD
5. **Implementar health checks** y monitoreo básico
6. **Agregar tests E2E** con Cypress o Playwright

**Tiempo estimado**: 2-3 semanas
**Equipo**: 1-2 desarrolladores
**Riesgo**: Bajo - evoluciona la arquitectura actual