# Resource Service - Microservicio de Gestión de Recursos

Este microservicio maneja toda la lógica relacionada con la gestión de recursos físicos y espacios en el sistema de coworking, incluyendo oficinas privadas, salas de reuniones, escritorios compartidos y equipos.

## 🚀 Características Principales

- **Gestión de recursos físicos** con MongoDB para flexibilidad
- **Sistema de categorías** jerárquico para organización
- **Disponibilidad en tiempo real** con algoritmos de optimización
- **Búsqueda avanzada** por ubicación, características y disponibilidad
- **Integración con mapas** para recursos geolocalizados
- **Gestión de mantenimiento** y períodos de bloqueo
- **Comunicación asíncrona** con otros servicios vía Redis/Kafka

## 📋 Prerrequisitos

- Node.js 18+
- MongoDB 6.0+
- Redis 7+
- Docker (opcional, para desarrollo)

## 🛠️ Instalación y Configuración

### 1. Instalación de Dependencias

```bash
npm install --legacy-peer-deps
```

### 2. Configuración de Variables de Entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=coworking_resources
MONGODB_USER=coworking_resource_user
MONGODB_PASSWORD=tu_password_seguro

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=2

# Otros servicios
USER_SERVICE_URL=http://localhost:3001
BOOKING_SERVICE_URL=http://localhost:3003

# Configuración específica
DEFAULT_CURRENCY=USD
SEARCH_DEFAULT_RADIUS_KM=5
```

### 3. Configuración de MongoDB

```bash
# Crear base de datos
mongosh
use coworking_resources

# Crear usuario (ejecutar en MongoDB shell)
db.createUser({
  user: "coworking_resource_user",
  pwd: "tu_password_seguro",
  roles: [
    {
      role: "readWrite",
      db: "coworking_resources"
    }
  ]
})
```

### 4. Inicio en Desarrollo

```bash
# Desarrollo con auto-reload
npm run start:dev

# Debug mode
npm run start:debug
```

## 🔧 Uso con Docker

### Archivo docker-compose.yml incluido

```bash
# Construir e iniciar servicios
docker-compose up --build

# Iniciar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f resource-service
```

## 📚 Documentación de API

Una vez iniciado el servicio, la documentación estará disponible en:

- **Swagger UI**: http://localhost:3002/api/docs
- **OpenAPI JSON**: http://localhost:3002/api/docs-json

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

El servicio incluye endpoints de health check:

- **URL**: http://localhost:3002/health
- **Método**: GET
- **Detallado**: http://localhost:3002/health/detailed

## 📊 Monitoreo

### Métricas Prometheus

- **Endpoint**: http://localhost:3002/metrics
- **Métricas disponibles**:
  - HTTP request duration por endpoint
  - Estado de conexiones a MongoDB
  - Uso de caché Redis
  - Estadísticas de recursos y búsquedas

### Logs

Los logs se generan en formato JSON y están estructurados para integración con ELK Stack.

## 🔒 Seguridad

### Características de Seguridad

- **Validación estricta** de datos de entrada con class-validator
- **Autenticación JWT** para operaciones protegidas
- **Autorización basada en roles** (admin, member, guest)
- **Rate limiting** por usuario y endpoint
- **CORS configurado** para orígenes específicos

## 🚀 Despliegue en Producción

### 1. Construir imagen optimizada

```bash
docker build --target production -t resource-service:latest .
```

### 2. Variables de entorno para producción

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://cluster.mongodb.net
MONGODB_SSL=true
REDIS_HOST=prod-redis-host
LOG_LEVEL=warn
```

### 3. Configuración de Kubernetes

```bash
# Aplicar manifests
kubectl apply -f k8s/base/resource-service-deployment.yml
kubectl apply -f k8s/base/resource-service-service.yml

# Ver estado del despliegue
kubectl get pods -l app=resource-service

# Ver logs
kubectl logs -f deployment/resource-service
```

## 🔧 Desarrollo

### Estructura del Proyecto

```
src/
├── common/                 # Utilidades compartidas
│   ├── guards/            # Guards de autenticación/autorización
│   ├── interceptors/      # Interceptors para logging/tracing
│   ├── decorators/        # Decoradores personalizados
│   └── services/          # Servicios comunes (DB, Redis, etc.)
├── modules/               # Módulos de negocio
│   ├── resources/         # Gestión de recursos
│   ├── categories/        # Gestión de categorías
│   └── availability/      # Gestión de disponibilidad
├── entities/             # Entidades de Mongoose
├── dto/                  # Data Transfer Objects
└── config/               # Configuraciones adicionales
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

### Comunicación con User Service

```typescript
// Ejemplo de llamada HTTP al User Service
const userResponse = await this.httpService
  .get(`${this.userServiceUrl}/api/v1/users/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .toPromise();
```

### Comunicación con Booking Service

```typescript
// Publicar evento cuando un recurso cambia de estado
await this.redisEventService.publishEvent({
  eventType: 'RESOURCE_UPDATED',
  data: {
    resourceId: resource.id,
    changes: { status: 'maintenance' },
    reason: 'Scheduled maintenance'
  }
});
```

### Eventos Publicados

- `RESOURCE_CREATED` - Nuevo recurso disponible
- `RESOURCE_UPDATED` - Cambios en características del recurso
- `RESOURCE_DELETED` - Recurso eliminado
- `AVAILABILITY_CHANGED` - Cambios en disponibilidad
- `MAINTENANCE_SCHEDULED` - Mantenimiento programado

## 📈 Performance

### Optimizaciones Implementadas

- **Índices MongoDB** optimizados para búsquedas frecuentes
- **Caché Redis** para consultas de disponibilidad
- **Paginación** para listados grandes
- **Búsqueda geoespacial** para recursos cercanos
- **Agregaciones** para estadísticas en tiempo real

### Métricas de Performance

- **Tiempo de respuesta promedio**: < 150ms
- **Throughput**: 2000+ requests/segundo
- **Uptime objetivo**: 99.9%
- **Tiempo de búsqueda**: < 50ms para consultas simples

## 🆘 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a MongoDB**
   ```bash
   # Verificar que MongoDB esté corriendo
   docker ps | grep mongodb

   # Ver logs de MongoDB
   docker logs mongodb

   # Probar conexión manual
   mongosh --eval "db.runCommand('ismaster')"
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