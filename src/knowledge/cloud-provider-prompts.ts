/**
 * Cloud Provider Specialized Prompts
 * 
 * Each cloud provider has unique capabilities that AI can leverage to help users:
 * - Connect and inspect accounts
 * - Find cost savings opportunities
 * - Recommend better configurations
 * - Suggest code changes for optimization
 * 
 * Copied from extension/src/services/cloud-services/cloud-provider-prompts.ts
 * 
 * @module knowledge/cloud-provider-prompts
 */

export interface CloudProviderCapability {
  id: string
  name: string
  description: string
  /** Example prompt user can ask */
  examplePrompt: string
  /** System context for AI when handling this capability */
  systemContext: string
  /** Tags for categorization */
  tags: ('cost' | 'security' | 'performance' | 'setup' | 'monitoring' | 'migration')[]
}

export interface CloudProviderPromptConfig {
  providerId: string
  providerName: string
  emoji: string
  /** Brief description of what AI can do with this provider */
  description: string
  /** Specialized capabilities for this provider */
  capabilities: CloudProviderCapability[]
  /** Quick action prompts shown to user */
  quickActions: string[]
  /** Cost optimization specific prompts */
  costOptimization: {
    enabled: boolean
    prompts: string[]
  }
}

/**
 * AWS Cloud Provider Prompts
 */
export const awsPrompts: CloudProviderPromptConfig = {
  providerId: 'aws',
  providerName: 'Amazon AWS',
  emoji: '☁️',
  description: 'Manage EC2, S3, Lambda, RDS, and optimize AWS costs',
  capabilities: [
    {
      id: 'cost-analysis',
      name: 'Cost Analysis & Savings',
      description: 'Analyze your AWS bill and find cost savings',
      examplePrompt: 'Analyze my AWS costs and suggest ways to save money',
      systemContext: `You are an AWS cost optimization expert. When analyzing costs:
1. Use AWS Cost Explorer APIs to get spending data
2. Identify unused or underutilized resources (EC2, RDS, EBS volumes)
3. Recommend Reserved Instances or Savings Plans where applicable
4. Suggest right-sizing opportunities
5. Identify resources that could move to spot instances
6. Check for idle load balancers and NAT gateways
7. Review S3 storage classes and lifecycle policies`,
      tags: ['cost']
    },
    {
      id: 'serverless-migration',
      name: 'Serverless Migration',
      description: 'Recommend serverless alternatives to reduce costs',
      examplePrompt: 'Should I migrate my EC2 app to Lambda? What would I save?',
      systemContext: `You are a serverless architecture expert. When recommending serverless:
1. Analyze current EC2/ECS workloads for Lambda suitability
2. Calculate cost comparison (EC2 vs Lambda pricing)
3. Identify RDS databases that could use Aurora Serverless
4. Suggest API Gateway + Lambda for REST APIs
5. Recommend Step Functions for orchestration
6. Consider DynamoDB vs RDS for appropriate workloads
7. Provide migration steps and code examples`,
      tags: ['cost', 'migration']
    },
    {
      id: 'security-audit',
      name: 'Security Best Practices',
      description: 'Audit IAM, security groups, and encryption',
      examplePrompt: 'Audit my AWS security and find vulnerabilities',
      systemContext: `You are an AWS security expert. When auditing security:
1. Review IAM policies for least privilege
2. Check for overly permissive security groups (0.0.0.0/0)
3. Verify S3 bucket policies and public access settings
4. Ensure encryption at rest for EBS, S3, RDS
5. Check for MFA on root and IAM users
6. Review CloudTrail logging configuration
7. Identify resources without proper tagging`,
      tags: ['security']
    },
  ],
  quickActions: [
    'List all my EC2 instances and their costs',
    'Find unused EBS volumes I can delete',
    'Show me my top 5 most expensive resources',
    'Create a Lambda function for my API',
    'Set up S3 lifecycle rules to save money',
    'Check my security group rules for issues'
  ],
  costOptimization: {
    enabled: true,
    prompts: [
      'Analyze my AWS bill and find savings',
      'Which EC2 instances should I convert to Reserved?',
      'Should I use Spot instances for my workload?',
      'Help me move from RDS to Aurora Serverless',
      'Optimize my S3 storage classes',
      'Find and delete unused resources'
    ]
  }
}

/**
 * DigitalOcean Provider Prompts
 */
export const digitaloceanPrompts: CloudProviderPromptConfig = {
  providerId: 'digitalocean',
  providerName: 'DigitalOcean',
  emoji: '🌊',
  description: 'Manage Droplets, Kubernetes, Databases, and optimize DO costs',
  capabilities: [
    {
      id: 'droplet-optimization',
      name: 'Droplet Right-Sizing',
      description: 'Right-size Droplets for cost savings',
      examplePrompt: 'Help me right-size my Droplets',
      systemContext: `You are a DigitalOcean expert. When optimizing Droplets:
1. Analyze CPU and memory usage
2. Recommend appropriate Droplet sizes
3. Suggest reserved Droplets for savings
4. Consider App Platform for simpler deployments
5. Use Droplet snapshots for backups
6. Set up monitoring and alerts
7. Consider managed databases vs self-hosted`,
      tags: ['cost', 'performance']
    },
  ],
  quickActions: [
    'List all my Droplets',
    'Create a new $5 Droplet',
    'Set up a managed database',
    'Check my current spending',
    'Create a Kubernetes cluster',
    'Set up a load balancer'
  ],
  costOptimization: {
    enabled: true,
    prompts: [
      'Analyze my Droplet usage and costs',
      'Should I use App Platform instead?',
      'Right-size my database cluster',
      'Switch to reserved Droplets',
      'Optimize my Kubernetes nodes'
    ]
  }
}

/**
 * Cloudflare Provider Prompts
 */
export const cloudflarePrompts: CloudProviderPromptConfig = {
  providerId: 'cloudflare',
  providerName: 'Cloudflare',
  emoji: '🌩️',
  description: 'Manage DNS, caching, security rules, and Workers',
  capabilities: [
    {
      id: 'cache-optimization',
      name: 'Cache Optimization',
      description: 'Optimize caching for better performance and cost savings',
      examplePrompt: 'Help me optimize my Cloudflare caching',
      systemContext: `You are a Cloudflare caching expert. When optimizing:
1. Analyze cache hit ratios
2. Set up proper Page Rules for caching
3. Configure Browser Cache TTL
4. Use Cache Reserve for long-tail content
5. Set up Tiered Caching
6. Optimize cache keys
7. Implement proper cache purge strategies`,
      tags: ['performance', 'cost']
    },
    {
      id: 'security-setup',
      name: 'Security Configuration',
      description: 'Set up WAF, DDoS protection, and security rules',
      examplePrompt: 'Help me secure my site with Cloudflare',
      systemContext: `You are a Cloudflare security expert. When configuring:
1. Set up WAF rules for common attacks
2. Configure DDoS protection settings
3. Set up Bot Management
4. Implement rate limiting
5. Configure SSL/TLS settings
6. Set up Access for zero-trust
7. Review firewall events and tune rules`,
      tags: ['security']
    }
  ],
  quickActions: [
    'Add a DNS record for my domain',
    'Purge cache for my site',
    'Set up a Page Rule for caching',
    'Check my cache hit ratio',
    'Create a Worker function',
    'Review my security events'
  ],
  costOptimization: {
    enabled: true,
    prompts: [
      'Optimize my caching to reduce origin requests',
      'Should I use Cloudflare R2 instead of S3?',
      'Set up Cache Reserve to reduce bandwidth',
      'Move my API to Workers',
      'Reduce my Cloudflare bill'
    ]
  }
}

/**
 * Sentry Provider Prompts
 */
export const sentryPrompts: CloudProviderPromptConfig = {
  providerId: 'sentry',
  providerName: 'Sentry',
  emoji: '🐛',
  description: 'Monitor errors, track performance, and debug issues',
  capabilities: [
    {
      id: 'error-analysis',
      name: 'Error Analysis',
      description: 'Analyze errors and find root causes',
      examplePrompt: 'What are the most critical errors in my app?',
      systemContext: `You are a Sentry debugging expert. When analyzing errors:
1. Identify top errors by frequency and impact
2. Analyze stack traces and breadcrumbs
3. Find patterns in error occurrence
4. Identify affected users and sessions
5. Correlate errors with deployments
6. Suggest fixes based on error patterns
7. Set up proper error grouping`,
      tags: ['monitoring']
    },
  ],
  quickActions: [
    'Show me today\'s critical errors',
    'Find the most affected users',
    'Analyze my app\'s performance',
    'Check Web Vitals scores',
    'Review recent releases',
    'Set up an alert rule'
  ],
  costOptimization: {
    enabled: true,
    prompts: [
      'Reduce my Sentry event quota usage',
      'Filter out noisy errors',
      'Set up proper sampling',
      'Optimize my DSN configuration'
    ]
  }
}

/**
 * GitHub Provider Prompts
 */
export const githubPrompts: CloudProviderPromptConfig = {
  providerId: 'github',
  providerName: 'GitHub',
  emoji: '🐙',
  description: 'Manage repos, PRs, Actions, and automate workflows',
  capabilities: [
    {
      id: 'actions-optimization',
      name: 'GitHub Actions Optimization',
      description: 'Optimize CI/CD workflows and reduce minutes',
      examplePrompt: 'Help me speed up my GitHub Actions',
      systemContext: `You are a GitHub Actions expert. When optimizing:
1. Analyze workflow run times
2. Recommend caching strategies
3. Use matrix builds efficiently
4. Set up proper concurrency
5. Use self-hosted runners if beneficial
6. Optimize Docker build layers
7. Reduce redundant steps`,
      tags: ['cost', 'performance']
    },
  ],
  quickActions: [
    'Create a PR for my changes',
    'Check my Actions workflow status',
    'Review open PRs',
    'Set up branch protection',
    'Create a release',
    'Check my Actions minutes usage'
  ],
  costOptimization: {
    enabled: true,
    prompts: [
      'Reduce my GitHub Actions minutes',
      'Optimize my workflow caching',
      'Should I use self-hosted runners?',
      'Reduce my LFS bandwidth'
    ]
  }
}

/**
 * Bitbucket Provider Prompts
 */
export const bitbucketPrompts: CloudProviderPromptConfig = {
  providerId: 'bitbucket',
  providerName: 'Bitbucket',
  emoji: '🔵',
  description: 'Manage repos, pipelines, and code reviews',
  capabilities: [
    {
      id: 'pipeline-optimization',
      name: 'Pipeline Optimization',
      description: 'Optimize Bitbucket Pipelines for speed and cost',
      examplePrompt: 'Help me speed up my Bitbucket Pipelines',
      systemContext: `You are a Bitbucket Pipelines expert. When optimizing:
1. Analyze pipeline run times
2. Recommend caching strategies
3. Use parallel steps efficiently
4. Optimize Docker images
5. Set up proper triggers
6. Use self-hosted runners if beneficial
7. Reduce redundant steps`,
      tags: ['cost', 'performance']
    },
  ],
  quickActions: [
    'Check my pipeline status',
    'View recent deployments',
    'Review open PRs',
    'Set up branch permissions',
    'Create a deployment',
    'Check my pipeline minutes usage'
  ],
  costOptimization: {
    enabled: true,
    prompts: [
      'Reduce my Bitbucket Pipeline minutes',
      'Optimize my pipeline caching',
      'Should I use self-hosted runners?'
    ]
  }
}

/**
 * All provider prompts registry
 */
export const cloudProviderPrompts: Record<string, CloudProviderPromptConfig> = {
  aws: awsPrompts,
  digitalocean: digitaloceanPrompts,
  cloudflare: cloudflarePrompts,
  sentry: sentryPrompts,
  github: githubPrompts,
  bitbucket: bitbucketPrompts,
}

/**
 * Get specialized prompts for a provider
 */
export function getProviderPrompts(providerId: string): CloudProviderPromptConfig | undefined {
  return cloudProviderPrompts[providerId]
}

/**
 * Get all quick actions for a provider
 */
export function getQuickActions(providerId: string): string[] {
  return cloudProviderPrompts[providerId]?.quickActions || []
}

/**
 * Get cost optimization prompts for a provider
 */
export function getCostOptimizationPrompts(providerId: string): string[] {
  const config = cloudProviderPrompts[providerId]
  if (!config?.costOptimization?.enabled) {
    return []
  }
  return config.costOptimization.prompts
}

/**
 * Get system context for a specific capability
 */
export function getCapabilityContext(providerId: string, capabilityId: string): string | undefined {
  const config = cloudProviderPrompts[providerId]
  const capability = config?.capabilities.find(c => c.id === capabilityId)
  return capability?.systemContext
}

/**
 * Generate a cost analysis prompt for any cloud provider
 */
export function generateCostAnalysisPrompt(providerId: string): string {
  const config = cloudProviderPrompts[providerId]
  if (!config) {
    return ''
  }
  
  return `As an expert in ${config.providerName} cost optimization, analyze the user's ${config.providerName} account and:

1. Identify the top cost drivers
2. Find unused or underutilized resources
3. Recommend immediate cost-saving actions
4. Suggest long-term optimization strategies
5. Provide specific commands or steps to implement each recommendation
6. Calculate estimated savings for each suggestion

Be specific and actionable. Include CLI commands where applicable.`
}

