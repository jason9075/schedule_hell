# Access Control Planning Tool

A Vanilla JS application for managing user access groups, devices, and conflict detection.

## 🚀 Getting Started

This project uses **Nix** to ensure a reproducible development environment.

### Prerequisites
- [Nix](https://nixos.org/download.html) installed with flakes enabled.

### Enter Development Environment
```bash
nix develop
# OR if you use direnv
direnv allow
```

## 🛠 Usage (Justfile)

We use `just` to automate tasks. Run `just` to list available commands.

```bash
just dev      # Start local development server (live-server)
just build    # Build for production (minify/bundle)
just test     # Run unit tests
just lint     # Check code quality
just fmt      # Format code
just deploy   # Deploy to production (e.g., gh-pages)
```

## 📂 Project Structure
- `index.html`: Main entry point.
- `main.js`: Core application logic and state management.
- `style.css`: Styling.
- `guidelines.md` & `AGENTS.md`: Project rules and AI agent instructions.
