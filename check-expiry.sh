#!/bin/bash

# Check expiration dates for OverSight SSL certificates

echo "🔍 OverSight Certificate Expiry Check"
echo "===================================="
echo ""

# Check if SSL certificates exist
if [ ! -f "ssl/cert.pem" ]; then
    echo "❌ No SSL certificate found at ssl/cert.pem"
    echo "   Run 'make setup-ssl' to generate certificates"
    exit 1
fi

# Get certificate expiration date
expiry_date=$(openssl x509 -in ssl/cert.pem -enddate -noout | cut -d= -f2)
expiry_timestamp=$(date -d "$expiry_date" +%s)
current_timestamp=$(date +%s)
days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))

echo "📅 Certificate Information:"
echo "   Certificate: ssl/cert.pem"
echo "   Expires: $expiry_date"
echo "   Days until expiry: $days_until_expiry"
echo ""

# Check certificate details
echo "🔒 Certificate Details:"
openssl x509 -in ssl/cert.pem -text -noout | grep -A 2 "Subject:"
echo ""

# Provide renewal guidance based on days remaining
if [ $days_until_expiry -lt 0 ]; then
    echo "🚨 EXPIRED: Certificate has expired $((days_until_expiry * -1)) days ago!"
    echo ""
    echo "🔧 Immediate Action Required:"
    echo "   1. Generate new certificates: make setup-ssl"
    echo "   2. Update Server/.env.local with new paths"
    echo "   3. Restart server: make start"
    echo ""
elif [ $days_until_expiry -lt 30 ]; then
    echo "⚠️  WARNING: Certificate expires in $days_until_expiry days"
    echo ""
    echo "🔧 Recommended Actions:"
    echo "   1. Plan certificate renewal soon"
    echo "   2. Schedule maintenance window"
    echo "   3. Prepare renewal procedure"
    echo ""
elif [ $days_until_expiry -lt 60 ]; then
    echo "📝 NOTICE: Certificate expires in $days_until_expiry days"
    echo ""
    echo "💡 Plan ahead:"
    echo "   Consider scheduling renewal in the next month"
    echo ""
else
    echo "✅ HEALTHY: Certificate is valid for $days_until_expiry more days"
    echo ""
fi

echo "🔄 Certificate Renewal Commands:"
echo "   Check expiry: ./check-expiry.sh"
echo "   Renew certs:  make setup-ssl"
echo "   Restart:      make start"
