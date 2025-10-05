# OverSight Security Guide

Complete security documentation for the OverSight monitoring system covering encryption, authentication, and security best practices.

## Security Architecture

OverSight implements **defense in depth** with multiple security layers:

1. **🔐 SSL/TLS Encryption** - Protects all traffic in transit
2. **🛡️ Bearer Token Authentication** - Controls WebSocket access
3. **🔑 Session Management** - NextAuth JWT encryption
4. **🗄️ Database Authentication** - MongoDB user access control

## Admin Security Management

**OverSight includes an admin interface for security management:**

**Access:** Admin → Security (admin users only)

**Features:**
- **Real-time certificate expiry monitoring** with status badges
- **One-click token rotation** for WebSocket and NextAuth tokens
- **Certificate renewal** with hostname configuration
- **Expiry warnings** and maintenance reminders
- **Copy-paste ready** token output for monitoring script updates

## Security Overview

### What's Protected

OverSight transmits sensitive system information including:
- **Process Lists** - Running applications and services
- **Performance Metrics** - CPU, memory, disk usage
- **System Information** - Device names, OS details
- **Authentication Tokens** - Access credentials

### How It's Protected

**SSL/TLS Encryption:**
- All WebSocket traffic is encrypted using industry-standard TLS
- Self-signed certificates provide the same encryption strength as CA certificates
- Protects against network eavesdropping and packet sniffing

**Bearer Token Authentication:**
- Every WebSocket connection requires a valid authentication token
- Tokens are cryptographically generated with 256-bit entropy
- Prevents unauthorized access even if network is compromised

## Security Implementation

### SSL/TLS Encryption

OverSight uses **self-signed certificates** for internal network security:

```bash
# Generate certificates automatically
make setup-ssl
```

**Benefits:**
- **Bank-level encryption** (TLS 1.2+, RSA 4096-bit keys)
- **No external dependencies** - easy to implement for internal systems
- **Immediate deployment** - no certificate authority delays
- **Full control** - generate, rotate, and manage internally
- **Cost effective** - no certificate fees

**Certificate Details:**
- **Algorithm**: RSA 4096-bit keys with SHA-256 signatures
- **Validity**: 10 years (minimal maintenance)
- **Subject**: CN=hostname, O=OverSight, C=AU
- **Extensions**: Subject Alternative Names for hostname/IP flexibility

**Why 10-year validity for internal systems:**
- ✅ **Eliminates routine maintenance** - No annual renewals needed
- ✅ **Prevents unexpected outages** - System won't fail due to expired certificates
- ✅ **Same security level** - Validity period doesn't affect encryption strength
- ✅ **Appropriate for internal use** - No external validation requirements

**Browser Warnings:**
- Browsers show security warnings for self-signed certificates
- This is cosmetic only - encryption is fully active
- For internal systems: click "Advanced" → "Proceed to [hostname]"

### Authentication System

#### WebSocket Bearer Tokens

```bash
# Generate secure authentication tokens
make generate-all-tokens
```

**Properties:**
- **256-bit cryptographic entropy** using Node.js crypto.randomBytes()
- **Hex-encoded format** for HTTP header compatibility
- **Unique per environment** (development/staging/production)
- **Computationally infeasible** to brute force

**Usage:**
- Required for all WebSocket connections
- Transmitted in Authorization header: `Bearer token_here`
- Fallback support via query parameter: `?token=token_here`
- Validated on connection and upgrade requests

#### NextAuth Session Security

**NextAuth Secret:**
- **256-bit base64url-encoded** secret for JWT encryption
- **Session data encryption** protects user authentication state
- **CSRF token generation** prevents cross-site request forgery
- **Automatic session management** with secure defaults

**Session Properties:**
- **24-hour expiration** (configurable)
- **JWT strategy** with encrypted payloads
- **Secure cookie handling** with HttpOnly and SameSite flags
- **Automatic token refresh** on activity

## Security Setup

### Token Generation

Generate all required authentication tokens:

```bash
# Generate both WebSocket and NextAuth tokens
make generate-all-tokens
```

This creates:
- **WebSocket Bearer Token** - 256-bit hex-encoded for WebSocket authentication
- **NextAuth Secret** - 256-bit base64url-encoded for session encryption
add these to the server's .env.local file and the monitoring script's config.json

### SSL Certificate Generation

Generate self-signed certificates for encryption:

```bash
# Interactive certificate generation
make setup-ssl
```

This creates:
- **ssl/key.pem** - Private key (4096-bit RSA)
- **ssl/cert.pem** - Certificate (10-year validity)
- **Subject**: CN=hostname, O=OverSight, C=AU
add the private key and certificate paths to the server's .env.local file. 

### Configuration Files

#### Server Configuration (Server/.env.local)

```bash
# Database Configuration
MONGODB_URI=mongodb://OverSight:your_db_password@localhost:27017/
NODE_ENV=production

# NextAuth Configuration
NEXTAUTH_SECRET=your_generated_nextauth_secret_here
NEXTAUTH_URL=https://your-hostname:3000

# Server Configuration
HOSTNAME=your-hostname
PORT=3000

# SSL Configuration
USE_HTTPS=true
SSL_KEY_PATH=/absolute/path/to/OverSight-ITC303/ssl/key.pem
SSL_CERT_PATH=/absolute/path/to/OverSight-ITC303/ssl/cert.pem

# WebSocket Security
WS_BEARER_TOKEN=your_generated_websocket_token_here
```

#### Monitoring Script Configuration (MonitoringScript/config.json)

```json
{
    "uri": "wss://your-hostname:3000/api/ws/monitoring",
    "connection_attempts": 20,
    "ping_interval": 20,
    "ping_timeout": 20,
    "bearer_token": "your_generated_websocket_token_here"
}
```

**Note:** SSL is automatically configured for self-signed certificates.

## Security Best Practices

### Token Management

- **Store tokens securely** in environment variables or secure config files
- **Never commit tokens** to version control
- **Rotate tokens regularly** (quarterly recommended)

#### Token Rotation Process

**Bearer tokens don't automatically expire** but should be rotated for security:

**When to rotate:**
- **Quarterly** (security best practice)
- **Team member changes** (joiners/leavers)
- **Suspected compromise** (unusual activity)
- **Compliance requirements** (annual audits)

**Via Admin UI (Recommended):**
1. **Navigate** to Admin → Security in the web dashboard
2. **View current token status** - shows configuration status
3. **Click token rotation button** - "Rotate WebSocket Token", "Rotate NextAuth Secret", or "Rotate Both"
4. **Copy new tokens** from the popup dialog
5. **Update monitoring scripts** - paste new WebSocket token into `config.json` on all machines
6. **Restart server** - `make start` (required for new tokens)
7. **Restart monitoring scripts** - they'll reconnect with new tokens

**Via Command Line:**
```bash
# 1. Generate new tokens
make generate-all-tokens

# 2. Update server configuration
# Edit Server/.env.local with new WS_BEARER_TOKEN and NEXTAUTH_SECRET

# 3. Update all monitoring scripts
# Edit config.json on each monitored machine with new bearer_token

# 4. Rolling restart
make start                    # Restart server
make run-monitor             # Restart monitoring scripts
```

**⚠️ Coordination Required:**
- Update all monitoring scripts **before** restarting server
- Plan brief maintenance window for token rotation
- The Admin UI provides the new tokens for easy copy/paste 

### Certificate Management

- **Generate certificates per environment** or hostname
- **Set appropriate validity periods** (365 days default)
- **Store private keys securely** with restricted file permissions (600)
- **Monitor expiration dates** using `make check-expiry`
- **Regenerate certificates** before expiration (30-day warning)

#### Certificate Expiration Monitoring

**Check certificate status:**
```bash
make check-expiry
```

**Automated monitoring:**
```bash
# Add to crontab for monthly checks
0 0 1 * * cd /path/to/OverSight-ITC303 && ./check-expiry.sh
```

#### Certificate Renewal

**Via Admin UI (Recommended):**
1. **Navigate** to Admin → Security in the web dashboard
2. **Check certificate status** - shows expiry date and warnings
3. **Enter hostname** for the new certificate
4. **Click "Renew Certificate"** - generates new certificate automatically
5. **Restart server** - `make start` (required for new certificate)

**Via Command Line:**
1. **Check status** - `make check-expiry`
2. **Generate new certificates** - `make setup-ssl`
3. **Restart server** - `make start`
4. **Verify connections** - monitoring scripts reconnect automatically

**Emergency renewal (expired certificates):**
- Use either method above - both work for expired certificates
- All services resume after server restart

## Threat Model

### Protects Against

- **Network Eavesdropping** - SSL encryption prevents packet sniffing
- **Unauthorized Access** - Bearer tokens prevent connection without credentials
- **Man-in-the-Middle Attacks** - TLS prevents traffic interception/modification
- **Credential Theft** - Tokens are transmitted encrypted
- **Data Exposure** - System metrics are encrypted in transit

### Doesn't Protect Against

- **Server Compromise** - If server is compromised, tokens could be extracted
- **Client Compromise** - If monitoring script host is compromised
- **Social Engineering** - Users sharing credentials inappropriately
- **Physical Access** - Direct server access bypasses network security

## Compliance

This security implementation supports compliance with:
- **Internal Security Policies** - Standard encryption and authentication
- **Data Protection Requirements** - Encrypted transmission of system data
- **Network Security Standards** - Industry-standard TLS encryption
