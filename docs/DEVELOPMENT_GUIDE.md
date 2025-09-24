# OverSight Development Guide

This guide covers everything you need to know to develop, contribute to, and maintain the OverSight-ITC303 monitoring system.

## Table of Contents

- [Project Overview](#project-overview)
- [Git Branch Strategy](#git-branch-strategy)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Conventional Commits](#conventional-commits)
- [Testing](#testing)
- [Release Process](#release-process)

## Project Overview

OverSight-ITC303 is a live system monitoring and reporting system consisting of:

- **MonitoringScript/**: Python-based monitoring scripts deployed on remote VMs
- **Server/**: NextJS web application for UI and API routes  
- **Database**: (Future) Data storage for monitoring metrics

## Git Branch Strategy

We follow a structured branching model for code quality and collaboration:

### Branch Structure

```
main (production)
├── dev (development)
    ├── feat/user-authentication
    ├── feat/monitoring-dashboard  
    ├── fix/memory-leak-monitoring
    └── fix/api-response-timeout
```

### Branch Types

- **`main`**: Production-ready code. Protected branch.
- **`dev`**: Integration branch for development. Protected branch.
- **`feat/*`**: New features (e.g., `feat/cpu-monitoring`, `feat/user-dashboard`)
- **`fix/*`**: Bug fixes (e.g., `fix/memory-leak`, `fix/auth-issue`)
- **`docs/*`**: Documentation updates (e.g., `docs/api-guide`)
- **`chore/*`**: Maintenance tasks (e.g., `chore/update-dependencies`)

### Workflow

1. **Create feature branch** from `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/your-feature-name
   ```

2. **Develop and commit** using conventional commits:
   ```bash
   make commit  # Interactive conventional commits
   ```

3. **Push and create PR** to `dev`:
   ```bash
   git push origin feat/your-feature-name
   # Create PR: feat/your-feature-name -> dev
   ```

4. **Code review** by team member (required)
- **MonitoringScript** -> review by Database Team
- **Database** -> reviewed by UI Team
- **UI** -> reviewed by Monitoring Script Team

5. **Merge to dev** after approval

6. **Release PR** from `dev` to `main` (reviewed by project lead)

### Branch Protection Rules

- **`main`**: Requires PR review by project lead, all checks must pass
- **`dev`**: Requires PR review by specified team, all checks must pass
- **No direct pushes** to protected branches

## Development Setup

### Prerequisites

Install the following tools:

1. **Node.js** (v18+): [nodejs.org](https://nodejs.org/)
2. **Python** (3.11+): [python.org](https://python.org/) 
3. **Poetry**: [python-poetry.org](https://python-poetry.org/)
4. **Git**: [git-scm.com](https://git-scm.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd OverSight-ITC303
   ```

2. **Install all dependencies**:

   **Option A: Using Make (Linux/macOS/WSL)**
   ```bash
   make install
   ```

   **Option B: Using Make Alias (Windows - Recommended)**
   ```powershell
   # One-time setup to enable 'make' commands:
   .\setup-aliases.ps1
   
   # Then use the same commands as Linux/macOS:
   make install
   ```

   **Option C: Using Batch Files (Windows - Alternative)**
   ```cmd
   install.bat
   # or
   .\dev.bat install     # Note: Use .\ prefix in PowerShell
   ```

   **Option D: Using PowerShell (Windows - if scripts enabled)**
   ```powershell
   # First enable script execution in powershell (run as Administrator):
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   
   # Then run:
   .\install.ps1
   # or
   .\dev.ps1 install
   ```

   **Option E: Manual installation**
   ```bash
   npm install                    # Root dependencies
   cd Server && npm install      # Server dependencies
   cd ../MonitoringScript && poetry install  # Python dependencies
   ```

3. **Verify installation**:
   ```bash
   make help          # Linux/macOS/WSL & Windows (with alias setup)
   .\dev.bat help     # Windows batch files (alternative)
   .\dev.ps1 help     # Windows PowerShell (if enabled)
   ```

## Project Structure

```
OverSight-ITC303/
├── docs/                     # Project documentation
├── Server/                   # NextJS application
│   ├── app/                  # NextJS app directory
│   ├── package.json          # Node.js dependencies
│   ├── next.config.ts        # NextJS configuration
│   └── tsconfig.json         # TypeScript configuration
├── MonitoringScript/         # Python monitoring system
│   ├── oversight_monitoring/ # Main Python package
│   ├── tests/                # Test suite
│   ├── pyproject.toml        # Poetry configuration and dependency management
│   └── readme.md            # Component documentation
├── package.json              # Root dependencies (dev tools only)
├── Makefile                  # Development workflows
├── CHANGELOG.md              # Auto-generated changelog
└── .gitignore               # Git ignore rules
```

### Component Responsibilities

- **Root**: Project coordination, conventional commits, versioning
- **Server/**: All NextJS runtime dependencies and server logic
- **MonitoringScript/**: Python dependencies and monitoring logic
- **docs/**: Centralized project documentation

## Development Workflow

### Common Commands

**Linux & WSL (Read further for windows):**
```bash
# Development
make dev          # Start NextJS development server
make build        # Build the application
make start        # Start production server

# Code Quality
make lint         # Lint all components (Python + TypeScript)
make type-check   # Type check all components (mypy + tsc)
make test         # Run all tests

# Monitoring Scripts
make run-monitor  # Run monitoring scripts locally

# Git Workflow
make commit       # Interactive conventional commit
make release      # Create a new release (project lead only)

# Maintenance
make clean        # Clean all build artifacts
make help         # Show all available commands
```

## Windows Setup: Enabling 'make' Commands

### Enable script execution first (run as Administrator):
`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Run this **once** to enable `make` commands permanently:

```powershell
.\setup-aliases.ps1
```

This will:
- Create a PowerShell profile with `make` function
- Enable `make` commands in all future PowerShell sessions  
- Persist across computer restarts

After setup, you can use these commands:

```bash
# Development
make dev          # Start NextJS development server
make build        # Build the application
make start        # Start production server

# Code Quality
make lint         # Lint all components (Python + TypeScript)
make type-check   # Type check all components (mypy + tsc)
make test         # Run all tests

# Monitoring Scripts
make run-monitor  # Run monitoring scripts locally

# Git Workflow
make commit       # Interactive conventional commit
make release      # Create a new release (project lead only)

# Maintenance
make clean        # Clean all build artifacts
make help         # Show all available commands
```

### Alternative Windows Options
If you prefer not to modify your PowerShell profile:
**Direct batch files**
```cmd
.\dev.bat help    # Use .\ prefix in PowerShell
dev.bat help      # Command prompt
```

**Windows PowerShell (if script execution enabled):**
```powershell
# Enable script execution first (run as Administrator):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then use PowerShell scripts:
.\dev.ps1 dev          # Start NextJS development server
.\dev.ps1 build        # Build the application
.\dev.ps1 start        # Start production server
# ... (same commands as batch files)
```

### Adding Dependencies

#### Server Dependencies (Node.js)
```bash
cd Server
npm install <package-name>
# or
npm install --save-dev <package-name>
```

#### Monitoring Dependencies (Python)
```bash
cd MonitoringScript
poetry add <package-name>
# or  
poetry add --group dev <package-name>
```

### Running Components

#### NextJS Server
```bash
make dev          # Development with hot reload
make build        # Production build
make start        # Production server
```

#### Monitoring Scripts
```bash
make run-monitor  # Run system monitoring demo
# or
cd MonitoringScript
poetry run python -m oversight_monitoring.system_monitor
```

## Conventional Commits

We use conventional commits for consistent commit messages and automated changelog generation.

### Commit Format

```
type(scope): description

[optional body]

[optional footer]
```

### Commit Types

- **feat**: New features
- **fix**: Bug fixes  
- **docs**: Documentation changes
- **style**: Code style changes (no logic changes)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding tests
- **build**: Build system changes
- **ci**: CI/CD changes
- **chore**: Maintenance tasks
- **revert**: Reverting changes
- **monitor**: Monitoring system changes (project-specific)

### Scopes

- **server**: NextJS server changes
- **monitoring**: Monitoring script changes
- **database**: Database-related changes
- **ui**: UI/frontend changes
- **api**: API-related changes
- **deps**: Dependency updates
- **config**: Configuration changes

### Examples

```bash
feat(monitoring): add CPU usage tracking
fix(server): resolve authentication timeout
docs(readme): update installation instructions
monitor(scripts): improve disk space monitoring
chore(deps): update React to v19
```

### Making Commits

Always use the interactive commit tool:

```bash
make commit
```

This ensures proper formatting and generates appropriate changelog entries.

## Testing

### Running Tests

```bash
# All tests
make test

# Component-specific tests
cd Server && npm test
cd MonitoringScript && poetry run pytest
```

### Test Structure

#### Server Tests (Jest/React Testing Library)
```bash
Server/
├── __tests__/           # Test files
└── jest.config.js       # Jest configuration
```

#### Monitoring Tests (Pytest)
```bash
MonitoringScript/
├── tests/
│   ├── __init__.py
│   └── test_*.py        # Test files
└── pyproject.toml       # Pytest configuration
```

### Writing Tests

#### Python Tests
```python
# MonitoringScript/tests/test_feature.py
def test_feature():
    """Test feature functionality."""
    # Test implementation
    assert True
```

#### TypeScript Tests
```typescript
// Server/__tests__/feature.test.ts
describe('Feature', () => {
  test('should work correctly', () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Creating Releases

**Project lead only:**

```bash
# Automatic patch release
make release

# Specific version type
npm run release:patch
npm run release:minor
npm run release:major
```

### Release Workflow

1. **Ensure `dev` is ready** for release
2. **Create release PR** from `dev` to `main`
3. **Project lead reviews** and approves
4. **Merge to `main`**
5. **Run release command** to tag and update changelog
6. **Deploy** the new version

### Changelog

The changelog is automatically generated from conventional commits:

- **Features** and **fixes** are highlighted
- **Breaking changes** are clearly marked
- **All changes** are categorized by type

## Team Roles

- **Project Manager**: Brodie Davis
- **Deputy Manager**: Lilith McGoldrick  
- **Developers**: Timothy Markut, David Stinson, Nicholas Smith, Oliver Multari

### Responsibilities

- **Project Lead**: Approves `dev` → `main` PRs, manages releases
- **DB Team**: Reviews commits made by MonitoringScript team
- **UI Team**: Reviews commits made by DB Team
- **Monitoring Script Team**: Reviews commits made by UI team
- **Team Members**: Review feature PRs, develop features, write tests
- **All Developers**: Follow conventional commits, write tests, document code

## Getting Help

- **Documentation**: Check this guide and component READMEs
- **Commands**: Run `make help` for available commands
- **Issues**: Create GitHub issues for bugs or feature requests
- **Questions**: Ask in team discord chat or during meetings

## Best Practices

### Code Quality

- **Always run tests** before committing
- **Use type hints** in Python code
- **Write meaningful commit messages**
- **Keep PRs focused** and reasonably sized
- **Document complex logic**

### Git Workflow

- **Keep branches up to date** with `dev`
- **Use descriptive branch names**
- **Squash commits** when appropriate
- **Delete branches** after merging

### Dependencies

- **Pin major versions** for stability
- **Regular updates** during maintenance windows
- **Security updates** take priority
- **Document breaking changes**