# AI Configuration Management

> **改造中**：目录单一事实源、远程签名更新见分批提案 [`../feature-proposal--ai-catalog-source.md`](../feature-proposal--ai-catalog-source.md)。本文描述**当前**双层实现；在对应批次落地前不要按提案目标模型改代码。

## Architecture Overview

The AI configuration management system separates default configurations from user modifications:

### Two-Layer Configuration System

1. **Default Configurations** (`default-ais.json`)
   - Located in: `src/shared/statics/default-ais.json`
   - Embedded in the application source code
   - **NEVER modified by users**
   - Used for:
     - First-time application launch
     - Reset to defaults functionality
     - Merging new AI presets in updates

2. **User Configurations** (`user-ais.json`)
   - Located in: Electron's userData directory
   - Created when users modify any AI settings
   - Stores only user modifications
   - Merged with defaults at runtime

### Configuration Merge Strategy

```
Effective AIs = User Modifications + New Defaults
```

- User configs override default configs with the same ID
- New default AIs (from app updates) are automatically added
- Deleted user configs fall back to defaults

## File Structure

```
projects/ChatAIO/
├── src/
│   ├── shared/
│   │   └── statics/
│   │       └── default-ais.json          # Default AI configurations
│   ├── Main/
│   │   └── services/
│   │       └── settings/
│   │           └── ai-config-service.ts  # Configuration management service
│   └── userData/
│       └── user-ais.json                 # User modifications (auto-created)
```

## AIConfigService API

### Core Methods

```typescript
// Get default configurations (read-only)
getDefaultAIs(): AI.AIItem[]

// Get user modifications (null if none)
getUserAIs(): AI.AIItem[] | null

// Save user configurations
saveUserAIs(ais: AI.AIItem[]): void

// Get effective configurations (merged)
getEffectiveAIs(): AI.AIItem[]

// Reset to defaults
resetToDefaults(): void

// Check if user has modifications
hasUserModifications(): boolean
```

### CRUD Operations

```typescript
// Get specific AI
getAIById(id: string): AI.AIItem | undefined

// Update AI
updateAI(id: string, updates: Partial<AI.AIItem>): AI.AIItem | null

// Add new AI
addAI(ai: Omit<AI.AIItem, 'id'> & { id?: string }): AI.AIItem

// Delete AI
deleteAI(id: string): boolean
```

### Preload Management

```typescript
// Get AIs marked for preload on startup
getPreloadAIFamilies(): AI.AIFamily[]
```

## IPC RPC Methods

Available through preload API:

```typescript
window.api.getAIs()
window.api.getDefaultAIs()
window.api.updateAI(id, updates)
window.api.addAI(aiConfig)
window.api.deleteAI(id)
window.api.reorderAIs(orderedIds)
window.api.resetAIsToDefaults()
window.api.getPreloadAIFamilies()
```

列表顺序就是 `ais` 数组下标。Switch AI 右键拖与 Manage AIs 表拖都通过 `reorderAIs` **立即写盘**，不走 Apply。细节与不变量见 [`../features/ai-list-reorder.md`](../features/ai-list-reorder.md)。

## Usage in Settings UI

1. On settings view open, call `fetchSettings()`
2. AI configurations are loaded from `AIConfigService`
3. User modifications are saved via `submitSettings()` or individual CRUD methods

## userData Location

The user configuration file is stored in Electron's userData directory:

- **Windows**: `%APPDATA%/ChatAIO/user-ais.json`
- **macOS**: `~/Library/Application Support/ChatAIO/user-ais.json`
- **Linux**: `~/.config/ChatAIO/user-ais.json`
