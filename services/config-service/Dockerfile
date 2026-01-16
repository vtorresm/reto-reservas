# Multi-stage build para optimización
FROM node:18-alpine AS builder

# Instalar herramientas necesarias
RUN apk add --no-cache dumb-init

# Crear directorio de aplicación
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependencias (incluyendo dev dependencies para el build)
RUN npm ci --only=production=false

# Copiar código fuente
COPY src/ ./src/
COPY dto/ ./dto/
COPY entities/ ./entities/
COPY config/ ./config/

# Construir la aplicación
RUN npm run build

# Eliminar dev dependencies para reducir tamaño de imagen
RUN npm ci --only=production && npm cache clean --force

# Imagen de producción
FROM node:18-alpine AS production

# Instalar herramientas necesarias
RUN apk add --no-cache dumb-init curl

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Crear directorio de aplicación
WORKDIR /app

# Copiar archivos necesarios desde el builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Crear directorio para archivos temporales
RUN mkdir -p /tmp && chown -R nestjs:nodejs /tmp

# Cambiar propietario de archivos
RUN chown -R nestjs:nodejs /app

# Cambiar al usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3006/health || exit 1

# Usar dumb-init para manejar señales correctamente
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Comando de inicio
CMD ["npm", "run", "start:prod"]