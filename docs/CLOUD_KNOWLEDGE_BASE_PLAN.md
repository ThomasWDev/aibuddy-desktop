# Cloud Provider Knowledge Base - Feature Plan

## Overview

AIBuddy Desktop will have a **persistent local knowledge base** that stores all your cloud provider documentation, credentials, and infrastructure details. Unlike Cursor, which forgets this information between sessions, AIBuddy will **remember forever** and automatically reference this data when you start tasks.

---

## 🎯 Goals

1. **Never Forget**: Store cloud provider docs locally, persist across sessions
2. **Auto-Reference**: AI automatically checks knowledge base before starting tasks
3. **Secure Storage**: Sensitive data (API keys, SSH keys) encrypted locally
4. **One-Click Import**: Upload a doc file and AIBuddy parses it automatically
5. **Smart Suggestions**: AI asks "Want me to SSH to check server logs?" when relevant

---

## 📁 Data Structure

### Knowledge Base Location
```
~/.aibuddy/
├── knowledge/
│   ├── providers/           # Cloud provider configs
│   │   ├── aws.json
│   │   ├── digitalocean.json
│   │   ├── cloudflare.json
│   │   ├── sentry.json
│   │   ├── bitbucket.json
│   │   ├── godaddy.json
│   │   └── custom/          # User-defined providers
│   │       └── my-server.json
│   ├── servers/             # SSH server configs
│   │   ├── production.json
│   │   ├── staging.json
│   │   └── denver-aws.json
│   ├── docs/                # Imported documentation
│   │   ├── api-keys-master.md
│   │   └── infrastructure.md
│   └── index.json           # Quick lookup index
├── secrets/                 # Encrypted credentials (AES-256)
│   ├── aws-credentials.enc
│   ├── ssh-keys.enc
│   └── api-tokens.enc
└── config.json              # User preferences
```

### Provider Schema
```typescript
interface CloudProvider {
  id: string                    // 'aws', 'digitalocean', 'custom-xyz'
  name: string                  // 'Amazon AWS'
  emoji: string                 // '☁️'
  type: 'cloud' | 'api' | 'server' | 'database' | 'custom'
  
  // Connection details
  connection: {
    type: 'api' | 'ssh' | 'cli'
    baseUrl?: string            // API base URL
    region?: string             // AWS region, etc.
    accountId?: string          // Account identifier
  }
  
  // Credentials (stored encrypted separately)
  credentialId?: string         // Reference to encrypted credential
  
  // Infrastructure details
  infrastructure?: {
    servers?: ServerInfo[]
    databases?: DatabaseInfo[]
    services?: ServiceInfo[]
  }
  
  // CLI commands
  cliCommands?: {
    name: string                // 'aws', 'doctl', 'wrangler'
    installCommand: string      // 'brew install awscli'
    configCommand: string       // 'aws configure'
    testCommand: string         // 'aws sts get-caller-identity'
  }
  
  // Quick actions
  quickActions: string[]
  
  // Imported documentation
  importedDocs?: {
    filename: string
    importedAt: Date
    content: string             // Parsed content
  }[]
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastUsedAt?: Date
}

interface ServerInfo {
  name: string                  // 'Denver Production'
  ip: string                    // '3.132.25.123'
  provider: string              // 'aws', 'digitalocean'
  instanceId?: string           // 'i-0030a379f872bdea3'
  instanceType?: string         // 't3.medium'
  sshUser: string               // 'ubuntu'
  sshKeyPath?: string           // '~/.ssh/denver_veterans.pem'
  sshPort: number               // 22
  domain?: string               // 'denvermobileappdeveloper.com'
  notes?: string
}
```

---

## 🖥️ UI Design

### Main Knowledge Base Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Cloud Knowledge Base                              [+ Add]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 Import Documentation                                │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Drop your doc file here or click to browse             │   │
│  │  Supports: .md, .txt, .json, .yaml                      │   │
│  │                                                         │   │
│  │  [📁 Browse Files]  [📋 Paste Text]                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Connected Providers ──────────────────────────────────────  │
│                                                                 │
│  ☁️ AWS (us-east-2)                              [✓ Connected]  │
│     Account: REDACTED_AWS_ACCOUNT                                       │
│     Servers: denver-production, aibuddy-lambda                  │
│     [Test Connection] [View Details] [Edit]                     │
│                                                                 │
│  🌊 DigitalOcean                                 [✓ Connected]  │
│     Droplet: api.aibuddyseo.com (159.203.71.21)                │
│     [SSH Connect] [View Details] [Edit]                         │
│                                                                 │
│  🌩️ Cloudflare                                  [✓ Connected]  │
│     Zones: aibuddy.life, denvermobileappdeveloper.com          │
│     [Manage DNS] [View Details] [Edit]                          │
│                                                                 │
│  🐛 Sentry                                       [✓ Connected]  │
│     Projects: aibuddy-extension, aibuddy-desktop               │
│     [View Errors] [View Details] [Edit]                         │
│                                                                 │
│  📦 Bitbucket                                    [✓ Connected]  │
│     Repos: tbltechnerds/aibuddyapi, tbltechnerds/tbl_site_2020 │
│     [View Repos] [View Details] [Edit]                          │
│                                                                 │
│  ── Quick Actions ────────────────────────────────────────────  │
│                                                                 │
│  [🔍 Check Server Logs]  [💰 Analyze AWS Costs]                 │
│  [🚀 Deploy to Server]   [📊 View Sentry Errors]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Import Documentation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 Import Documentation                              [X Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  File: API_KEYS_MASTER.md                                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  🔍 AIBuddy detected the following:                             │
│                                                                 │
│  ☑️ AWS Configuration                                           │
│     Account: REDACTED_AWS_ACCOUNT                                       │
│     Region: us-east-2                                           │
│     Instance: i-0030a379f872bdea3 (t3.medium)                   │
│                                                                 │
│  ☑️ SSH Server: Denver Production                               │
│     IP: 3.132.25.123                                            │
│     User: ubuntu                                                │
│     Key: ~/.ssh/denver_veterans.pem                             │
│                                                                 │
│  ☑️ DigitalOcean Droplet                                        │
│     IP: 159.203.71.21                                           │
│     User: root                                                  │
│     Key: ~/Desktop/SSH keys/do_aibuddy                          │
│                                                                 │
│  ☑️ Cloudflare Zone                                             │
│     Domain: aibuddy.life                                        │
│                                                                 │
│  ⚠️ API Keys Detected (will be encrypted):                      │
│     - Sentry DSN                                                │
│     - Bitbucket App Password                                    │
│     - SendGrid API Key                                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Cancel]                              [Import Selected Items]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 AI Integration Flow

### When User Starts a Task

```
User: "Check why the API is returning 500 errors"

AIBuddy (internally):
1. Check knowledge base for relevant providers
2. Found: AWS Lambda (aibuddy-api), Sentry (aibuddy-api project)
3. Generate context-aware response

AIBuddy: "I see you have the AIBuddy API on AWS Lambda and Sentry 
configured. Would you like me to:

1. 🔍 Check Sentry for recent 500 errors
2. 📊 View CloudWatch logs for the Lambda
3. 🔗 SSH to the server to check logs

[1] [2] [3] [Do All]"
```

### SSH Connection Flow

```
User clicks [SSH to server]

AIBuddy:
"Connecting to Denver Production (3.132.25.123)...

Using: ssh -i ~/.ssh/denver_veterans.pem ubuntu@3.132.25.123

✅ Connected! What would you like me to check?

[View Recent Logs] [Check Disk Space] [View Running Processes] [Custom Command]"
```

---

## 🔐 Security

### Encryption
- All sensitive data encrypted with AES-256-GCM
- Encryption key derived from machine-specific identifier + user password
- Keys never stored in plain text
- Optional: Require password to unlock knowledge base

### Data Isolation
- Knowledge base stored locally only
- Never sent to AIBuddy API
- AI processes data locally for context
- Only user-approved commands sent to servers

---

## 📋 Implementation Tasks

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create `~/.aibuddy/knowledge/` directory structure
- [ ] Implement `KnowledgeBaseManager` class
- [ ] Create encrypted storage for credentials
- [ ] Build provider schema and validation

### Phase 2: UI Components (Week 2)
- [ ] Create `CloudKnowledgePanel` component
- [ ] Build `ImportDocumentModal` component
- [ ] Create `ProviderCard` component
- [ ] Add "📚 Knowledge Base" button to main UI

### Phase 3: Document Parser (Week 3)
- [ ] Build markdown parser for infrastructure docs
- [ ] Detect server configs (IP, SSH, keys)
- [ ] Detect API keys and credentials
- [ ] Detect cloud provider settings

### Phase 4: AI Integration (Week 4)
- [ ] Inject knowledge base context into AI prompts
- [ ] Add "check knowledge base" step before tasks
- [ ] Implement smart suggestions based on context
- [ ] Add SSH connection capability

### Phase 5: Advanced Features (Week 5+)
- [ ] Terminal integration for SSH
- [ ] Real-time server monitoring
- [ ] Cost analysis integration
- [ ] Multi-workspace support

---

## 🔗 Reusing Extension Code

The VS Code extension already has these components we can reuse:

| Extension File | Desktop Equivalent | Status |
|----------------|-------------------|--------|
| `cloud-provider-prompts.ts` | Copy directly | ✅ Ready |
| `credential-types.ts` | Copy directly | ✅ Ready |
| `cloud-services-guard.ts` | Adapt for Electron | 🔄 Needs work |
| `cloudflare-manager.ts` | Copy directly | ✅ Ready |

### Files to Copy
```bash
# From extension to desktop
cp extension/src/services/cloud-services/cloud-provider-prompts.ts \
   aibuddy-desktop/src/services/cloud/

cp extension/src/services/credentials/credential-types.ts \
   aibuddy-desktop/src/services/credentials/

cp extension/src/services/cloudflare/*.ts \
   aibuddy-desktop/src/services/cloudflare/
```

---

## 📝 Example Doc Format

Users can import docs in this format:

```markdown
# My Infrastructure

## AWS (Production)
- Account: REDACTED_AWS_ACCOUNT
- Region: us-east-2
- Instance ID: i-0030a379f872bdea3
- Instance Type: t3.medium
- SSH User: ubuntu
- SSH Key: ~/.ssh/denver_veterans.pem
- SSH Command: ssh -i ~/.ssh/denver_veterans.pem ubuntu@3.132.25.123
- Domain: denvermobileappdeveloper.com

## DigitalOcean (MoneyRobot)
- Server IP: 159.203.71.21
- SSH User: root
- SSH Key: ~/Desktop/SSH keys/do_aibuddy
- SSH Command: ssh -i "~/Desktop/SSH keys/do_aibuddy" root@159.203.71.21
- Domain: api.aibuddyseo.com

## Cloudflare
- Account Email: admin@example.com
- API Token: [ENCRYPTED]
- Zones: aibuddy.life, denvermobileappdeveloper.com

## Sentry
- DSN: https://xxx@sentry.io/xxx
- Projects: aibuddy-extension, aibuddy-desktop

## Bitbucket
- Workspace: tbltechnerds
- Repos: aibuddyapi, tbl_site_2020
- App Password: [ENCRYPTED]
```

---

## 🚀 Quick Start for Users

1. Click **📚 Knowledge Base** button
2. Click **📄 Import Documentation**
3. Drop your infrastructure doc file
4. AIBuddy parses and shows detected items
5. Click **Import Selected Items**
6. Done! AIBuddy now remembers your infrastructure forever

---

## 📊 Success Metrics

- **Time Saved**: No more re-explaining infrastructure to AI
- **Error Reduction**: AI uses correct SSH keys, regions, etc.
- **User Satisfaction**: "Finally, an AI that remembers!"

---

## 🔮 Future Enhancements

1. **Auto-Discovery**: Scan `~/.ssh/config`, `~/.aws/credentials` automatically
2. **Team Sharing**: Export/import knowledge bases (encrypted)
3. **Version History**: Track changes to infrastructure over time
4. **Health Monitoring**: Periodic checks on server status
5. **Cost Alerts**: Notify when cloud costs exceed threshold

