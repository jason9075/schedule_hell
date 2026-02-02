# Agent Instructions for Access Control Planning Tool

## 1. Environment & Commands

This project uses **Nix** for the development environment and **Just** for task automation.
Do not rely on global `npm` or `node`.

### Build & Run
- **Development Server:** Start the local dev server.
  ```bash
  just dev
  ```
  *(Underlying: `vite` or `live-server`)*

- **Build:** Bundle for production.
  ```bash
  just build
  ```

### Testing
- **Run All Tests:**
  ```bash
  just test
  ```
- **Run Single Test:**
  Pass the filename or pattern to the test command.
  ```bash
  just test tests/conflict.test.js
  ```
  *(Underlying: `vitest run tests/conflict.test.js`)*

### Quality Assurance
- **Lint:** Check for code quality issues.
  ```bash
  just lint
  ```
  *(Underlying: `eslint .`)*
- **Format:** Check/Apply formatting.
  ```bash
  just fmt
  ```
  *(Underlying: `prettier --write .`)*

---

## 2. Code Style Guidelines

### General Principles
- **Vanilla JS:** strictly adhere to **Vanilla JavaScript (ES6+)**. No frameworks (React, Vue, etc.).
- **State Management:** Centralized `state` object (see `guidelines.md`).
- **Functional:** Prefer pure functions for logic (e.g., conflict detection).

### Formatting
- **Indentation:** 2 spaces.
- **Quotes:** Single quotes `'`.
- **Semicolons:** Always use semicolons `;`.
- **Trailing Commas:** ES5 compatible (objects/arrays).

### Naming Conventions
- **Variables/Functions:** `camelCase` (e.g., `checkConflict`, `updateUserList`).
- **Classes/Constructors:** `PascalCase`.
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `DEFAULT_START_TIME`).
- **DOM Elements:** Suffix with type (e.g., `submitBtn`, `userListEl`).

### Type Safety (JSDoc)
Since we are using Vanilla JS, use **JSDoc** to enforce types and document interfaces.
```javascript
/**
 * Checks for device conflicts for a user.
 * @param {string} targetUserId
 * @param {string} targetGroupId
 * @param {string[]} targetDeviceKeys
 * @returns {{hasConflict: boolean, conflictingGroup?: string}}
 */
function checkConflict(targetUserId, targetGroupId, targetDeviceKeys) { ... }
```

### Imports
- Use ES Modules (`import`/`export`).
- Import specific functions rather than whole modules when possible.
- Relative paths must start with `./` or `../`.

### Error Handling
- Use `try/catch` for async operations.
- Fail gracefully in UI (e.g., show error toast/banner instead of crashing).
- Validation errors (like conflicts) should be returned as structured objects, not thrown as exceptions.

---

## 3. Project-Specific Rules (from guidelines.md)

### Data Model
- **State:** Centralized `state` object containing `users`, `devices`, and `groups`.
- **Group Structure:**
  ```javascript
  {
    id: "uuid",
    name: "Group Name",
    members: ["UserA", "UserB"],
    configs: { "DeviceA": { start: "00:00", end: "23:59" } }
  }
  ```

### Conflict Detection
- **Rule:** A user cannot be in two groups that configure the same device.
- **Trigger:** Run `checkConflict` immediately when a user is selected in the UI.
- **Visuals:** Mark conflicting users with ⚠️ and disable save.

### DOM Manipulation
- **Event Delegation:** Bind listeners to parent containers, not individual items.
  ```javascript
  // Good
  container.addEventListener('change', e => { if (e.target.matches(...)) ... })
  ```
- **Data Attributes:** Use `data-id` or `data-type` for DOM state tracking.

---

## 4. Cursor/Copilot Instructions

- **No Frameworks:** If asked to add a library, verify if native DOM APIs can achieve the goal first.
- **Senior Engineer Role:** Focus on clean, maintainable, and idiomatic JavaScript.
- **NixOS Context:** Assume the environment is managed by `flake.nix`. Suggest `nix` commands over `apt/brew`.
