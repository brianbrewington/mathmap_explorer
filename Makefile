.PHONY: serve test test-watch heroes heroes-refresh help

PORT ?= 8080

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

serve: ## Start the dev server (PORT=8080 by default)
	@if lsof -iTCP:$(PORT) -sTCP:LISTEN -t > /dev/null 2>&1; then \
		echo "\n  Error: port $(PORT) is already in use.\n  Run: PORT=<other> make serve\n"; \
		exit 1; \
	fi; \
	node server.js & \
	SERVER_PID=$$!; \
	printf '\n  Waiting for server'; \
	i=0; \
	while [ $$i -lt 20 ]; do \
		sleep 0.5; \
		if ! kill -0 $$SERVER_PID 2>/dev/null; then \
			echo "\n  Server process exited unexpectedly on port $(PORT)"; \
			exit 1; \
		fi; \
		if curl -sf http://localhost:$(PORT)/ > /dev/null 2>&1; then \
			echo "\n  Server is up — http://localhost:$(PORT)\n"; \
			wait $$SERVER_PID; \
			exit $$?; \
		fi; \
		printf '.'; \
		i=$$((i+1)); \
	done; \
	echo "\n  Server failed to respond on port $(PORT)"; \
	kill $$SERVER_PID 2>/dev/null; \
	exit 1

test: ## Run tests once
	@npx vitest run

test-watch: ## Run tests in watch mode
	@npx vitest

heroes: ## Generate hero thumbnails (skips if heroes/ exists)
	@node scripts/generate-heroes.js

heroes-refresh: ## Regenerate all hero thumbnails
	@node scripts/generate-heroes.js --force
