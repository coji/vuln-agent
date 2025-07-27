#!/bin/bash

echo "🚀 VulnAgent Demo Script"
echo "========================"
echo ""
echo "This script will:"
echo "1. Start a vulnerable test application"
echo "2. Run VulnAgent to scan it"
echo ""
echo "⚠️  WARNING: The test app contains security vulnerabilities!"
echo "Only run this in a safe, isolated environment."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Install dependencies for vulnerable app
echo "📦 Installing dependencies for vulnerable app..."
cd examples/vulnerable-app
pnpm install

# Start the vulnerable app in background
echo "🎯 Starting vulnerable app on http://localhost:3000..."
pnpm start &
APP_PID=$!

# Wait for app to start
echo "⏳ Waiting for app to start..."
sleep 3

# Go back to project root
cd ../..

# Run VulnAgent scan
echo ""
echo "🔍 Running VulnAgent scan..."
echo "================================"
npx vuln-agent scan http://localhost:3000 --llm claude-sonnet-4 --verbose

# Kill the vulnerable app
echo ""
echo "🛑 Stopping vulnerable app..."
kill $APP_PID

echo ""
echo "✅ Demo complete!"
echo ""
echo "To generate an HTML report, run:"
echo "npx vuln-agent scan http://localhost:3000 --llm claude-sonnet-4 -f html"