#  Live System Monitoring and Reporting System
The Live System Monitoring and Reporting System is designed to collect and transmit real-time system metrics from client machines to a centralized server for monitoring and analysis. The system gathers information about active processes, running applications, and resource utilization (CPU, RAM, disk usage). This data is then sent to the server for real-time visualization and analysis, allowing administrators to monitor system health and detect potential performance issues or anomalies.  

This project is crucial for IT infrastructure monitoring, security enforcement, and performance optimization, ensuring that system administrators have up-to-date insights into system activities. The collected data can be used for anomaly detection, performance tuning, and potential security auditing.  

## Project Team
- Brodie Davis - **Project Manager**
- Lilith McGoldrick - **Deputy Manager**
- Timothy Markut
- David Stinson
- Nicholas Smith
- Oliver Multari

## [Project Charter](https://docs.google.com/document/d/1S6CHM9pdh3tzhjktl-W98jiSdyM_CNEeo4VP5q7Iim8/edit?usp=sharing)

## [Project Management Plan](https://docs.google.com/document/d/1OY_OlzYQVuXcd5Vz9nZP1dYgHVSR2Mk3ofjnDLS8FDE/edit?usp=sharing)

![Gantt Chart](/gantt_chart.png)


## Development

**📖 [Complete Development Guide](./docs/DEVELOPMENT_GUIDE.md)**

### What's Covered

Complete guide covering:
- **Git workflow** and branch strategy
- **Development setup** and installation
- **Conventional commits** and releases
- **Testing** and code quality standards
- **Project architecture** and structure

### Quick Start

1. **Prerequisites**: Install [Node.js](https://nodejs.org/) and [Poetry](https://python-poetry.org/)
2. **Install**: `make install` (Windows: [setup make first](./docs/DEVELOPMENT_GUIDE.md#windows-setup-enabling-make-commands))
3. **Develop**: `make dev` (starts NextJS server)
4. **Commit**: `make commit` (conventional commits)
5. **Help**: `make help` (see all commands)

### Quick Reference

For specific development tasks, jump to these sections:

- [Getting Started](./docs/DEVELOPMENT_GUIDE.md#development-setup)
- [Git Workflow](./docs/DEVELOPMENT_GUIDE.md#git-branch-strategy)
- [Common Commands](./docs/DEVELOPMENT_GUIDE.md#common-commands)
- [Making Commits](./docs/DEVELOPMENT_GUIDE.md#conventional-commits)

## Documentation

### 🚀 **[Deployment Guide](./docs/DEPLOYMENT.md)**
Complete deployment instructions covering:
- Database setup (MongoDB installation and configuration)
- SSL certificate generation and configuration  
- Server deployment and environment configuration
- Monitoring script setup and configuration
- Production deployment checklist

### 🔒 **[Security Guide](./docs/SECURITY.md)**
Comprehensive security documentation covering:
- SSL/TLS encryption implementation
- Bearer token authentication system
- Security best practices and threat model
- Configuration security and token management

## Quick Start

```bash
# 1. Generate authentication tokens
make generate-all-tokens

# 2. Generate SSL certificates  
make setup-ssl

# 3. Install and deploy
make install && make build && make start
```

## Security Features

- 🔒 **WSS (WebSocket Secure)** with self-signed certificates
- 🛡️ **Bearer Token Authentication** for all WebSocket connections
- 🔑 **NextAuth JWT Encryption** for session management
- 🗄️ **MongoDB Authentication** with role-based access control
- 🖥️ **Admin Security UI** - certificate expiry monitoring and token rotation
- 📋 **Defense in Depth** - multiple security layers

