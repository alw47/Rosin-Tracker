# Rosin Tracker

A comprehensive rosin press tracking application designed for cannabis processing professionals, providing detailed operational insights and advanced management tools.

## Features

- **Batch Tracking**: Comprehensive rosin press batch management with detailed parameters
- **Curing Logs**: Track curing process stages with visual and aroma documentation  
- **Advanced Analytics**: Performance insights, yield trends, and strain analysis with start material filtering
- **Image Documentation**: Upload and attach images to batches and curing logs
- **Unit System Toggle**: Dynamic switching between metric and imperial units
- **Dark Mode**: Beautiful dark theme (default) with light mode support
- **Optional Authentication**: Secure login system for self-hosted deployments
- **Responsive Design**: Mobile-first approach with desktop optimization

## Quick Start

### One-Liner Installation (Debian/Ubuntu)

For automatic setup on Debian or Ubuntu systems (run as regular user, not root):

**Fresh installation (default - resets IDs to start from 1):**
```bash
curl -fsSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install.sh | bash
```

**Update installation (preserves existing data):**
```bash
curl -fsSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install.sh | bash -s -- --update
```

This script will:
- Install all dependencies (Node.js, PostgreSQL, Nginx)
- Setup the database and user accounts
- Fresh install: reset database sequences to start from ID 1
- Update install: preserve existing data and sequences
- Configure systemd service for auto-startup
- Setup SSL with Let's Encrypt (optional)
- Start the application on port 5000

### Manual Installation

If you prefer manual setup or are using a different OS:

#### Prerequisites
- Node.js 18+
- PostgreSQL database

#### Steps

1. **Clone and install**
   ```bash
   git clone https://github.com/alw47/Rosin-Tracker.git
   cd Rosin-Tracker
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database connection
   ```

3. **Setup database and start**
   ```bash
   npm run db:push
   npm run dev
   ```

Application available at `http://localhost:5000`

## Configuration

### Environment Variables

```env
# Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/rosin_tracker

# Authentication (Optional - leave empty to disable)
AUTH_PASSWORD=your-secure-password

# Session Security (Recommended for production)
SESSION_SECRET=your-random-secret-string
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Charts**: Recharts for data visualization
- **State Management**: TanStack Query

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run db:push      # Push schema changes to database
```

## License

MIT License - see [LICENSE](LICENSE) file for details.