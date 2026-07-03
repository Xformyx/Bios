# ============================================================
# MyHealth Market Lite - Docker 관리 명령어
# ============================================================

.PHONY: help up down build logs restart clean dev status

help: ## 도움말 표시
	@echo "MyHealth Market Lite - Docker 명령어"
	@echo "============================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## 전체 서비스 시작 (백그라운드)
	docker-compose up -d

down: ## 전체 서비스 중지
	docker-compose down

build: ## 이미지 빌드
	docker-compose build --no-cache

logs: ## 전체 로그 확인
	docker-compose logs -f

logs-server: ## 서버 로그만 확인
	docker-compose logs -f server

logs-client: ## 클라이언트 로그만 확인
	docker-compose logs -f client

restart: ## 전체 서비스 재시작
	docker-compose restart

restart-server: ## 서버만 재시작
	docker-compose restart server

status: ## 서비스 상태 확인
	docker-compose ps

clean: ## 전체 정리 (볼륨 포함)
	docker-compose down -v --rmi local

dev: ## 개발 모드 (로그 표시)
	docker-compose up --build

db-shell: ## PostgreSQL 셸 접속
	docker-compose exec postgres psql -U myhealth -d myhealth

redis-shell: ## Redis CLI 접속
	docker-compose exec redis redis-cli

backup-db: ## 데이터베이스 백업
	docker-compose exec postgres pg_dump -U myhealth myhealth > backup_$$(date +%Y%m%d_%H%M%S).sql
