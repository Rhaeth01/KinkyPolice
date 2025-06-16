# KinkyPolice Dashboard

Modern Vue.js 3 web dashboard for the KinkyPolice Discord bot.

## Tech Stack

- **Vue.js 3** with Composition API and TypeScript
- **Tailwind CSS** for styling and responsive design
- **Vue Router** for client-side routing
- **Pinia** for state management
- **VueUse** for composable utilities
- **@vueuse/motion** for animations
- **Vite** as build tool

## Features

### 🏠 Dashboard
- Real-time bot statistics and monitoring
- Quick action buttons for common tasks
- Activity charts and popular commands overview
- Responsive design for mobile and desktop

### ⚙️ Configuration
- Interactive configuration interface
- Tabbed organization by category
- Real-time validation and saving
- NSFW content management

### 🛡️ Moderation
- Moderation action logs and history
- Quick moderation tools
- Filterable action history
- User and moderator tracking

### 📈 Analytics
- Detailed server analytics
- User and channel activity tracking
- Command usage statistics
- Time-based filtering

### 📚 Documentation
- Interactive command documentation
- Searchable command reference
- API documentation
- FAQ section

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Reusable components
│   ├── ui/         # UI components (future shadcn-vue)
│   └── common/     # Common components
├── composables/    # Vue composables
├── layouts/        # Layout components
├── pages/          # Page components
├── router/         # Vue Router configuration
├── stores/         # Pinia stores
├── styles/         # Global styles
├── utils/          # Utility functions
├── App.vue
└── main.ts
```

## Key Features

### 🎨 Modern UI/UX
- Dark/light theme support with smooth transitions
- Consistent design system with CSS variables
- Micro-interactions and smooth animations
- Mobile-first responsive design

### ⚡ Performance
- Lazy-loaded routes for optimal bundle splitting
- Efficient state management with Pinia
- Optimized animations with @vueuse/motion
- Fast development with Vite HMR

### 🔧 Developer Experience
- TypeScript for type safety
- Vue 3 Composition API for better code organization
- Auto-imports for composables
- ESLint and Prettier configuration (to be added)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking

### Adding New Pages

1. Create a new Vue component in `src/pages/`
2. Add the route to `src/router/index.ts`
3. Update navigation in `src/layouts/AppLayout.vue`

### State Management

The app uses Pinia for state management. Stores are located in `src/stores/` and follow the composition pattern.

### Styling

The project uses Tailwind CSS with a custom theme that supports dark/light modes. CSS variables are used for theming consistency.

## Deployment

The application can be deployed to any static hosting service:

```bash
npm run build
# Deploy the dist/ folder
```

## Contributing

Please ensure all contributions follow the existing code style and patterns. Run type checks before committing:

```bash
npm run type-check
```
