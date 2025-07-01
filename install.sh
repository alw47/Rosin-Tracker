#!/bin/bash

# Rosin Tracker - Automated Installation Script for Debian/Ubuntu
# This script installs and configures Rosin Tracker on Debian-based systems
# Tested and working with Node.js 18 and PostgreSQL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Use a regular user with sudo privileges."
    exit 1
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    print_error "sudo is required but not installed. Please install sudo first."
    exit 1
fi

print_status "🌿 Rosin Tracker Installation Script"
echo "=================================================="

# Parse command line arguments
FRESH_INSTALL=true
while [[ $# -gt 0 ]]; do
    case $1 in
        --update)
            FRESH_INSTALL=false
            shift
            ;;
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
print_status "Installing Node.js 18..."
if ! command -v node &> /dev/null || [ "$(node --version | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js $(node --version) installed"
else
    print_success "Node.js $(node --version) already installed"
fi

# Install PostgreSQL
print_status "Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL installed and started"
else
    print_success "PostgreSQL already installed"
fi

# Install additional tools
print_status "Installing additional tools..."
sudo apt install -y git curl wget unzip build-essential

# Create application directory
APP_DIR="/opt/rosin-tracker"
print_status "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Download application
print_status "Downloading Rosin Tracker..."
cd $APP_DIR

# Use curl for reliable download
print_status "Downloading via curl..."
curl -L https://github.com/alw47/Rosin-Tracker/archive/refs/heads/main.zip -o main.zip

# Extract and setup
print_status "Extracting files..."
unzip -o -q main.zip

# Find the extracted directory (handles case variations)
EXTRACTED_DIR=""
for dir in *-main; do
    if [ -d "$dir" ]; then
        EXTRACTED_DIR="$dir"
        break
    fi
done

if [ -z "$EXTRACTED_DIR" ]; then
    print_error "Failed to find extracted directory. Contents:"
    ls -la
    exit 1
fi

print_status "Found extracted directory: $EXTRACTED_DIR"

# Move files from extracted directory
print_status "Moving files from $EXTRACTED_DIR to application directory..."
find "$EXTRACTED_DIR" -mindepth 1 -maxdepth 1 -exec cp -r {} . \;

# Clean up
rm -rf $EXTRACTED_DIR main.zip

# Verify package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found after extraction. Current directory contents:"
    ls -la
    exit 1
fi

print_success "Repository downloaded and extracted successfully"

# Apply Node.js 18 compatibility fixes BEFORE building
print_status "Applying Node.js 18 compatibility fixes..."

# Fix import.meta.dirname issues in server files
if [ -f "server/vite.ts" ]; then
    if grep -q "import.meta.dirname" server/vite.ts; then
        sed -i 's/import\.meta\.dirname/path.dirname(new URL(import.meta.url).pathname)/g' server/vite.ts
        print_success "Fixed server/vite.ts for Node.js 18 compatibility"
    fi
fi

# Fix server.listen() format in server/index.ts
if [ -f "server/index.ts" ]; then
    if grep -q "server\.listen({" server/index.ts; then
        sed -i 's/server\.listen({.*$/server.listen(port, "0.0.0.0", () => {/' server/index.ts
        sed -i '/port,$/d; /host: "0\.0\.0\.0",$/d; /reusePort: true,$/d; /}, () => {$/d' server/index.ts
        print_success "Fixed server.listen() format for Node.js 18"
    fi
fi

# Fix database connection for local PostgreSQL
if [ -f "server/db.ts" ]; then
    if grep -q "@neondatabase/serverless" server/db.ts; then
        print_status "Updating database driver for local PostgreSQL..."
        sed -i "s|import { Pool, neonConfig } from '@neondatabase/serverless';|import { Pool } from 'pg';|g" server/db.ts
        sed -i "s|import { drizzle } from 'drizzle-orm/neon-serverless';|import { drizzle } from 'drizzle-orm/node-postgres';|g" server/db.ts
        sed -i '/import ws from "ws";/d' server/db.ts
        sed -i '/neonConfig.webSocketConstructor = ws;/d' server/db.ts
        sed -i 's|export const pool = new Pool({ connectionString: process.env.DATABASE_URL });|export const pool = new Pool({ \n  connectionString: process.env.DATABASE_URL,\n  ssl: false // Disable SSL for local PostgreSQL\n});|g' server/db.ts
        print_success "Updated database driver for local PostgreSQL"
    fi
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Install standard PostgreSQL driver for local database
print_status "Installing PostgreSQL driver for local database..."
npm install pg @types/pg
npm uninstall @neondatabase/serverless 2>/dev/null || true
print_success "Dependencies installed"

# Setup database
print_status "Setting up PostgreSQL database..."

# Generate random passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

# Setup database - handle existing database/user
sudo -u postgres psql << EOF
-- Drop existing database and user if they exist to start fresh
DROP DATABASE IF EXISTS rosin_tracker;
DROP USER IF EXISTS rosin_user;

-- Create new database and user
CREATE DATABASE rosin_tracker;
CREATE USER rosin_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE rosin_tracker TO rosin_user;
ALTER DATABASE rosin_tracker OWNER TO rosin_user;

-- Grant additional permissions
\c rosin_tracker
GRANT ALL PRIVILEGES ON SCHEMA public TO rosin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rosin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rosin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO rosin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO rosin_user;
\q
EOF

print_success "Database created with user 'rosin_user'"

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://rosin_user:$DB_PASSWORD@localhost:5432/rosin_tracker

# Session Security
SESSION_SECRET=$SESSION_SECRET

# Application Settings
NODE_ENV=production
PORT=5000

# Optional: Enable authentication (uncomment and set password)
# AUTH_PASSWORD=your_secure_password_here
EOF

print_success "Environment file created"

# Setup database schema
print_status "Setting up database schema..."
npm run db:push
print_success "Database schema created"

# Database initialization based on command line arguments
if [ "$FRESH_INSTALL" = true ]; then
    print_status "Initializing database sequences for fresh install..."
    npx tsx scripts/init-db.ts
    print_success "Database sequences initialized - new entries will start from ID 1"
else
    print_status "Update mode - preserving existing data and sequences"
    print_success "Database ready for updates"
fi

# Build application
print_status "Building application..."
npm run build

# Apply post-build fixes if needed
if [ -f "dist/index.js" ]; then
    if grep -q "import.meta.dirname" dist/index.js; then
        print_status "Applying post-build Node.js compatibility fixes..."
        sed -i 's/import\.meta\.dirname/path.dirname(new URL(import.meta.url).pathname)/g' dist/index.js
        print_success "Applied post-build fixes"
    fi
fi

print_success "Application built successfully"

# Create systemd service
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/rosin-tracker.service > /dev/null << EOF
[Unit]
Description=Rosin Tracker - Cannabis Processing Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable rosin-tracker
sudo systemctl stop rosin-tracker 2>/dev/null || true
sudo systemctl start rosin-tracker

# Check service status with retry
print_status "Verifying service startup..."
sleep 5

RETRY_COUNT=0
MAX_RETRIES=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if sudo systemctl is-active --quiet rosin-tracker; then
        print_success "Rosin Tracker service started successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            print_warning "Service not ready yet, retrying in 5 seconds... (attempt $RETRY_COUNT/$MAX_RETRIES)"
            sleep 5
        else
            print_error "Service failed to start after $MAX_RETRIES attempts. Recent logs:"
            sudo journalctl -u rosin-tracker -n 10 --no-pager
            exit 1
        fi
    fi
done

# Setup firewall
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 5000
    print_success "Firewall configured"
else
    print_warning "UFW firewall not installed. Consider installing and configuring it for security."
fi

# Final status check
print_status "Performing final status check..."

# Check if service is running
if sudo systemctl is-active --quiet rosin-tracker; then
    SERVICE_STATUS="${GREEN}✓ Running${NC}"
else
    SERVICE_STATUS="${RED}✗ Not Running${NC}"
fi

# Check if port is open
if ss -tuln | grep -q ":5000 "; then
    PORT_STATUS="${GREEN}✓ Port 5000 Open${NC}"
else
    PORT_STATUS="${RED}✗ Port 5000 Closed${NC}"
fi

# Check database connection
if sudo -u postgres psql rosin_tracker -c "SELECT 1;" &> /dev/null; then
    DB_STATUS="${GREEN}✓ Database Connected${NC}"
else
    DB_STATUS="${RED}✗ Database Connection Failed${NC}"
fi

# Get server IP
SERVER_IP=$(curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "=================================================="
print_success "🎉 Rosin Tracker Installation Complete!"
echo "=================================================="
echo ""
echo "📊 System Status:"
echo -e "   Service: $SERVICE_STATUS"
echo -e "   Port: $PORT_STATUS"
echo -e "   Database: $DB_STATUS"
echo ""
echo "🌐 Access Your Application:"
echo "   Web Interface: http://$SERVER_IP:5000"
echo "   Local Access: http://localhost:5000"
echo "   Health Check: http://$SERVER_IP:5000/api/health"
echo ""
echo "🔧 Management Commands:"
echo "   Start:   sudo systemctl start rosin-tracker"
echo "   Stop:    sudo systemctl stop rosin-tracker"
echo "   Restart: sudo systemctl restart rosin-tracker"
echo "   Logs:    sudo journalctl -u rosin-tracker -f"
echo "   Status:  sudo systemctl status rosin-tracker"
echo ""
echo "📁 Application Directory: $APP_DIR"
echo "⚙️  Configuration File: $APP_DIR/.env"
echo ""
print_warning "Important: Save your database password and session secret from the .env file!"
echo ""

# Show next steps
echo "🚀 Next Steps:"
echo "1. Visit your web interface to start tracking rosin batches"
echo "2. Optional: Set AUTH_PASSWORD in .env to enable login protection"
echo "3. Set up regular database backups"
echo "4. Monitor logs for any issues"
echo ""

# Test the API endpoint
print_status "Testing API endpoint..."
if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
    print_success "✅ API health check passed - Your Rosin Tracker is ready!"
else
    print_warning "⚠️  API not responding yet - may still be starting up"
fi

echo ""
print_success "Happy rosin processing! 🌿"