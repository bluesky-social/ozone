
SHELL = /bin/bash
.SHELLFLAGS = -o pipefail -c

.PHONY: help
help: ## Print info about all commands
	@echo "Helper Commands:"
	@echo
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "    \033[01;32m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "NOTE: dependencies between commands are not automatic. Eg, you must run 'deps' and 'build' first, and after any changes"

.PHONY: build
build: ## Compile all modules
	yarn build

.PHONY: test
test: ## Run tests
	yarn type-check

.PHONY: run-dev-server
run-dev-server: ## Run a "development environment" shell
	yarn dev

.PHONY: lint
lint: ## Run style checks and verify syntax
	yarn lint

.PHONY: deps
deps: ## Installs dependent libs using 'yarn install'
	yarn install --frozen-lockfile

.PHONY: nvm-setup
nvm-setup: ## Use NVM to install and activate node+yarn
	nvm install 20
	nvm use 20
	npm install --global yarn
