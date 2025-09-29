# Sistema de Reservas de Salas de Reuniones

[![GitHub](https://img.shields.io/badge/GitHub-vtorresm%2Freto--reservas-blue?logo=github)](https://github.com/vtorresm/reto-reservas)

Un sistema completo para la gestión y reserva de salas de reuniones, desarrollado con **NestJS** para el backend y **Angular** para el frontend, con autenticación JWT, base de datos **PostgreSQL** y una interfaz moderna con Material Design.

## 📋 Características

### Backend (NestJS)
- ✅ **Autenticación JWT** con registro y login de usuarios
- ✅ **Base de datos PostgreSQL** con TypeORM
- ✅ **Validaciones robustas** con class-validator
- ✅ **Manejo de errores específico** para diferentes escenarios
- ✅ **CORS habilitado** para desarrollo
- ✅ **API RESTful** completa

### Frontend (Angular)
- ✅ **Autenticación completa** con guards y servicios
- ✅ **Material Design** para UI moderna
- ✅ **SweetAlert2** para mensajes atractivos
- ✅ **Reactive Forms** con validaciones
- ✅ **Sistema de reservas** con listado y formulario
- ✅ **Navegación fluida** entre páginas

## 🚀 Inicio Rápido

### Prerrequisitos
- **Node.js** (versión 18 o superior)
- **npm** o **yarn**
- **Git**

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd reto-reservas
```

### 2. Configuración del Backend

#### Instalar dependencias del backend
```bash
cd booking-backend
npm install
```

#### Variables de entorno
Crea un archivo `.env` con la configuración de PostgreSQL:
```env
# Puerto del servidor
PORT=3000

# Configuración de PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/booking_db

# JWT Secret (cámbialo en producción)
JWT_SECRET=tu-secret-super-seguro-aqui

# Tiempo de expiración del token
JWT_EXPIRES_IN=24h
```

#### Ejecutar el backend
```bash
# Modo desarrollo (con recarga automática)
npm run start:dev

# Modo producción
npm run start:prod

# Compilar para producción
npm run build
```

El backend se ejecutará en: `http://localhost:3000`

### 3. Configuración del Frontend

#### Instalar dependencias del frontend
```bash
cd booking-frontend
npm install
```

#### Instalar librerías adicionales
```bash
# Instalar SweetAlert2 para mensajes bonitos
npm install sweetalert2

# Instalar Angular Material (ya incluido en el proyecto)
# npm install @angular/material @angular/cdk

# Instalar animaciones de Angular
npm install @angular/animations
```

#### Ejecutar el frontend
```bash
# Servidor de desarrollo
ng serve

# Con proxy para evitar problemas de CORS
ng serve --proxy-config proxy.conf.json
```

El frontend se ejecutará en: `http://localhost:4200`

### 4. Acceso a la aplicación

Una vez que ambas aplicaciones estén ejecutándose:

1. **Backend**: `http://localhost:3000`
2. **Frontend**: `http://localhost:4200`

#### Rutas principales:
- **Login**: `http://localhost:4200/auth/login`
- **Registro**: `http://localhost:4200/auth/register`
- **Listado de reservas**: `http://localhost:4200/reservations/list`
- **Formulario de reserva**: `http://localhost:4200/reservations/form`

## 📦 Dependencias Instaladas

### Backend (booking-backend/package.json)
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "pg": "^8.11.0",
    "typeorm": "^0.3.17"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcryptjs": "^2.4.2",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.9",
    "@types/passport-local": "^1.0.35",
    "@types/supertest": "^2.0.12",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.1",
    "typescript": "^5.1.3"
  }
}
```

### Frontend (booking-frontend/package.json)
```json
{
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/cdk": "^17.0.0",
    "@angular/common": "^17.0.0",
    "@angular/compiler": "^17.0.0",
    "@angular/core": "^17.0.0",
    "@angular/forms": "^17.0.0",
    "@angular/material": "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/platform-browser-dynamic": "^17.0.0",
    "@angular/router": "^17.0.0",
    "rxjs": "~7.8.0",
    "sweetalert2": "^11.7.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
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
}
```

## 🔧 Comandos Útiles

### Backend
```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run start:dev

# Ejecutar en producción
npm run start:prod

# Compilar
npm run build

# Tests
npm run test
```

### Frontend
```bash
# Instalar dependencias
npm install

# Instalar SweetAlert2
npm install sweetalert2

# Servidor de desarrollo
ng serve

# Build de producción
ng build

# Tests
ng test
```

## 🗄️ Base de Datos PostgreSQL

El sistema utiliza **PostgreSQL** con las siguientes entidades:
- **Users**: Usuarios del sistema
- **Rooms**: Salas de reuniones
- **Reservations**: Reservas de salas

### Configuración de PostgreSQL
1. Instalar PostgreSQL en tu sistema
2. Crear una base de datos: `booking_db`
3. Configurar las credenciales en el archivo `.env`

### Migraciones
TypeORM se encarga de crear las tablas automáticamente con las entidades definidas.

## 🔐 Autenticación

### Registro de usuarios
- **Endpoint**: `POST /auth/register`
- **Validaciones**: Username único, email válido, contraseña mínima 6 caracteres
- **Respuesta**: Token JWT y datos del usuario

### Login de usuarios
- **Endpoint**: `POST /auth/login`
- **Validaciones**: Username y contraseña correctos
- **Respuesta**: Token JWT y datos del usuario

### Uso del token
Incluye el token en el header: `Authorization: Bearer <token>`

## 📚 API Endpoints

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión

### Reservas
- `GET /reservations` - Listar reservas (con filtro opcional por fecha)
- `POST /reservations` - Crear nueva reserva

### Usuarios
- `GET /users` - Listar usuarios

### Salas
- `GET /rooms` - Listar salas disponibles

## 🎨 Tecnologías Utilizadas

### Backend
- **NestJS** - Framework Node.js
- **TypeORM** - ORM para base de datos
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **class-validator** - Validaciones

### Frontend
- **Angular 17** - Framework frontend
- **Angular Material** - Componentes UI
- **SweetAlert2** - Mensajes bonitos
- **TypeScript** - Tipado estático
- **RxJS** - Programación reactiva

## 🛠️ Solución de Problemas

### Error de CORS
- El backend tiene CORS habilitado para `http://localhost:4200`
- Si usas otros puertos, actualiza la configuración en `main.ts`

### Error de rutas en Angular
- Asegúrate de que los componentes estén en `declarations` del módulo
- Verifica que las rutas estén correctamente configuradas

### Error de base de datos PostgreSQL
- Verifica que PostgreSQL esté ejecutándose
- Comprueba las credenciales en el archivo `.env`
- Asegúrate de que la base de datos `booking_db` exista

## 📝 Notas de Desarrollo

- El sistema está configurado para desarrollo local con PostgreSQL
- Para producción, configura variables de entorno apropiadas
- Asegúrate de tener PostgreSQL ejecutándose antes de iniciar el backend
- Los estilos están optimizados para dispositivos móviles

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
