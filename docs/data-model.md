# Data Model Specification

## Database Schema

### Users & Authentication

```sql
-- Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    oauth_provider VARCHAR(50) NOT NULL, -- 'github', 'google'
    oauth_id VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'premium', 'enterprise'
    ai_quota_used INTEGER DEFAULT 0,
    ai_quota_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(oauth_provider, oauth_id)
);

-- User API tokens for AI providers
CREATE TABLE user_ai_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'openai', 'gemini'
    encrypted_token TEXT NOT NULL,
    token_name VARCHAR(100), -- User-friendly name
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider, token_name)
);

-- Session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
);
```

### Workspaces & Projects

```sql
-- User workspaces/projects
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(50) NOT NULL, -- 'javascript', 'python', 'cpp', 'java'
    template VARCHAR(100), -- 'blank', 'react', 'express', etc.
    settings JSONB DEFAULT '{}', -- Editor settings, build config, etc.
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    fork_count INTEGER DEFAULT 0,
    star_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- File system structure
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    path TEXT NOT NULL, -- Relative path from workspace root
    content TEXT,
    content_hash VARCHAR(64), -- SHA-256 hash for change detection
    size_bytes INTEGER DEFAULT 0,
    mime_type VARCHAR(100),
    is_binary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_id, path)
);

-- Workspace sharing and collaboration
CREATE TABLE workspace_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    shared_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL, -- 'read', 'write', 'admin'
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Public sharing links
CREATE TABLE public_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    permission_level VARCHAR(20) DEFAULT 'read',
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### AI Usage & Analytics

```sql
-- AI usage tracking
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL, -- 'openai', 'gemini', 'shared'
    request_type VARCHAR(50) NOT NULL, -- 'completion', 'chat', 'explanation'
    tokens_used INTEGER,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI conversation history
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Token count, model used, etc.
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Compilation & Execution

```sql
-- Compilation jobs and results
CREATE TABLE compilation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    source_files JSONB NOT NULL, -- Array of {path, content}
    compiler_options JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'success', 'error', 'timeout'
    stdout TEXT,
    stderr TEXT,
    exit_code INTEGER,
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Execution results for compiled programs
CREATE TABLE execution_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compilation_job_id UUID REFERENCES compilation_jobs(id) ON DELETE CASCADE,
    stdin TEXT,
    stdout TEXT,
    stderr TEXT,
    exit_code INTEGER,
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

### Extensions & Marketplace

```sql
-- Extension definitions
CREATE TABLE extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    manifest JSONB NOT NULL, -- Extension manifest with permissions, etc.
    source_url TEXT,
    download_url TEXT,
    icon_url TEXT,
    category VARCHAR(100), -- 'language', 'theme', 'tool', 'ai'
    tags TEXT[], -- Array of searchable tags
    download_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User-installed extensions
CREATE TABLE user_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    extension_id UUID REFERENCES extensions(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    installed_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, extension_id)
);

-- Extension ratings and reviews
CREATE TABLE extension_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension_id UUID REFERENCES extensions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(extension_id, user_id)
);

-- Curated extension bundles
CREATE TABLE extension_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'beginner', 'web-dev', 'data-science'
    is_official BOOLEAN DEFAULT false,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bundle_extensions (
    bundle_id UUID REFERENCES extension_bundles(id) ON DELETE CASCADE,
    extension_id UUID REFERENCES extensions(id) ON DELETE CASCADE,
    PRIMARY KEY (bundle_id, extension_id)
);
```

## Data Access Patterns

### User Authentication Flow
```typescript
interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  aiQuotaUsed: number;
  aiQuotaResetDate: string;
}

interface AIToken {
  id: string;
  provider: 'openai' | 'gemini';
  tokenName: string;
  isActive: boolean;
  expiresAt?: string;
}
```

### Workspace Management
```typescript
interface Workspace {
  id: string;
  name: string;
  description?: string;
  language: string;
  template: string;
  settings: Record<string, any>;
  isPublic: boolean;
  lastAccessedAt: string;
  createdAt: string;
}

interface WorkspaceFile {
  id: string;
  path: string;
  content: string;
  contentHash: string;
  sizeBytes: number;
  mimeType: string;
  isBinary: boolean;
  updatedAt: string;
}
```

### Extension System
```typescript
interface Extension {
  id: string;
  name: string;
  displayName: string;
  version: string;
  manifest: ExtensionManifest;
  category: string;
  tags: string[];
  downloadCount: number;
  ratingAverage: number;
  isVerified: boolean;
}

interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  main: string;
  permissions: string[];
  contributes: {
    languages?: LanguageContribution[];
    themes?: ThemeContribution[];
    commands?: CommandContribution[];
  };
}
```

## Caching Strategy

### Redis Cache Keys
```
user:${userId}:profile          # User profile data (TTL: 1 hour)
user:${userId}:tokens          # AI tokens (TTL: 30 minutes)
workspace:${workspaceId}       # Workspace metadata (TTL: 1 hour)
workspace:${workspaceId}:files # File tree structure (TTL: 30 minutes)
compilation:${hash}            # Compilation results (TTL: 24 hours)
ai:response:${hash}            # AI responses (TTL: 1 hour)
extension:${extensionId}       # Extension metadata (TTL: 6 hours)
```

### Database Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_workspaces_user_accessed ON workspaces(user_id, last_accessed_at DESC);
CREATE INDEX idx_files_workspace_path ON files(workspace_id, path);
CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_extensions_category_featured ON extensions(category, is_featured, published_at DESC);

-- Full-text search indexes
CREATE INDEX idx_workspaces_search ON workspaces USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_extensions_search ON extensions USING gin(to_tsvector('english', display_name || ' ' || description));
```