# ─────────────────────────────────────────────────
# OPTKAS Platform Makefile
# ─────────────────────────────────────────────────

.PHONY: install build test lint validate dashboard docs clean docker docker-up docker-down

# ── Install ──────────────────────────────────────
install:
	npm ci

# ── Build ────────────────────────────────────────
build:
	npx tsc -p tsconfig.json

# ── Test ─────────────────────────────────────────
test:
	npx jest --verbose --ci

test-coverage:
	npx jest --verbose --ci --coverage

# ── Lint ─────────────────────────────────────────
lint:
	npx eslint 'packages/*/src/**/*.ts' 'scripts/**/*.ts' 'apps/*/src/**/*.ts'

# ── Validate Config ──────────────────────────────
validate:
	npx ts-node scripts/validate-config.ts --dry-run

# ── Dashboard ────────────────────────────────────
dashboard:
	npx ts-node apps/dashboard/src/server.ts

# ── Docs ─────────────────────────────────────────
docs:
	npx ts-node apps/docs-site/src/build.ts

# ── Docker ───────────────────────────────────────
docker:
	docker build -t optkas-dashboard .

docker-up:
	docker-compose up -d dashboard

docker-down:
	docker-compose down

# ── Clean ────────────────────────────────────────
clean:
	rm -rf coverage/ apps/docs-site/dist/ node_modules/.cache

# ── Init Platform (dry-run) ──────────────────────
init:
	npx ts-node scripts/init-platform.ts --dry-run

# ── Full CI ──────────────────────────────────────
ci: install validate test-coverage build docs
	@echo ""
	@echo "  ✓ OPTKAS CI pipeline complete"
	@echo ""
