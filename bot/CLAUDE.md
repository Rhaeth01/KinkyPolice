# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KinkyPolice is a Discord bot built with Discord.js v14 that provides moderation, entertainment, and community management features with a focus on NSFW/kink communities. The bot includes games, confession systems, modmail, ticketing, and various moderation tools.

## Recent Updates (Session January 2025)

### New Features
- **Interaction Router System**: Implemented centralized interaction routing (`handlers/interactionRouter.js`) with priority-based patterns
- **ConfigFixer Utility**: Automatic configuration repair system to fix common issues
- **Vote System Separation**: Separated vote roles from Tourette roles with distinct configuration paths
- **Funny Roles Feature**: New "rôles drôles" system for server animation with automatic staff role filtering

### Major Bug Fixes Completed
- **Interaction Handling Conflicts**: Fixed button handler conflicts that caused "Unknown interaction" errors (code 10062)
- **Config Command Stability**: Improved error handling in config.js collectors to prevent crashes from expired interactions
- **Collector Management**: Added proper interaction state checks and timeout handling across all collectors
- **Navigation Improvements**: Fixed back button functionality in config interface to prevent nested collectors
- **Double-Processing Protection**: Added safeguards against interaction being processed multiple times

### Technical Improvements
- Enhanced error handling for Discord interaction timeouts
- Improved button handler exclusion logic to prevent double-processing
- Added graceful fallback for expired interactions
- Implemented proper interaction state validation throughout config system
- Better session management for config users
- Enhanced debugging logs for vote system role loading

### Code Quality
- Fixed syntax errors with escaped characters in template literals
- Corrected all JavaScript syntax issues in config.js and buttonHandler.js
- Improved error logging and debugging capabilities
- Better separation of concerns between different interaction handlers

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Start the bot
npm start

# Deploy slash commands to Discord
npm run deploy

# Run tests
npm test
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e       # End-to-end tests only
npm run test:coverage  # With coverage report
npm run test:ci        # CI environment

# Configuration validation
npm run test:config    # Test configuration
npm run validate:configmanager # Validate config manager
npm run migrate:config # Migrate configuration
```

### Docker Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Deploy script (Windows)
./deploy.bat
```

## Architecture

### Core Structure
- **Entry Point**: `index.js` - Initializes Discord client, loads commands/events, handles scheduling
- **Command Handler**: Recursively loads commands from `commands/` directory and subdirectories
- **Event Handler**: Loads event handlers from `events/` directory
- **Configuration**: Uses `configManager.js` for centralized config with validation, caching, and file locking

### Key Systems

#### Configuration Management (`utils/configManager.js`)
- Centralized configuration with JSON schema validation
- File locking to prevent concurrent writes
- Automatic backups in `config_backups/`
- Cache invalidation on file changes
- Access through `/config` command with edit/view/diagnostic subcommands

#### Modern Config Interface (`commands/config.js`)
**Recently Fixed Issues:**
- Fixed interaction collector conflicts and timeouts
- Improved error handling for expired interactions (error 10062)
- Added proper state management for button interactions
- Enhanced navigation between config sections
- Integrated ConfigFixer for automatic issue resolution
- Better user session management

Key features:
- Interactive dashboard with real-time statistics
- Category-based configuration organization
- Modal field management for entry forms
- Export/import configuration functionality
- Comprehensive error handling and user feedback
- Automatic configuration repair via ConfigFixer
- "Rôles drôles" management for server animation

#### Interaction Router (`handlers/interactionRouter.js`)
**New Central Routing System:**
- Priority-based routing patterns (config > games > moderation > general)
- Prevents interaction conflicts between handlers
- Built-in protection against double-processing
- Graceful error handling for expired interactions

#### Interaction Handling (`handlers/buttonHandler.js`)
**Recently Updated:**
- Excluded all config-related buttons to prevent conflicts
- Added proper interaction state checks
- Improved error handling and logging
- Fixed double-processing issues

Handles:
- Access request buttons and modals
- Rule acceptance with role management
- Ticket system interactions
- Game interactions
- Modmail management

#### Command Structure
Commands are organized by category:
- **Moderation**: ban, kick, warn, mute, clear
- **Games**: Various games in `commands/games/` including board games, vote system with separate role configuration
- **NSFW/Kink**: confession, kinky, kink-config
- **Utility**: embed creation, voice logs, modmail
- **Economy**: balance, shop, currency management
- **Configuration**: Advanced config system with interactive menus and automatic fixes

#### Data Storage
- JSON files in `data/` directory for persistent storage
- Separate managers for different data types:
  - `currencyManager.js` - User points/currency
  - `warningsManager.js` - User warnings
  - `gameScoresManager.js` - Game statistics
  - `jsonManager.js` - Generic JSON file operations

#### Scheduled Tasks
- **Daily Quiz**: Runs every 24 hours via `dailyQuizScheduler.js`
- **Voice Activity**: Tracks voice channel activity via `voiceActivityScheduler.js`
- **Event Scheduler**: General event scheduling system

#### Moderation Features
- **Modmail System**: Private ticket system for user-staff communication
- **Ticket System**: Support ticket handling with transcripts
- **Warning System**: Track and manage user warnings
- **Voice Logging**: Log voice channel activities
- **Message Logging**: Track message edits/deletions

#### Content Filtering
- `contentFilter.js` - Filter inappropriate content
- Confession moderation system
- NSFW content management

### Environment Variables
Required in `.env`:
- `TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application ID
- `GUILD_ID` - Primary guild ID for command deployment
- `OPENROUTER_API_KEY` - API key for AI features

### Modern Webhook Logging System

KinkyPolice includes a cutting-edge webhook logging system that provides:

#### Features
- **Better Performance**: Separate rate limits and faster execution
- **Professional Design**: Custom avatars and names for each log type
- **Automatic Fallback**: Falls back to traditional channels if webhooks fail
- **Easy Management**: `/webhook-config` command for full control

#### Log Types
- **🛡️ Moderation**: Ban, kick, warn, mute actions
- **💬 Messages**: Edited and deleted messages
- **🔊 Voice**: Voice channel activity
- **👥 Roles**: Role additions and removals
- **👤 Members**: Join/leave events
- **🎫 Tickets**: Ticket system events

#### Setup
1. Use `/webhook-config` command
2. Click "🚀 Configurer Automatiquement"
3. Webhooks are created automatically for all log channels

#### Usage in Code
```javascript
const webhookLogger = require('./utils/webhookLogger');

// Log moderation action
await webhookLogger.logModeration('Ban', targetUser, moderator, reason);

// Log message edit
await webhookLogger.logMessageEdit(oldMessage, newMessage);

// Custom log
await webhookLogger.log('moderation', embedObject);
```

#### Migration from Old System
The new system includes compatibility adapters:
- `modernMessageLogs.js` - Replaces `messageLogs.js`
- `modernRoleLogs.js` - Replaces `roleLogs.js`

Old events are automatically migrated to use the new webhook system while maintaining backward compatibility.

### Error Handling
**Recently Enhanced:**
- Global error handlers for unhandled rejections/exceptions
- Specific handling for Discord interaction errors (codes 10062, 40060)
- Improved collector timeout management
- Graceful handling of expired interactions
- Enhanced logging for debugging interaction issues

### Testing Strategy
- Unit tests for individual utilities
- Integration tests for command functionality
- E2E tests for full workflows
- Configuration-specific test suites
- Jest as testing framework

## Important Notes

1. **Configuration Updates**: Always use `configManager` methods, never modify `config.json` directly
2. **Command Deployment**: Run `npm run deploy` after adding/modifying slash commands
3. **Error Codes**: Discord interaction errors 10062 (Unknown Interaction) and 40060 are handled gracefully
4. **File Locking**: ConfigManager implements file locking to prevent data corruption
5. **Validation**: Configuration changes are validated against `config.schema.json`
6. **Backups**: Configuration automatically backed up before changes
7. **Interaction Handling**: All config-related interactions are managed by config.js to prevent conflicts
8. **Syntax Checking**: Always run `node -c filename.js` to verify syntax before deployment

## Interaction Best Practices

### For Config System
- Use `interaction.update()` for navigation within collectors
- Handle expired interactions gracefully with try-catch blocks
- Check `interaction.replied` and `interaction.deferred` before processing
- Use separate functions for update vs. new interaction flows

### For Button Handlers
- Exclude config buttons in general button handler
- Implement proper cooldowns and double-click protection
- Use specific error handling for different interaction types
- Log unhandled interactions for debugging

## Current Status

✅ **Stable**: All interaction bugs fixed, syntax validated  
✅ **Ready for Production**: Code can be safely deployed  
✅ **Migration Ready**: See MIGRATION-ROADMAP.md for next steps  

## Future Development

The next major milestone is migrating to a multi-server architecture with:
- PostgreSQL database (via Supabase)
- Web dashboard interface
- Multi-guild support
- Real-time configuration management

See `MIGRATION-ROADMAP.md` for detailed implementation plan.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

SYNTAX VALIDATION: Always run `node -c filename.js` to verify JavaScript syntax before confirming any code changes are ready for deployment.

INTERACTION HANDLING: Be aware that config-related interactions are handled exclusively by config.js to prevent conflicts. The buttonHandler.js excludes all config buttons for this reason.