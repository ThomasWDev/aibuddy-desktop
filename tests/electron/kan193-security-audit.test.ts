/**
 * KAN-193 TDD: Security audit — no exposed AWS URLs or secrets in source/docs
 *
 * Root causes:
 * 1. Hardcoded AWS API Gateway, ALB, Lambda Function URLs in shipped source
 * 2. Jira API token committed in tracked documentation
 * 3. Amplitude secret key in .env.example
 * 4. Real API test key in multiple test files
 * 5. Raw AWS infrastructure URLs in public-facing documentation
 *
 * Fix: Centralize URLs behind env-var-backed config, scrub secrets from docs
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const MONOREPO = resolve(ROOT, '..')
const read = (rel: string) => {
  const p = resolve(MONOREPO, rel)
  return existsSync(p) ? readFileSync(p, 'utf-8') : ''
}

describe('KAN-193 — No hardcoded AWS infrastructure URLs in source code', () => {
  const urlsTs = read('aibuddy-desktop/src/constants/urls.ts')
  const extensionAibuddy = read('extension/src/shared/aibuddy.ts')
  const coreClient = read('packages/core/src/ai/client.ts')

  it('urls.ts must not contain raw execute-api URLs', () => {
    expect(urlsTs).not.toMatch(/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/)
  })

  it('urls.ts must not contain raw lambda-url URLs', () => {
    expect(urlsTs).not.toMatch(/[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws/)
  })

  it('urls.ts must not contain raw ELB URLs', () => {
    expect(urlsTs).not.toMatch(/[a-z0-9-]+\.us-east-2\.elb\.amazonaws\.com/)
  })

  it('urls.ts must use environment variable or config for API URLs', () => {
    expect(urlsTs).toMatch(/process\.env/)
  })

  it('extension aibuddy.ts must not contain raw execute-api URLs', () => {
    expect(extensionAibuddy).not.toMatch(/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/)
  })

  it('extension aibuddy.ts must not contain raw ELB URLs', () => {
    expect(extensionAibuddy).not.toMatch(/[a-z0-9-]+\.us-east-2\.elb\.amazonaws\.com/)
  })

  it('packages/core client.ts must not contain raw execute-api URLs', () => {
    expect(coreClient).not.toMatch(/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/)
  })
})

describe('KAN-193 — No real secrets in tracked documentation', () => {
  it('docs must not contain real Jira API tokens', () => {
    const pendingTasks = read('docs/PENDING_TASKS.md')
    const ciCdSecrets = read('docs/CI_CD_SECRETS_REFERENCE.md')
    expect(pendingTasks).not.toMatch(/ATATT3xFfGF0/)
    expect(ciCdSecrets).not.toMatch(/ATATT3xFfGF0/)
  })

  it('.env.example must not contain real Amplitude secret keys', () => {
    const envExample = read('extension/.env.example')
    expect(envExample).not.toMatch(/df7aa9e1536a4bb/)
  })
})

describe('KAN-193 — Documentation must use placeholder URLs', () => {
  const architectureMd = read('ARCHITECTURE.md')
  const awsLambdaMd = read('docs/architecture/backend/AWS_LAMBDA.md')
  const apiDesignMd = read('docs/architecture/API_DESIGN.md')
  const awsReadme = read('aws-api/README.md')

  it('ARCHITECTURE.md must not contain raw execute-api or ELB URLs', () => {
    expect(architectureMd).not.toMatch(/i6f81wuqo0\.execute-api/)
    expect(architectureMd).not.toMatch(/aibuddy-api-alb-90164252/)
  })

  it('aws-api README must not contain raw execute-api URLs', () => {
    expect(awsReadme).not.toMatch(/i6f81wuqo0\.execute-api/)
  })

  it('API_DESIGN.md must not contain raw execute-api URLs', () => {
    expect(apiDesignMd).not.toMatch(/i6f81wuqo0\.execute-api/)
  })

  it('AWS_LAMBDA.md must not contain raw lambda-url or execute-api URLs', () => {
    expect(awsLambdaMd).not.toMatch(/x6s3kwugl426vmsnv4evh6p2se0kbmke\.lambda-url/)
    expect(awsLambdaMd).not.toMatch(/i6f81wuqo0\.execute-api/)
  })
})

describe('KAN-193 — .gitignore must exclude sensitive docs', () => {
  const gitignore = read('.gitignore')

  it('.gitignore must exclude PENDING_TASKS.md', () => {
    expect(gitignore).toContain('PENDING_TASKS')
  })

  it('.gitignore must exclude CI_CD_SECRETS_REFERENCE.md', () => {
    expect(gitignore).toContain('CI_CD_SECRETS_REFERENCE')
  })
})
