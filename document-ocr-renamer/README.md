# Document OCR File Renamer

Scans documents in a selected folder using OCR, locates a user-defined ID/number pattern, and renames files as `DATE_PATTERN.ext`.

## What it does

1. You select a folder containing scanned documents (PDF, JPG, PNG, TIFF)
2. You enter a **regex pattern** that matches the ID on your documents (e.g. `[A-Z]{2}-\d{6}` for `AB-123456`)
3. The app runs OCR on every file, finds the ID, extracts the document date, and renames the file:
   - **Example:** `2024-03-15_AB-123456.pdf`
4. Files where the pattern is **not found** are moved to an `unmatched/` subfolder

Your pattern is saved automatically and reloaded next time you open the app.

---

## Installation (Mac — build a double-click .app)

This is the recommended way. You run the build script **once** on your Mac, and it produces a `Document OCR Renamer.app` file you drag to `/Applications` like any other Mac app. No Python or terminal needed to run it after that.

### Step 1 — Install Python

Download Python 3.9+ from https://python.org/downloads

---

### Step 2 — Install Tesseract OCR engine

Tesseract is the OCR engine that reads text from images. Install it for your platform:

**Windows:**
- Download the installer from https://github.com/UB-Mannheim/tesseract/wiki
- Run it and note the install path (e.g. `C:\Program Files\Tesseract-OCR\tesseract.exe`)
- Add that path to your system `PATH`, or set it in the script (see below)

**Mac:**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install tesseract-ocr
```

---

### Step 3 — Install Poppler (required for PDF support)

**Windows:**
- Download from https://github.com/oschwartz10612/poppler-windows/releases
- Extract and add the `bin/` folder to your system `PATH`

**Mac:**
```bash
brew install poppler
```

**Linux:**
```bash
sudo apt install poppler-utils
```

---

### Step 4 — Install Python dependencies

Open a terminal in this folder and run:

```bash
pip install -r requirements.txt
```

---

### Step 5 — Build the .app

Open Terminal, navigate to this folder, and run:

```bash
bash build_mac.sh
```

This takes a minute or two. When done you'll see:

```
dist/Document OCR Renamer.app
```

**Drag that file to your `/Applications` folder.** Done — it now launches like any Mac app.

### Step 6 (optional) — Run directly without building

```bash
python main.py
```

---

## Windows: Tesseract path

If Tesseract is not on your PATH, add this line near the top of `main.py` (after the imports):

```python
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

---

## Pattern Guide

The app uses **regular expressions (regex)** to find patterns in OCR text.

| Pattern | Matches |
|---------|---------|
| `[A-Z]{2}-\d{6}` | AB-123456, XY-000001 |
| `INV-\d{4,8}` | INV-2024, INV-00123456 |
| `[A-Z]{3}\d{7}` | ABC1234567 |
| `\d{3}-\d{2}-\d{4}` | 123-45-6789 |
| `CASE-\d{4}-\d{4}` | CASE-2024-0001 |

Use the **Test Pattern** button in the app to verify your pattern before processing.

**Quick regex reference:**
- `\d` = any digit (0–9)
- `[A-Z]` = any uppercase letter
- `[a-zA-Z]` = any letter
- `{n}` = exactly n times
- `{n,m}` = between n and m times
- `-` = literal dash
- `.` = any character

---

## Output filename format

```
DATE_PATTERN.ext
2024-03-15_AB-123456.pdf
```

- **DATE** is the first date found in the document content
- If no date is found in the document, the file's modification date is used as a fallback
- If two files produce the same output name, a counter is appended: `2024-03-15_AB-123456_2.pdf`

---

## Supported file types

| Format | Extension |
|--------|-----------|
| PDF | `.pdf` |
| JPEG | `.jpg`, `.jpeg` |
| PNG | `.png` |
| TIFF | `.tiff`, `.tif` |
