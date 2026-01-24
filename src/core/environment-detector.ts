/**
 * Environment Detector
 * 
 * Detects installed development tools, SDKs, and languages on the user's machine.
 * This allows AIBuddy to provide accurate, environment-aware suggestions.
 * 
 * PRIORITY LANGUAGES:
 * 1. Node.js / React.js / Next.js
 * 2. Flutter / Dart
 * 3. Android (Java & Kotlin)
 * 4. iOS / SwiftUI
 * 5. .NET / C#
 * 6. Python
 * 7. Rust
 * 8. Go
 * 9. Solidity / Web3 (Ethereum, etc.)
 * 
 * @module core/environment-detector
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// =============================================================================
// Types
// =============================================================================

export interface ToolInfo {
  name: string
  installed: boolean
  version?: string
  path?: string
  notes?: string
}

export interface SDKInfo {
  name: string
  installed: boolean
  version?: string
  path?: string
  variants?: string[]  // e.g., multiple Android SDK versions
}

export interface LanguageEnvironment {
  language: string
  category: 'priority' | 'standard' | 'blockchain'
  installed: boolean
  version?: string
  packageManager?: ToolInfo
  buildTools?: ToolInfo[]
  sdks?: SDKInfo[]
  frameworks?: ToolInfo[]
  runCommand?: string
  testCommand?: string
  buildCommand?: string
  notes?: string[]
}

export interface DevelopmentEnvironment {
  os: {
    platform: string
    release: string
    arch: string
    homedir: string
  }
  shell: string
  languages: LanguageEnvironment[]
  ides: ToolInfo[]
  versionControl: ToolInfo[]
  containerization: ToolInfo[]
  cloud: ToolInfo[]
  databases: ToolInfo[]
  detectedAt: Date
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely execute a command and return output
 */
function safeExec(command: string, timeout = 5000): string | null {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      timeout,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return result.trim()
  } catch {
    return null
  }
}

/**
 * Check if a command exists
 */
function commandExists(command: string): boolean {
  const checkCmd = process.platform === 'win32' 
    ? `where ${command} 2>nul`
    : `which ${command} 2>/dev/null`
  return safeExec(checkCmd) !== null
}

/**
 * Get version from a command
 */
function getVersion(command: string, versionFlag = '--version'): string | null {
  const output = safeExec(`${command} ${versionFlag}`)
  if (!output) return null
  
  // Extract version number from output
  const versionMatch = output.match(/(\d+\.\d+(\.\d+)?)/)?.[1]
  return versionMatch || output.split('\n')[0]
}

/**
 * Check if a directory exists
 */
function dirExists(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()
  } catch {
    return false
  }
}

// =============================================================================
// Language Detectors
// =============================================================================

/**
 * Detect Node.js / JavaScript / TypeScript environment
 */
function detectNodeJS(): LanguageEnvironment {
  const nodeVersion = getVersion('node', '-v')
  const npmVersion = getVersion('npm', '-v')
  const yarnVersion = getVersion('yarn', '-v')
  const pnpmVersion = getVersion('pnpm', '-v')
  const bunVersion = getVersion('bun', '-v')
  
  const frameworks: ToolInfo[] = []
  
  // Check for global CLI tools
  if (commandExists('create-react-app')) {
    frameworks.push({ name: 'Create React App', installed: true, version: getVersion('create-react-app', '--version') || undefined })
  }
  if (commandExists('next')) {
    frameworks.push({ name: 'Next.js', installed: true, version: getVersion('next', '-v') || undefined })
  }
  if (commandExists('vite')) {
    frameworks.push({ name: 'Vite', installed: true, version: getVersion('vite', '-v') || undefined })
  }
  if (commandExists('nest')) {
    frameworks.push({ name: 'NestJS', installed: true, version: getVersion('nest', '-v') || undefined })
  }
  if (commandExists('expo')) {
    frameworks.push({ name: 'Expo', installed: true, version: getVersion('expo', '--version') || undefined })
  }
  
  const packageManagers: ToolInfo[] = []
  if (npmVersion) packageManagers.push({ name: 'npm', installed: true, version: npmVersion })
  if (yarnVersion) packageManagers.push({ name: 'yarn', installed: true, version: yarnVersion })
  if (pnpmVersion) packageManagers.push({ name: 'pnpm', installed: true, version: pnpmVersion })
  if (bunVersion) packageManagers.push({ name: 'bun', installed: true, version: bunVersion })
  
  return {
    language: 'Node.js / JavaScript / TypeScript',
    category: 'priority',
    installed: !!nodeVersion,
    version: nodeVersion || undefined,
    packageManager: packageManagers[0],  // Primary
    buildTools: packageManagers,
    frameworks,
    runCommand: 'npm start',
    testCommand: 'npm test',
    buildCommand: 'npm run build',
    notes: nodeVersion ? [
      `Node.js ${nodeVersion} installed`,
      packageManagers.map(pm => `${pm.name} ${pm.version}`).join(', '),
    ] : ['Node.js not installed - install from https://nodejs.org']
  }
}

/**
 * Detect Flutter / Dart environment
 */
function detectFlutter(): LanguageEnvironment {
  const flutterVersion = getVersion('flutter', '--version')
  const dartVersion = getVersion('dart', '--version')
  
  // Check Flutter doctor output for more details
  let flutterDoctor: string | null = null
  if (flutterVersion) {
    flutterDoctor = safeExec('flutter doctor -v', 10000)
  }
  
  const notes: string[] = []
  if (flutterVersion) {
    notes.push(`Flutter installed`)
    if (flutterDoctor?.includes('Android toolchain')) {
      notes.push('Android toolchain configured')
    }
    if (flutterDoctor?.includes('Xcode')) {
      notes.push('iOS toolchain (Xcode) configured')
    }
    if (flutterDoctor?.includes('Chrome')) {
      notes.push('Web development enabled')
    }
  } else {
    notes.push('Flutter not installed - install from https://flutter.dev')
  }
  
  return {
    language: 'Flutter / Dart',
    category: 'priority',
    installed: !!flutterVersion || !!dartVersion,
    version: flutterVersion || dartVersion || undefined,
    runCommand: 'flutter run',
    testCommand: 'flutter test',
    buildCommand: 'flutter build apk / flutter build ios',
    notes
  }
}

/**
 * Detect Android development environment
 */
function detectAndroid(): LanguageEnvironment {
  const home = os.homedir()
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 
    path.join(home, 'Library/Android/sdk') // macOS default
  
  const hasAndroidSDK = dirExists(androidHome)
  const hasAndroidStudio = process.platform === 'darwin' 
    ? dirExists('/Applications/Android Studio.app')
    : commandExists('android-studio') || commandExists('studio')
  
  // Check for Gradle
  const gradleVersion = getVersion('gradle', '-v')
  const hasGradleWrapper = fs.existsSync('./gradlew') || fs.existsSync('./gradlew.bat')
  
  // Check for Java/Kotlin
  const javaVersion = getVersion('java', '-version')
  const kotlinVersion = getVersion('kotlin', '-version')
  
  // Check installed SDK versions
  const sdkVersions: string[] = []
  if (hasAndroidSDK) {
    const platformsDir = path.join(androidHome, 'platforms')
    if (dirExists(platformsDir)) {
      try {
        const platforms = fs.readdirSync(platformsDir)
        sdkVersions.push(...platforms.filter(p => p.startsWith('android-')))
      } catch {}
    }
  }
  
  // Check for emulators
  const emulatorPath = path.join(androidHome, 'emulator', 'emulator')
  const hasEmulator = fs.existsSync(emulatorPath)
  
  const notes: string[] = []
  if (hasAndroidStudio) notes.push('✅ Android Studio installed')
  else notes.push('❌ Android Studio not found')
  
  if (hasAndroidSDK) {
    notes.push(`✅ Android SDK at ${androidHome}`)
    if (sdkVersions.length > 0) {
      notes.push(`   SDK versions: ${sdkVersions.join(', ')}`)
    }
  } else {
    notes.push('❌ Android SDK not found')
  }
  
  if (javaVersion) notes.push(`✅ Java: ${javaVersion}`)
  else notes.push('❌ Java not installed')
  
  if (kotlinVersion) notes.push(`✅ Kotlin: ${kotlinVersion}`)
  
  if (gradleVersion) notes.push(`✅ Gradle: ${gradleVersion}`)
  else if (hasGradleWrapper) notes.push('✅ Gradle wrapper available')
  else notes.push('❌ Gradle not found')
  
  if (hasEmulator) notes.push('✅ Android Emulator available')
  
  return {
    language: 'Android (Java / Kotlin)',
    category: 'priority',
    installed: hasAndroidSDK && (!!javaVersion || !!kotlinVersion),
    version: sdkVersions[sdkVersions.length - 1] || undefined,
    sdks: [{
      name: 'Android SDK',
      installed: hasAndroidSDK,
      path: androidHome,
      variants: sdkVersions
    }],
    buildTools: [
      { name: 'Gradle', installed: !!gradleVersion || hasGradleWrapper, version: gradleVersion || undefined },
      { name: 'Java', installed: !!javaVersion, version: javaVersion || undefined },
      { name: 'Kotlin', installed: !!kotlinVersion, version: kotlinVersion || undefined },
    ],
    runCommand: './gradlew installDebug',
    testCommand: './gradlew test',
    buildCommand: './gradlew assembleRelease',
    notes
  }
}

/**
 * Detect iOS / SwiftUI development environment
 */
function detectIOS(): LanguageEnvironment {
  // iOS development is only available on macOS
  if (process.platform !== 'darwin') {
    return {
      language: 'iOS / SwiftUI',
      category: 'priority',
      installed: false,
      notes: ['iOS development requires macOS']
    }
  }
  
  const xcodeVersion = safeExec('xcodebuild -version')
  const swiftVersion = getVersion('swift', '--version')
  const hasXcode = dirExists('/Applications/Xcode.app')
  const hasSimulator = commandExists('xcrun') && safeExec('xcrun simctl list devices') !== null
  
  // Check for CocoaPods
  const cocoapodsVersion = getVersion('pod', '--version')
  
  // Check for Swift Package Manager (built into Swift)
  const hasSPM = !!swiftVersion
  
  const notes: string[] = []
  if (hasXcode) {
    notes.push(`✅ Xcode installed`)
    if (xcodeVersion) notes.push(`   ${xcodeVersion.split('\n')[0]}`)
  } else {
    notes.push('❌ Xcode not installed - install from App Store')
  }
  
  if (swiftVersion) notes.push(`✅ Swift: ${swiftVersion}`)
  else notes.push('❌ Swift not found')
  
  if (hasSimulator) notes.push('✅ iOS Simulator available')
  
  if (cocoapodsVersion) notes.push(`✅ CocoaPods: ${cocoapodsVersion}`)
  if (hasSPM) notes.push('✅ Swift Package Manager available')
  
  return {
    language: 'iOS / SwiftUI',
    category: 'priority',
    installed: hasXcode && !!swiftVersion,
    version: swiftVersion || undefined,
    buildTools: [
      { name: 'Xcode', installed: hasXcode, version: xcodeVersion?.split('\n')[0] || undefined },
      { name: 'CocoaPods', installed: !!cocoapodsVersion, version: cocoapodsVersion || undefined },
      { name: 'Swift Package Manager', installed: hasSPM },
    ],
    runCommand: 'xcodebuild -scheme [AppName] -destination "platform=iOS Simulator" build',
    testCommand: 'xcodebuild test -scheme [AppName] -destination "platform=iOS Simulator"',
    buildCommand: 'xcodebuild -scheme [AppName] -configuration Release archive',
    notes
  }
}

/**
 * Detect .NET / C# development environment
 */
function detectDotNet(): LanguageEnvironment {
  const dotnetVersion = getVersion('dotnet', '--version')
  const dotnetInfo = safeExec('dotnet --list-sdks')
  
  const sdkVersions: string[] = []
  if (dotnetInfo) {
    const matches = dotnetInfo.match(/\d+\.\d+\.\d+/g)
    if (matches) sdkVersions.push(...matches)
  }
  
  // Check for common .NET tools
  const hasEF = safeExec('dotnet ef --version') !== null
  
  const notes: string[] = []
  if (dotnetVersion) {
    notes.push(`✅ .NET SDK ${dotnetVersion}`)
    if (sdkVersions.length > 1) {
      notes.push(`   All SDKs: ${sdkVersions.join(', ')}`)
    }
  } else {
    notes.push('❌ .NET SDK not installed - install from https://dotnet.microsoft.com')
  }
  
  if (hasEF) notes.push('✅ Entity Framework tools installed')
  
  return {
    language: '.NET / C#',
    category: 'priority',
    installed: !!dotnetVersion,
    version: dotnetVersion || undefined,
    sdks: [{
      name: '.NET SDK',
      installed: !!dotnetVersion,
      variants: sdkVersions
    }],
    runCommand: 'dotnet run',
    testCommand: 'dotnet test',
    buildCommand: 'dotnet build --configuration Release',
    notes
  }
}

/**
 * Detect Python environment
 */
function detectPython(): LanguageEnvironment {
  const python3Version = getVersion('python3', '--version')
  const pythonVersion = getVersion('python', '--version')
  const pipVersion = getVersion('pip3', '--version') || getVersion('pip', '--version')
  const poetryVersion = getVersion('poetry', '--version')
  const condaVersion = getVersion('conda', '--version')
  
  const version = python3Version || pythonVersion
  
  const frameworks: ToolInfo[] = []
  // Check for common frameworks (via pip list would be slow, so we check commands)
  if (commandExists('django-admin')) {
    frameworks.push({ name: 'Django', installed: true })
  }
  if (commandExists('flask')) {
    frameworks.push({ name: 'Flask', installed: true })
  }
  if (commandExists('fastapi')) {
    frameworks.push({ name: 'FastAPI', installed: true })
  }
  
  const notes: string[] = []
  if (version) notes.push(`✅ Python ${version}`)
  else notes.push('❌ Python not installed')
  
  if (pipVersion) notes.push(`✅ pip installed`)
  if (poetryVersion) notes.push(`✅ Poetry ${poetryVersion}`)
  if (condaVersion) notes.push(`✅ Conda ${condaVersion}`)
  
  return {
    language: 'Python',
    category: 'standard',
    installed: !!version,
    version: version || undefined,
    packageManager: pipVersion ? { name: 'pip', installed: true, version: pipVersion } : undefined,
    buildTools: [
      { name: 'pip', installed: !!pipVersion, version: pipVersion || undefined },
      { name: 'Poetry', installed: !!poetryVersion, version: poetryVersion || undefined },
      { name: 'Conda', installed: !!condaVersion, version: condaVersion || undefined },
    ],
    frameworks,
    runCommand: 'python main.py',
    testCommand: 'pytest',
    buildCommand: 'python -m build',
    notes
  }
}

/**
 * Detect Rust environment
 */
function detectRust(): LanguageEnvironment {
  const rustcVersion = getVersion('rustc', '--version')
  const cargoVersion = getVersion('cargo', '--version')
  
  const notes: string[] = []
  if (rustcVersion) notes.push(`✅ Rust ${rustcVersion}`)
  else notes.push('❌ Rust not installed - install from https://rustup.rs')
  
  if (cargoVersion) notes.push(`✅ Cargo ${cargoVersion}`)
  
  return {
    language: 'Rust',
    category: 'standard',
    installed: !!rustcVersion,
    version: rustcVersion || undefined,
    packageManager: cargoVersion ? { name: 'Cargo', installed: true, version: cargoVersion } : undefined,
    runCommand: 'cargo run',
    testCommand: 'cargo test',
    buildCommand: 'cargo build --release',
    notes
  }
}

/**
 * Detect Go environment
 */
function detectGo(): LanguageEnvironment {
  const goVersion = getVersion('go', 'version')
  
  const notes: string[] = []
  if (goVersion) notes.push(`✅ Go ${goVersion}`)
  else notes.push('❌ Go not installed - install from https://golang.org')
  
  return {
    language: 'Go',
    category: 'standard',
    installed: !!goVersion,
    version: goVersion || undefined,
    runCommand: 'go run .',
    testCommand: 'go test ./...',
    buildCommand: 'go build',
    notes
  }
}

/**
 * Detect Blockchain / Web3 development environment
 */
function detectBlockchain(): LanguageEnvironment {
  // Solidity / Ethereum tools
  const solcVersion = getVersion('solc', '--version')
  const hardhatInstalled = commandExists('npx') && safeExec('npx hardhat --version') !== null
  const foundryVersion = getVersion('forge', '--version')
  const truffleVersion = getVersion('truffle', 'version')
  const ganacheInstalled = commandExists('ganache') || commandExists('ganache-cli')
  
  // Check for Ethereum clients
  const gethVersion = getVersion('geth', 'version')
  
  const notes: string[] = []
  
  if (solcVersion) notes.push(`✅ Solidity compiler: ${solcVersion}`)
  if (hardhatInstalled) notes.push('✅ Hardhat available')
  if (foundryVersion) notes.push(`✅ Foundry (Forge): ${foundryVersion}`)
  if (truffleVersion) notes.push(`✅ Truffle: ${truffleVersion}`)
  if (ganacheInstalled) notes.push('✅ Ganache (local blockchain)')
  if (gethVersion) notes.push(`✅ Geth (Ethereum client): ${gethVersion}`)
  
  if (notes.length === 0) {
    notes.push('❌ No blockchain tools detected')
    notes.push('   Install Hardhat: npm install --save-dev hardhat')
    notes.push('   Install Foundry: curl -L https://foundry.paradigm.xyz | bash')
  }
  
  const installed = !!solcVersion || hardhatInstalled || !!foundryVersion || !!truffleVersion
  
  return {
    language: 'Solidity / Web3 (Ethereum)',
    category: 'blockchain',
    installed,
    buildTools: [
      { name: 'Solidity Compiler', installed: !!solcVersion, version: solcVersion || undefined },
      { name: 'Hardhat', installed: hardhatInstalled },
      { name: 'Foundry', installed: !!foundryVersion, version: foundryVersion || undefined },
      { name: 'Truffle', installed: !!truffleVersion, version: truffleVersion || undefined },
      { name: 'Ganache', installed: ganacheInstalled },
    ],
    runCommand: 'npx hardhat run scripts/deploy.js',
    testCommand: 'npx hardhat test',
    buildCommand: 'npx hardhat compile',
    notes
  }
}

/**
 * Detect Ruby environment
 */
function detectRuby(): LanguageEnvironment {
  const rubyVersion = getVersion('ruby', '--version')
  const gemVersion = getVersion('gem', '--version')
  const bundlerVersion = getVersion('bundler', '--version')
  const railsVersion = getVersion('rails', '--version')
  
  const notes: string[] = []
  if (rubyVersion) notes.push(`✅ Ruby ${rubyVersion}`)
  else notes.push('❌ Ruby not installed')
  
  if (railsVersion) notes.push(`✅ Rails ${railsVersion}`)
  
  return {
    language: 'Ruby / Rails',
    category: 'standard',
    installed: !!rubyVersion,
    version: rubyVersion || undefined,
    packageManager: gemVersion ? { name: 'gem', installed: true, version: gemVersion } : undefined,
    frameworks: railsVersion ? [{ name: 'Rails', installed: true, version: railsVersion }] : [],
    runCommand: 'rails server',
    testCommand: 'bundle exec rspec',
    buildCommand: 'bundle install',
    notes
  }
}

/**
 * Detect PHP / Laravel environment
 */
function detectPHP(): LanguageEnvironment {
  const phpVersion = getVersion('php', '--version')
  const composerVersion = getVersion('composer', '--version')
  const laravelInstalled = commandExists('laravel')
  
  const notes: string[] = []
  if (phpVersion) notes.push(`✅ PHP ${phpVersion}`)
  else notes.push('❌ PHP not installed')
  
  if (composerVersion) notes.push(`✅ Composer installed`)
  if (laravelInstalled) notes.push('✅ Laravel CLI installed')
  
  return {
    language: 'PHP / Laravel',
    category: 'standard',
    installed: !!phpVersion,
    version: phpVersion || undefined,
    packageManager: composerVersion ? { name: 'Composer', installed: true, version: composerVersion } : undefined,
    runCommand: 'php artisan serve',
    testCommand: 'php artisan test',
    buildCommand: 'composer install --optimize-autoloader',
    notes
  }
}

// =============================================================================
// IDE Detection
// =============================================================================

function detectIDEs(): ToolInfo[] {
  const ides: ToolInfo[] = []
  
  // VS Code
  if (commandExists('code')) {
    ides.push({ name: 'VS Code', installed: true, version: getVersion('code', '--version') || undefined })
  }
  
  // Cursor
  if (commandExists('cursor')) {
    ides.push({ name: 'Cursor', installed: true })
  }
  
  // Android Studio (macOS)
  if (process.platform === 'darwin' && dirExists('/Applications/Android Studio.app')) {
    ides.push({ name: 'Android Studio', installed: true })
  }
  
  // Xcode (macOS)
  if (process.platform === 'darwin' && dirExists('/Applications/Xcode.app')) {
    ides.push({ name: 'Xcode', installed: true, version: safeExec('xcodebuild -version')?.split('\n')[0] || undefined })
  }
  
  // IntelliJ IDEA
  if (process.platform === 'darwin' && (
    dirExists('/Applications/IntelliJ IDEA.app') || 
    dirExists('/Applications/IntelliJ IDEA CE.app')
  )) {
    ides.push({ name: 'IntelliJ IDEA', installed: true })
  }
  
  // Visual Studio (Windows/Mac)
  if (process.platform === 'darwin' && dirExists('/Applications/Visual Studio.app')) {
    ides.push({ name: 'Visual Studio for Mac', installed: true })
  }
  
  // WebStorm
  if (process.platform === 'darwin' && dirExists('/Applications/WebStorm.app')) {
    ides.push({ name: 'WebStorm', installed: true })
  }
  
  // PyCharm
  if (process.platform === 'darwin' && (
    dirExists('/Applications/PyCharm.app') ||
    dirExists('/Applications/PyCharm CE.app')
  )) {
    ides.push({ name: 'PyCharm', installed: true })
  }
  
  return ides
}

// =============================================================================
// Version Control Detection
// =============================================================================

function detectVersionControl(): ToolInfo[] {
  const tools: ToolInfo[] = []
  
  const gitVersion = getVersion('git', '--version')
  if (gitVersion) {
    tools.push({ name: 'Git', installed: true, version: gitVersion })
  }
  
  if (commandExists('gh')) {
    tools.push({ name: 'GitHub CLI', installed: true, version: getVersion('gh', '--version') || undefined })
  }
  
  if (commandExists('glab')) {
    tools.push({ name: 'GitLab CLI', installed: true })
  }
  
  return tools
}

// =============================================================================
// Container/Cloud Detection
// =============================================================================

function detectContainerization(): ToolInfo[] {
  const tools: ToolInfo[] = []
  
  const dockerVersion = getVersion('docker', '--version')
  if (dockerVersion) {
    tools.push({ name: 'Docker', installed: true, version: dockerVersion })
  }
  
  const dockerComposeVersion = getVersion('docker-compose', '--version') || getVersion('docker', 'compose version')
  if (dockerComposeVersion) {
    tools.push({ name: 'Docker Compose', installed: true, version: dockerComposeVersion })
  }
  
  if (commandExists('kubectl')) {
    tools.push({ name: 'kubectl', installed: true, version: getVersion('kubectl', 'version --client --short') || undefined })
  }
  
  if (commandExists('podman')) {
    tools.push({ name: 'Podman', installed: true, version: getVersion('podman', '--version') || undefined })
  }
  
  return tools
}

function detectCloudTools(): ToolInfo[] {
  const tools: ToolInfo[] = []
  
  if (commandExists('aws')) {
    tools.push({ name: 'AWS CLI', installed: true, version: getVersion('aws', '--version') || undefined })
  }
  
  if (commandExists('gcloud')) {
    tools.push({ name: 'Google Cloud CLI', installed: true, version: getVersion('gcloud', '--version') || undefined })
  }
  
  if (commandExists('az')) {
    tools.push({ name: 'Azure CLI', installed: true, version: getVersion('az', '--version') || undefined })
  }
  
  if (commandExists('vercel')) {
    tools.push({ name: 'Vercel CLI', installed: true, version: getVersion('vercel', '--version') || undefined })
  }
  
  if (commandExists('netlify')) {
    tools.push({ name: 'Netlify CLI', installed: true, version: getVersion('netlify', '--version') || undefined })
  }
  
  if (commandExists('firebase')) {
    tools.push({ name: 'Firebase CLI', installed: true, version: getVersion('firebase', '--version') || undefined })
  }
  
  if (commandExists('serverless')) {
    tools.push({ name: 'Serverless Framework', installed: true, version: getVersion('serverless', '--version') || undefined })
  }
  
  return tools
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect the complete development environment
 */
export function detectEnvironment(): DevelopmentEnvironment {
  const env: DevelopmentEnvironment = {
    os: {
      platform: process.platform,
      release: os.release(),
      arch: process.arch,
      homedir: os.homedir(),
    },
    shell: process.env.SHELL || process.env.ComSpec || 'unknown',
    languages: [],
    ides: [],
    versionControl: [],
    containerization: [],
    cloud: [],
    databases: [],
    detectedAt: new Date(),
  }
  
  // Detect priority languages first
  env.languages.push(detectNodeJS())
  env.languages.push(detectFlutter())
  env.languages.push(detectAndroid())
  env.languages.push(detectIOS())
  env.languages.push(detectDotNet())
  
  // Standard languages
  env.languages.push(detectPython())
  env.languages.push(detectRust())
  env.languages.push(detectGo())
  env.languages.push(detectRuby())
  env.languages.push(detectPHP())
  
  // Blockchain
  env.languages.push(detectBlockchain())
  
  // Tools
  env.ides = detectIDEs()
  env.versionControl = detectVersionControl()
  env.containerization = detectContainerization()
  env.cloud = detectCloudTools()
  
  return env
}

/**
 * Generate a summary of the environment for AI context
 * This is SAFE to send to AI - no sensitive data
 */
export function generateEnvironmentSummary(env: DevelopmentEnvironment): string {
  const lines: string[] = []
  
  lines.push('## Development Environment')
  lines.push('')
  lines.push(`**OS:** ${env.os.platform} (${env.os.arch})`)
  lines.push(`**Shell:** ${env.shell}`)
  lines.push('')
  
  // Installed languages
  const installedLangs = env.languages.filter(l => l.installed)
  if (installedLangs.length > 0) {
    lines.push('### Installed Languages & Frameworks')
    lines.push('')
    for (const lang of installedLangs) {
      lines.push(`**${lang.language}**${lang.version ? ` (${lang.version})` : ''}`)
      if (lang.runCommand) lines.push(`- Run: \`${lang.runCommand}\``)
      if (lang.testCommand) lines.push(`- Test: \`${lang.testCommand}\``)
      if (lang.buildCommand) lines.push(`- Build: \`${lang.buildCommand}\``)
      lines.push('')
    }
  }
  
  // Not installed (priority only)
  const notInstalled = env.languages.filter(l => !l.installed && l.category === 'priority')
  if (notInstalled.length > 0) {
    lines.push('### Not Installed (Priority Languages)')
    lines.push('')
    for (const lang of notInstalled) {
      lines.push(`- ${lang.language}`)
    }
    lines.push('')
  }
  
  // IDEs
  if (env.ides.length > 0) {
    lines.push('### IDEs')
    lines.push(env.ides.map(ide => `- ${ide.name}${ide.version ? ` (${ide.version})` : ''}`).join('\n'))
    lines.push('')
  }
  
  // Cloud tools
  if (env.cloud.length > 0) {
    lines.push('### Cloud Tools')
    lines.push(env.cloud.map(tool => `- ${tool.name}`).join('\n'))
    lines.push('')
  }
  
  return lines.join('\n')
}

/**
 * Get the appropriate run command for a project
 */
export function getRunCommand(projectPath: string, env: DevelopmentEnvironment): string | null {
  const files = fs.readdirSync(projectPath)
  
  // Android
  if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
    const android = env.languages.find(l => l.language.includes('Android'))
    if (android?.installed) {
      return files.includes('gradlew') ? './gradlew installDebug' : 'gradle installDebug'
    }
    return null // Android SDK not installed
  }
  
  // iOS
  if (files.some(f => f.endsWith('.xcodeproj') || f.endsWith('.xcworkspace'))) {
    const ios = env.languages.find(l => l.language.includes('iOS'))
    if (ios?.installed) {
      return 'xcodebuild -scheme [AppName] -destination "platform=iOS Simulator" build'
    }
    return null
  }
  
  // Flutter
  if (files.includes('pubspec.yaml')) {
    const flutter = env.languages.find(l => l.language.includes('Flutter'))
    if (flutter?.installed) {
      return 'flutter run'
    }
    return null
  }
  
  // Node.js
  if (files.includes('package.json')) {
    const node = env.languages.find(l => l.language.includes('Node'))
    if (node?.installed) {
      // Check package.json for scripts
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'))
        if (pkg.scripts?.dev) return 'npm run dev'
        if (pkg.scripts?.start) return 'npm start'
        if (pkg.scripts?.serve) return 'npm run serve'
      } catch {}
      return 'npm start'
    }
    return null
  }
  
  // .NET
  if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
    const dotnet = env.languages.find(l => l.language.includes('.NET'))
    if (dotnet?.installed) {
      return 'dotnet run'
    }
    return null
  }
  
  // Python
  if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
    const python = env.languages.find(l => l.language.includes('Python'))
    if (python?.installed) {
      if (files.includes('manage.py')) return 'python manage.py runserver'
      if (files.includes('app.py')) return 'python app.py'
      if (files.includes('main.py')) return 'python main.py'
      return 'python -m [module]'
    }
    return null
  }
  
  // Rust
  if (files.includes('Cargo.toml')) {
    const rust = env.languages.find(l => l.language.includes('Rust'))
    if (rust?.installed) {
      return 'cargo run'
    }
    return null
  }
  
  // Go
  if (files.includes('go.mod')) {
    const go = env.languages.find(l => l.language.includes('Go'))
    if (go?.installed) {
      return 'go run .'
    }
    return null
  }
  
  return null
}

// Export singleton for caching
let cachedEnvironment: DevelopmentEnvironment | null = null
let cacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function getCachedEnvironment(): DevelopmentEnvironment {
  const now = Date.now()
  if (!cachedEnvironment || (now - cacheTime) > CACHE_DURATION) {
    cachedEnvironment = detectEnvironment()
    cacheTime = now
  }
  return cachedEnvironment
}

export function clearEnvironmentCache(): void {
  cachedEnvironment = null
  cacheTime = 0
}

