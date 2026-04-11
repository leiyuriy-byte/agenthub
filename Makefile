# ============================================================
# AgentHub Makefile
# ============================================================
# Quick deployment commands for development and production.
#
# Usage:
#   make help              Show this help
#   make dev               Start development environment
#   make build             Build for production
#   make prod              Deploy to production
#   make logs              Tail all logs
#   make logs-api          Tail API logs
#   make logs-web          Tail web logs
#   make restart           Restart all services
#   make clean             Stop and remove all containers + volumes
#   make db-backup         Backup database to ./backups/
#   make db-restore FILE=  Restore database from ./backups/<FILE>
# ============================================================

.PHONY: help dev build prod logs logs-api logs-web restart clean db-backup db-restore status

# ── Default ────────────────────────────────────────────────
help:
	@echo "AgentHub Makefile"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Environment:"
	@echo "    .env           - development (auto-created from .env.example)"
	@echo "    .env.production - production  (copy from .env.production.example)"

# ── Development ────────────────────────────────────────────
dev: ## Start development environment
	docker-compose up -d
	@echo "🌐 Web:    http://localhost:3000"
	@echo "🔌 API:    http://localhost:3001"
	@echo "📚 Docs:   http://localhost:3001/docs"

build: ## Build Docker images (no cache)
	docker-compose build --no-cache

build-dev: ## Build Docker images (with cache)
	docker-compose build

# ── Production ──────────────────────────────────────────────
prod: ## Deploy to production (uses .env.production)
	docker-compose --env-file .env.production up -d --build
	@echo "✅ Production deployment complete"

prod-verbose: ## Deploy to production with full output
	docker-compose --env-file .env.production up -d --build --verbose

# ── Logs ────────────────────────────────────────────────────
logs: ## Tail all logs
	docker-compose logs -f

logs-api: ## Tail API logs
	docker-compose logs -f api

logs-web: ## Tail Web logs
	docker-compose logs -f web

# ── Operations ─────────────────────────────────────────────
status: ## Show container status
	docker-compose ps

restart: ## Restart all services
	docker-compose restart
	@echo "✅ Services restarted"

stop: ## Stop all services (keep volumes)
	docker-compose stop

clean: ## Stop and remove all containers + volumes (DESTRUCTIVE)
	docker-compose down -v
	@echo "🗑️  All containers and volumes removed"

# ── Database ────────────────────────────────────────────────
DB_BACKUP_DIR := ./backups

db-backup: ## Backup database to ./backups/
	@mkdir -p $(DB_BACKUP_DIR)
	@DATE=$$(date +%Y%m%d_%H%M%S); \
	docker-compose exec -T api sh -c "tar -czf /tmp/backup_\$$DATE.tar.gz -C /app data" && \
	docker-compose cp api:/tmp/backup_$$DATE.tar.gz $(DB_BACKUP_DIR)/agenthub_$$DATE.tar.gz && \
	docker-compose exec -T api rm /tmp/backup_$$DATE.tar.gz && \
	echo "✅ Backup saved: $(DB_BACKUP_DIR)/agenthub_$$DATE.tar.gz"

db-restore: ## Restore database from ./backups/<FILE>
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make db-restore FILE=agenthub_20240101_120000.tar.gz"; \
		exit 1; \
	fi
	@echo "⚠️  This will overwrite your current database!"
	@docker-compose cp $(FILE) api:/tmp/restore.tar.gz && \
	docker-compose exec -T api sh -c "rm -rf /app/data && mkdir -p /app/data && tar -xzf /tmp/restore.tar.gz -C /app" && \
	docker-compose exec -T api rm /tmp/restore.tar.gz && \
	docker-compose restart api && \
	echo "✅ Database restored from $(FILE)"

# ── Maintenance ────────────────────────────────────────────
migrate: ## Run database migrations
	docker-compose exec api sh -c "cd /app && pnpm --filter @agenthub/api db:migrate"

seed: ## Seed database with initial data
	docker-compose exec api sh -c "cd /app && pnpm --filter @agenthub/api db:seed"

shell-api: ## Open shell in API container
	docker-compose exec api sh

shell-web: ## Open shell in Web container
	docker-compose exec web sh

# ── Health Checks ────────────────────────────────────────────
health: ## Check health of all services
	@echo "Web health:";    curl -sf http://localhost:3000 >/dev/null && echo "✅ OK" || echo "❌ DOWN"
	@echo "API health:";    curl -sf http://localhost:3001/health >/dev/null && echo "✅ OK" || echo "❌ DOWN"
	@echo "API docs:";      curl -sf http://localhost:3001/docs >/dev/null && echo "✅ OK" || echo "❌ DOWN"
