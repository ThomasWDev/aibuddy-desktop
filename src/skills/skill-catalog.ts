/**
 * Skill Marketplace Catalog — KAN-288, KAN-289, KAN-292
 *
 * Curated collection of prebuilt skills users can browse and install.
 * Ships with the app (offline-capable). KAN-292: When a Skills API URL
 * is configured, fetches catalog from the remote API with local fallback.
 * KAN-289: Some skills now declare allowed_tools for tool-enabled execution.
 */

import type { CatalogSkill } from './types'
import { createSkillsApiClient } from './skills-api-client'

export const SKILL_CATALOG: CatalogSkill[] = [
  {
    catalog_id: 'marketplace_prompt_refiner',
    name: 'Developer Prompt Refiner',
    description: 'Automatically refines vague prompts into precise, actionable developer requests with clear scope and acceptance criteria.',
    author: 'AIBuddy Team',
    category: 'Productivity',
    icon: '✨',
    tags: ['prompt-engineering', 'productivity'],
    scope: 'global',
    execution_mode: 'always',
    prompt_template: `# Developer Prompt Refiner

When the user gives a vague or incomplete prompt:
1. Identify the core intent
2. Infer missing context from the workspace (language, framework, patterns)
3. Expand the request with specific acceptance criteria
4. Ask clarifying questions ONLY if there are multiple valid interpretations

Always respond with the refined understanding before writing code.
Never assume the user wants a full rewrite — prefer minimal, targeted changes.`,
  },
  {
    catalog_id: 'marketplace_architecture_assistant',
    name: 'Architecture Assistant',
    description: 'Provides system design guidance, suggests patterns, and reviews architecture decisions for scalability and maintainability.',
    author: 'AIBuddy Team',
    category: 'Architecture',
    icon: '🏗️',
    tags: ['architecture', 'system-design', 'patterns'],
    scope: 'global',
    execution_mode: 'manual',
    prompt_template: `# Architecture Assistant

When asked about system design or architecture:
- Evaluate trade-offs explicitly (latency vs consistency, complexity vs flexibility)
- Suggest appropriate design patterns (Repository, CQRS, Event Sourcing, etc.)
- Consider scalability constraints (horizontal scaling, caching layers, message queues)
- Recommend separation of concerns and clear module boundaries
- Flag potential single points of failure
- Reference industry standards (12-factor app, SOLID, DDD) where relevant

Always justify recommendations with concrete reasoning, not just "best practice".`,
  },
  {
    catalog_id: 'marketplace_sql_optimizer',
    name: 'SQL Optimizer',
    description: 'Analyzes SQL queries for performance issues and suggests optimizations including indexes, query rewrites, and execution plan improvements.',
    author: 'AIBuddy Team',
    category: 'Database',
    icon: '🗃️',
    tags: ['sql', 'database', 'performance', 'optimization'],
    scope: 'project',
    execution_mode: 'manual',
    allowed_tools: ['filesystem', 'terminal'],
    prompt_template: `# SQL Optimizer

When reviewing or writing SQL:
- Identify N+1 query patterns and suggest batch alternatives
- Recommend appropriate indexes based on WHERE, JOIN, and ORDER BY clauses
- Flag full table scans and suggest covering indexes
- Convert correlated subqueries to JOINs where beneficial
- Use EXPLAIN ANALYZE output to guide optimizations
- Consider query caching and materialized views for expensive aggregations
- Warn about implicit type conversions that prevent index usage
- Prefer EXISTS over IN for large subquery result sets`,
  },
  {
    catalog_id: 'marketplace_aws_deployment',
    name: 'AWS Deployment Helper',
    description: 'Guides AWS infrastructure setup, CI/CD pipelines, and deployment best practices including IAM, VPC, and cost optimization.',
    author: 'AIBuddy Team',
    category: 'DevOps',
    icon: '☁️',
    tags: ['aws', 'deployment', 'devops', 'infrastructure'],
    scope: 'project',
    execution_mode: 'manual',
    allowed_tools: ['terminal', 'aws_cli', 'docker'],
    prompt_template: `# AWS Deployment Helper

When working with AWS infrastructure:
- Follow least-privilege IAM policies — never use wildcard permissions
- Use infrastructure-as-code (CloudFormation, CDK, or Terraform)
- Recommend appropriate instance types based on workload characteristics
- Configure auto-scaling with proper health checks and cooldown periods
- Set up CloudWatch alarms for key metrics (CPU, memory, error rates, latency)
- Use Parameter Store or Secrets Manager for sensitive configuration
- Implement blue/green or canary deployments for zero-downtime releases
- Enable VPC flow logs and CloudTrail for audit compliance
- Estimate monthly costs and suggest Reserved Instances or Savings Plans`,
  },
  {
    catalog_id: 'marketplace_security_reviewer',
    name: 'Security Reviewer',
    description: 'Scans code for security vulnerabilities including injection attacks, auth flaws, data exposure, and OWASP Top 10 issues.',
    author: 'AIBuddy Team',
    category: 'Security',
    icon: '🔒',
    tags: ['security', 'owasp', 'vulnerability', 'code-review'],
    scope: 'global',
    execution_mode: 'always',
    allowed_tools: ['filesystem', 'git'],
    prompt_template: `# Security Reviewer

For every code change, automatically check for:
- SQL injection (parameterized queries required)
- XSS vulnerabilities (sanitize all user input rendered in HTML)
- Authentication bypasses (verify auth middleware on all protected routes)
- Secrets in code (API keys, passwords, tokens must use env vars)
- Path traversal (validate and sanitize file paths)
- CSRF protection (verify tokens on state-changing requests)
- Insecure deserialization (validate input schemas)
- Overly permissive CORS configurations
- Missing rate limiting on public endpoints

Flag issues with severity (Critical/High/Medium/Low) and suggest fixes.`,
  },
  {
    catalog_id: 'marketplace_api_design',
    name: 'API Design Guide',
    description: 'Enforces RESTful API best practices including consistent naming, proper status codes, pagination, versioning, and error handling.',
    author: 'AIBuddy Team',
    category: 'Backend',
    icon: '🔌',
    tags: ['api', 'rest', 'backend', 'design'],
    scope: 'project',
    execution_mode: 'always',
    prompt_template: `# API Design Guide

When designing or reviewing APIs:
- Use plural nouns for resources (/users, /orders), not verbs
- Return appropriate HTTP status codes (201 Created, 204 No Content, 422 Unprocessable)
- Implement cursor-based pagination for large collections
- Version APIs in the URL path (/v1/users) or Accept header
- Use consistent error response format: { error: { code, message, details } }
- Support filtering, sorting, and field selection via query parameters
- Document with OpenAPI/Swagger specs
- Implement idempotency keys for POST/PUT operations
- Use HATEOAS links for discoverability where appropriate`,
  },
  {
    catalog_id: 'marketplace_react_best_practices',
    name: 'React Best Practices',
    description: 'Enforces modern React patterns including hooks, memoization, component composition, and performance optimization.',
    author: 'AIBuddy Team',
    category: 'Frontend',
    icon: '⚛️',
    tags: ['react', 'frontend', 'hooks', 'performance'],
    scope: 'project',
    execution_mode: 'always',
    prompt_template: `# React Best Practices

When writing React code:
- Prefer functional components with hooks over class components
- Use useMemo/useCallback only when there's a measurable performance benefit
- Extract custom hooks for reusable stateful logic
- Keep components small (< 200 lines) — split when responsibility grows
- Use composition over prop drilling (Context, compound components)
- Avoid inline object/array creation in JSX (causes unnecessary re-renders)
- Lazy-load heavy components with React.lazy + Suspense
- Use error boundaries to catch and gracefully handle render errors
- Prefer controlled components for forms
- Use keys properly in lists (never use array index as key for dynamic lists)`,
  },
  {
    catalog_id: 'marketplace_git_workflow',
    name: 'Git Workflow Standards',
    description: 'Enforces clean git practices including conventional commits, branch naming, PR templates, and rebase strategies.',
    author: 'AIBuddy Team',
    category: 'Workflow',
    icon: '🌿',
    tags: ['git', 'workflow', 'commits', 'version-control'],
    scope: 'global',
    execution_mode: 'always',
    allowed_tools: ['git', 'terminal'],
    prompt_template: `# Git Workflow Standards

When working with git:
- Use conventional commit format: type(scope): description
  - Types: feat, fix, docs, style, refactor, test, chore, perf, ci
- Branch naming: feature/KAN-xxx-short-description, fix/KAN-xxx-description
- One logical change per commit — don't mix features and fixes
- Write meaningful commit messages explaining WHY, not just WHAT
- Rebase feature branches on main before merging (no merge commits)
- Squash WIP commits before PR review
- Never force-push to shared branches (main, develop, release/*)
- Tag releases with semantic versioning (v1.2.3)`,
  },
]

/** Get all catalog skills (static / offline) */
export function getCatalog(): CatalogSkill[] {
  return SKILL_CATALOG
}

/** Get a specific catalog skill by ID (static) */
export function getCatalogSkill(catalogId: string): CatalogSkill | undefined {
  return SKILL_CATALOG.find(s => s.catalog_id === catalogId)
}

/** Get unique categories from the catalog */
export function getCatalogCategories(): string[] {
  return [...new Set(SKILL_CATALOG.map(s => s.category))].sort()
}

// ─── KAN-292: API-backed catalog ─────────────────────────────────────────────

/** Fetch catalog from remote API, falling back to static catalog on failure */
export async function getCatalogFromApi(apiBaseUrl: string, apiKey?: string): Promise<{ skills: CatalogSkill[]; source: 'api' | 'static'; error?: string }> {
  const client = createSkillsApiClient(apiBaseUrl, apiKey)
  if (!client) {
    return { skills: SKILL_CATALOG, source: 'static' }
  }
  try {
    const response = await client.listCatalog()
    const merged = deduplicateCatalog([...response.data, ...SKILL_CATALOG])
    return { skills: merged, source: 'api' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`[SkillCatalog] API fetch failed, using static fallback: ${message}`)
    return { skills: SKILL_CATALOG, source: 'static', error: message }
  }
}

/** Remove duplicate catalog entries, preferring API versions over static */
export function deduplicateCatalog(skills: CatalogSkill[]): CatalogSkill[] {
  const seen = new Map<string, CatalogSkill>()
  for (const skill of skills) {
    if (!seen.has(skill.catalog_id)) {
      seen.set(skill.catalog_id, skill)
    }
  }
  return [...seen.values()]
}
