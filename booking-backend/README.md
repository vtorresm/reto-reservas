# 🚀 Backend - API de Reservas de Salas

API REST desarrollada con **NestJS** y **PostgreSQL** para el sistema de reservas de salas de reuniones.

## 📋 Características Principales
- ✅ **Autenticación JWT** con registro y login
- ✅ **Base de datos PostgreSQL** con TypeORM
- ✅ **Entidades**: Users, Rooms, Reservations
- ✅ **Validaciones** con class-validator
- ✅ **CORS habilitado** para desarrollo
- ✅ **Manejo de errores específico**

## 🛠️ Instalación y Configuración

### 1. Prerrequisitos
```bash
# Instalar PostgreSQL en tu sistema
# Crear base de datos: booking_db
# Usuario: postgres / Contraseña: postgres (o la que configures)
```

### 2. Instalar dependencias
```bash
cd booking-backend
npm install
```

### 3. Instalar drivers de PostgreSQL
```bash
npm install pg @types/pg
```

### 4. Configurar base de datos
Crea un archivo `.env` en `booking-backend/`:
```env
# Puerto del servidor
PORT=3000

# Configuración de PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booking_db

# JWT Secret (cámbialo en producción)
JWT_SECRET=tu-secret-super-seguro-aqui

# Tiempo de expiración del token
JWT_EXPIRES_IN=24h
```

### 5. Ejecutar la aplicación
```bash
# Modo desarrollo (con recarga automática)
npm run start:dev

# El servidor se ejecutará en: http://localhost:3000
```

## 📚 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registrar nuevo usuario |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/reservations` | Listar reservas |
| POST | `/reservations` | Crear nueva reserva |
| GET | `/users` | Listar usuarios |
| GET | `/rooms` | Listar salas |

## 🔧 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Instalar PostgreSQL driver
npm install pg @types/pg

# Ejecutar en desarrollo
npm run start:dev

# Ejecutar en producción
npm run start:prod

# Compilar
npm run build

# Tests
npm run test
```

## 🗄️ Base de Datos

- **PostgreSQL** requerido
- **Base de datos**: `booking_db`
- **Tablas creadas automáticamente** por TypeORM
- **Entidades**: Users, Rooms, Reservations

## 🔐 Autenticación

- **Registro**: `POST /auth/register`
- **Login**: `POST /auth/login`
- **Token JWT** en respuesta
- **Header**: `Authorization: Bearer <token>`

## ⚠️ Notas Importantes

1. **PostgreSQL debe estar ejecutándose** antes de iniciar el backend
2. **Configura las credenciales correctas** en el archivo `.env`
3. **El backend se ejecuta en el puerto 3000**
4. **CORS habilitado** para `http://localhost:4200`

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
