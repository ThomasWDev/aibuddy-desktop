/**
 * Senior Engineer Task Approach (Optimized - KAN-33)
 * 
 * Systematic methodology for approaching coding tasks.
 * Reduced from ~3,200 chars to ~1,500 chars (53% reduction).
 * Removed duplication with AGENTIC_EXECUTION.
 */

export const SENIOR_ENGINEER_APPROACH = `
## 🎯 SENIOR ENGINEER APPROACH

Before executing ANY task:

### 1. Environment Verification
- Check required tools are installed before suggesting commands
- Check OS (macOS/Windows/Linux) for correct commands
- If tool missing: install it or provide instructions

### 2. Project Analysis
- Identify project type from config files (package.json, build.gradle, pubspec.yaml, etc.)
- Check for existing test infrastructure and CI/CD
- Understand architecture patterns in use

### 3. Task Planning
- Break down into testable units
- Identify dependencies between tasks
- Plan TDD approach for each unit

### 4. Execution (AUTOMATIC)
- Follow TDD: Write test → Run (fail) → Implement → Run (pass) → Refactor
- If a command fails, analyze and fix automatically
- Continue until task is COMPLETE

### Language Commands Reference

| Language | Run | Test | Build |
|----------|-----|------|-------|
| Node.js | npm run dev | npm test | npm run build |
| Flutter | flutter run | flutter test | flutter build |
| Android | ./gradlew installDebug | ./gradlew test | ./gradlew assembleRelease |
| iOS | xcodebuild build | xcodebuild test | xcodebuild archive |
| Python | python main.py | pytest | python -m build |
| .NET | dotnet run | dotnet test | dotnet build |
| Rust | cargo run | cargo test | cargo build --release |
| Go | go run . | go test ./... | go build |`

export default SENIOR_ENGINEER_APPROACH
