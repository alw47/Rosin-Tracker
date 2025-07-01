# Changelog

All notable changes to Rosin Tracker will be documented in this file.

## [1.0.0] - 2025-07-01

### Initial Release

#### Core Features
- **Comprehensive Batch Tracking**: Full rosin press batch management with detailed parameters including strain, material type, yields, temperature, pressure, and micron bags
- **Curing Process Management**: Track curing stages with visual characteristics, aroma notes, and progress monitoring
- **Advanced Analytics Dashboard**: Performance insights, yield trends, environmental monitoring, and strain analysis with filtering
- **Reminder System**: Scheduled curing reminders with notifications and batch management
- **Image Documentation**: Upload and attach images to batches and curing logs
- **Data Management**: Complete backup and restore functionality with JSON export/import

#### User Experience
- **Dark Mode**: Beautiful dark theme set as default with light mode support
- **Metric System**: Celsius, grams, and bar units set as default with imperial conversion
- **Responsive Design**: Mobile-first approach optimized for all screen sizes
- **Unit System Toggle**: Dynamic switching between metric and imperial units
- **Interactive Charts**: Data visualization using Recharts with consistent styling

#### Technical Architecture
- **Frontend**: React 18 with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations
- **State Management**: TanStack Query for server state with caching
- **Authentication**: Optional session-based authentication for self-hosting

#### Security & Deployment
- **Optional Authentication**: Environment-based password protection for self-hosted deployments
- **Production Ready**: Comprehensive manual deployment guide for Debian/Ubuntu systems
- **Service Integration**: Systemd service setup with automatic startup and monitoring
- **Session Management**: Secure cookie configuration with environment-based secrets

#### Recent Fixes (v1.0.0)
- Fixed critical micron bag formatting issue - now stores raw dimensions without units
- Enhanced backup system to include all data tables (rosin presses, curing logs, reminders)
- Improved data integrity handling for edge cases and corrupted entries
- Set practical default temperature of 90°C for new press batches
- Optimized analytics dashboard with unified advanced features

### Technical Details
- **Database Schema**: Three main tables with proper relations and cascade deletion
- **API Design**: RESTful endpoints with Zod validation and type safety
- **File Handling**: Base64 image encoding for database storage
- **Development Tools**: Vite build system with hot reload and TypeScript strict mode

### Installation Requirements
- Node.js 18+
- PostgreSQL database
- Modern web browser with JavaScript enabled

---

For detailed technical documentation, see [replit.md](replit.md).
For setup instructions, see [README.md](README.md).