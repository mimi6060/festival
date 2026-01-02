#!/bin/bash
# ============================================
# Festival Platform - Docker Build Script
# ============================================
# Builds all Docker images for the platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${DOCKER_REGISTRY:-"festival"}
VERSION=${VERSION:-"latest"}
PUSH=${PUSH:-"false"}

# Print with color
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build function
build_image() {
    local name=$1
    local dockerfile=$2
    local context=${3:-.}
    local image="${REGISTRY}/${name}:${VERSION}"

    print_info "Building ${image}..."

    docker build \
        -f "${dockerfile}" \
        -t "${image}" \
        --build-arg NODE_ENV=production \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        "${context}"

    if [ $? -eq 0 ]; then
        print_success "Built ${image}"

        if [ "${PUSH}" = "true" ]; then
            print_info "Pushing ${image}..."
            docker push "${image}"
            print_success "Pushed ${image}"
        fi
    else
        print_error "Failed to build ${image}"
        exit 1
    fi
}

# Main
main() {
    print_info "Festival Platform Docker Build"
    print_info "Registry: ${REGISTRY}"
    print_info "Version: ${VERSION}"
    print_info "Push: ${PUSH}"
    echo ""

    # Build API
    build_image "api" "apps/api/Dockerfile"

    # Build Web
    build_image "web" "apps/web/Dockerfile"

    # Build Admin
    build_image "admin" "apps/admin/Dockerfile"

    echo ""
    print_success "All images built successfully!"
    echo ""

    # List built images
    print_info "Built images:"
    docker images | grep "${REGISTRY}" | grep "${VERSION}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --push)
            PUSH="true"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --registry REGISTRY  Docker registry (default: festival)"
            echo "  --version VERSION    Image version (default: latest)"
            echo "  --push               Push images after building"
            echo "  -h, --help           Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main
