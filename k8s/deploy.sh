#!/bin/bash

# Script de despliegue para la arquitectura de microservicios de Coworking
# Uso: ./deploy.sh [environment] [action]

set -e

# Variables de configuración
ENVIRONMENT=${1:-base}
ACTION=${2:-deploy}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar dependencias
check_dependencies() {
    log "Verificando dependencias..."

    if ! command -v kubectl &> /dev/null; then
        error "kubectl no está instalado"
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        warning "helm no está instalado. Algunas funcionalidades pueden no estar disponibles."
    fi

    success "Dependencias verificadas"
}

# Crear namespaces
create_namespaces() {
    log "Creando namespaces..."

    kubectl apply -f "$SCRIPT_DIR/base/namespace.yml"

    if [ "$ENVIRONMENT" = "staging" ]; then
        kubectl create namespace coworking-staging --dry-run=client -o yaml | kubectl apply -f -
    elif [ "$ENVIRONMENT" = "production" ]; then
        kubectl create namespace coworking-production --dry-run=client -o yaml | kubectl apply -f -
    fi

    success "Namespaces creados"
}

# Desplegar infraestructura base
deploy_infrastructure() {
    log "Desplegando infraestructura base..."

    # Aplicar configuración base
    kubectl apply -f "$SCRIPT_DIR/base/" --namespace=coworking

    # Esperar a que los servicios estén listos
    log "Esperando a que la infraestructura esté lista..."
    kubectl wait --for=condition=available --timeout=300s deployment/kong-gateway --namespace=coworking
    kubectl wait --for=condition=available --timeout=300s deployment/user-service-db --namespace=coworking
    kubectl wait --for=condition=available --timeout=300s statefulset/redis-cluster --namespace=coworking

    success "Infraestructura desplegada"
}

# Desplegar servicios
deploy_services() {
    log "Desplegando servicios..."

    # Desplegar servicios en orden de dependencias
    kubectl apply -f "$SCRIPT_DIR/base/user-service-deployment.yml" --namespace=coworking
    kubectl apply -f "$SCRIPT_DIR/base/user-service-service.yml" --namespace=coworking

    # Aplicar configuración específica del entorno
    if [ "$ENVIRONMENT" = "staging" ]; then
        kubectl apply -f "$SCRIPT_DIR/staging/" --namespace=coworking-staging
    elif [ "$ENVIRONMENT" = "production" ]; then
        kubectl apply -f "$SCRIPT_DIR/production/" --namespace=coworking-production
    fi

    success "Servicios desplegados"
}

# Desplegar monitoreo
deploy_monitoring() {
    log "Desplegando sistema de monitoreo..."

    kubectl apply -f "$SCRIPT_DIR/base/monitoring.yml" --namespace=coworking

    # Esperar a que Prometheus y Grafana estén listos
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus --namespace=coworking
    kubectl wait --for=condition=available --timeout=300s deployment/grafana --namespace=coworking

    success "Sistema de monitoreo desplegado"
}

# Configurar Kong Gateway
configure_kong() {
    log "Configurando Kong Gateway..."

    # Aplicar configuración declarativa
    kubectl apply -f "$SCRIPT_DIR/base/kong-declarative-config.yml" --namespace=coworking

    # Reiniciar Kong para aplicar configuración
    kubectl rollout restart deployment/kong-gateway --namespace=coworking

    # Esperar a que Kong esté listo
    kubectl wait --for=condition=available --timeout=300s deployment/kong-gateway --namespace=coworking

    success "Kong Gateway configurado"
}

# Verificar despliegue
verify_deployment() {
    log "Verificando despliegue..."

    # Verificar servicios críticos
    kubectl get pods --namespace=coworking --selector=app!=redis-cluster

    # Verificar endpoints de salud
    log "Verificando health checks..."
    kubectl exec -it deployment/user-service --namespace=coworking -- curl -f http://localhost:3001/health || {
        error "Health check del User Service falló"
        exit 1
    }

    kubectl exec -it deployment/kong-gateway --namespace=coworking -- curl -f http://localhost:8001/health || {
        error "Health check de Kong Gateway falló"
        exit 1
    }

    success "Despliegue verificado correctamente"
}

# Función principal de despliegue
deploy() {
    log "🚀 Iniciando despliegue en entorno: $ENVIRONMENT"

    check_dependencies
    create_namespaces
    deploy_infrastructure
    deploy_services
    deploy_monitoring
    configure_kong
    verify_deployment

    success "🎉 Despliegue completado exitosamente!"
    log "🌐 Kong Gateway: http://kong-gateway-proxy:80"
    log "📊 Grafana: http://grafana:3000 (admin/coworking-grafana)"
    log "🔍 Prometheus: http://prometheus:9090"
    log "📚 API Docs: http://kong-gateway-proxy:80/api/v1/users/api/docs"
}

# Función de destrucción
destroy() {
    log "🗑️  Destruyendo despliegue en entorno: $ENVIRONMENT"

    if [ "$ENVIRONMENT" = "base" ]; then
        kubectl delete -f "$SCRIPT_DIR/base/" --namespace=coworking || true
        kubectl delete namespace coworking --ignore-not-found=true
    elif [ "$ENVIRONMENT" = "staging" ]; then
        kubectl delete -f "$SCRIPT_DIR/staging/" --namespace=coworking-staging || true
        kubectl delete namespace coworking-staging --ignore-not-found=true
    elif [ "$ENVIRONMENT" = "production" ]; then
        warning "⚠️  Eliminando entorno de producción. Esta acción no se puede deshacer."
        read -p "¿Está seguro? (yes/no): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            kubectl delete -f "$SCRIPT_DIR/production/" --namespace=coworking-production || true
            kubectl delete namespace coworking-production --ignore-not-found=true
            success "Entorno de producción destruido"
        else
            log "Operación cancelada"
        fi
    fi
}

# Función de actualización
update() {
    log "🔄 Actualizando servicios en entorno: $ENVIRONMENT"

    # Construir imágenes localmente si es necesario
    if [ -f "services/user-service/Dockerfile" ]; then
        log "Construyendo imágenes Docker..."
        docker build -t user-service:latest services/user-service/
    fi

    # Aplicar cambios
    kubectl rollout restart deployment/user-service --namespace=coworking
    kubectl rollout restart deployment/kong-gateway --namespace=coworking

    # Esperar a que los servicios estén listos
    kubectl rollout status deployment/user-service --namespace=coworking --timeout=300s

    success "Servicios actualizados"
}

# Función de estado
status() {
    log "📊 Estado del despliegue en entorno: $ENVIRONMENT"

    if [ "$ENVIRONMENT" = "base" ]; then
        NAMESPACE="coworking"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        NAMESPACE="coworking-staging"
    elif [ "$ENVIRONMENT" = "production" ]; then
        NAMESPACE="coworking-production"
    fi

    echo "=== Pods ==="
    kubectl get pods --namespace="$NAMESPACE" --no-headers | grep -v redis-cluster || true

    echo -e "\n=== Services ==="
    kubectl get services --namespace="$NAMESPACE" --no-headers

    echo -e "\n=== Ingress ==="
    kubectl get ingress --namespace="$NAMESPACE" --no-headers || echo "No ingress found"

    echo -e "\n=== PersistentVolumeClaims ==="
    kubectl get pvc --namespace="$NAMESPACE" --no-headers || echo "No PVCs found"
}

# Función de logs
logs() {
    SERVICE=${2:-user-service}
    log "📋 Mostrando logs del servicio: $SERVICE en entorno: $ENVIRONMENT"

    if [ "$ENVIRONMENT" = "base" ]; then
        NAMESPACE="coworking"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        NAMESPACE="coworking-staging"
    elif [ "$ENVIRONMENT" = "production" ]; then
        NAMESPACE="coworking-production"
    fi

    kubectl logs -f deployment/"$SERVICE" --namespace="$NAMESPACE"
}

# Menú de ayuda
help() {
    echo "Uso: $0 [environment] [action]"
    echo
    echo "Entornos:"
    echo "  base        Despliegue base (por defecto)"
    echo "  staging     Despliegue en staging"
    echo "  production  Despliegue en producción"
    echo
    echo "Acciones:"
    echo "  deploy      Desplegar servicios (por defecto)"
    echo "  destroy     Destruir despliegue"
    echo "  update      Actualizar servicios existentes"
    echo "  status      Mostrar estado del despliegue"
    echo "  logs        Mostrar logs de un servicio"
    echo "  help        Mostrar esta ayuda"
    echo
    echo "Ejemplos:"
    echo "  $0 base deploy          # Desplegar en entorno base"
    echo "  $0 staging deploy       # Desplegar en staging"
    echo "  $0 production status    # Ver estado de producción"
    echo "  $0 base logs user-service  # Ver logs del User Service"
}

# Ejecutar acción basada en parámetros
case "${ACTION}" in
    "deploy")
        deploy
        ;;
    "destroy")
        destroy
        ;;
    "update")
        update
        ;;
    "status")
        status
        ;;
    "logs")
        logs "$@"
        ;;
    "help"|"-h"|"--help")
        help
        ;;
    *)
        error "Acción desconocida: ${ACTION}"
        help
        exit 1
        ;;
esac
