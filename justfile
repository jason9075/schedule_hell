# Justfile for Access Control Planning Tool

set shell := ["bash", "-c"]

# List available commands
default:
    @just --list

# Install dependencies (if we decide to add package.json later)
setup:
    npm install

# Start local development server
dev:
    browser-sync start --server --files "." --port 8080

# Clean the build directory
clean:
    rm -rf dist

# Build for production
build: clean
    mkdir -p dist
    cp index.html style.css main.js dist/
    # In a real setup, we might run minification here

# Run tests
test:
    @echo "Running tests..."
    # npx vitest

# Lint code
lint:
    @echo "Linting..."
    # npx eslint .

# Format code
fmt:
    @echo "Formatting..."
    # npx prettier --write .

# Deploy (Simulated)
deploy: build
    @echo "Deploying to production..."
    # Example: gh pages deploy dist
    @echo "Build artifacts are in ./dist ready for deployment."
