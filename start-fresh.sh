#!/bin/bash

echo "=== Killing any existing Electron processes ==="
pkill -9 -f "electron" 2>/dev/null
pkill -9 -f "Electron" 2>/dev/null
sleep 1

echo ""
echo "=== Cleaning and rebuilding ==="
npm run clean
npm run build

echo ""
echo "=== Starting Electron (logs below) ==="
echo ""
npm start
