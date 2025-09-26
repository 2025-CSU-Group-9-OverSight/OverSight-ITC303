# OverSight-ITC303 Project Makefile

.PHONY: help install install-server install-monitor dev build start lint type-check test run-monitor clean commit release generate-token generate-nextauth generate-all-tokens setup-ssl check-expiry

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: install-server install-monitor ## Install all dependencies

install-server: ## Install server dependencies
	npm install
	cd Server && npm install

install-monitor: ## Install monitoring script dependencies
	cd MonitoringScript && poetry install

dev: ## Start development server
	cd Server && npm run dev

build: ## Build the application
	cd Server && npm run build

start: ## Start production server
	cd Server && sudo npm run start

lint: ## Run linting for all components
	cd MonitoringScript && poetry run black .
	cd MonitoringScript && poetry run flake8 .
	npm run lint --prefix Server

type-check: ## Run type checking for all components
	cd MonitoringScript && poetry run mypy .
	cd Server && npm run type-check

test: ## Run tests for all components
	cd MonitoringScript && poetry run pytest
	-cd Server && npm test

run-monitor: ## Run the monitoring scripts
	cd MonitoringScript && poetry run python -m oversight_monitoring.monitoring_script

generate-token: ## Generate a secure WebSocket bearer token
	node generate-token.js

generate-nextauth: ## Generate a NextAuth secret
	node generate-token.js nextauth

generate-all-tokens: ## Generate both WebSocket and NextAuth tokens
	node generate-token.js all

setup-ssl: ## Generate self-signed SSL certificates for HTTPS/WSS
	./setup-ssl.sh

check-expiry: ## Check SSL certificate expiration dates
	./check-expiry.sh

clean: ## Clean node_modules and build artifacts
	-rm -rf node_modules
	-rm -rf Server/node_modules
	-rm -rf Server/.next
	-rm -rf Server/out
	cd MonitoringScript && poetry env remove --all

commit: ## Make a conventional commit
	npm run commit

release: ## Create a release
	npm run release