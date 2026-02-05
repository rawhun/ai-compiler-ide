# Extension System & Marketplace Design

## Extension Architecture

### Extension Manifest Format

```json
{
  "name": "python-linter",
  "displayName": "Python Linter",
  "version": "1.0.0",
  "description": "Advanced Python linting with pylint and flake8",
  "author": "AI IDE Team",
  "license": "MIT",
  "repository": "https://github.com/ai-ide/python-linter",
  "icon": "icon.png",
  "categories": ["Linters", "Python"],
  "keywords": ["python", "lint", "pylint", "flake8", "code-quality"],
  "engines": {
    "ai-ide": "^1.0.0"
  },
  "main": "./dist/extension.js",
  "contributes": {
    "languages": [
      {
        "id": "python",
        "extensions": [".py", ".pyw"],
        "aliases": ["Python", "py"],
        "configuration": "./language-configuration.json"
      }
    ],
    "commands": [
      {
        "command": "python-linter.lint",
        "title": "Lint Python File",
        "category": "Python"
      },
      {
        "command": "python-linter.fix",
        "title": "Auto-fix Python Issues",
        "category": "Python"
      }
    ],
    "keybindings": [
      {
        "command": "python-linter.lint",
        "key": "ctrl+shift+l",
        "when": "editorLangId == python"
      }
    ],
    "themes": [
      {
        "label": "Python Dark",
        "uiTheme": "vs-dark",
        "path": "./themes/python-dark.json"
      }
    ],
    "snippets": [
      {
        "language": "python",
        "path": "./snippets/python.json"
      }
    ],
    "debuggers": [
      {
        "type": "python",
        "label": "Python Debug",
        "program": "./debugAdapter.js",
        "runtime": "node",
        "configurationAttributes": {
          "launch": {
            "required": ["program"],
            "properties": {
              "program": {
                "type": "string",
                "description": "Absolute path to the program."
              }
            }
          }
        }
      }
    ]
  },
  "activationEvents": [
    "onLanguage:python",
    "onCommand:python-linter.lint",
    "workspaceContains:**/*.py"
  ],
  "permissions": [
    "filesystem:read",
    "filesystem:write",
    "network:http",
    "terminal:execute",
    "ai:completion"
  ],
  "dependencies": {
    "pylint": "^2.15.0",
    "flake8": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^4.9.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "package": "ai-ide-cli package"
  }
}
```

### Extension API Surface

```typescript
// Extension API available to extensions
declare namespace aiIde {
  // Workspace API
  export namespace workspace {
    export function getWorkspaceFolder(): WorkspaceFolder | undefined;
    export function findFiles(pattern: string): Promise<Uri[]>;
    export function openTextDocument(uri: Uri): Promise<TextDocument>;
    export function saveAll(): Promise<boolean>;
    
    export const onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
    export const onDidSaveTextDocument: Event<TextDocument>;
  }

  // Editor API
  export namespace window {
    export const activeTextEditor: TextEditor | undefined;
    export const visibleTextEditors: TextEditor[];
    
    export function showTextDocument(document: TextDocument): Promise<TextEditor>;
    export function showInformationMessage(message: string): Promise<string | undefined>;
    export function showErrorMessage(message: string): Promise<string | undefined>;
    export function showWarningMessage(message: string): Promise<string | undefined>;
    export function showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
    export function showQuickPick(items: string[]): Promise<string | undefined>;
    
    export const onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
  }

  // Commands API
  export namespace commands {
    export function registerCommand(command: string, callback: (...args: any[]) => any): Disposable;
    export function executeCommand<T>(command: string, ...args: any[]): Promise<T>;
    export function getCommands(): Promise<string[]>;
  }

  // Languages API
  export namespace languages {
    export function registerCompletionItemProvider(
      selector: DocumentSelector,
      provider: CompletionItemProvider
    ): Disposable;
    
    export function registerHoverProvider(
      selector: DocumentSelector,
      provider: HoverProvider
    ): Disposable;
    
    export function registerDefinitionProvider(
      selector: DocumentSelector,
      provider: DefinitionProvider
    ): Disposable;
    
    export function registerDiagnosticCollection(name: string): DiagnosticCollection;
  }

  // AI API (restricted)
  export namespace ai {
    export function requestCompletion(
      prompt: string,
      options?: CompletionOptions
    ): Promise<CompletionResponse>;
    
    export function requestChat(
      message: string,
      context?: ChatContext
    ): Promise<ChatResponse>;
  }

  // Terminal API
  export namespace terminal {
    export function createTerminal(options?: TerminalOptions): Terminal;
    export const activeTerminal: Terminal | undefined;
    export const terminals: Terminal[];
  }

  // File System API (restricted)
  export namespace fs {
    export function readFile(uri: Uri): Promise<Uint8Array>;
    export function writeFile(uri: Uri, content: Uint8Array): Promise<void>;
    export function stat(uri: Uri): Promise<FileStat>;
    export function readDirectory(uri: Uri): Promise<[string, FileType][]>;
    export function createDirectory(uri: Uri): Promise<void>;
    export function delete(uri: Uri, options?: { recursive?: boolean }): Promise<void>;
  }
}

// Extension entry point
export function activate(context: ExtensionContext): void;
export function deactivate(): void;
```

### Permission Model

```typescript
interface ExtensionPermissions {
  // File system access
  'filesystem:read': {
    paths?: string[]; // Specific paths or patterns
    scope?: 'workspace' | 'user' | 'system';
  };
  'filesystem:write': {
    paths?: string[];
    scope?: 'workspace' | 'user';
  };
  
  // Network access
  'network:http': {
    domains?: string[]; // Allowed domains
    ports?: number[];   // Allowed ports
  };
  'network:websocket': {
    domains?: string[];
  };
  
  // Terminal access
  'terminal:execute': {
    commands?: string[]; // Allowed commands
    shell?: boolean;     // Allow shell access
  };
  
  // AI access
  'ai:completion': {
    quota?: number; // Daily quota
    models?: string[]; // Allowed models
  };
  'ai:chat': {
    quota?: number;
    models?: string[];
  };
  
  // System access
  'system:clipboard': boolean;
  'system:notifications': boolean;
  
  // Extension communication
  'extension:communicate': {
    extensions?: string[]; // Specific extensions
  };
}
```

## Extension Host Architecture

### Sandboxed Execution Environment

```typescript
// Extension Host Service
class ExtensionHost {
  private extensions = new Map<string, ExtensionInstance>();
  private permissionManager = new PermissionManager();
  private apiProxy = new APIProxy();

  async loadExtension(extensionId: string, manifest: ExtensionManifest): Promise<void> {
    // Validate manifest and permissions
    await this.validateExtension(manifest);
    
    // Create sandboxed environment
    const sandbox = await this.createSandbox(extensionId, manifest.permissions);
    
    // Load extension code
    const extensionCode = await this.loadExtensionCode(extensionId);
    
    // Execute in sandbox
    const instance = await sandbox.execute(extensionCode);
    
    // Register extension
    this.extensions.set(extensionId, instance);
    
    // Activate if needed
    if (this.shouldActivate(manifest.activationEvents)) {
      await instance.activate();
    }
  }

  private async createSandbox(
    extensionId: string, 
    permissions: string[]
  ): Promise<ExtensionSandbox> {
    return new ExtensionSandbox({
      extensionId,
      permissions,
      apiProxy: this.apiProxy,
      resourceLimits: {
        memory: 64 * 1024 * 1024, // 64MB
        cpu: 0.1, // 10% CPU
        timeout: 30000, // 30 seconds
      }
    });
  }
}

// Sandboxed execution environment
class ExtensionSandbox {
  private vm: VM;
  private permissions: PermissionChecker;
  private resourceMonitor: ResourceMonitor;

  constructor(options: SandboxOptions) {
    this.vm = new VM({
      timeout: options.resourceLimits.timeout,
      sandbox: this.createSandboxContext(options),
    });
    
    this.permissions = new PermissionChecker(options.permissions);
    this.resourceMonitor = new ResourceMonitor(options.resourceLimits);
  }

  private createSandboxContext(options: SandboxOptions): any {
    return {
      // Restricted global objects
      console: this.createRestrictedConsole(),
      setTimeout: this.createRestrictedSetTimeout(),
      setInterval: this.createRestrictedSetInterval(),
      
      // Extension API
      aiIde: this.createRestrictedAPI(options.apiProxy, this.permissions),
      
      // Node.js modules (restricted)
      require: this.createRestrictedRequire(),
      
      // Extension context
      __extensionId: options.extensionId,
      __permissions: options.permissions,
    };
  }

  async execute(code: string): Promise<ExtensionInstance> {
    this.resourceMonitor.start();
    
    try {
      const result = await this.vm.run(code);
      return new ExtensionInstance(result, this);
    } finally {
      this.resourceMonitor.stop();
    }
  }
}
```

### LSP Integration

```typescript
// Language Server Protocol integration
class LSPExtension {
  private languageClient: LanguageClient;
  
  constructor(private manifest: ExtensionManifest) {}

  async activate(): Promise<void> {
    const serverOptions: ServerOptions = {
      command: this.manifest.contributes.languageServer.command,
      args: this.manifest.contributes.languageServer.args,
      options: {
        env: process.env,
        cwd: this.getExtensionPath(),
      }
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: this.manifest.contributes.languages.map(lang => ({
        scheme: 'file',
        language: lang.id
      })),
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher('**/*')
      }
    };

    this.languageClient = new LanguageClient(
      'languageServer',
      'Language Server',
      serverOptions,
      clientOptions
    );

    await this.languageClient.start();
  }

  async deactivate(): Promise<void> {
    if (this.languageClient) {
      await this.languageClient.stop();
    }
  }
}
```

## Marketplace Implementation

### Extension Store API

```typescript
// Extension marketplace API
class ExtensionMarketplace {
  async searchExtensions(query: SearchQuery): Promise<ExtensionSearchResult[]> {
    const results = await db('extensions')
      .where('status', 'approved')
      .where(builder => {
        if (query.category) {
          builder.where('category', query.category);
        }
        if (query.tags) {
          builder.whereIn('tags', query.tags);
        }
        if (query.text) {
          builder.where('display_name', 'ilike', `%${query.text}%`)
                 .orWhere('description', 'ilike', `%${query.text}%`);
        }
      })
      .orderBy(query.sortBy || 'download_count', 'desc')
      .limit(query.limit || 20)
      .offset(query.offset || 0);

    return results.map(this.formatExtensionResult);
  }

  async getExtension(extensionId: string): Promise<ExtensionDetails> {
    const extension = await db('extensions')
      .where({ id: extensionId, status: 'approved' })
      .first();

    if (!extension) {
      throw new Error('Extension not found');
    }

    const reviews = await db('extension_reviews')
      .where({ extension_id: extensionId })
      .orderBy('created_at', 'desc')
      .limit(10);

    return {
      ...this.formatExtensionResult(extension),
      reviews,
      manifest: extension.manifest,
    };
  }

  async installExtension(userId: string, extensionId: string): Promise<void> {
    const extension = await this.getExtension(extensionId);
    
    // Check compatibility
    await this.checkCompatibility(extension);
    
    // Download extension package
    const packageData = await this.downloadExtension(extensionId);
    
    // Verify signature
    await this.verifyExtensionSignature(packageData);
    
    // Install for user
    await db('user_extensions').insert({
      user_id: userId,
      extension_id: extensionId,
      version: extension.version,
      is_enabled: true,
    }).onConflict(['user_id', 'extension_id']).merge();

    // Update download count
    await db('extensions')
      .where({ id: extensionId })
      .increment('download_count', 1);
  }
}
```

### Curated Extension Bundles

```typescript
// Predefined extension bundles
const EXTENSION_BUNDLES = {
  'web-development': {
    name: 'Web Development Essentials',
    description: 'Everything you need for modern web development',
    extensions: [
      'html-css-support',
      'javascript-typescript',
      'react-snippets',
      'tailwind-intellisense',
      'prettier-formatter',
      'eslint-linter',
      'live-server',
      'git-integration'
    ],
    category: 'web-dev',
    isOfficial: true,
  },
  
  'python-data-science': {
    name: 'Python Data Science',
    description: 'Tools for data analysis and machine learning',
    extensions: [
      'python-language-server',
      'jupyter-notebooks',
      'pandas-snippets',
      'matplotlib-viewer',
      'numpy-intellisense',
      'data-viewer',
      'python-debugger'
    ],
    category: 'data-science',
    isOfficial: true,
  },
  
  'cpp-competitive': {
    name: 'C++ Competitive Programming',
    description: 'Fast C++ development for competitive programming',
    extensions: [
      'cpp-language-server',
      'competitive-snippets',
      'fast-io-templates',
      'stress-testing',
      'time-complexity-analyzer',
      'contest-helper'
    ],
    category: 'competitive',
    isOfficial: true,
  },
  
  'beginner-friendly': {
    name: 'Beginner Friendly',
    description: 'Perfect for coding beginners',
    extensions: [
      'syntax-highlighter',
      'error-explainer',
      'code-runner',
      'simple-debugger',
      'learning-assistant',
      'progress-tracker'
    ],
    category: 'beginner',
    isOfficial: true,
  }
};

// Bundle installation
class BundleManager {
  async installBundle(userId: string, bundleId: string): Promise<void> {
    const bundle = EXTENSION_BUNDLES[bundleId];
    if (!bundle) {
      throw new Error('Bundle not found');
    }

    // Install all extensions in bundle
    for (const extensionId of bundle.extensions) {
      try {
        await this.marketplace.installExtension(userId, extensionId);
      } catch (error) {
        console.warn(`Failed to install ${extensionId}:`, error);
        // Continue with other extensions
      }
    }

    // Track bundle installation
    await db('user_bundle_installs').insert({
      user_id: userId,
      bundle_id: bundleId,
      installed_at: new Date(),
    });
  }
}
```

### Extension Development Tools

```bash
# AI IDE CLI for extension development
npm install -g @ai-ide/cli

# Create new extension
ai-ide create-extension my-extension --template=language-server

# Package extension
ai-ide package

# Publish to marketplace
ai-ide publish --token=<marketplace-token>

# Test extension locally
ai-ide test --workspace=./test-workspace
```

### Extension Manifest Validation

```typescript
// Extension manifest validation schema
const MANIFEST_SCHEMA = {
  type: 'object',
  required: ['name', 'version', 'description', 'main'],
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-z0-9-]+$',
      minLength: 3,
      maxLength: 50
    },
    displayName: {
      type: 'string',
      minLength: 3,
      maxLength: 100
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$'
    },
    description: {
      type: 'string',
      minLength: 10,
      maxLength: 500
    },
    permissions: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'filesystem:read',
          'filesystem:write',
          'network:http',
          'network:websocket',
          'terminal:execute',
          'ai:completion',
          'ai:chat',
          'system:clipboard',
          'system:notifications'
        ]
      }
    },
    contributes: {
      type: 'object',
      properties: {
        languages: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              extensions: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        },
        commands: {
          type: 'array',
          items: {
            type: 'object',
            required: ['command', 'title'],
            properties: {
              command: { type: 'string' },
              title: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

// Validation function
function validateManifest(manifest: any): ValidationResult {
  const validator = new JSONSchemaValidator(MANIFEST_SCHEMA);
  const result = validator.validate(manifest);
  
  if (!result.valid) {
    return {
      valid: false,
      errors: result.errors.map(error => ({
        path: error.instancePath,
        message: error.message
      }))
    };
  }

  // Additional security checks
  const securityChecks = [
    checkPermissions(manifest.permissions),
    checkContributions(manifest.contributes),
    checkDependencies(manifest.dependencies),
  ];

  const securityErrors = securityChecks
    .filter(check => !check.valid)
    .flatMap(check => check.errors);

  return {
    valid: securityErrors.length === 0,
    errors: securityErrors
  };
}
```

This extension system provides:

1. **Secure sandboxing** with resource limits and permission model
2. **Rich API surface** for extension development
3. **LSP/DAP integration** for language support
4. **Curated bundles** for different use cases
5. **Marketplace infrastructure** with search and reviews
6. **Development tools** for extension creators
7. **Manifest validation** and security checks
8. **Permission-based access control** for security