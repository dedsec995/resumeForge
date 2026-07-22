#!/usr/bin/env bash
# PM2 deploy for ResumeForge frontend (port 9240)
set -euo pipefail

APP_NAME="resumeforge-frontend"
PORT=9240

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 Starting PM2 deployment of resume-forge Frontend..."

if ! command -v node &>/dev/null; then
  print_error "Node.js is not installed."
  exit 1
fi

if ! command -v pm2 &>/dev/null; then
  print_error "PM2 is not installed. Install: npm install -g pm2"
  exit 1
fi

print_status "Installing dependencies…"
npm install

print_status "Building React application…"
npm run build

if [[ ! -d dist ]]; then
  print_error "Build failed — dist/ not found."
  exit 1
fi

print_status "Restarting PM2 app (${APP_NAME})…"
pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
pm2 delete frontend >/dev/null 2>&1 || true
pm2 serve dist/ "${PORT}" --name "${APP_NAME}" --spa
pm2 save >/dev/null 2>&1 || true

sleep 2

if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  print_status "✅ Frontend deployed on http://localhost:${PORT}"
elif pm2 describe "${APP_NAME}" 2>/dev/null | grep -q "status.*online"; then
  print_status "✅ Frontend PM2 process is online on port ${PORT}"
else
  print_error "❌ Frontend deployment failed!"
  print_error "Check: pm2 logs ${APP_NAME}"
  exit 1
fi

MEMORY="$(pm2 jlist 2>/dev/null | grep -o '"name":"'"${APP_NAME}"'"[^}]*"memory":[0-9]*' | grep -o '"memory":[0-9]*' | cut -d: -f2 || true)"
if [[ -n "${MEMORY}" ]]; then
  print_status "Memory usage: ${MEMORY} bytes"
fi
