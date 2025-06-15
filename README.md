# KinkyPolice Monorepo

A Discord bot with web dashboard for NSFW/kink community management.

## Structure

This project is organized as a monorepo with three main components:

```
KinkyPolice/
├── bot/          # Discord bot application
├── back-end/     # API service (planned)
├── front-end/    # Web dashboard (planned)
└── README.md     # This file
```

### Bot

The Discord bot built with Discord.js v14 that provides:
- Moderation tools
- Entertainment features
- Confession systems
- Economy system
- Interactive games
- Community management

See [bot/README.md](bot/README.md) for bot-specific documentation.

### Back-end

Future API service for connecting the bot, dashboard, and database.

See [back-end/README.md](back-end/README.md) for API information.

### Front-end

Future web dashboard for bot management and documentation.

See [front-end/README.md](front-end/README.md) for dashboard information.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Discord Bot Token

### Bot Setup

```bash
cd bot
npm install
# Configure your .env file
npm start
```

### Development

Each component can be developed independently:

```bash
# Bot development
cd bot
npm start

# Backend development (when implemented)
cd back-end
npm run dev

# Frontend development (when implemented)
cd front-end
npm run dev
```

## Deployment

The bot can be deployed using Docker:

```bash
cd bot
docker-compose up -d
```

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License.