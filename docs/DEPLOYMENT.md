# OverSight Deployment Guide

Complete deployment guide for the OverSight monitoring system covering all components: database, server, and monitoring scripts.

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.9+** and Poetry (for monitoring scripts)
- **Ubuntu Server 24.04** (recommended for database)
- **OpenSSL** (for certificate generation)

## Quick Start

```bash
# 1. Generate authentication tokens
make generate-all-tokens

# 2. Generate SSL certificates
make setup-ssl

# 3. Configure components (copy tokens from step 1 output)
# 4. Deploy
make install && make build && make start
```

## Component Deployment

### 1. Database Setup (MongoDB)

#### Prerequisites
**Ubuntu Server** (v24.04): [ubuntu.com](https://ubuntu.com/download/server)

#### Installation

1. **Install gnupg and curl**  
   ```
   sudo apt-get install gnupg curl
   ```
2. **Import the public key**  
   ```
   curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
      sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
      --dearmor
   ```
3. **Create the list file for Ubuntu 24.04 (Noble)**  
   ```
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
   ```
4. **Reload the package database**  
   ```
   sudo apt-get update
   ```  
5. **Install MongoDB Community Server**  
   ```
   sudo apt-get install -y mongodb-org
   ```  
6. **Setup MongoDB to run as a service**  
   ```
   sudo systemctl enable mongod.service
   ```  
7. **Start MongoDB and verify it is running** 
   ```
   sudo systemctl start mongod.service
   sudo systemctl status mongod.service
   ```
##### Authentication Setup
1. **Stop MongoDB**
   ```
   sudo systemctl stop mongod.service
   ```
2. **Edit the MongoDB config**
   ```
   sudo nano /etc/mongod.conf
   ```
   Replace *#security* and *#replication* with
   ```
   security:
     authorization: enabled
     keyFile: /etc/mongodb/keyfile

   replication:
      replSetName: "rs0"
   ```
   Optional: Add a local ip to allow network access
   ```
   bindIp: 127.0.0.1, XX.XX.XX.XX
   ```
   Save and exit
3. **Generate the keyfile and set its permissions**
   ```
   sudo mkdir /etc/mongodb
   sudo openssl rand -base64 756 | sudo tee /etc/mongodb/keyfile
   sudo chown mongodb:mongodb /etc/mongodb/keyfile
   sudo chmod 400 /etc/mongodb/keyfile
   ```
4. **Restart MongoDB and verify it is running** 
   ```
   sudo systemctl start mongod.service
   sudo systemctl status mongod.service
   ```
5. **Connect to MongoDB with mongosh**
   ```
   mongosh --port 27017
   ```
6. **Initiate the replica set**
   ```
   rs.initiate()
   rs.status()
   ```
7. **Switch to the admin database**
   ```
   use admin
   ```
8. **Create the admin and application users**  
   Create the admin user user
   ```
   db.createUser(
      {
      user: "DBAdmin",
      pwd: passwordPrompt(), // or cleartext password
      roles: [
         { role: "root", db: "admin" }
      ]
      }
   )
   ```
   Login as the admin user
   ```
   db.auth("DBAdmin", passwordPrompt())
   ```
   Create the application user
   ```
   db.createUser(
      {
      user: "OverSight",
      pwd: passwordPrompt(), // or cleartext password
      roles: [
         { role: "dbAdmin", db: "oversight" },
         { role: "readWrite", db: "oversight" },
         { role: "dbAdmin", db: "test" },
         { role: "readWrite", db: "test" }
      ]
      }
   )
   ```
9. **Exit mongosh and stop MongoDB**
   ```
   .exit
   ```
10. **The connection strings will now be**  
   ```mongodb://DBAdmin:ADMIN_PASSOWRD@localhost:27017/```  
   ```mongodb://OverSight:APPLICATION_PASSOWRD@localhost:27017/```  

### 2. Authentication Token Generation

Generate secure tokens for WebSocket and NextAuth authentication:

```bash
# Generate all required tokens
make generate-all-tokens

# This creates:
# - WebSocket bearer token (256-bit entropy)
# - NextAuth secret for session encryption (256-bit entropy)
```

Save both tokens from the output for the next steps.

### 3. SSL Certificate Setup

Generate self-signed certificates for HTTPS/WSS encryption:

```bash
# Generate certificates automatically
make setup-ssl

# Follow prompts for hostname/IP
# Certificates are created in ssl/ directory
```

The script will show you the exact paths to add to your environment configuration.

### 4. Server Configuration

#### Install Dependencies

```bash
make install
```

OR

```bash
cd Server
npm install
```

#### Environment Configuration

Create environment file:

```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/
NODE_ENV=production

# NextAuth Configuration (from make generate-all-tokens)
NEXTAUTH_SECRET=your_generated_nextauth_secret_here
NEXTAUTH_URL=https://your-hostname

# Server Configuration
HOSTNAME=your-hostname
# PORT=443                     # Production HTTPS (default, can be omitted)
# PORT=80                      # Production HTTP (if USE_HTTPS=false)
# PORT=3000                    # Development/custom port

# SSL Configuration (from make setup-ssl)
USE_HTTPS=true
SSL_KEY_PATH=/absolute/path/to/OverSight-ITC303/ssl/key.pem
SSL_CERT_PATH=/absolute/path/to/OverSight-ITC303/ssl/cert.pem

# WebSocket Security (from make generate-all-tokens)
WS_BEARER_TOKEN=your_generated_websocket_token_here
```

#### Database Seeding

Seed the database with template users and initial data:

```bash
# Build the application first
npm run build

# Start the server
npm run start

# In another terminal, seed the database
curl -X POST https://your-hostname/api/seed -k

# Verify seeding worked
curl https://your-hostname/api/seed -k
```

**Template Users Created:**
- **Admin**: admin@gmail.com / admin123
- **Standard**: standard@gmail.com / standard123

### 5. Monitoring Script Configuration

#### Install Dependencies
**Ensure you have installed poetry on your machine** https://python-poetry.org/

```bash
cd MonitoringScript
poetry install
```

#### Configuration

Create configuration file:

```bash
cp config.example.json config.json
```

Edit `config.json` with your WebSocket token:

```json
{
    "uri": "wss://your-hostname/api/ws/monitoring",
    "connection_attempts": 20,
    "ping_interval": 20,
    "ping_timeout": 20,
    "bearer_token": "your_generated_websocket_token_here"
}
```

**Configuration Fields:**
- `uri` - WebSocket server URL (use `wss://` for secure connection)
- `connection_attempts` - Number of reconnection attempts
- `ping_interval` - WebSocket ping interval in seconds
- `ping_timeout` - WebSocket ping timeout in seconds
- `bearer_token` - Authentication token (from `make generate-all-tokens`)

#### Run Monitoring Script

```bash
# Start monitoring
poetry run python oversight_monitoring/monitoring_script.py

# Or using the Makefile from project root
make run-monitor
```

## Production Deployment

### Build and Start

```bash
# From project root
make build    # Build server application
make start    # Start production server

# Start monitoring on the remote machine
cd MonitoringScript && poetry run python -m oversight_monitoring.monitoring_script
```

### Verification

**Server logs should show:**
```
🔧 Server Configuration:
   HTTPS Enabled: true
   WebSocket Authentication: Enabled
🔒 HTTPS server created with SSL certificates
▲ Ready on https://your-hostname:443
✅ New authenticated monitoring client connected
```

**Monitoring script logs should show:**
```
Configuration file successfully loaded.
Attempting to connect to server at URI wss://your-hostname/api/ws/monitoring...
Connection to server at URI wss://your-hostname/api/ws/monitoring successful.
Message Received: Connected
```

**Web Dashboard:**
- Navigate to `https://your-hostname`
- Accept browser security warning for self-signed certificate
- Login with template credentials
- Verify live metrics are appearing

## Environment-Specific Configurations

### Development

```bash
# Server/.env.local
NODE_ENV=development
USE_HTTPS=true
SSL_KEY_PATH=/path/to/dev/ssl/key.pem
SSL_CERT_PATH=/path/to/dev/ssl/cert.pem
MONGODB_URI=mongodb://localhost:27017/
WS_BEARER_TOKEN=dev_websocket_token...
NEXTAUTH_SECRET=dev_nextauth_secret...
NEXTAUTH_URL=https://localhost

# MonitoringScript/config.json
{
    "uri": "wss://localhost/api/ws/monitoring",
    "connection_attempts": 20,
    "ping_interval": 20,
    "ping_timeout": 20,
    "bearer_token": "dev_websocket_token..."
}
```

### Production

```bash
# Server/.env.local
NODE_ENV=production
USE_HTTPS=true
SSL_KEY_PATH=/etc/ssl/private/oversight/key.pem
SSL_CERT_PATH=/etc/ssl/certs/oversight/cert.pem
MONGODB_URI=mongodb://OverSight:prod_password@localhost:27017/
WS_BEARER_TOKEN=prod_websocket_token...
NEXTAUTH_SECRET=prod_nextauth_secret...
NEXTAUTH_URL=https://monitor.yourdomain.com

# MonitoringScript/config.json
{
    "uri": "wss://your-domain.com/api/ws/monitoring",
    "connection_attempts": 20,
    "ping_interval": 20,
    "ping_timeout": 20,
    "bearer_token": "prod_websocket_token..."
}
```

## Troubleshooting

### Common Issues

#### 1. "Configuration file not found"

**Error:** `ERROR: Configuration file 'config.json' not found.`

**Solution:**
```bash
cd MonitoringScript
cp config.example.json config.json
# Edit config.json with your settings
```

#### 2. "Missing required configuration fields"

**Error:** `ERROR: Missing required configuration fields: bearer_token`

**Solution:**
```bash
# Check config.json has all required fields
cat MonitoringScript/config.json

# Generate new tokens if needed
make generate-all-tokens
```

#### 3. "SSL certificate verification failed"

**Solution:**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Verify certificate expiration
openssl x509 -in ssl/cert.pem -enddate -noout
```

#### 4. "Connection refused"

**Solution:**
```bash
# Check server is running
netstat -tlnp | grep :443

# Check firewall
sudo ufw status

# Verify MongoDB is running
sudo systemctl status mongod
```

#### 5. "Authentication failed"

**Solution:**
```bash
# Verify tokens match between server and monitoring script
grep WS_BEARER_TOKEN Server/.env.local
grep bearer_token MonitoringScript/config.json
```

### Debug Mode

Enable detailed logging:

```bash
# Server debug mode
NODE_ENV=development npm start

# Check monitoring script configuration
poetry run python oversight_monitoring/monitoring_script.py
```

## Available Commands

```bash
# Installation
make install              # Install all dependencies
make install-server       # Install server dependencies only
make install-monitor      # Install monitoring script dependencies only

# Security Setup
make generate-all-tokens  # Generate WebSocket and NextAuth tokens
make setup-ssl           # Generate SSL certificates

# Development
make dev                 # Start development server
make run-monitor         # Start monitoring script

# Production
make build              # Build application
make start              # Start production server

# Maintenance
make clean              # Clean build artifacts
make lint               # Run code linting
make type-check         # Run TypeScript type checking
```
## Token and Certificate Management

OverSight provides both **web-based admin UI** and **command-line tools** for security management.

### Admin Security UI

**Access:** Navigate to **Admin → Security** in the web dashboard (admin users only)

**Features:**
- **Certificate expiry monitoring** - real-time status with warnings
- **One-click token rotation** - WebSocket and NextAuth tokens
- **Certificate renewal** - generate new SSL certificates
- **Maintenance reminders** - visual indicators for upcoming expirations

### SSL Certificate Management (10-year validity)

**Check certificate expiration:**
```bash
make check-expiry
# Shows days until expiry and renewal guidance
```

**Why 10-year validity:**
- **Eliminates maintenance overhead** - No scheduled renewals needed
- **Prevents unexpected outages** - System won't stop working suddenly
- **Same encryption strength** - Validity period doesn't affect security
- **Suitable for internal use** - No external CA validation needed

**If certificates do expire (after 10 years):**
- WebSocket connections fail with SSL errors
- Web dashboard becomes inaccessible  
- Monitoring scripts can't connect

**Renewal process (Admin UI - Recommended):**
1. **Navigate** to Admin → Security in web dashboard
2. **Enter hostname** for new certificate
3. **Click "Renew Certificate"** - automatically updates `.env.local`
4. **Restart server** - `make start`

**Alternative (Command Line):**
```bash
# 1. Generate new certificates
make setup-ssl

# 2. Update .env.local if paths changed
# (Usually paths stay the same: ssl/key.pem, ssl/cert.pem)

# 3. Restart server
make start
```

### Bearer Token Rotation

**Current tokens don't expire automatically** but should be rotated regularly for security.

**When to rotate:**
- Quarterly (recommended)
- When team members leave
- After suspected compromise
- For compliance requirements

**Rotation process (Admin UI - Recommended):**
1. **Navigate** to Admin → Security in web dashboard
2. **Click "Rotate Both Tokens"** - automatically updates `.env.local`
3. **Copy new WebSocket token** from popup dialog
4. **Update monitoring scripts** - paste token into `config.json` on all machines
5. **Restart server** - `make start`
6. **Restart monitoring scripts** - `make run-monitor`

**Alternative (Command Line):**
```bash
# 1. Generate new tokens
make generate-all-tokens

# 2. Update server configuration
# Edit Server/.env.local with new tokens

# 3. Update monitoring scripts
# Edit MonitoringScript/config.json with new WebSocket token

# 4. Restart server
make start

# 5. Restart monitoring scripts
make run-monitor
```

**⚠️ Important:** All monitoring scripts must be updated with the new token before the server restart, or they'll lose connection.

### NextAuth Session Management

**Sessions automatically expire after 24 hours of inactivity.**

**What happens:**
- Users are automatically logged out
- Redirected to login page
- No service interruption
- No admin action required

For detailed security information, see [SECURITY.md](./SECURITY.md).