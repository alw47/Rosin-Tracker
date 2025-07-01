#!/bin/bash
#
# Rosin Tracker - Simple Installation Script
# Repository: https://github.com/alw47/Rosin-Tracker
# This script provides a non-interactive installation with sensible defaults
#

set -e

# Color functions for output
print_status() { echo -e "\e[34m[INFO]\e[0m $1"; }
print_success() { echo -e "\e[32m[SUCCESS]\e[0m $1"; }
print_error() { echo -e "\e[31m[ERROR]\e[0m $1"; }
print_warning() { echo -e "\e[33m[WARNING]\e[0m $1"; }

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Parse command line arguments
FRESH_INSTALL=false
ENABLE_AUTH=false

for arg in "$@"; do
    case $arg in
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
        --auth)
            ENABLE_AUTH=true
            shift
            ;;
        --help)
            echo "Rosin Tracker Installation Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fresh    Fresh installation (resets database)"
            echo "  --auth     Enable authentication (default: disabled)"
            echo "  --help     Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Standard update installation"
            echo "  $0 --fresh           # Fresh install without authentication"
            echo "  $0 --fresh --auth    # Fresh install with authentication enabled"
            exit 0
            ;;
        *)
            print_error "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_status "Starting Rosin Tracker installation..."
print_status "Fresh install: $FRESH_INSTALL"
print_status "Authentication: $ENABLE_AUTH"
echo ""

# Check for required commands
for cmd in git node npm psql sudo; do
    if ! command -v $cmd &> /dev/null; then
        print_error "$cmd is required but not installed"
        exit 1
    fi
done

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install
print_success "Dependencies installed"

# PostgreSQL setup
if [ "$FRESH_INSTALL" = true ]; then
    print_status "Setting up PostgreSQL database (FRESH INSTALL - will reset data)..."
    
    # Generate secure defaults
    DB_USERNAME="rosin_user"
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/")
    
    print_status "Creating database with generated credentials..."
    
    # Create database and user
    sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS rosin_tracker;
DROP ROLE IF EXISTS $DB_USERNAME;
CREATE DATABASE rosin_tracker;
CREATE ROLE $DB_USERNAME WITH LOGIN PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE rosin_tracker TO $DB_USERNAME;
ALTER DATABASE rosin_tracker OWNER TO $DB_USERNAME;
\c rosin_tracker
GRANT ALL ON SCHEMA public TO $DB_USERNAME;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USERNAME;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USERNAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USERNAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USERNAME;
\q
EOF

    print_success "Database created with user '$DB_USERNAME'"
else
    print_status "Update mode - preserving existing database..."
    
    # Load existing credentials from .env if available
    if [ -f ".env" ]; then
        DB_USERNAME=$(grep "^DATABASE_URL=" .env | sed 's/.*:\/\/\([^:]*\):.*/\1/')
        DB_PASSWORD=$(grep "^DATABASE_URL=" .env | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
        SESSION_SECRET=$(grep "^SESSION_SECRET=" .env | cut -d'=' -f2)
    else
        print_error "No existing .env file found for update mode"
        exit 1
    fi
fi

# Create environment file
print_status "Creating environment configuration..."

cat > .env << 'EOF'
# Database Configuration
# Session Security
# Application Settings
NODE_ENV=production
PORT=5000
# Authentication Settings
EOF

# Add variables
echo "DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@localhost:5432/rosin_tracker" >> .env
echo "SESSION_SECRET=$SESSION_SECRET" >> .env

# Add authentication setting
if [ "$ENABLE_AUTH" = true ]; then
    echo "AUTH_PASSWORD=YES  # Email-based authentication with 2FA support enabled" >> .env
else
    echo "# AUTH_PASSWORD=YES  # Set to \"YES\" to enable email-based authentication with 2FA support" >> .env
fi

print_success "Environment file created"

# Setup database schema
print_status "Setting up database..."
set -a
source .env
set +a

if [ "$FRESH_INSTALL" = true ]; then
    print_status "Fresh install - creating database schema..."
    npm run db:push
    print_success "Database schema created"
    
    print_status "Initializing database sequences for fresh install..."
    npx tsx scripts/init-db.ts
    print_success "Database sequences initialized - new entries will start from ID 1"
else
    print_status "Update mode - safely applying schema updates..."
    
    # Create a backup before any potential schema changes
    BACKUP_FILE="/tmp/rosin_tracker_backup_$(date +%Y%m%d_%H%M%S).sql"
    print_status "Creating backup before schema update: $BACKUP_FILE"
    
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    print_success "Backup created: $BACKUP_FILE"
    
    # Apply schema updates
    npm run db:push
    print_success "Database schema updated"
fi

# Install and configure systemd service
print_status "Setting up systemd service..."

sudo tee /etc/systemd/system/rosin-tracker.service > /dev/null << EOF
[Unit]
Description=Rosin Tracker Application
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Add npm start script if not present
if ! npm run start --silent 2>/dev/null; then
    print_status "Adding start script to package.json..."
    # This is a simple way to add the start script
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.start = 'tsx server/index.ts';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
fi

sudo systemctl daemon-reload
sudo systemctl enable rosin-tracker
sudo systemctl restart rosin-tracker

print_success "Systemd service configured and started"

# Setup UFW firewall
print_status "Configuring firewall..."
sudo ufw allow 5000/tcp
print_success "Firewall configured to allow port 5000"

# Final status
echo ""
print_success "Installation completed successfully!"
echo ""
print_status "=== CONFIGURATION SUMMARY ==="
echo "Database Username: $DB_USERNAME"
echo "Database Password: [saved in .env file]"
if [ "$ENABLE_AUTH" = true ]; then
    echo "Authentication: ENABLED"
    echo "  - Visit your application to create user accounts"
    echo "  - Users will need email and password to log in"
    echo "  - 2FA can be enabled in user settings"
else
    echo "Authentication: DISABLED"
    echo "  - Application runs without login requirements"
    echo "  - To enable later, set AUTH_PASSWORD=YES in .env and restart"
fi
echo "Application URL: http://localhost:5000"
echo ""

print_status "=== USEFUL COMMANDS ==="
echo "View logs:           sudo journalctl -u rosin-tracker -f"
echo "Restart service:     sudo systemctl restart rosin-tracker"
echo "Stop service:        sudo systemctl stop rosin-tracker"
echo "Check status:        sudo systemctl status rosin-tracker"
echo ""

if [ "$ENABLE_AUTH" = true ]; then
    print_warning "IMPORTANT: Authentication is enabled"
    print_warning "Visit http://localhost:5000 to create your first user account"
fi

print_success "Rosin Tracker is now running!"