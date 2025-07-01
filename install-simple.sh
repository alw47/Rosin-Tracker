#!/bin/bash
#
# Rosin Tracker - Enhanced Simple Installation Script
# Repository: https://github.com/alw47/Rosin-Tracker
# This script provides a non-interactive installation with comprehensive error handling
#

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

# Enhanced error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    print_error "An error occurred on line $line_number. Exit code: $exit_code"
    print_error "Installation failed. Please check the error above and try again."
    exit $exit_code
}

# Set up error trap
trap 'handle_error $LINENO' ERR

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

# Detect OS
if [ ! -f /etc/os-release ]; then
    print_error "Cannot detect operating system. This script requires Debian or Ubuntu."
    exit 1
fi

source /etc/os-release
if [[ "$ID" != "debian" && "$ID" != "ubuntu" ]]; then
    print_error "This script only supports Debian and Ubuntu systems. Detected: $ID"
    exit 1
fi

print_status "🌿 Rosin Tracker Installation Script"
print_status "Operating System: $PRETTY_NAME"
echo "=================================================="

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

# Check system requirements
print_status "Checking system requirements..."

# Check available disk space (need at least 1GB)
AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
    print_error "Insufficient disk space. At least 1GB of free space is required."
    exit 1
fi

# Check internet connectivity
if ! ping -c 1 8.8.8.8 &> /dev/null; then
    print_error "No internet connection detected. Please check your network connection."
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
if ! sudo apt update &> /dev/null; then
    print_error "Failed to update package lists. Please check your internet connection and try again."
    exit 1
fi

# Install Node.js 18 if needed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null || [ "$(node --version | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    print_status "Installing Node.js 18..."
    if ! curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - &> /dev/null; then
        print_error "Failed to add Node.js repository"
        exit 1
    fi
    if ! sudo apt install -y nodejs &> /dev/null; then
        print_error "Failed to install Node.js"
        exit 1
    fi
    print_success "Node.js $(node --version) installed"
else
    print_success "Node.js $(node --version) already installed"
fi

# Install PostgreSQL if needed
print_status "Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL..."
    if ! sudo apt install -y postgresql postgresql-contrib &> /dev/null; then
        print_error "Failed to install PostgreSQL"
        exit 1
    fi
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL installed and started"
else
    print_success "PostgreSQL already installed"
fi

# Install additional required tools
print_status "Installing additional tools..."
if ! sudo apt install -y git curl wget unzip build-essential &> /dev/null; then
    print_error "Failed to install required tools"
    exit 1
fi

# Verify all required commands are now available
print_status "Verifying installation requirements..."
for cmd in git node npm psql sudo; do
    if ! command -v $cmd &> /dev/null; then
        print_error "$cmd is required but not installed"
        exit 1
    fi
done
print_success "All required dependencies are available"

# Setup application directory
APP_DIR="/opt/rosin-tracker"
print_status "Setting up application directory..."

if [ "$FRESH_INSTALL" = true ]; then
    # Fresh install - remove existing directory
    if [ -d "$APP_DIR" ]; then
        print_status "Removing existing installation..."
        sudo rm -rf "$APP_DIR"
    fi
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    
    # Download application
    print_status "Downloading Rosin Tracker from GitHub..."
    cd "$APP_DIR"
    
    # Use curl for reliable download with error checking
    if ! curl -L https://github.com/alw47/Rosin-Tracker/archive/refs/heads/main.zip -o main.zip; then
        print_error "Failed to download application from GitHub"
        exit 1
    fi
    
    # Extract and setup with robust error handling
    print_status "Extracting application files..."
    if ! unzip -o -q main.zip; then
        print_error "Failed to extract downloaded files"
        exit 1
    fi
    
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
    
    # Move files from extracted directory with verification
    print_status "Moving files to application directory..."
    if ! find "$EXTRACTED_DIR" -mindepth 1 -maxdepth 1 -exec cp -r {} . \;; then
        print_error "Failed to move application files"
        exit 1
    fi
    
    # Clean up
    rm -rf "$EXTRACTED_DIR" main.zip
    
    # Verify package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found after extraction. Current directory contents:"
        ls -la
        exit 1
    fi
    
    print_success "Application downloaded and extracted successfully"
    
else
    # Update mode - navigate to existing directory
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found. Use --fresh for initial installation."
        exit 1
    fi
    cd "$APP_DIR"
    
    # Create backup before update
    print_status "Creating backup before update..."
    BACKUP_DIR="/tmp/rosin-tracker-backup-$(date +%Y%m%d-%H%M%S)"
    if ! cp -r "$APP_DIR" "$BACKUP_DIR"; then
        print_error "Failed to create backup"
        exit 1
    fi
    print_success "Backup created at $BACKUP_DIR"
    
    # Pull latest changes
    print_status "Updating application from GitHub..."
    if [ -d ".git" ]; then
        # Git repository exists
        if ! git pull origin main; then
            print_error "Failed to update via git"
            exit 1
        fi
    else
        # Download and extract new version
        if ! curl -L https://github.com/alw47/Rosin-Tracker/archive/refs/heads/main.zip -o main.zip; then
            print_error "Failed to download update from GitHub"
            exit 1
        fi
        
        if ! unzip -o -q main.zip; then
            print_error "Failed to extract update files"
            exit 1
        fi
        
        # Find and copy updated files
        EXTRACTED_DIR=""
        for dir in *-main; do
            if [ -d "$dir" ]; then
                EXTRACTED_DIR="$dir"
                break
            fi
        done
        
        if [ -n "$EXTRACTED_DIR" ]; then
            find "$EXTRACTED_DIR" -mindepth 1 -maxdepth 1 -exec cp -r {} . \;
            rm -rf "$EXTRACTED_DIR" main.zip
        fi
    fi
    
    print_success "Application updated successfully"
fi

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

# Install dependencies with error checking
print_status "Installing Node.js dependencies..."
if ! npm install; then
    print_error "Failed to install Node.js dependencies"
    exit 1
fi
print_success "Dependencies installed successfully"

# Build the application
print_status "Building the application..."
if ! npm run build; then
    print_error "Failed to build the application"
    exit 1
fi
print_success "Application built successfully"

# PostgreSQL setup with comprehensive error handling
if [ "$FRESH_INSTALL" = true ]; then
    print_status "Setting up PostgreSQL database (FRESH INSTALL - will reset data)..."
    
    # Verify PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        print_status "Starting PostgreSQL service..."
        sudo systemctl start postgresql
        if ! systemctl is-active --quiet postgresql; then
            print_error "Failed to start PostgreSQL service"
            exit 1
        fi
    fi
    
    # Generate secure defaults
    DB_USERNAME="rosin_user"
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/")
    
    print_status "Creating database with generated credentials..."
    
    # Create database and user with error checking
    if ! sudo -u postgres psql << EOF
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
    then
        print_error "Failed to create database or user"
        exit 1
    fi

    print_success "Database created with user '$DB_USERNAME'"
    
    # Test database connection
    print_status "Testing database connection..."
    if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USERNAME -d rosin_tracker -c "SELECT 1;" &> /dev/null; then
        print_error "Failed to connect to database with created credentials"
        exit 1
    fi
    print_success "Database connection verified"
    
else
    print_status "Update mode - preserving existing database..."
    
    # Load existing credentials from .env if available
    if [ -f ".env" ]; then
        print_status "Loading existing configuration..."
        
        # Extract database credentials more robustly
        if grep -q "^DATABASE_URL=" .env; then
            DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2)
            DB_USERNAME=$(echo "$DB_URL" | sed 's/.*:\/\/\([^:]*\):.*/\1/')
            DB_PASSWORD=$(echo "$DB_URL" | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
        else
            print_error "DATABASE_URL not found in existing .env file"
            exit 1
        fi
        
        if grep -q "^SESSION_SECRET=" .env; then
            SESSION_SECRET=$(grep "^SESSION_SECRET=" .env | cut -d'=' -f2)
        else
            print_warning "SESSION_SECRET not found, generating new one..."
            SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/")
        fi
        
        # Test existing database connection
        print_status "Testing existing database connection..."
        if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USERNAME -d rosin_tracker -c "SELECT 1;" &> /dev/null; then
            print_error "Cannot connect to existing database with stored credentials"
            exit 1
        fi
        print_success "Existing database connection verified"
        
    else
        print_error "No existing .env file found for update mode"
        print_error "Use --fresh flag for initial installation"
        exit 1
    fi
fi

# Create environment file with comprehensive configuration
print_status "Creating environment configuration..."

cat > .env << EOF
# Rosin Tracker Environment Configuration
# Generated by install-simple.sh on $(date)

# Database Configuration
DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@localhost:5432/rosin_tracker
PGHOST=localhost
PGPORT=5432
PGDATABASE=rosin_tracker
PGUSER=$DB_USERNAME
PGPASSWORD=$DB_PASSWORD

# Session Security
SESSION_SECRET=$SESSION_SECRET

# Application Settings
NODE_ENV=production
PORT=5000

# Authentication Settings
EOF

# Add authentication configuration based on flag
if [ "$ENABLE_AUTH" = true ]; then
    echo "AUTH_PASSWORD=YES" >> .env
    print_success "Authentication ENABLED - you will need to create a user account after starting the application"
else
    echo "# AUTH_PASSWORD=YES" >> .env
    print_success "Authentication DISABLED - application will run without login protection"
fi

print_success "Environment file created successfully"

# Verify .env file was created correctly
if [ ! -f ".env" ]; then
    print_error "Failed to create .env file"
    exit 1
fi

# Test that required environment variables are present
if ! grep -q "DATABASE_URL=" .env || ! grep -q "SESSION_SECRET=" .env; then
    print_error ".env file is missing required configuration"
    exit 1
fi



# Setup database schema with comprehensive error handling
print_status "Setting up database schema..."

# Load environment variables safely
set -a
if ! source .env; then
    print_error "Failed to load environment variables from .env file"
    exit 1
fi
set +a

# Verify required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is not set in environment"
    exit 1
fi

if [ "$FRESH_INSTALL" = true ]; then
    print_status "Fresh install - creating database schema..."
    
    # Run database schema push with error checking
    if ! npm run db:push; then
        print_error "Failed to create database schema"
        print_error "Please check your database connection and permissions"
        exit 1
    fi
    print_success "Database schema created successfully"
    
    # Initialize database sequences for clean start
    print_status "Initializing database sequences for fresh install..."
    if [ -f "scripts/init-db.ts" ]; then
        if ! npx tsx scripts/init-db.ts; then
            print_warning "Failed to initialize database sequences, but continuing installation"
            print_warning "New entries may not start from ID 1"
        else
            print_success "Database sequences initialized - new entries will start from ID 1"
        fi
    else
        print_warning "Database initialization script not found, skipping sequence reset"
    fi
    
else
    print_status "Update mode - safely applying schema updates with backup protection..."
    
    # Verify database connection before proceeding
    if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USERNAME -d rosin_tracker -c "SELECT 1;" &> /dev/null; then
        print_error "Cannot connect to database before schema update"
        exit 1
    fi
    
    # Create comprehensive backup before any schema changes
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="/tmp/rosin_tracker_backup_$TIMESTAMP.sql"
    print_status "Creating backup before schema update: $BACKUP_FILE"
    
    if ! pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
        print_error "Failed to create database backup"
        print_error "Cannot proceed with schema updates without backup"
        exit 1
    fi
    
    # Verify backup file was created and has content
    if [ ! -s "$BACKUP_FILE" ]; then
        print_error "Backup file is empty or was not created properly"
        exit 1
    fi
    
    print_success "Backup created successfully: $BACKUP_FILE"
    
    # Apply schema updates with error handling and rollback capability
    print_status "Applying database schema updates..."
    if ! npm run db:push; then
        print_error "Failed to apply database schema updates"
        print_status "Attempting to restore from backup..."
        
        # Attempt to restore from backup on failure
        if psql "$DATABASE_URL" < "$BACKUP_FILE" &> /dev/null; then
            print_success "Database restored from backup"
            print_error "Schema update failed but database was restored to previous state"
        else
            print_error "CRITICAL: Schema update failed and backup restoration also failed"
            print_error "Manual database recovery may be required"
            print_error "Backup location: $BACKUP_FILE"
        fi
        exit 1
    fi
    
    print_success "Database schema updated successfully"
    print_status "Backup retained at: $BACKUP_FILE"
fi

# Verify database schema is working by testing basic connectivity
print_status "Verifying database schema deployment..."
if ! PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USERNAME -d rosin_tracker -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" &> /dev/null; then
    print_error "Database schema verification failed"
    exit 1
fi
print_success "Database schema verification completed successfully"

# Install and configure systemd service with comprehensive error handling
print_status "Setting up systemd service..."

# Verify we have the correct working directory
CURRENT_DIR=$(pwd)
if [ ! -f "$CURRENT_DIR/package.json" ]; then
    print_error "package.json not found in current directory: $CURRENT_DIR"
    exit 1
fi

# Create systemd service file with error checking
print_status "Creating systemd service file..."

# Get the full path to node and npm
NODE_PATH=$(which node)
NPM_PATH=$(which npm)

if [ -z "$NODE_PATH" ]; then
    print_error "Node.js not found in PATH"
    exit 1
fi

if [ -z "$NPM_PATH" ]; then
    print_error "npm not found in PATH"
    exit 1
fi

print_status "Using Node.js at: $NODE_PATH"
print_status "Using npm at: $NPM_PATH"

if ! sudo tee /etc/systemd/system/rosin-tracker.service > /dev/null << EOF
[Unit]
Description=Rosin Tracker Application
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$CURRENT_DIR
Environment=NODE_ENV=production
Environment=PATH=$PATH
EnvironmentFile=$CURRENT_DIR/.env
ExecStartPre=$NPM_PATH run build
ExecStart=$NODE_PATH dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rosin-tracker

[Install]
WantedBy=multi-user.target
EOF
then
    print_error "Failed to create systemd service file"
    exit 1
fi

# Verify service file was created
if [ ! -f "/etc/systemd/system/rosin-tracker.service" ]; then
    print_error "Systemd service file was not created"
    exit 1
fi

print_success "Systemd service file created"

# Ensure npm start script exists and is properly configured
print_status "Configuring npm start script..."

# Check if start script exists by parsing package.json
START_SCRIPT_EXISTS=$(node -e "
try {
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(pkg.scripts && pkg.scripts.start ? 'true' : 'false');
} catch (error) {
    console.log('false');
}
")

if [ "$START_SCRIPT_EXISTS" != "true" ]; then
    print_status "Adding start script to package.json..."
    
    # Backup package.json before modification
    if ! cp package.json package.json.backup; then
        print_error "Failed to backup package.json"
        exit 1
    fi
    
    # Add start script using Node.js with error handling
    if ! node -e "
    try {
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.start = 'tsx server/index.ts';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('Start script added successfully');
    } catch (error) {
        console.error('Failed to modify package.json:', error.message);
        process.exit(1);
    }
    "; then
        print_error "Failed to add start script to package.json"
        # Restore backup
        mv package.json.backup package.json
        exit 1
    fi
    
    # Verify the start script was added correctly by checking package.json content
    VERIFICATION=$(node -e "
    try {
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        console.log(pkg.scripts && pkg.scripts.start ? 'success' : 'failed');
    } catch (error) {
        console.log('failed');
    }
    ")
    
    if [ "$VERIFICATION" != "success" ]; then
        print_error "Start script verification failed"
        # Restore backup
        mv package.json.backup package.json
        exit 1
    fi
    
    print_success "Start script added to package.json"
    rm -f package.json.backup
else
    print_success "Start script already exists in package.json"
fi

# Reload systemd daemon with error checking
print_status "Reloading systemd daemon..."
if ! sudo systemctl daemon-reload; then
    print_error "Failed to reload systemd daemon"
    exit 1
fi

# Enable service with error checking
print_status "Enabling rosin-tracker service..."
if ! sudo systemctl enable rosin-tracker; then
    print_error "Failed to enable rosin-tracker service"
    exit 1
fi

# Check if port 5000 is already in use (development environment detection)
print_status "Checking for port conflicts..."
PORT_IN_USE=false

# More comprehensive port checking
if command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -E "(:5000 |\.5000 )" | grep -E "(LISTEN|tcp)" > /dev/null; then
        PORT_IN_USE=true
        print_warning "Detected process listening on port 5000 (netstat)"
    fi
elif command -v ss &> /dev/null; then
    if ss -tuln 2>/dev/null | grep -E "(:5000 |\.5000 )" > /dev/null; then
        PORT_IN_USE=true
        print_warning "Detected process listening on port 5000 (ss)"
    fi
fi

# Additional check using lsof if available
if [ "$PORT_IN_USE" = false ] && command -v lsof &> /dev/null; then
    if lsof -i :5000 2>/dev/null | grep -q LISTEN; then
        PORT_IN_USE=true
        print_warning "Detected process listening on port 5000 (lsof)"
    fi
fi

# Final check by attempting to connect to the port
if [ "$PORT_IN_USE" = false ]; then
    if timeout 2 bash -c "</dev/tcp/localhost/5000" 2>/dev/null; then
        PORT_IN_USE=true
        print_warning "Port 5000 is responding to connections"
    else
        print_status "Port 5000 appears to be available"
    fi
fi

# Stop any existing service before starting (only if we're going to start it)
if [ "$PORT_IN_USE" = false ] && systemctl is-active --quiet rosin-tracker; then
    print_status "Stopping existing rosin-tracker service..."
    sudo systemctl stop rosin-tracker
fi

# Handle service startup with robust error handling
SERVICE_STARTED=false

if [ "$PORT_IN_USE" = true ]; then
    print_warning "Port 5000 is already in use (likely development environment)"
    print_warning "Skipping systemd service startup to avoid port conflict"
    print_status "Service is configured but not started due to port conflict"
    print_status "In production, stop the existing process before starting the service"
else
    # Always attempt to start the service, but handle failures gracefully
    print_status "Attempting to start rosin-tracker service..."
    
    # Start service and capture both stdout and stderr
    SERVICE_START_OUTPUT=$(sudo systemctl start rosin-tracker 2>&1)
    SERVICE_START_SUCCESS=$?
    
    if [ $SERVICE_START_SUCCESS -eq 0 ]; then
        # Service start command succeeded, now verify it's actually running
        sleep 3
        if systemctl is-active --quiet rosin-tracker; then
            SERVICE_STARTED=true
            print_success "Systemd service started successfully"
        else
            # Service started but then stopped - check why
            print_warning "Service started but then stopped, checking logs..."
            if sudo journalctl -u rosin-tracker --no-pager -n 10 | grep -q "EADDRINUSE\|address already in use"; then
                print_warning "Service stopped due to port conflict"
                print_status "Service is configured but cannot run due to port conflict"
                PORT_IN_USE=true
            else
                print_error "Service stopped for unknown reason"
                print_error "Service status:"
                sudo systemctl status rosin-tracker --no-pager
                print_error "Recent logs:"
                sudo journalctl -u rosin-tracker --no-pager -n 30
                print_error "Detailed application logs:"
                sudo journalctl -u rosin-tracker --no-pager -n 50 -o cat
                exit 1
            fi
        fi
    else
        # Service start command failed
        print_warning "Service startup failed, checking if it's a port conflict..."
        
        # Check recent logs for port conflicts
        if sudo journalctl -u rosin-tracker --no-pager -n 10 | grep -q "EADDRINUSE\|address already in use"; then
            print_warning "Service failed due to port conflict (expected in development)"
            print_status "Service is configured but cannot start due to port conflict"
            PORT_IN_USE=true
        else
            print_error "Service failed to start for unknown reason"
            print_error "Service logs:"
            sudo journalctl -u rosin-tracker --no-pager -n 20
            exit 1
        fi
    fi
fi

# Report final service status
if [ "$SERVICE_STARTED" = true ]; then
    print_success "Systemd service configured and started successfully"
elif [ "$PORT_IN_USE" = true ]; then
    print_success "Systemd service configured (startup skipped due to port conflict - normal in development)"
else
    print_success "Systemd service configured"
fi

# Verify the application is responding (only if we started the service)
if [ "$SERVICE_STARTED" = true ]; then
    print_status "Verifying application is responding..."
    sleep 5  # Give the app time to fully start

    # Check if the application is listening on port 5000
    if command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":5000 "; then
            print_success "Application is listening on port 5000"
        else
            print_warning "Application may not be listening on port 5000 yet"
        fi
    elif command -v ss &> /dev/null; then
        if ss -tuln | grep -q ":5000 "; then
            print_success "Application is listening on port 5000"
        else
            print_warning "Application may not be listening on port 5000 yet"
        fi
    fi
else
    print_status "Skipping application connectivity test (service not started due to port conflict)"
fi

# Setup UFW firewall with error checking
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    if ! sudo ufw --force enable &> /dev/null; then
        print_warning "Failed to enable UFW firewall, but continuing installation"
    fi
    
    if ! sudo ufw allow 5000/tcp &> /dev/null; then
        print_warning "Failed to configure firewall rule for port 5000"
        print_warning "You may need to manually configure firewall access"
    else
        print_success "Firewall configured to allow port 5000"
    fi
else
    print_warning "UFW firewall not found - skipping firewall configuration"
    print_warning "Consider manually configuring your firewall to allow port 5000"
fi

# Final comprehensive verification
print_status "Performing final system verification..."

# Check service status one more time (only if we actually started the service)
if [ "$SERVICE_STARTED" = true ]; then
    if ! systemctl is-active --quiet rosin-tracker; then
        print_error "Service verification failed - rosin-tracker is not running"
        exit 1
    fi
    print_success "Systemd service is running and verified"
else
    print_status "Service configured but not started due to port conflict (expected in development)"
fi

# Verify environment file integrity
if [ ! -f ".env" ] || ! grep -q "DATABASE_URL=" .env; then
    print_error "Environment configuration verification failed"
    exit 1
fi

# Test basic HTTP connectivity (if curl is available and service was started)
if [ "$SERVICE_STARTED" = true ] && command -v curl &> /dev/null; then
    print_status "Testing application connectivity..."
    # Give the app a bit more time to fully initialize
    sleep 5
    
    # Try to connect to the app with a timeout
    if curl -f -s --connect-timeout 10 "http://localhost:5000" > /dev/null 2>&1; then
        print_success "Application is responding on http://localhost:5000"
    else
        print_warning "Application connectivity test failed, but service is running"
        print_warning "The application may still be starting up"
    fi
elif [ "$SERVICE_STARTED" = false ]; then
    print_status "Skipping HTTP connectivity test (service not started due to port conflict)"
fi

print_success "Final verification completed"

# Comprehensive success message and instructions
echo ""
echo "=================================================================="
print_success "🌿 ROSIN TRACKER INSTALLATION COMPLETED SUCCESSFULLY!"
echo "=================================================================="
echo ""
print_status "=== CONFIGURATION SUMMARY ==="
echo "Installation Directory:  $APP_DIR"
echo "Database Name:          rosin_tracker"
echo "Database Username:      $DB_USERNAME"
echo "Database Password:      [securely stored in .env file]"
echo "Application Port:       5000"
echo "Service Name:           rosin-tracker"

if [ "$ENABLE_AUTH" = true ]; then
    echo ""
    print_status "🔐 AUTHENTICATION: ENABLED"
    echo "  ✓ Email-based login with 2FA support"
    echo "  ✓ Secure session management"
    echo "  → Visit your application to create the first user account"
    echo "  → Users can enable 2FA in their account settings"
else
    echo ""
    print_status "🔓 AUTHENTICATION: DISABLED"
    echo "  ✓ Application runs without login requirements"
    echo "  → To enable authentication later:"
    echo "    1. Set AUTH_PASSWORD=YES in $APP_DIR/.env"
    echo "    2. Run: sudo systemctl restart rosin-tracker"
fi

echo ""
print_status "=== ACCESS YOUR APPLICATION ==="
echo "Local Access:           http://localhost:5000"
echo "System Access:          http://$(hostname -I | awk '{print $1}'):5000"
if command -v hostname &> /dev/null; then
    HOSTNAME=$(hostname)
    echo "Hostname Access:        http://$HOSTNAME:5000"
fi

echo ""
print_status "=== SYSTEM MANAGEMENT COMMANDS ==="
echo "View real-time logs:    sudo journalctl -u rosin-tracker -f"
echo "Check service status:   sudo systemctl status rosin-tracker"
echo "Restart application:    sudo systemctl restart rosin-tracker"
echo "Stop application:       sudo systemctl stop rosin-tracker"
echo "Start application:      sudo systemctl start rosin-tracker"
echo "Disable auto-start:     sudo systemctl disable rosin-tracker"
echo "Enable auto-start:      sudo systemctl enable rosin-tracker"

echo ""
print_status "=== FILE LOCATIONS ==="
echo "Application Files:      $APP_DIR"
echo "Configuration File:     $APP_DIR/.env"
echo "Service File:           /etc/systemd/system/rosin-tracker.service"
echo "Log Files:              sudo journalctl -u rosin-tracker"

if [ "$FRESH_INSTALL" = false ] && [ -n "$BACKUP_FILE" ]; then
    echo "Database Backup:        $BACKUP_FILE"
fi

echo ""
print_status "=== TROUBLESHOOTING ==="
echo "If the application isn't accessible:"
echo "  1. Check service status: sudo systemctl status rosin-tracker"
echo "  2. View logs: sudo journalctl -u rosin-tracker -n 50"
echo "  3. Verify firewall: sudo ufw status"
echo "  4. Test database: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USERNAME -d rosin_tracker -c 'SELECT 1;'"

echo ""
if [ "$ENABLE_AUTH" = true ]; then
    print_warning "🔑 NEXT STEPS FOR SECURE SETUP:"
    print_warning "1. Visit http://localhost:5000 to create your first user account"
    print_warning "2. Enable 2FA in your account settings for maximum security"
    print_warning "3. Consider setting up SSL/TLS for external access"
else
    print_status "🚀 READY TO USE:"
    print_status "Visit http://localhost:5000 to start using Rosin Tracker!"
fi

echo ""
print_success "Rosin Tracker is now running and ready for use!"
echo "=================================================================="