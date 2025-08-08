#!/bin/bash

# PM2 Deploy script for resume-forge Frontend
echo "🚀 Starting PM2 deployment of resume-forge Frontend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Please install PM2 first: npm install -g pm2"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build the application
print_status "Building React application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed! dist/ directory not found."
    exit 1
fi

# Stop and delete existing PM2 process if it exists
pm2 delete frontend 2>/dev/null || true

# Start the application with PM2
pm2 serve dist/ 3006 --name frontend --spa

# Wait a moment for PM2 to start the process
sleep 2

# Check if the process started successfully
if pm2 list | grep -q "frontend.*online"; then
    print_status "✅ Frontend deployed successfully!"
    
    # Get memory usage
    MEMORY=$(pm2 list | grep frontend | awk '{print $10}')
    print_status "Memory usage: $MEMORY"
else
    print_error "❌ Frontend deployment failed!"
    print_error "Check PM2 logs with: pm2 logs frontend"
    exit 1
fi 