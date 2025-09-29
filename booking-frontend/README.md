# Frontend - Sistema de Reservas de Salas

Aplicación frontend desarrollada con **Angular 17** para el sistema de reservas de salas de reuniones, con **Material Design**, **SweetAlert2** y autenticación completa.

## 📋 Características

### Tecnologías
- ✅ **Angular 17** - Framework frontend moderno
- ✅ **Angular Material** - Componentes UI profesionales
- ✅ **SweetAlert2** - Mensajes atractivos y modernos
- ✅ **TypeScript** - Tipado estático completo
- ✅ **Reactive Forms** - Formularios con validaciones robustas
- ✅ **JWT Authentication** - Sistema de autenticación seguro

### Funcionalidades
- ✅ **Autenticación completa** (login/registro)
- ✅ **Sistema de reservas** con listado y formulario
- ✅ **Navegación fluida** entre páginas
- ✅ **Validaciones en tiempo real**
- ✅ **Mensajes de error específicos**
- ✅ **Diseño responsivo**

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Node.js** (versión 18 o superior)
- **npm** o **yarn**
- **Git**
- **PostgreSQL** (para la base de datos del backend)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Instalar librerías adicionales
```bash
# SweetAlert2 para mensajes bonitos
npm install sweetalert2

# Angular Material y CDK (ya incluido)
# npm install @angular/material @angular/cdk

# Animaciones (ya incluido)
# npm install @angular/animations
```

### 3. Configuración del proxy (para evitar CORS)
El archivo `proxy.conf.json` ya está configurado para redirigir las llamadas al backend:
```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

## Ejecutar la aplicación

### Modo desarrollo
```bash
# Con proxy para desarrollo
ng serve --proxy-config proxy.conf.json

# Sin proxy (si el backend está en el mismo dominio)
ng serve
```

### Modo producción
```bash
# Build para producción
ng build

# Servir la versión de producción
ng serve --configuration production
```

El frontend se ejecutará en: `http://localhost:4200`

## 📦 Dependencias Instaladas

### Producción
```json
{
  "@angular/animations": "^17.0.0",
  "@angular/cdk": "^17.0.0",
  "@angular/material": "^17.0.0",
  "sweetalert2": "^11.7.0",
  "rxjs": "~7.8.0",
  "tslib": "^2.3.0",
  "zone.js": "~0.14.0"
}
```

### Desarrollo
```json
{
  "@angular-devkit/build-angular": "^17.0.0",
  "@angular/cli": "^17.0.0",
  "@angular/compiler-cli": "^17.0.0",
  "@types/jasmine": "~5.1.0",
  "jasmine-core": "~5.1.0",
  "karma": "~6.4.0",
  "karma-chrome-launcher": "~3.2.0",
  "karma-coverage": "~2.2.0",
  "karma-jasmine": "~5.1.0",
  "karma-jasmine-html-reporter": "~2.1.0",
  "typescript": "~5.2.0"
}
```

## 🧪 Pruebas Unitarias

### Ejecutar pruebas
```bash
# Ejecutar todas las pruebas
ng test

# Ejecutar pruebas con cobertura
ng test --code-coverage

# Ejecutar pruebas en modo watch
ng test --watch=false

# Ejecutar pruebas específicas
ng test --include="**/reservation-form.component.spec.ts"
```

### Pruebas implementadas

#### ✅ Componente de Formulario de Reservas (`reservation-form.component.spec.ts`)
- **Creación exitosa**: Prueba que una reserva se crea correctamente
- **Manejo de errores**:
  - Usuario no encontrado
  - Sala no encontrada
  - Conflicto de horario
  - Errores genéricos
- **Validación de formularios**: Campos requeridos y formato
- **Navegación**: Redirección después del éxito
- **Manejo de formularios inválidos**

### Configuración de pruebas
- **Karma** + **Jasmine** como framework
- **Mocks** para servicios externos
- **Spies** para métodos y llamadas HTTP
- **Cobertura de casos de error**

## 🔧 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Instalar SweetAlert2
npm install sweetalert2

# Servidor de desarrollo
ng serve --proxy-config proxy.conf.json

# Build de producción
ng build

# Tests unitarios
ng test

# Tests con cobertura
ng test --code-coverage

# Análisis de código
ng lint

# Generar componente
ng generate component nombre-componente

# Generar servicio
ng generate service nombre-servicio
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── auth/                 # Módulo de autenticación
│   │   ├── login/           # Componente de login
│   │   ├── register/        # Componente de registro
│   │   └── auth.service.ts  # Servicio de autenticación
│   ├── services/            # Servicios personalizados
│   │   └── alert.service.ts # Servicio para SweetAlert2
│   ├── reservations/        # Módulo de reservas
│   │   ├── reservation-form/ # Formulario de reserva
│   │   ├── reservation-list/ # Listado de reservas
│   │   └── reservation.service.ts # Servicio de reservas
│   └── app.module.ts        # Módulo principal
├── styles.css              # Estilos globales
└── proxy.conf.json         # Configuración del proxy
```

## 🌐 Rutas de la Aplicación

| Ruta | Descripción |
|------|-------------|
| `/auth/login` | Formulario de inicio de sesión |
| `/auth/register` | Formulario de registro de usuarios |
| `/reservations/list` | Listado de reservas |
| `/reservations/form` | Formulario para crear reserva |

## 🔐 Funcionalidades de Autenticación

### Login
- **Validaciones**: Username y contraseña requeridos
- **Mensajes SweetAlert2**: Éxito con bienvenida personalizada
- **Redirección automática**: Al listado de reservas después del login
- **Manejo de errores**: Mensajes específicos para credenciales inválidas

### Registro
- **Validaciones completas**: Username, email, contraseña y confirmación
- **Verificación de contraseñas**: Deben coincidir
- **Mensajes específicos**: Para username/email duplicados
- **Redirección automática**: Al listado después del registro exitoso

## 🎨 Características de UI/UX

### Material Design
- **Componentes modernos**: Cards, formularios, botones
- **Tema consistente**: Colores y tipografía uniforme
- **Iconos intuitivos**: Material Icons en toda la aplicación
- **Diseño responsivo**: Se adapta a móviles y tablets

### SweetAlert2
- **Mensajes de login**: Bienvenida personalizada con nombre del usuario
- **Mensajes de registro**: Confirmación de creación de cuenta
- **Mensajes de error**: Específicos para cada tipo de error
- **Estilos personalizados**: Integrados con el tema de la aplicación

### Pruebas Unitarias
- **Framework**: Karma + Jasmine
- **Cobertura**: Componentes y servicios principales
- **Mocks**: Servicios externos y rutas
- **Casos de error**: Manejados correctamente

## 🔧 Configuración Adicional

### Proxy para desarrollo
El archivo `proxy.conf.json` redirige las llamadas API:
```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

### Variables de entorno
Para personalizar la configuración, crea `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

## 🛠️ Solución de Problemas

### Error de CORS
- Usa el proxy: `ng serve --proxy-config proxy.conf.json`
- El backend tiene CORS habilitado para `localhost:4200`

### Error de rutas
- Verifica que los componentes estén en `declarations` del módulo
- Asegúrate de que las rutas estén correctamente configuradas

### Error de Material Design
- Verifica que `BrowserAnimationsModule` esté importado
- Asegúrate de que los módulos de Material estén en `imports`

### Error de base de datos PostgreSQL
- Verifica que PostgreSQL esté ejecutándose
- Comprueba las credenciales en el archivo `.env` del backend
- Asegúrate de que la base de datos `booking_db` exista

## 📱 Compatibilidad

- **Navegadores modernos**: Chrome, Firefox, Safari, Edge
- **Móviles**: iOS Safari, Chrome Mobile
- **Tablets**: iPad, Android tablets
- **Resolución mínima**: 320px de ancho

## 🧪 Estrategia de Pruebas

### Pruebas Unitarias Implementadas

#### Backend (Jest)
- **Servicio de Reservas**: Casos de éxito y error
- **Mocks de repositorios**: TypeORM testing
- **Casos límite**: Solapamiento exacto y parcial
- **Validaciones**: Usuario y sala no encontrados

#### Frontend (Karma + Jasmine)
- **Componente de Formulario**: Validaciones y envío
- **Manejo de errores**: Diferentes tipos de error
- **Navegación**: Redirección automática
- **Integración**: Servicios y routing

### Comandos de Pruebas
```bash
# Backend
npm run test          # Ejecutar pruebas
npm run test:cov      # Con cobertura
npm run test:watch    # Modo watch

# Frontend
ng test              # Ejecutar pruebas
ng test --code-coverage  # Con cobertura
```

## 🚀 Próximos Pasos

- [ ] Implementar edición de reservas
- [ ] Agregar filtros avanzados en el listado
- [ ] Implementar notificaciones push
- [ ] Agregar modo oscuro
- [ ] Implementar tests E2E

## 🧪 Casos de Prueba Implementados

### Backend (NestJS)
- ✅ **Creación correcta de reservas** sin conflictos de horario
- ✅ **Conflicto por solapamiento** de horarios (parcial y exacto)
- ✅ **Usuario no encontrado** - manejo de usuarios inexistentes
- ✅ **Sala no encontrada** - manejo de salas inexistentes
- ✅ **Listado de reservas** con y sin filtro de fecha

### Frontend (Angular)
- ✅ **Creación exitosa de reservas** con redirección
- ✅ **Manejo de errores específicos** (usuario/sala no encontrada, conflicto)
- ✅ **Validación de formularios** (campos requeridos, formato)
- ✅ **Navegación automática** después del éxito
- ✅ **Integración con SweetAlert2** para mensajes

## 📞 Soporte

Para problemas o preguntas:
1. Revisa la consola del navegador para errores
2. Verifica que el backend esté ejecutándose en `http://localhost:3000`
3. Comprueba la configuración del proxy
4. Revisa los logs de Angular CLI
5. **PostgreSQL**: Asegúrate de que esté ejecutándose y configurado correctamente en el backend
6. **Pruebas**: Ejecuta `npm test` para verificar que todo funcione correctamente
