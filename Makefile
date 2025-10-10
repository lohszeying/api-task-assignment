SHELL := /bin/sh
.DEFAULT_GOAL := help

PORT ?= 3000

run: start_db
	npm run start

run_dev: start_db
	npm run dev

start_dev:
	docker compose up --build

start_db:
	docker compose up -d api_task_assignment_db

stop:
	docker compose down
