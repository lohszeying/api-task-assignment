SHELL := /bin/sh
COMPOSE_PROJECT ?= docker compose

run: start_db
	npm run start

run_dev: start_db
	npm run dev

start:
	$(COMPOSE_PROJECT) up api_task_assignment

start_dev:
	$(COMPOSE_PROJECT) up api_task_assignment_dev

start_db:
	$(COMPOSE_PROJECT) up -d api_task_assignment_db

run_migration_up: start_db
	npm run migrate:up

run_migration_down: start_db
	npm run migrate:down

run_seed: run_migration_up
	npm run seed

init_and_start: run_seed
	$(COMPOSE_PROJECT) up api_task_assignment

stop:
	$(COMPOSE_PROJECT) down

remove_db_data:
	$(COMPOSE_PROJECT) down -v
