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
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "OPTIONS:"
            echo "  --fresh     Fresh installation (default) - sets up database schema and resets sequences to start from ID 1"
            echo "  --update    Update existing installation - applies schema updates safely with data protection"
            echo "  --help, -h  Show this help message"
            echo ""
            echo "SAFETY NOTES:"
            echo "  --fresh: Only use for new installations - will reset database sequences"
            echo "  --update: Safe for existing installations - applies schema updates with automatic backup/restore protection"
            echo ""
            echo "Examples:"
            echo "  curl -fsSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install.sh | bash"
            echo "  curl -fsSL https://raw.githubusercontent.com/alw47/Rosin-Tracker/main/install.sh | bash -s -- --update"
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1. Use --help for usage information."
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
if [ "$FRESH_INSTALL" = true ]; then
    print_status "Setting up PostgreSQL database (FRESH INSTALL - will reset data)..."
    
    # Prompt for database credentials during fresh install
    echo ""
    print_status "Setting up database credentials for fresh installation..."
    echo ""
    
    # Prompt for database username
    while true; do
        echo -n "Enter database username (default: rosin_user): "
        read -r DB_USERNAME
        DB_USERNAME=${DB_USERNAME:-rosin_user}
        
        # Validate username (basic validation)
        if [[ "$DB_USERNAME" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]]; then
            break
        else
            print_error "Invalid username. Use only letters, numbers, and underscores. Must start with a letter."
        fi
    done
    
    # Prompt for database password
    while true; do
        echo -n "Enter database password (leave empty to auto-generate): "
        read -s DB_PASSWORD_INPUT
        echo ""
        
        # Check if password is empty (check length directly)
        if [ ${#DB_PASSWORD_INPUT} -eq 0 ]; then
            DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            print_success "Auto-generated secure password"
            break
        else
            # Confirm password
            echo -n "Confirm database password: "
            read -s DB_PASSWORD_CONFIRM
            echo ""
            
            if [ "$DB_PASSWORD_INPUT" = "$DB_PASSWORD_CONFIRM" ]; then
                DB_PASSWORD="$DB_PASSWORD_INPUT"
                print_success "Password confirmed"
                break
            else
                print_error "Passwords do not match. Please try again."
                print_status "Hint: Leave password empty to auto-generate a secure password"
            fi
        fi
    done
    
    # Prompt for authentication setup
    echo ""
    print_status "Setting up application security..."
    echo ""
    
    while true; do
        echo -n "Enable authentication for secure login? (y/N): "
        read -r AUTH_CHOICE
        
        # Handle empty input (Enter key) as default No
        case "${AUTH_CHOICE}" in
            "")
                AUTH_PASSWORD=""
                print_success "Authentication disabled - application runs without login"
                break
                ;;
            [Yy]|[Yy][Ee][Ss])
                AUTH_PASSWORD="YES"
                print_success "Authentication enabled - users will need to log in"
                print_status "You'll be able to create user accounts after installation"
                break
                ;;
            [Nn]|[Nn][Oo])
                AUTH_PASSWORD=""
                print_success "Authentication disabled - application runs without login"
                break
                ;;
            *)
                print_error "Please enter 'y' for yes, 'n' for no, or press Enter for default (no)"
                ;;
        esac
    done
    
    # Generate session secret
    SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    
    print_success "Security configuration complete"
    print_status "Database Username: $DB_USERNAME"
    print_status "Database Password: [hidden - will be saved to .env file]"
    print_status "Authentication: $([ -n "$AUTH_PASSWORD" ] && echo "Enabled" || echo "Disabled")"
    print_status "Session Secret: Auto-generated"
    echo ""

    # Setup database - handle existing database/user
    sudo -u postgres psql << EOF
-- Drop existing database and user if they exist to start fresh
DROP DATABASE IF EXISTS rosin_tracker;
DROP USER IF EXISTS $DB_USERNAME;

-- Create new database and user
CREATE DATABASE rosin_tracker;
CREATE USER $DB_USERNAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE rosin_tracker TO $DB_USERNAME;
ALTER DATABASE rosin_tracker OWNER TO $DB_USERNAME;

-- Grant additional permissions
\c rosin_tracker
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USERNAME;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USERNAME;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USERNAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USERNAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USERNAME;
\q
EOF

    print_success "Database created with user '$DB_USERNAME'"
else
    print_status "Updating installation - preserving existing database..."
    
    # Check if .env file exists to get existing credentials
    if [ -f ".env" ]; then
        print_status "Using existing environment configuration..."
        # Extract existing credentials from .env
        DB_USERNAME=$(grep "DATABASE_URL" .env | sed 's/.*:\/\/\([^:]*\):.*/\1/')
        DB_PASSWORD=$(grep "DATABASE_URL" .env | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
        SESSION_SECRET=$(grep "SESSION_SECRET" .env | cut -d'=' -f2)
        AUTH_PASSWORD=$(grep "^AUTH_PASSWORD=" .env | cut -d'=' -f2)
        
        if [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$SESSION_SECRET" ]; then
            print_warning "Could not extract existing credentials from .env file"
            print_status "Using default credentials..."
            DB_USERNAME=${DB_USERNAME:-rosin_user}
            DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)}
            SESSION_SECRET=${SESSION_SECRET:-$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)}
            # AUTH_PASSWORD defaults to empty if not found (preserves existing behavior)
        else
            print_success "Existing credentials found and preserved"
            print_status "Username: $DB_USERNAME"
            print_status "Authentication: $([ -n "$AUTH_PASSWORD" ] && echo "Enabled ($AUTH_PASSWORD)" || echo "Disabled")"
        fi
    else
        print_warning "No existing .env file found, using default credentials..."
        DB_USERNAME="rosin_user"
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
        AUTH_PASSWORD=""  # Default to disabled for updates without existing config
    fi
    
    # Only create database if it doesn't exist
    sudo -u postgres psql << EOF
-- Create database and user only if they don't exist
SELECT 'CREATE DATABASE rosin_tracker' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rosin_tracker')\gexec
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '$DB_USERNAME') THEN
      CREATE USER $DB_USERNAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE rosin_tracker TO $DB_USERNAME;
ALTER DATABASE rosin_tracker OWNER TO $DB_USERNAME;

-- Grant additional permissions
\c rosin_tracker
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USERNAME;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USERNAME;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USERNAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USERNAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USERNAME;
\q
EOF

    print_success "Database setup completed (existing data preserved)"
fi

# Create environment file
print_status "Creating environment configuration..."

# Create base .env file
cat > .env << 'ENVEOF'
# Database Configuration
# Session Security
# Application Settings
NODE_ENV=production
PORT=5000
# Authentication Settings
ENVEOF

# Add variables with proper substitution
echo "DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@localhost:5432/rosin_tracker" >> .env
echo "SESSION_SECRET=$SESSION_SECRET" >> .env

# Add authentication setting conditionally
if [ -n "$AUTH_PASSWORD" ]; then
    echo "AUTH_PASSWORD=YES  # Email-based authentication with 2FA support enabled" >> .env
else
    echo "# AUTH_PASSWORD=YES  # Set to \"YES\" to enable email-based authentication with 2FA support" >> .env
fi

print_success "Environment file created"

# Setup database based on install mode
print_status "Setting up database..."
# Source environment variables for database commands
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

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
    print_status "Creating database backup..."
    PGPASSWORD="$PGPASSWORD" pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" > "$BACKUP_FILE" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Database backed up to $BACKUP_FILE"
        
        # Count existing records before schema update
        BEFORE_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM rosin_presses;" 2>/dev/null | xargs || echo "0")
        print_status "Found $BEFORE_COUNT existing rosin press records"
        
        # Apply schema changes with Drizzle
        print_status "Applying schema updates..."
        npm run db:push
        
        # Verify data integrity after schema update
        AFTER_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM rosin_presses;" 2>/dev/null | xargs || echo "0")
        
        if [ "$AFTER_COUNT" = "$BEFORE_COUNT" ] && [ "$BEFORE_COUNT" != "0" ]; then
            print_success "Schema updated successfully - all $AFTER_COUNT records preserved"
            # Clean up backup since update was successful
            rm -f "$BACKUP_FILE" 2>/dev/null
        elif [ "$BEFORE_COUNT" = "0" ]; then
            print_success "Schema updated successfully - no existing data to preserve"
            rm -f "$BACKUP_FILE" 2>/dev/null
        else
            print_warning "Data count mismatch detected! Before: $BEFORE_COUNT, After: $AFTER_COUNT"
            print_status "Restoring database from backup..."
            PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" < "$BACKUP_FILE" 2>/dev/null
            
            # Verify restoration
            RESTORED_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM rosin_presses;" 2>/dev/null | xargs || echo "0")
            if [ "$RESTORED_COUNT" = "$BEFORE_COUNT" ]; then
                print_success "Database restored successfully from backup"
                print_warning "Schema update skipped due to data integrity concerns"
                print_status "Backup retained at: $BACKUP_FILE"
            else
                print_error "Database restoration failed! Manual recovery may be needed."
                print_error "Backup file location: $BACKUP_FILE"
                exit 1
            fi
        fi
    else
        print_warning "Could not create backup - skipping schema updates for safety"
        print_success "Update complete - no schema changes applied"
    fi
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
echo "2. Optional: Enable authentication by setting AUTH_PASSWORD=YES in .env"
echo "   - Creates secure email-based login with 2FA support"
echo "   - Includes QR code setup for authenticator apps"
echo "   - Features comprehensive user management and security"
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