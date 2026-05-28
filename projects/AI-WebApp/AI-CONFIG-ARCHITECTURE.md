# AI Configuration Management

## Architecture Overview

The AI configuration management system has been refactored to separate default configurations from user modifications:

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
projects/AI-WebApp/
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
// Fetch all effective AIs
window.api.getAIs()

// Get default AIs only
window.api.getDefaultAIs()

// Update an AI
window.api.updateAI(id, updates)

// Add a new AI
window.api.addAI(aiConfig)

// Delete an AI
window.api.deleteAI(id)

// Reset to defaults
window.api.resetAIsToDefaults()

// Get preload families
window.api.getPreloadAIFamilies()
```

## Usage in Settings UI

The Settings view automatically loads AI configurations via IPC:

1. On settings view open, call `fetchSettings()`
2. AI configurations are loaded from `AIConfigService`
3. User modifications are saved via `submitSettings()` or individual CRUD methods

## Migration from Hardcoded Configs

**Before:**
```typescript
// Hardcoded in multiple places
const AIs = [
  { id: 'gpt-mia-001', label: 'GPT-Mia', ... },
  { id: 'gpt-john-002', label: 'GPT-John', ... },
  // ... more hardcoded configs
];
```

**After:**
```typescript
// Dynamic loading from service
const { getAIConfigService } = await import('#main/services/settings/ai-config-service');
const aiConfigService = getAIConfigService();
const effectiveAIs = aiConfigService.getEffectiveAIs();
```

## Benefits

1. **Maintainability**: Default configs in one JSON file
2. **User Customization**: Users can modify without touching source code
3. **Update-Safe**: New defaults can be added without overwriting user configs
4. **Reset Capability**: Easy reset to defaults by deleting user config file
5. **Type Safety**: Full TypeScript support with AI.AIItem type
6. **Separation of Concerns**: Clear separation between defaults and user data

## Testing

To test the configuration management:

1. **First Launch**: No `user-ais.json` exists, defaults are used
2. **Modify Settings**: Use Settings UI to modify AI configs
3. **Verify Persistence**: Check `user-ais.json` in userData directory
4. **Reset Test**: Use "Reset to Defaults" feature
5. **Update Test**: Add new AI to `default-ais.json`, verify merge

## userData Location

The user configuration file is stored in Electron's userData directory:

- **Windows**: `%APPDATA%/AI-WebApp/user-ais.json`
- **macOS**: `~/Library/Application Support/AI-WebApp/user-ais.json`
- **Linux**: `~/.config/AI-WebApp/user-ais.json`
