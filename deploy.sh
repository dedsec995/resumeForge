#!/usr/bin/env bash
# ResumeForge — Docker backend + PM2 frontend + nginx/SSL
#
#   ./deploy.sh
#   sudo ./deploy.sh
#
# Optional env:
#   DEPLOY_USER=you          # PM2/npm user when run with sudo (default: SUDO_USER)
#   SKIP_NGINX=1             # app only (docker + PM2, no nginx/certbot)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../dktp/deployLib.sh
source "${ROOT}/../dktp/deployLib.sh"
cd "$ROOT"

DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-$USER}}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

step()   { echo -e "${BLUE}[resumeforge]${NC} $*"; }
info()   { echo -e "${GREEN}[resumeforge]${NC} $*"; }
warn()   { echo -e "${YELLOW}[resumeforge]${NC} $*" >&2; }
err()    { echo -e "${RED}[resumeforge]${NC} $*" >&2; }
banner() {
  echo ""
  echo -e "${CYAN}================================================================================${NC}"
  echo -e "${CYAN} $*${NC}"
  echo -e "${CYAN}================================================================================${NC}"
  echo ""
}

run_as_deploy_user() {
  if [[ "$(id -u)" -eq 0 && "$DEPLOY_USER" != "root" && "$(id -un)" != "$DEPLOY_USER" ]]; then
    sudo -u "$DEPLOY_USER" -H bash -lc "$*"
  else
    bash -lc "$*"
  fi
}

compose() {
  if docker compose version &>/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose &>/dev/null; then
    docker-compose "$@"
  else
    err "Docker Compose is not installed (need 'docker compose' or docker-compose)."
    exit 1
  fi
}

DOMAIN="resumeforge.thatinsaneguy.com"
NGINX_CONF_FILE="nginx-resumeforge.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
BACKEND_PORT=9241
FRONTEND_PORT=9240

START_TS=$(date +%s)
banner "ResumeForge deploy"
info "Domain: https://${DOMAIN}"
if [[ "$(id -u)" -eq 0 && "$DEPLOY_USER" != "root" ]]; then
  info "Running as root — PM2/npm as ${DEPLOY_USER}, Docker/nginx as root"
fi

if [[ -d "${ROOT}/.git" ]] && command -v git &>/dev/null; then
  step "Git pull (optional)…"
  (git pull --ff-only 2>/dev/null) && info "git pull OK" || warn "git pull skipped or failed"
fi

if [[ ! -f "${ROOT}/.env" ]]; then
  warn ".env file not found — ensure environment variables are configured."
fi

banner "Docker backend (port ${BACKEND_PORT})"
if ! command -v docker &>/dev/null; then
  err "Docker is not installed."
  exit 1
fi

step "Stopping existing containers…"
compose down >/dev/null 2>&1 || true

step "Building and starting backend…"
compose up --build -d

step "Waiting for backend…"
HEALTH_OK=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://localhost:${BACKEND_PORT}/" >/dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 3
done

if [[ "$HEALTH_OK" == true ]]; then
  info "Backend healthy on http://localhost:${BACKEND_PORT}"
else
  warn "Backend health check did not pass yet — check: docker compose logs -f"
fi

banner "Frontend (PM2, port ${FRONTEND_PORT})"
if [[ ! -d "${ROOT}/frontend" ]]; then
  err "Frontend directory not found: ${ROOT}/frontend"
  exit 1
fi
if [[ ! -f "${ROOT}/frontend/deploy.sh" ]]; then
  err "Frontend deploy script not found: ${ROOT}/frontend/deploy.sh"
  exit 1
fi

if [[ "$(id -u)" -eq 0 && "$DEPLOY_USER" != "root" ]]; then
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" \
    "${ROOT}/frontend/node_modules" \
    "${ROOT}/frontend/dist" 2>/dev/null || true
fi

step "Building and starting frontend as ${DEPLOY_USER}…"
run_as_deploy_user "cd '${ROOT}/frontend' && bash ./deploy.sh"

banner "Nginx + SSL (${DOMAIN})"
if [[ "${SKIP_NGINX:-0}" == "1" ]]; then
  warn "SKIP_NGINX=1 — nginx/certbot skipped"
elif ! command -v nginx &>/dev/null; then
  warn "nginx not installed — skipping vhost/SSL"
  warn "Install: sudo pacman -S nginx  or  sudo apt install nginx"
elif [[ "$(id -u)" -ne 0 ]]; then
  warn "Not root — nginx/SSL skipped. Use: sudo bash ${ROOT}/deploy.sh"
  warn "Manual nginx:"
  echo "  sudo cp ${NGINX_CONF_FILE} ${NGINX_AVAILABLE}"
  echo "  sudo ln -sf ${NGINX_AVAILABLE} ${NGINX_ENABLED}"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
elif [[ ! -f "$NGINX_CONF_FILE" ]]; then
  err "Missing nginx config: ${NGINX_CONF_FILE}"
  exit 1
else
  step "Installing nginx vhost…"
  cp "$NGINX_CONF_FILE" "$NGINX_AVAILABLE"
  chmod 644 "$NGINX_AVAILABLE"
  ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
  rm -f /etc/nginx/sites-enabled/default

  step "nginx test + reload"
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx >/dev/null 2>&1 || service nginx reload >/dev/null 2>&1 || true
    info "Nginx configured"
  else
    err "nginx -t failed"
    exit 1
  fi

  if le_cert_exists "${DOMAIN}"; then
    if le_nginx_has_ssl "${DOMAIN}"; then
      info "Certificate exists for ${DOMAIN} — HTTPS vhost OK."
    else
      step "Applying existing certificate to nginx (${DOMAIN})…"
      le_install_nginx_ssl "${DOMAIN}" \
        || warn "Could not apply SSL — run: sudo certbot install --cert-name ${DOMAIN}"
    fi
  elif command -v certbot &>/dev/null; then
    step "Certbot: ${DOMAIN}"
    if certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect 2>/dev/null; then
      info "SSL certificate configured"
    elif printf '\nA\n1\n' | certbot --nginx -d "${DOMAIN}" 2>/dev/null; then
      info "SSL certificate configured"
    else
      warn "Certbot issue for ${DOMAIN} — check manually"
    fi
    nginx -t >/dev/null 2>&1 && (systemctl reload nginx >/dev/null 2>&1 || service nginx reload >/dev/null 2>&1 || true)
  else
    warn "certbot not installed — HTTP vhost only"
  fi
fi

ELAPSED=$(( $(date +%s) - START_TS ))
banner "Deploy summary (${ELAPSED}s)"
info "ResumeForge deploy finished."

cat <<EOF

Live URLs:
  Site:  https://${DOMAIN}
  API:   https://${DOMAIN}/api/

Local ports:
  Frontend: http://localhost:${FRONTEND_PORT}
  Backend:  http://localhost:${BACKEND_PORT}

Useful commands:
  docker compose logs -f
  docker compose ps
  pm2 status
  pm2 logs resumeforge-frontend
  pm2 restart resumeforge-frontend
EOF
