#!/bin/bash
# Build script for Document OCR Renamer — macOS .app bundle
# Run this once on your Mac. The resulting .app can be shared with other Macs.
#
# Prerequisites (install once):
#   brew install tesseract poppler
#   pip install -r requirements.txt pyinstaller

set -e

echo "================================================"
echo "  Document OCR Renamer — macOS Build Script"
echo "================================================"
echo ""

# Check Python is available
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found. Install from https://python.org/downloads"
    exit 1
fi

# Check PyInstaller
if ! python3 -c "import PyInstaller" &>/dev/null; then
    echo "Installing PyInstaller..."
    pip3 install pyinstaller
fi

# Check required packages
echo "Checking Python dependencies..."
pip3 install -r requirements.txt --quiet

# Warn about system dependencies
for cmd in tesseract pdftoppm; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "WARNING: '$cmd' not found on PATH."
        echo "  Install with: brew install tesseract poppler"
        echo "  The app will warn the user at launch if these are missing."
    fi
done

echo ""
echo "Building .app bundle..."
python3 -m PyInstaller DocRenamer.spec --clean --noconfirm

echo ""
echo "================================================"
echo "  Build complete!"
echo ""
echo "  Your app is at:"
echo "    dist/Document OCR Renamer.app"
echo ""
echo "  To install: drag it to your /Applications folder."
echo "================================================"
