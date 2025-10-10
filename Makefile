SHELL := /bin/sh
COMPOSE_PROJECT ?= docker compose

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

run_seed: run_migration_up
	npm run seed

stop:
	$(COMPOSE_PROJECT) down
