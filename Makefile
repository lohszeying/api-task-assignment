SHELL := /bin/sh
.PHONY := help run run_dev start start_dev start_db stop run_migration_up run_migration_down
.DEFAULT_GOAL := help

PORT ?= 3000
COMPOSE_PROJECT ?= docker compose

help:
	@echo "Available targets:"
	@echo "  make run             - Build and run the API locally (ensures DB is up)"
	@echo "  make run_dev         - Run the API locally with TSX hot reload (ensures DB is up)"
	@echo "  make start           - Start API + Postgres via Docker (production build)"
	@echo "  make start_dev       - Start API + Postgres via Docker with hot reload"
	@echo "  make start_db        - Start only the Postgres container"
	@echo "  make run_migration_up   - Apply pending SQL migrations"
	@echo "  make run_migration_down - Roll back the most recent migration"
	@echo "  make stop            - Stop Docker containers"

run: start_db
	npm run start

run_dev: start_db
	npm run dev

start:
	$(COMPOSE_PROJECT) -f docker-compose.prod.yml up --build

start_dev:
	$(COMPOSE_PROJECT) up --build

start_db:
	$(COMPOSE_PROJECT) up -d api_task_assignment_db

run_migration_up: start_db
	npm run migrate:up

run_migration_down: start_db
	npm run migrate:down

stop:
	$(COMPOSE_PROJECT) down
