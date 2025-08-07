#!/bin/bash

echo "🚀 Starting Docker deployment of resume-forge Backend..."

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
if docker-compose build --no-cache; then
    print_status "Docker image built successfully"
else
    print_error "Docker build failed!"
    exit 1
fi

print_step "Starting Docker containers..."
if docker-compose up -d; then
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
read -p "Do you want to deploy the frontend as well? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Starting frontend deployment..."
    
    if [ ! -d "resume-forge-frontend" ]; then
        print_error "Frontend directory 'resume-forge-frontend' not found!"
        print_error "Please ensure the frontend code is in the resume-forge-frontend directory."
        exit 1
    fi
    
    cd resume-forge-frontend
    
    if [ -f "deploy.sh" ]; then
        print_status "Running frontend deploy script..."
        if ./deploy.sh; then
            print_status "✅ Frontend deployment completed successfully!"
        else
            print_error "❌ Frontend deployment failed!"
            print_error "Please check the frontend deployment logs above."
        fi
    else
        print_error "Frontend deploy.sh script not found!"
        print_error "Please ensure the frontend deploy script exists in resume-forge-frontend/deploy.sh"
    fi
    
    cd ..
    
    print_status "🎉 Full deployment (backend + frontend) complete!"
else
    print_status "Frontend deployment skipped. You can deploy it manually by running:"
    print_status "cd resume-forge-frontend && ./deploy.sh"
fi
