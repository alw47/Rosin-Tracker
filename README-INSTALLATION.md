# Rosin Tracker - Installation Guide

## Quick Installation (Recommended)

For a hassle-free installation without interactive prompts:

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

### Installation Options

**Basic Installation (No Authentication):**
```bash
./install-simple.sh --fresh
```
- Creates fresh database
- No login required
- Ready to use immediately

**Secure Installation (With Authentication):**
```bash
./install-simple.sh --fresh --auth
```
- Creates fresh database
- Enables email-based authentication with 2FA
- You'll create user accounts after installation

**Update Existing Installation:**
```bash
./install-simple.sh
```
- Preserves existing data
- Updates application safely

## What Gets Installed

- ✅ PostgreSQL database with auto-generated secure credentials
- ✅ Node.js application with all dependencies
- ✅ Systemd service for automatic startup
- ✅ UFW firewall configuration
- ✅ Complete environment setup

## Post-Installation

### Access Your Application
- **URL**: `http://localhost:5000`
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
If you installed without authentication, you can enable it later:

1. Edit `.env` file:
   ```bash
   AUTH_PASSWORD=YES
   ```
2. Restart the service:
   ```bash
   sudo systemctl restart rosin-tracker
   ```

## Troubleshooting

### Port Already in Use
If port 5000 is occupied:
```bash
# Check what's using the port
sudo lsof -i :5000

# Stop the service and restart
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

### View Detailed Logs
```bash
# Application logs
sudo journalctl -u rosin-tracker -f

# PostgreSQL logs
sudo journalctl -u postgresql -f
```

## Security Notes

- Database credentials are auto-generated and stored in `.env`
- Session secrets are cryptographically secure
- UFW firewall is configured for port 5000
- For external access, consider setting up SSL/TLS with nginx

## Manual Installation

If you prefer the original interactive installer (with prompts):
```bash
./install.sh --fresh
```

The simple installer eliminates all interactive prompts and uses secure defaults, making it much more reliable for automated deployments.