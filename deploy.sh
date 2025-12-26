#!/bin/bash

echo "================================"
echo "Starting Bank Statement Analyzer Deployment"
echo "================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Current directory: $(pwd)"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from Hostinger control panel:"
    echo "Advanced > Select PHP Version > Enable Node.js"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies
echo "================================"
echo "Installing dependencies..."
echo "================================"
npm install --production=false

if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed"
    exit 1
fi

# Build the project
echo "================================"
echo "Building project..."
echo "================================"
npm run build

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed"
    exit 1
fi

# Check if dist folder was created
if [ ! -d "dist" ]; then
    echo "ERROR: dist folder not found after build"
    exit 1
fi

echo "================================"
echo "Deploying built files..."
echo "================================"

# Move all files from dist to parent directory (public_html root)
# This will overwrite any existing files
cp -rf dist/* ./

# Clean up - remove source files but keep dist contents
echo "================================"
echo "Cleaning up source files..."
echo "================================"

# Create a list of files/folders to keep
KEEP_FILES=("index.html" "assets" ".htaccess")

# Remove source files (but keep built files)
rm -rf src/
rm -rf node_modules/
rm -rf .git/
rm -rf .github/
rm -f package.json
rm -f package-lock.json
rm -f vite.config.js
rm -f .gitignore
rm -f README.md
rm -f deploy.sh
rm -f .deployment
rm -rf dist/

echo "================================"
echo "Deployment completed successfully!"
echo "================================"
echo "Your site should now be live at:"
echo "https://steelblue-bear-125759.hostingersite.com/"
echo "================================"

# List final files
echo "Final files in public_html:"
ls -lah
