#!/bin/bash
# QRent Scraper 独立部署脚本

set -e

# 切换到scraper目录
cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "================================================================="
    echo "           QRent Scraper Independent Deployment Tool"
    echo "================================================================="
    echo -e "${NC}"
}

# Check environment variables file
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error ".env file does not exist!"
        print_status "Please configure environment variables first:"
        echo ""
        echo "1. Copy example configuration file:"
        echo "   cp .env.example .env"
        echo ""
        echo "2. Edit configuration file:"
        echo "   nano .env"
        echo ""
        echo "3. Configure required variables:"
        echo "   - DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE"
        echo "   - GOOGLE_MAPS_API_KEY"  
        echo "   - PROPERTY_RATING_API_KEY"
        exit 1
    fi
}

# Check required environment variables
check_required_env() {
    print_status "Checking required environment variables..."
    
    source .env
    
    required_vars=(
        "DB_HOST"
        "DB_USER" 
        "DB_PASSWORD"
        "DB_DATABASE"
        "GOOGLE_MAPS_API_KEY"
        "PROPERTY_RATING_API_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "缺少必需的环境变量："
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "All required environment variables are configured"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p backup
    mkdir -p logs
    print_success "Directory creation completed"
}

# Build image  
build_image() {
    print_status "Building Scraper Docker image..."
    docker-compose build
    print_success "Image build completed"
}

# Start service
start_service() {
    print_status "Starting Scraper service..."
    docker-compose up -d
    print_success "Service startup completed"
    
    # Wait for service startup
    sleep 5
    show_status
}

# Stop service
stop_service() {
    print_status "Stopping Scraper service..."
    docker-compose down
    print_success "Service stopped"
}

# Restart service
restart_service() {
    print_status "Restarting Scraper service..."
    docker-compose restart
    print_success "Service restart completed"
    show_status
}

# Show status
show_status() {
    print_status "Service status:"
    docker-compose ps
    
    echo ""
    print_status "Recent logs:"
    docker-compose logs --tail=20 scraper
}

# Show logs
show_logs() {
    print_status "Real-time logs (Press Ctrl+C to exit):"
    docker-compose logs -f scraper
}

# Run scraper immediately
run_now() {
    print_status "Executing scraper task immediately..."
    docker-compose exec scraper python property.py
}

# Enter container shell
enter_shell() {
    print_status "Entering Scraper container..."
    docker-compose exec scraper bash
}

# Test mode
test_mode() {
    print_status "Running test mode..."
    docker-compose run --rm scraper test
}

# 清理数据
cleanup() {
    print_warning "This will delete all containers, images and data volumes!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning Docker resources..."
        docker-compose down -v --rmi all
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup operation cancelled"
    fi
}

# Backup data
backup_data() {
    print_status "Backing up data..."
    timestamp=$(date +"%Y%m%d_%H%M%S")
    
    # Create backup directory
    backup_dir="backup/backup_$timestamp"
    mkdir -p "$backup_dir"
    
    # Backup logs
    if docker-compose ps | grep -q scraper; then
        docker-compose exec scraper tar -czf /tmp/logs_backup.tar.gz logs/
        docker cp $(docker-compose ps -q scraper):/tmp/logs_backup.tar.gz "$backup_dir/"
    fi
    
    # Backup configuration
    cp .env "$backup_dir/" 2>/dev/null || true
    cp docker-compose.yml "$backup_dir/"
    
    print_success "Backup completed: $backup_dir"
}

# Update image
update_image() {
    print_status "Updating Docker image..."
    docker-compose pull
    docker-compose build --no-cache
    print_success "Image update completed"
}

# Show help
show_help() {
    show_banner
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  init        Initialize environment (create .env file template)"
    echo "  build       Build Scraper Docker image"
    echo "  start       Start Scraper service"
    echo "  stop        Stop Scraper service"
    echo "  restart     Restart Scraper service"
    echo "  status      Show service status and logs"
    echo "  logs        Show real-time logs"
    echo "  run         Execute scraper task immediately"
    echo "  shell       Enter container command line"
    echo "  test        Run test mode"
    echo "  backup      Backup data and configuration"
    echo "  update      Update Docker image"
    echo "  cleanup     Clean all Docker resources"
    echo "  help        Show this help information"
    echo ""
    echo "Quick start:"
    echo "  1. $0 init"
    echo "  2. Edit .env file to configure API keys"
    echo "  3. $0 build"
    echo "  4. $0 start"
    echo ""
}

# Initialize environment
init_env() {
    print_status "Initializing environment..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created .env configuration file"
        print_warning "Please edit .env file to configure necessary API keys"
        echo ""
        echo "Required configuration:"
        echo "  - Database connection information"
        echo "  - Google Maps API key"
        echo "  - DashScope API key"
    else
        print_warning ".env file already exists"
    fi
    
    create_directories
}

# Check Docker environment
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
}

# Main function
main() {
    show_banner
    
    case "${1:-help}" in
        "init")
            init_env
            ;;
        "build")
            check_docker
            check_env_file
            check_required_env
            create_directories
            build_image
            ;;
        "start")
            check_docker
            check_env_file
            check_required_env
            start_service
            ;;
        "stop")
            check_docker
            stop_service
            ;;
        "restart")
            check_docker
            restart_service
            ;;
        "status")
            check_docker
            show_status
            ;;
        "logs")
            check_docker
            show_logs
            ;;
        "run")
            check_docker
            check_env_file
            run_now
            ;;
        "shell")
            check_docker
            enter_shell
            ;;
        "test")
            check_docker
            check_env_file
            test_mode
            ;;
        "backup")
            check_docker
            backup_data
            ;;
        "update")
            check_docker
            update_image
            ;;
        "cleanup")
            check_docker
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

main "$@"
