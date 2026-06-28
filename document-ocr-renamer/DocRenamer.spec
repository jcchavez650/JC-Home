# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for Document OCR Renamer (macOS .app bundle)

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'PIL._tkinter_finder',
        'PIL.Image',
        'pytesseract',
        'pdf2image',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Document OCR Renamer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,        # No terminal window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,     # Build for current arch (universal2 if supported)
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Document OCR Renamer',
)

app = BUNDLE(
    coll,
    name='Document OCR Renamer.app',
    icon=None,            # Replace with 'icon.icns' if you add one
    bundle_identifier='com.docrenamer.app',
    info_plist={
        'NSHighResolutionCapable': True,
        'NSHumanReadableCopyright': 'Document OCR Renamer',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleVersion': '1.0.0',
        'CFBundleName': 'Document OCR Renamer',
        'CFBundleDisplayName': 'Document OCR Renamer',
        'LSMinimumSystemVersion': '11.0',
    },
)
