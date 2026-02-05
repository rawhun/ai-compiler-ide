# API Specification

## OpenAPI 3.0 Core Endpoints

```yaml
openapi: 3.0.3
info:
  title: AI Compiler IDE API
  version: 1.0.0
  description: RESTful API for AI-integrated web IDE with compilation and AI assistance

servers:
  - url: https://api.ai-compiler-ide.com/v1
    description: Production server
  - url: http://localhost:8000/v1
    description: Development server

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        displayName:
          type: string
        avatarUrl:
          type: string
          format: uri
        subscriptionTier:
          type: string
          enum: [free, premium, enterprise]
        aiQuotaUsed:
          type: integer
        aiQuotaResetDate:
          type: string
          format: date
    
    Workspace:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        language:
          type: string
          enum: [javascript, typescript, python, cpp, java]
        template:
          type: string
        settings:
          type: object
        isPublic:
          type: boolean
        lastAccessedAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
    
    CompilationJob:
      type: object
      properties:
        id:
          type: string
          format: uuid
        language:
          type: string
        sourceFiles:
          type: array
          items:
            type: object
            properties:
              path:
                type: string
              content:
                type: string
        compilerOptions:
          type: object
        status:
          type: string
          enum: [pending, running, success, error, timeout]
        stdout:
          type: string
        stderr:
          type: string
        exitCode:
          type: integer
        executionTimeMs:
          type: integer
        memoryUsedKb:
          type: integer

paths:
  /auth/oauth/{provider}/url:
    get:
      summary: Get OAuth authorization URL
      parameters:
        - name: provider
          in: path
          required: true
          schema:
            type: string
            enum: [github, google]
      responses:
        '200':
          description: OAuth URL generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  authUrl:
                    type: string
                    format: uri
                  state:
                    type: string

  /auth/oauth/{provider}/callback:
    post:
      summary: Handle OAuth callback
      parameters:
        - name: provider
          in: path
          required: true
          schema:
            type: string
            enum: [github, google]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
                state:
                  type: string
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  refreshToken:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'

  /workspaces:
    get:
      summary: List user workspaces
      security:
        - BearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Workspaces retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  workspaces:
                    type: array
                    items:
                      $ref: '#/components/schemas/Workspace'
                  total:
                    type: integer
    
    post:
      summary: Create new workspace
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                language:
                  type: string
                template:
                  type: string
                  default: blank
      responses:
        '201':
          description: Workspace created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Workspace'

  /workspaces/{workspaceId}/files:
    get:
      summary: List workspace files
      security:
        - BearerAuth: []
      parameters:
        - name: workspaceId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Files retrieved
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    path:
                      type: string
                    size:
                      type: integer
                    mimeType:
                      type: string
                    updatedAt:
                      type: string
                      format: date-time

  /workspaces/{workspaceId}/files/{path}:
    get:
      summary: Get file content
      security:
        - BearerAuth: []
      parameters:
        - name: workspaceId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: path
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: File content
          content:
            text/plain:
              schema:
                type: string
    
    put:
      summary: Update file content
      security:
        - BearerAuth: []
      parameters:
        - name: workspaceId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: path
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          text/plain:
            schema:
              type: string
      responses:
        '200':
          description: File updated

  /compile:
    post:
      summary: Submit compilation job
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                workspaceId:
                  type: string
                  format: uuid
                language:
                  type: string
                sourceFiles:
                  type: array
                  items:
                    type: object
                    properties:
                      path:
                        type: string
                      content:
                        type: string
                compilerOptions:
                  type: object
      responses:
        '202':
          description: Compilation job submitted
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId:
                    type: string
                    format: uuid
                  status:
                    type: string

  /compile/{jobId}:
    get:
      summary: Get compilation job status
      security:
        - BearerAuth: []
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Job status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompilationJob'

  /ai/chat:
    post:
      summary: Send AI chat message
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                conversationId:
                  type: string
                  format: uuid
                workspaceId:
                  type: string
                  format: uuid
                provider:
                  type: string
                  enum: [openai, gemini, shared]
      responses:
        '200':
          description: AI response
          content:
            application/json:
              schema:
                type: object
                properties:
                  response:
                    type: string
                  conversationId:
                    type: string
                    format: uuid
                  tokensUsed:
                    type: integer

  /ai/complete:
    post:
      summary: Get code completion
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                code:
                  type: string
                language:
                  type: string
                position:
                  type: object
                  properties:
                    line:
                      type: integer
                    character:
                      type: integer
                provider:
                  type: string
                  enum: [openai, gemini, shared]
      responses:
        '200':
          description: Completion suggestions
          content:
            application/json:
              schema:
                type: object
                properties:
                  completions:
                    type: array
                    items:
                      type: object
                      properties:
                        text:
                          type: string
                        insertText:
                          type: string
                        kind:
                          type: string
                        detail:
                          type: string
```

## Sample API Calls

### Authentication Flow

```bash
# 1. Get OAuth URL
curl -X GET "http://localhost:8000/v1/auth/oauth/github/url" \
  -H "Content-Type: application/json"

# Response:
# {
#   "authUrl": "https://github.com/login/oauth/authorize?client_id=...",
#   "state": "random-state-string"
# }

# 2. Handle OAuth callback (after user authorizes)
curl -X POST "http://localhost:8000/v1/auth/oauth/github/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "oauth-code-from-github",
    "state": "random-state-string"
  }'

# Response:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "refresh-token-string",
#   "user": {
#     "id": "user-uuid",
#     "email": "user@example.com",
#     "displayName": "John Doe",
#     "subscriptionTier": "free"
#   }
# }
```

### Workspace Management

```bash
# Create workspace
curl -X POST "http://localhost:8000/v1/workspaces" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Python Project",
    "language": "python",
    "template": "flask"
  }'

# Response:
# {
#   "id": "workspace-uuid",
#   "name": "My Python Project",
#   "language": "python",
#   "template": "flask",
#   "createdAt": "2024-01-15T10:30:00Z"
# }

# Update file
curl -X PUT "http://localhost:8000/v1/workspaces/workspace-uuid/files/main.py" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: text/plain" \
  -d 'print("Hello, World!")'
```

### Compilation API

```bash
# Submit compilation job
curl -X POST "http://localhost:8000/v1/compile" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "workspace-uuid",
    "language": "python",
    "sourceFiles": [
      {
        "path": "main.py",
        "content": "print(\"Hello, World!\")"
      }
    ],
    "compilerOptions": {}
  }'

# Response:
# {
#   "jobId": "job-uuid",
#   "status": "pending"
# }

# Check job status
curl -X GET "http://localhost:8000/v1/compile/job-uuid" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
# {
#   "id": "job-uuid",
#   "status": "success",
#   "stdout": "Hello, World!\n",
#   "stderr": "",
#   "exitCode": 0,
#   "executionTimeMs": 45,
#   "memoryUsedKb": 1024
# }
```

### AI Integration

```bash
# AI chat
curl -X POST "http://localhost:8000/v1/ai/chat" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I fix this Python error?",
    "workspaceId": "workspace-uuid",
    "provider": "shared"
  }'

# Response:
# {
#   "response": "I can help you fix that Python error. Could you share the specific error message you're seeing?",
#   "conversationId": "conversation-uuid",
#   "tokensUsed": 25
# }

# Code completion
curl -X POST "http://localhost:8000/v1/ai/complete" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fib",
    "language": "python",
    "position": {"line": 3, "character": 14},
    "provider": "shared"
  }'

# Response:
# {
#   "completions": [
#     {
#       "text": "fibonacci(n-1) + fibonacci(n-2)",
#       "insertText": "onacci(n-1) + fibonacci(n-2)",
#       "kind": "function",
#       "detail": "Recursive fibonacci implementation"
#     }
#   ]
# }
```

## WebSocket Events

### Real-time Collaboration

```typescript
// WebSocket connection for real-time features
const ws = new WebSocket('ws://localhost:8000/ws');

// File change events
ws.send(JSON.stringify({
  type: 'file:change',
  workspaceId: 'workspace-uuid',
  path: 'main.py',
  content: 'updated content',
  cursor: { line: 5, character: 10 }
}));

// Compilation status updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'compilation:status') {
    console.log('Compilation status:', data.status);
  }
};
```

## Rate Limiting

### Limits by Tier

```typescript
const rateLimits = {
  free: {
    'api:general': '100/hour',
    'compile:submit': '20/hour',
    'ai:chat': '50/day',
    'ai:complete': '200/day'
  },
  premium: {
    'api:general': '1000/hour',
    'compile:submit': '200/hour',
    'ai:chat': 'unlimited', // Uses user's API key
    'ai:complete': 'unlimited'
  }
};
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
X-RateLimit-Retry-After: 3600
```