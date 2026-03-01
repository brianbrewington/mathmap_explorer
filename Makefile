.PHONY: serve test test-watch heroes heroes-refresh help

PORT ?= 8080

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

serve: heroes ## Start the dev server (PORT=8080 by default)
	@node server.js

test: ## Run tests once
	@npx vitest run

test-watch: ## Run tests in watch mode
	@npx vitest

heroes: ## Generate hero thumbnails (skips if heroes/ exists)
	@node scripts/generate-heroes.js

heroes-refresh: ## Regenerate all hero thumbnails
	@node scripts/generate-heroes.js --force
