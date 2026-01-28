/**
 * Language-Specific Prompts
 * 
 * Specialized guidance for different programming languages and frameworks.
 * These are appended to the base system prompt when the project type is detected.
 */

export { NODEJS_PROMPT } from './nodejs'
export { REACT_PROMPT } from './react'
export { FLUTTER_PROMPT } from './flutter'
export { ANDROID_PROMPT } from './android'
export { IOS_PROMPT } from './ios'
export { DOTNET_PROMPT } from './dotnet'
export { PYTHON_PROMPT } from './python'
export { RUST_PROMPT } from './rust'
export { GO_PROMPT } from './go'
export { SOLIDITY_PROMPT } from './solidity'

/**
 * Get the appropriate language prompt based on project type
 */
export function getLanguagePrompt(projectType: string): string | null {
  const type = projectType.toLowerCase()
  
  if (type.includes('react') || type.includes('next')) {
    return require('./react').REACT_PROMPT
  }
  if (type.includes('node') || type.includes('express') || type.includes('nest')) {
    return require('./nodejs').NODEJS_PROMPT
  }
  if (type.includes('flutter') || type.includes('dart')) {
    return require('./flutter').FLUTTER_PROMPT
  }
  if (type.includes('android') || type.includes('kotlin')) {
    return require('./android').ANDROID_PROMPT
  }
  if (type.includes('ios') || type.includes('swift')) {
    return require('./ios').IOS_PROMPT
  }
  if (type.includes('.net') || type.includes('csharp') || type.includes('c#')) {
    return require('./dotnet').DOTNET_PROMPT
  }
  if (type.includes('python') || type.includes('django') || type.includes('flask')) {
    return require('./python').PYTHON_PROMPT
  }
  if (type.includes('rust')) {
    return require('./rust').RUST_PROMPT
  }
  if (type.includes('go') || type.includes('golang')) {
    return require('./go').GO_PROMPT
  }
  if (type.includes('solidity') || type.includes('ethereum') || type.includes('web3')) {
    return require('./solidity').SOLIDITY_PROMPT
  }
  
  return null
}

