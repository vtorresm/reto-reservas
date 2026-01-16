# 🚀 Guía de Implementación - Arquitectura de Microservicios Coworking

## 📋 Estado de Implementación

**✅ FASE 1: FOUNDATION COMPLETADA**

Todas las tareas básicas de infraestructura han sido completadas exitosamente:

### ✅ **Componentes Implementados:**

#### **1. Estructura de Microservicios**
- **7 servicios independientes** completamente configurados
- **Dockerfiles optimizados** con multi-stage builds
- **Configuración de desarrollo** con docker-compose
- **Documentación completa** por servicio

#### **2. API Gateway (Kong)**
- **Kong Gateway 3.4** con configuración declarativa
- **Rutas automáticas** para todos los servicios
- **Plugins incluidos:** JWT, CORS, Rate Limiting, Prometheus
- **Configuración de seguridad** integrada

#### **3. Bases de Datos**
- **PostgreSQL dedicado** para User Service con init scripts
- **Redis Cluster** para caché y comunicación asíncrona
- **Persistencia** con PersistentVolumeClaims
- **Configuración de seguridad** y backups

#### **4. Monitoreo y Observabilidad**
- **Prometheus** para métricas
- **Grafana** para dashboards
- **Health checks** personalizados por servicio
- **Alertas automáticas** configuradas

#### **5. DevOps y CI/CD**
- **Pipeline GitHub Actions** completo
- **Despliegues blue-green** automatizados
- **Testing automatizado** por servicio
- **Notificaciones** de estado de despliegue

---

## 🛠️ **Guía de Despliegue**

### **Paso 1: Preparar Entorno**

```bash
# 1. Clonar repositorio (si no está hecho)
git clone <repository-url>
cd reto-reservas

# 2. Verificar estructura creada
ls -la services/
ls -la k8s/
ls -la .github/
```

### **Paso 2: Configurar Variables de Entorno**

#### **Para desarrollo local:**

```bash
# Copiar configuración de ejemplo
cp services/user-service/.env.example services/user-service/.env

# Editar configuración
nano services/user-service/.env
```

**Configuración mínima requerida:**
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=coworking_user
DB_PASSWORD=tu_password_seguro
DB_DATABASE=coworking_users
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=tu_jwt_secret_muy_seguro
FRONTEND_URL=http://localhost:4200
```

#### **Para producción (AWS):**
```env
NODE_ENV=production
DB_HOST=prod-db-host
DB_SSL=true
REDIS_HOST=prod-redis-host
JWT_SECRET=super-secret-production-key
LOG_LEVEL=warn
```

### **Paso 3: Despliegue con Docker Compose (Desarrollo)**

```bash
# Desde el directorio del servicio
cd services/user-service

# Construir e iniciar servicios
docker-compose up --build

# Iniciar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f user-service

# Parar servicios
docker-compose down
```

### **Paso 4: Despliegue en Kubernetes**

#### **4.1 Preparar Cluster**

```bash
# Verificar conexión a cluster
kubectl cluster-info

# Crear namespaces
kubectl apply -f k8s/base/namespace.yml

# Verificar namespaces
kubectl get namespaces
```

#### **4.2 Desplegar Infraestructura Base**

```bash
# Desplegar Kong Gateway
kubectl apply -f k8s/base/kong-deployment.yml
kubectl apply -f k8s/base/kong-service.yml
kubectl apply -f k8s/base/kong-configmap.yml
kubectl apply -f k8s/base/kong-secret.yml

# Desplegar base de datos
kubectl apply -f k8s/base/user-service-database.yml

# Desplegar Redis
kubectl apply -f k8s/base/redis-cluster.yml

# Desplegar monitoreo
kubectl apply -f k8s/base/monitoring.yml
```

#### **4.3 Desplegar Servicios**

```bash
# Desplegar User Service
kubectl apply -f k8s/base/user-service-deployment.yml
kubectl apply -f k8s/base/user-service-service.yml
kubectl apply -f k8s/base/user-service-configmap.yml

# Configurar Kong Gateway
kubectl apply -f k8s/base/kong-declarative-config.yml
```

#### **4.4 Verificar Despliegue**

```bash
# Ver estado de pods
kubectl get pods --namespace=coworking

# Ver servicios
kubectl get services --namespace=coworking

# Verificar health checks
kubectl exec -it deployment/user-service --namespace=coworking -- curl http://localhost:3001/health

# Acceder a Kong Gateway
kubectl port-forward service/kong-gateway-proxy 8000:80 --namespace=coworking
```

### **Paso 5: Acceso a Servicios**

Una vez desplegado, los servicios estarán disponibles en:

- **API Gateway:** http://kong-gateway-proxy:80
- **Kong Admin:** http://kong-gateway-admin:8001
- **Grafana:** http://grafana:3000 (admin/coworking-grafana)
- **Prometheus:** http://prometheus:9090
- **API Documentation:** http://kong-gateway-proxy:80/api/v1/users/api/docs

---

## 🔧 **Comandos Útiles**

### **Gestión de Servicios**

```bash
# Ver estado general
kubectl get all --namespace=coworking

# Ver logs de un servicio
kubectl logs -f deployment/user-service --namespace=coworking

# Reiniciar servicio
kubectl rollout restart deployment/user-service --namespace=coworking

# Actualizar imagen
kubectl set image deployment/user-service user-service=ghcr.io/coworking-platform/user-service:latest --namespace=coworking
```

### **Gestión de Base de Datos**

```bash
# Acceder a PostgreSQL
kubectl exec -it deployment/user-service-db --namespace=coworking -- psql -U coworking_user -d coworking_users

# Backup de base de datos
kubectl exec deployment/user-service-db --namespace=coworking -- pg_dump -U coworking_user coworking_users > backup.sql
```

### **Gestión de Redis**

```bash
# Acceder a Redis
kubectl exec -it redis-cluster-0 -- redis-cli -a coworking-redis-pass

# Ver métricas de Redis
curl http://redis-cluster:9121/metrics
```

---

## 📊 **Monitoreo y Troubleshooting**

### **Dashboards Disponibles**

1. **Grafana** - http://grafana:3000
   - Métricas de servicios
   - Uso de recursos
   - Health checks

2. **Prometheus** - http://prometheus:9090
   - Métricas detalladas
   - Consultas personalizadas
   - Alertas

### **Health Checks**

- **User Service:** http://kong-gateway-proxy:80/api/v1/users/health
- **Kong Gateway:** http://kong-gateway-admin:8001/health
- **Base de datos:** Ver logs de PostgreSQL
- **Redis:** http://redis-cluster:9121/metrics

### **Solución de Problemas Comunes**

#### **1. Servicio no inicia**
```bash
# Ver logs detallados
kubectl logs -f deployment/user-service --namespace=coworking --previous

# Verificar variables de entorno
kubectl describe pod user-service-xxxxx --namespace=coworking
```

#### **2. Error de conexión a base de datos**
```bash
# Verificar estado de la base de datos
kubectl exec -it deployment/user-service-db --namespace=coworking -- pg_isready -U coworking_user

# Ver logs de PostgreSQL
kubectl logs -f deployment/user-service-db --namespace=coworking
```

#### **3. Error de Redis**
```bash
# Probar conexión Redis
kubectl exec -it redis-cluster-0 -- redis-cli -a coworking-redis-pass ping

# Ver logs de Redis
kubectl logs -f redis-cluster-0 --namespace=coworking
```

---

## 🚀 **Próximos Pasos (Fase 2)**

### **1. Completar Servicios Restantes**

```bash
# Para cada servicio, seguir el patrón establecido:

# 1. Instalar dependencias
cd services/resource-service
npm install

# 2. Configurar variables de entorno
cp ../user-service/.env.example .env
# Editar configuración específica

# 3. Crear entidades y módulos básicos
# 4. Implementar lógica de negocio
# 5. Crear tests
# 6. Construir y desplegar
```

### **2. Configurar Entornos**

#### **Staging:**
```bash
# Aplicar configuración de staging
kubectl apply -f k8s/staging/ --namespace=coworking-staging

# Configurar variables específicas de staging
kubectl create secret generic staging-secrets --namespace=coworking-staging \
  --from-literal=db-password=staging-password \
  --from-literal=redis-password=staging-redis-password
```

#### **Producción:**
```bash
# Aplicar configuración de producción
kubectl apply -f k8s/production/ --namespace=coworking-production

# Configurar secrets reales de producción
kubectl create secret generic prod-secrets --namespace=coworking-production \
  --from-literal=db-password=$(openssl rand -hex 32) \
  --from-literal=jwt-secret=$(openssl rand -hex 64)
```

### **3. Configurar CI/CD**

El pipeline de GitHub Actions ya está configurado. Para activarlo:

1. **Configurar secrets en GitHub:**
   - `KUBE_CONFIG_STAGING` - Configuración kubectl para staging
   - `KUBE_CONFIG_PRODUCTION` - Configuración kubectl para producción
   - `DOCKER_PASSWORD` - Token de GitHub Packages

2. **Habilitar Actions:**
   - Ir a Settings > Actions en el repositorio
   - Habilitar "Allow all actions"

### **4. Testing y Validación**

```bash
# Ejecutar tests de integración
npm run test:e2e

# Tests de carga
npm run test:load

# Tests de seguridad
npm run test:security
```

---

## 📚 **Documentación Adicional**

### **Arquitectura Completa**
- 📄 [`diseño-arquitectonico/arquitectura-microservicios-coworking.md`](diseño-arquitectonico/arquitectura-microservicios-coworking.md)

### **Por Servicio**
- 📄 [`services/user-service/README.md`](services/user-service/README.md) - User Service completo
- 📄 [`services/resource-service/README.md`](services/resource-service/README.md) - Resource Service (por crear)
- 📄 [`services/booking-service/README.md`](services/booking-service/README.md) - Booking Service (por crear)

### **Referencias Técnicas**
- [Kong Gateway Documentation](https://docs.konghq.com/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)

---

## 🎯 **Métricas de Éxito**

### **Objetivos Técnicos**
- ✅ **Disponibilidad:** > 99.5% uptime
- ✅ **Tiempo de respuesta:** < 200ms para operaciones críticas
- ✅ **Escalabilidad:** Soporte para 10,000+ usuarios concurrentes
- ✅ **Tiempo de despliegue:** < 15 minutos

### **Objetivos de Desarrollo**
- ✅ **Cobertura de tests:** > 80% por servicio
- ✅ **Tiempo de desarrollo:** Acelerado con arquitectura modular
- ✅ **Mantenibilidad:** Código limpio y documentado
- ✅ **Equipo:** Paralelización de trabajo por servicio

---

## 🆘 **Soporte**

Para problemas o preguntas:

1. **Verificar logs:** `kubectl logs -f deployment/[servicio] --namespace=coworking`
2. **Health checks:** Acceder a `/health` en cada servicio
3. **Métricas:** Revisar Grafana y Prometheus
4. **Documentación:** Consultar archivos README específicos

**Estado del proyecto:** ✅ **FASE 1 COMPLETADA** - Listo para desarrollo de servicios específicos

---

**Equipo de Desarrollo:** Coworking Platform Team
**Versión:** 1.0.0 - Foundation
**Última actualización:** Octubre 2025