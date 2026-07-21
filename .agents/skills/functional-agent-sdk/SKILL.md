```markdown
# functional-agent-sdk Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches best practices and conventions for contributing to the `functional-agent-sdk` TypeScript codebase. You'll learn the project's file organization, import/export patterns, commit message habits, and how to write and run tests. This guide helps ensure consistency and maintainability for all contributors.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `agentManager.ts`, `userSession.test.ts`

### Imports
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { createAgent } from './agentManager';
    ```

### Exports
- Use **named exports** rather than default exports.
  - Example:
    ```typescript
    // agentManager.ts
    export function createAgent(config: AgentConfig) { ... }
    ```

### Commit Messages
- Commit messages are **freeform** and do not follow a strict prefix convention.
- Typical length is around 79 characters.
  - Example:
    ```
    Add support for custom agent configuration options
    ```

## Workflows

### Adding a New Feature
**Trigger:** When you want to introduce new functionality.
**Command:** `/add-feature`

1. Create a new file using camelCase naming.
2. Implement the feature with named exports.
3. Use relative imports for any dependencies.
4. Write corresponding tests in a `.test.ts` file.
5. Commit your changes with a clear, descriptive message.

### Writing and Running Tests
**Trigger:** When you need to verify code correctness.
**Command:** `/run-tests`

1. Create a test file named `<feature>.test.ts` alongside the implementation.
2. Write your tests using the project's preferred (unknown) testing framework.
3. Run the tests using the project's test runner (consult project documentation for specifics).

### Refactoring Code
**Trigger:** When improving or restructuring existing code.
**Command:** `/refactor`

1. Update file names to camelCase if needed.
2. Ensure all imports remain relative.
3. Maintain named exports.
4. Update or add tests as necessary.
5. Commit with a message describing the refactor.

## Testing Patterns

- Test files follow the `*.test.ts` naming convention.
  - Example: `agentManager.test.ts`
- The specific testing framework is not detected; check project documentation for details.
- Place test files next to the corresponding implementation files.

## Commands

| Command        | Purpose                                         |
|----------------|-------------------------------------------------|
| /add-feature   | Start the process of adding a new feature       |
| /run-tests     | Run all tests in the codebase                   |
| /refactor      | Begin a code refactoring workflow               |
```