# Rosin Tracker

A comprehensive rosin press tracking application designed for cannabis processing professionals, providing detailed operational insights and advanced management tools.

## Features

- **Batch Tracking**: Comprehensive rosin press batch management with detailed parameters
- **Curing Logs**: Track curing process stages with visual and aroma documentation  
- **Advanced Analytics**: Performance insights, yield trends, and strain analysis with start material filtering
- **Image Documentation**: Upload and attach images to batches and curing logs
- **Unit System Toggle**: Dynamic switching between metric and imperial units
- **Dark Mode**: Beautiful dark theme (default) with light mode support
- **Enterprise Authentication**: Email-based login with 2FA support, QR code setup, and comprehensive user management
- **Responsive Design**: Mobile-first approach with desktop optimization

## Quick Start

### One-Liner Installation (Debian/Ubuntu)

For automatic setup on Debian or Ubuntu systems (run as regular user, not root):

**Basic Installation (No Authentication):**
```bash
curl -sSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install-simple.sh | bash -s -- --fresh
```

**Secure Installation (Email + 2FA Authentication):**
```bash
curl -sSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install-simple.sh | bash -s -- --fresh --auth
```

**Update Existing Installation:**
```bash
curl -sSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install-simple.sh | bash
```

### Local Installation Options

If you've already downloaded the repository:

```bash
# Basic installation (no login required)
./install-simple.sh --fresh

# Secure installation (email-based authentication with 2FA)
./install-simple.sh --fresh --auth

# Update existing installation (preserves data)
./install-simple.sh
```

This script will:
- Install all dependencies (Node.js, PostgreSQL)
- Generate secure database credentials automatically
- Setup the database with proper permissions
- Fresh install: reset database sequences to start from ID 1
- Update install: preserve existing data and sequences
- Configure systemd service for auto-startup
- Setup UFW firewall rules
- Start the application on port 5000
- Optional: Enable email-based authentication with 2FA support

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

## Authentication Setup

When `AUTH_PASSWORD=YES` is set in your environment:

1. **First Visit**: You'll be redirected to create your initial user account
2. **Account Creation**: Set up your email and password for secure login
3. **2FA Setup**: Optional but recommended - scan QR code with authenticator app
4. **Login Process**: Use email/password + 2FA code for secure access

**Supported Authenticator Apps**: Google Authenticator, Authy, Microsoft Authenticator, or any TOTP-compatible app.

## Configuration

### Environment Variables

```env
# Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/rosin_tracker

# Authentication (Optional - set to "YES" to enable email-based login with 2FA)
AUTH_PASSWORD=YES

# Session Security (Recommended for production)
SESSION_SECRET=your-random-secret-string
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Charts**: Recharts for data visualization
- **State Management**: TanStack Query

## Post-Installation

### Access Your Application
- **Local**: `http://localhost:5000`
- **External**: `http://your-server-ip:5000`

### Useful Commands
```bash
# View application logs
sudo journalctl -u rosin-tracker -f

# Restart application
sudo systemctl restart rosin-tracker

# Check application status
sudo systemctl status rosin-tracker

# Stop application
sudo systemctl stop rosin-tracker
```

### Enable Authentication Later
To enable authentication after installation:
1. Edit `.env` file: `AUTH_PASSWORD=YES`
2. Restart: `sudo systemctl restart rosin-tracker`

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5000
sudo lsof -i :5000

# Stop and restart the service
sudo systemctl stop rosin-tracker
sudo systemctl start rosin-tracker
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Installation Issues
For interactive prompt issues, use the original installer:
```bash
./install.sh --fresh
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run db:push      # Push schema changes to database
```

## License

MIT License - see [LICENSE](LICENSE) file for details.