# User Service - Microservicio de Gestión de Usuarios

Este microservicio maneja toda la lógica relacionada con usuarios, autenticación, autorización y gestión de sesiones en el sistema de coworking.

## 🚀 Características Principales

- **Autenticación JWT** con refresh tokens
- **Gestión de usuarios** con perfiles personalizables
- **Sistema de roles y permisos** granular
- **SSO con Google y Facebook**
- **Verificación de email** y recuperación de contraseñas
- **Gestión de sesiones** múltiples por usuario
- **Caché Redis** para optimización de performance
- **Eventos asíncronos** con Kafka para integración

## 📋 Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (opcional, para desarrollo)

## 🛠️ Instalación y Configuración

### 1. Instalación de Dependencias

```bash
npm install
```

### 2. Configuración de Variables de Entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=coworking_user
DB_PASSWORD=tu_password_seguro
DB_DATABASE=coworking_users

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_password

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=15m

# Otros servicios necesarios
FRONTEND_URL=http://localhost:4200
```

### 3. Configuración de Base de Datos

```bash
# Crear base de datos
createdb coworking_users

# Ejecutar migraciones (si las tienes)
npm run migration:run
```

### 4. Inicio en Desarrollo

```bash
# Desarrollo con auto-reload
npm run start:dev

# Debug mode
npm run start:debug
```

### 5. Inicio con Docker Compose

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# Iniciar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f user-service
```

## 🔧 Uso con Docker Compose

El archivo `docker-compose.yml` incluye:

- **user-service**: Aplicación principal
- **user-db**: Base de datos PostgreSQL
- **redis**: Caché y sesiones
- **redis-commander**: Interfaz web para Redis (opcional)

### Comandos útiles:

```bash
# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f user-service

# Reiniciar un servicio
docker-compose restart user-service

# Parar todos los servicios
docker-compose down

# Parar y eliminar volúmenes
docker-compose down -v
```

## 📚 Documentación de API

Una vez iniciado el servicio, la documentación estará disponible en:

- **Swagger UI**: http://localhost:3001/api/docs
- **OpenAPI JSON**: http://localhost:3001/api/docs-json

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:cov

# Tests end-to-end
npm run test:e2e
```

## 🔍 Health Check

El servicio incluye un endpoint de health check:

- **URL**: http://localhost:3001/health
- **Método**: GET

## 📊 Monitoreo

### Métricas Prometheus

- **Endpoint**: http://localhost:3001/metrics
- **Métricas disponibles**:
  - HTTP request duration
  - Request count por endpoint
  - Estado de conexiones a base de datos
  - Uso de caché Redis

### Logs

Los logs se generan en formato JSON y están estructurados para integración con ELK Stack.

## 🔒 Seguridad

### Características de Seguridad

- **Encriptación de contraseñas** con bcrypt
- **JWT seguro** con configuración personalizable
- **Rate limiting** por usuario/IP
- **CORS configurado** para orígenes específicos
- **Validación estricta** de datos de entrada
- **Headers de seguridad** apropiados

### Configuración de Seguridad

```typescript
// Configuración recomendada para producción
{
  "helmet": true,
  "rateLimit": {
    "windowMs": 15 * 60 * 1000, // 15 minutos
    "max": 100 // límite por ventana
  },
  "cors": {
    "origin": ["https://tudominio.com"],
    "credentials": true
  }
}
```

## 🚀 Despliegue en Producción

### 1. Construir imagen optimizada

```bash
docker build --target production -t user-service:latest .
```

### 2. Variables de entorno para producción

```env
NODE_ENV=production
DB_HOST=prod-db-host
DB_SSL=true
REDIS_HOST=prod-redis-host
JWT_SECRET=super-secret-production-key
LOG_LEVEL=warn
```

### 3. Configuración de Kubernetes

```bash
# Aplicar manifests
kubectl apply -f k8s/

# Ver estado del despliegue
kubectl get pods -l app=user-service

# Ver logs
kubectl logs -f deployment/user-service
```

## 🔧 Desarrollo

### Estructura del Proyecto

```
src/
├── common/                 # Utilidades compartidas
│   ├── guards/            # Guards de autenticación/autorización
│   ├── interceptors/      # Interceptors para logging/tracing
│   ├── decorators/        # Decoradores personalizados
│   └── services/          # Servicios comunes
├── modules/               # Módulos de negocio
│   ├── auth/             # Autenticación y JWT
│   ├── users/            # Gestión de usuarios
│   └── roles/            # Sistema de roles
├── entities/             # Entidades de TypeORM
├── dto/                  # Data Transfer Objects
├── config/               # Configuraciones adicionales
└── migration/            # Migraciones de base de datos
```

### Comandos de Desarrollo

```bash
# Construir aplicación
npm run build

# Linting
npm run lint

# Formateo de código
npm run format

# Análisis de código
npm run test:cov
```

## 🔄 Integración con Otros Servicios

### Comunicación con Resource Service

```typescript
// Ejemplo de llamada HTTP
const response = await this.httpService
  .get('http://resource-service:3002/api/v1/resources/availability', {
    params: { resourceId, startDate, endDate }
  })
  .toPromise();
```

### Eventos con Kafka

```typescript
// Publicar evento de usuario creado
await this.kafkaProducer.send({
  topic: 'user-events',
  messages: [{
    key: user.id,
    value: {
      eventType: 'USER_CREATED',
      data: { userId: user.id, email: user.email }
    }
  }]
});
```

## 📈 Performance

### Optimizaciones Implementadas

- **Caché Redis** para sesiones y datos frecuentes
- **Índices de base de datos** optimizados
- **Paginación** para consultas grandes
- **Compresión gzip** habilitada
- **Connection pooling** para base de datos

### Métricas de Performance

- **Tiempo de respuesta promedio**: < 200ms
- **Throughput**: 1000+ requests/segundo
- **Uptime objetivo**: 99.9%

## 🆘 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a base de datos**
   ```bash
   # Verificar que PostgreSQL esté corriendo
   docker-compose ps
   # Ver logs de la base de datos
   docker-compose logs user-db
   ```

2. **Error de conexión a Redis**
   ```bash
   # Probar conexión Redis
   redis-cli -h localhost -p 6379 ping
   ```

3. **Problemas de permisos**
   ```bash
   # Verificar permisos de archivos
   ls -la .env
   chmod 600 .env
   ```

### Logs de Debug

Para habilitar logs detallados:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 🤝 Contribución

1. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Hacer commit: `git commit -m "feat: agregar nueva funcionalidad"`
3. Push: `git push origin feature/nueva-funcionalidad`
4. Crear Pull Request

## 📄 Licencia

Este proyecto es parte del sistema de coworking y está bajo licencia propietaria.

---

**Equipo de Desarrollo**: Coworking Platform Team
**Versión**: 1.0.0
**Última actualización**: Octubre 2025