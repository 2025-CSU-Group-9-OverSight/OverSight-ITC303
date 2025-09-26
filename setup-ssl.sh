#!/bin/bash

# Simple SSL Certificate Setup for OverSight Internal Project
# Creates self-signed certificates for development/internal use

echo "🔧 OverSight SSL Certificate Setup"
echo "=================================="
echo ""

# Create SSL directory
mkdir -p ssl

# Check if certificates already exist
if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    echo "⚠️  SSL certificates already exist in ssl/ directory"
    echo ""
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing certificates."
        exit 0
    fi
fi

# Get hostname/IP for certificate
echo "🏠 Certificate Configuration"
echo "Enter the hostname or IP address for the certificate"
echo "Examples: localhost, 192.168.1.100, oversight.local"
read -p "Hostname/IP [localhost]: " hostname
hostname=${hostname:-localhost}

# Generate private key and certificate in one command
echo ""
echo "🔐 Generating SSL certificate for: $hostname"
openssl req -x509 -newkey rsa:4096 -nodes -days 3650 \
    -keyout ssl/key.pem -out ssl/cert.pem \
    -subj "/CN=$hostname/O=OverSight/C=AU" \
    -addext "subjectAltName=DNS:$hostname,DNS:localhost,IP:127.0.0.1"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificates generated successfully!"
    echo ""
    echo "📁 Certificate files:"
    echo "   Private Key: $(pwd)/ssl/key.pem"
    echo "   Certificate: $(pwd)/ssl/cert.pem"
    echo ""
    echo "📋 Environment Configuration:"
    echo "   Add these to your Server/.env.local:"
    echo ""
    echo "   USE_HTTPS=true"
    echo "   SSL_KEY_PATH=$(pwd)/ssl/key.pem"
    echo "   SSL_CERT_PATH=$(pwd)/ssl/cert.pem"
    echo ""
    echo "⚠️  Browser Security Notice:"
    echo "   Your browser will show a security warning for self-signed certificates."
    echo "   For internal use, you can safely click 'Advanced' -> 'Proceed to $hostname'"
    echo ""
    echo "🔒 Certificate Details:"
    openssl x509 -in ssl/cert.pem -text -noout | grep -A 2 "Subject:"
    openssl x509 -in ssl/cert.pem -text -noout | grep -A 5 "Subject Alternative Name"
    echo ""
    echo "📅 Valid until:"
    openssl x509 -in ssl/cert.pem -enddate -noout | cut -d= -f2
else
    echo "❌ Failed to generate SSL certificates"
    exit 1
fi
