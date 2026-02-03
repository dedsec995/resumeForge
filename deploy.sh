#!/bin/bash

echo "🚀 Starting Docker deployment of resume-forge Backend..."

print_step "Pulling latest changes from git..."
if git pull; then
    print_status "Git pull successful"
else
    print_warning "Git pull failed or no changes to pull"
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please ensure your environment variables are configured."
fi

print_step "Stopping existing Docker containers..."
if docker-compose down; then
    print_status "Existing containers stopped successfully"
else
    print_warning "No existing containers to stop or error occurred"
fi

print_step "Building Docker image..."
# if docker-compose build --no-cache; then
#     print_status "Docker image built successfully"
# else
#     print_error "Docker build failed!"
#     exit 1
# fi

print_step "Starting Docker containers..."
if docker-compose up --build -d; then
    print_status "Docker containers started successfully"
else
    print_error "Failed to start Docker containers!"
    exit 1
fi

print_step "Waiting for containers to initialize..."
sleep 5

print_step "Checking container status..."
if docker-compose ps | grep -q "Up"; then
    print_status "✅ Backend deployment successful!"
    print_status "Backend is running on http://localhost:8002"
    print_status "Available at: https://resumeforge.thatinsaneguy.com/api/"
    
    print_status "Container Status:"
    docker-compose ps
    
    print_status "Recent logs:"
    docker-compose logs --tail=10
    
    print_status "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
else
    print_error "❌ Backend deployment failed!"
    print_error "Container is not running properly."
    print_error "Check logs with: docker-compose logs"
    exit 1
fi

print_step "Performing health check..."
sleep 3
if curl -f http://localhost:8002/ > /dev/null 2>&1; then
    print_status "✅ Health check passed! Backend is responding."
else
    print_warning "⚠️  Health check failed. Backend might still be starting up."
    print_warning "You can check logs with: docker-compose logs -f"
fi

print_status "🎉 Backend deployment complete!"
print_status "Note: Make sure nginx is configured to proxy API requests to port 8002"
print_status "To view logs: docker-compose logs -f"
print_status "To stop: docker-compose down"

echo ""
print_step "Frontend Deployment"

print_step "Starting frontend deployment..."

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    print_error "Frontend directory 'frontend' not found!"
    print_error "Please ensure the frontend code is in the frontend directory."
    exit 1
fi

print_status "Deploying frontend..."
cd frontend

# Check if frontend deploy script exists
if [ ! -f "deploy.sh" ]; then
    print_error "Frontend deploy script not found!"
    print_error "Please ensure the frontend deploy script exists in frontend/deploy.sh"
    exit 1
fi

# Run frontend deployment
./deploy.sh

print_status "cd frontend && ./deploy.sh"

cd ..

print_status "🎉 Full deployment (backend + frontend) complete!"

echo ""
print_step "Nginx Configuration Setup"

# Domain configuration
DOMAIN="resumeforge.thatinsaneguy.com"
NGINX_CONF_FILE="nginx-resumeforge.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    print_warning "Nginx is not installed. Skipping nginx setup."
    print_warning "Install nginx: sudo pacman -S nginx"
    exit 0
fi

# Check if running with sudo
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then
    print_warning "Not running as root. Nginx setup requires sudo."
    print_warning "To set up nginx manually, run:"
    echo "  sudo cp $NGINX_CONF_FILE $NGINX_AVAILABLE"
    echo "  sudo ln -sf $NGINX_AVAILABLE $NGINX_ENABLED"
    echo "  sudo nginx -t && sudo systemctl reload nginx"
    echo "  echo '1' | sudo certbot --nginx -d $DOMAIN"
    exit 0
fi

# Check if nginx config file exists
if [ ! -f "$NGINX_CONF_FILE" ]; then
    print_error "Nginx config file '$NGINX_CONF_FILE' not found!"
    print_error "Please ensure the nginx config file exists in the project root."
    exit 1
fi

# Copy nginx config
print_step "Copying nginx configuration..."
cp "$NGINX_CONF_FILE" "$NGINX_AVAILABLE"

# Enable the site
print_step "Enabling nginx site..."
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
print_step "Testing nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration is valid"
    print_step "Reloading nginx..."
    systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
    print_status "✅ Nginx configuration deployed"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

# SSL Certificate Setup
echo ""
print_step "SSL Certificate Setup"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot is not installed. Installing certbot..."
    if command -v pacman &> /dev/null; then
        # Arch Linux
        pacman -Sy --noconfirm certbot certbot-nginx 2>/dev/null || {
            print_error "Failed to install certbot. Please install manually: sudo pacman -S certbot certbot-nginx"
            exit 1
        }
    elif command -v apt &> /dev/null; then
        # Ubuntu/Debian
        apt update && apt install -y certbot python3-certbot-nginx 2>/dev/null || {
            print_error "Failed to install certbot. Please install manually: sudo apt install certbot python3-certbot-nginx"
            exit 1
        }
    else
        print_error "Could not determine package manager. Please install certbot manually."
        exit 1
    fi
fi

# Get SSL certificate
print_step "Setting up SSL certificate..."
print_status "If prompted to reinstall/renew certificate, automatically selecting option 1 (reinstall existing)..."

# Run certbot with automatic selection of option 1 if prompted
# First try non-interactive mode (works for new certs or valid existing certs)
if certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --keep-until-expiring 2>/dev/null; then
    print_status "✅ SSL certificate configured successfully"
else
    # If non-interactive fails (e.g., cert exists and certbot wants to prompt for reinstall choice)
    # Use interactive mode and pipe "1" to automatically select "reinstall existing certificate"
    print_status "Running certbot with automatic selection of option 1 (reinstall existing)..."
    # Handle prompts: email (skip/use existing), agreement (A), reinstall choice (1)
    # Using printf to handle multiple prompts: empty for email (use existing), A for agree, 1 for reinstall
    if printf "\nA\n1\n" | certbot --nginx -d ${DOMAIN} 2>/dev/null; then
        print_status "✅ SSL certificate configured successfully"
    else
        print_warning "⚠️  Certbot encountered an issue. This might be normal if certificate already exists."
        print_warning "You can manually run: printf '\nA\n1\n' | sudo certbot --nginx -d ${DOMAIN}"
    fi
fi

# Test nginx configuration after SSL setup
print_step "Testing nginx configuration after SSL setup..."
if nginx -t; then
    print_status "Nginx configuration is valid"
    systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
    print_status "✅ Nginx reloaded with SSL configuration"
else
    print_error "Nginx configuration test failed after SSL setup!"
    exit 1
fi

echo ""
print_status "🎉 Nginx and SSL setup complete!"
print_status "Site available at: https://${DOMAIN}"
print_status "API available at: https://${DOMAIN}/api/"
