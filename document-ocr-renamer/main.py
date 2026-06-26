"""
Document OCR File Renamer
Scans documents in a selected folder using OCR, finds a user-defined alphanumeric
pattern, and renames files as DATE_PATTERN.ext
"""

import os
import re
import json
import shutil
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

try:
    from pdf2image import convert_from_path
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".docrenamer_config.json")

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


# ─── Config ──────────────────────────────────────────────────────────────────

class Config:
    def __init__(self):
        self._data = {"pattern": "", "folder": ""}
        self._load()

    def _load(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    self._data.update(json.load(f))
            except Exception:
                pass

    def save(self):
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(self._data, f, indent=2)
        except Exception:
            pass

    def get(self, key: str, default: str = "") -> str:
        return self._data.get(key, default)

    def set(self, key: str, value: str):
        self._data[key] = value
        self.save()


# ─── OCR & Pattern Logic ─────────────────────────────────────────────────────

class OCRProcessor:
    def extract_text(self, file_path: str) -> str:
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            return self._ocr_pdf(file_path)
        elif ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif"}:
            return self._ocr_image(file_path)
        return ""

    def _ocr_pdf(self, file_path: str) -> str:
        if not PDF_AVAILABLE:
            raise RuntimeError(
                "pdf2image is not installed. Run: pip install pdf2image\n"
                "Also requires Poppler — see README for instructions."
            )
        pages = convert_from_path(file_path, dpi=300)
        return "\n".join(pytesseract.image_to_string(page) for page in pages)

    def _ocr_image(self, file_path: str) -> str:
        if not OCR_AVAILABLE:
            raise RuntimeError(
                "pytesseract/Pillow not installed. Run: pip install pytesseract Pillow"
            )
        img = Image.open(file_path)
        return pytesseract.image_to_string(img)

    def find_pattern(self, text: str, pattern: str) -> Optional[str]:
        try:
            m = re.search(pattern, text, re.IGNORECASE)
            return m.group(0) if m else None
        except re.error:
            return None

    def find_date(self, text: str) -> Optional[str]:
        # YYYY-MM-DD or YYYY/MM/DD (most unambiguous first)
        m = re.search(r'\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b', text)
        if m:
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1 <= mo <= 12 and 1 <= d <= 31:
                return f"{y:04d}-{mo:02d}-{d:02d}"

        # Month name DD, YYYY  (e.g. "March 15, 2024" or "Mar. 15 2024")
        m = re.search(
            r'\b(January|February|March|April|May|June|July|August|September|October|'
            r'November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?'
            r'\s+(\d{1,2}),?\s+(\d{4})\b',
            text, re.IGNORECASE
        )
        if m:
            mo = MONTH_MAP.get(m.group(1).lower().rstrip('.'), 0)
            d, y = int(m.group(2)), int(m.group(3))
            if mo and 1 <= d <= 31:
                return f"{y:04d}-{mo:02d}-{d:02d}"

        # DD Month YYYY  (e.g. "15 March 2024")
        m = re.search(
            r'\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|'
            r'October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?'
            r'\s+(\d{4})\b',
            text, re.IGNORECASE
        )
        if m:
            d = int(m.group(1))
            mo = MONTH_MAP.get(m.group(2).lower().rstrip('.'), 0)
            y = int(m.group(3))
            if mo and 1 <= d <= 31:
                return f"{y:04d}-{mo:02d}-{d:02d}"

        # MM/DD/YYYY or MM-DD-YYYY
        m = re.search(r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b', text)
        if m:
            mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if 1 <= mo <= 12 and 1 <= d <= 31:
                return f"{y:04d}-{mo:02d}-{d:02d}"

        return None


# ─── File Processor ───────────────────────────────────────────────────────────

class FileProcessor:
    def __init__(self, log_callback: Optional[Callable] = None):
        self.ocr = OCRProcessor()
        self._log = log_callback or print
        self.processed = 0
        self.renamed = 0
        self.unmatched = 0
        self.errors = 0
        self._stop = False

    def stop(self):
        self._stop = True

    def process_folder(
        self,
        folder: str,
        pattern: str,
        progress_cb: Optional[Callable] = None,
    ):
        self.processed = self.renamed = self.unmatched = self.errors = 0
        self._stop = False

        files = [
            f for f in os.listdir(folder)
            if os.path.isfile(os.path.join(folder, f))
            and Path(f).suffix.lower() in SUPPORTED_EXTENSIONS
        ]
        total = len(files)
        self._log(f"Found {total} document(s) to process.\n")

        if total == 0:
            self._log("No supported files found in the selected folder.\n")
            return

        used_names: set = set()

        for i, filename in enumerate(files):
            if self._stop:
                self._log("\nProcessing stopped by user.\n")
                break

            filepath = os.path.join(folder, filename)
            self._log(f"[{i+1}/{total}] {filename}")

            try:
                text = self.ocr.extract_text(filepath)
                found_id = self.ocr.find_pattern(text, pattern)

                if found_id:
                    found_date = self.ocr.find_date(text)
                    if not found_date:
                        mtime = os.path.getmtime(filepath)
                        found_date = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
                        self._log(f"  (No date in document; using file date: {found_date})")

                    ext = Path(filename).suffix
                    safe_id = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", found_id)
                    base_name = f"{found_date}_{safe_id}"
                    new_name = f"{base_name}{ext}"

                    counter = 2
                    while new_name in used_names or (
                        os.path.exists(os.path.join(folder, new_name))
                        and os.path.join(folder, new_name) != filepath
                    ):
                        new_name = f"{base_name}_{counter}{ext}"
                        counter += 1

                    used_names.add(new_name)
                    new_path = os.path.join(folder, new_name)

                    if new_path != filepath:
                        os.rename(filepath, new_path)
                        self._log(f"  Renamed → {new_name}\n")
                    else:
                        self._log(f"  Already correctly named.\n")

                    self.renamed += 1

                else:
                    unmatched_dir = os.path.join(folder, "unmatched")
                    os.makedirs(unmatched_dir, exist_ok=True)
                    dest = os.path.join(unmatched_dir, filename)

                    if os.path.exists(dest):
                        stem, ext_part = os.path.splitext(filename)
                        c = 2
                        while os.path.exists(dest):
                            dest = os.path.join(unmatched_dir, f"{stem}_{c}{ext_part}")
                            c += 1

                    shutil.move(filepath, dest)
                    self._log(f"  Pattern not found — moved to 'unmatched/'\n")
                    self.unmatched += 1

            except Exception as e:
                self._log(f"  ERROR: {e}\n")
                self.errors += 1

            self.processed += 1
            if progress_cb:
                progress_cb(i + 1, total)

        self._log(
            f"\n{'='*50}\n"
            f"Finished!  Processed: {self.processed}  |  "
            f"Renamed: {self.renamed}  |  "
            f"Unmatched: {self.unmatched}  |  "
            f"Errors: {self.errors}\n"
            f"{'='*50}\n"
        )


# ─── Main Application UI ──────────────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Document OCR File Renamer")
        self.geometry("820x680")
        self.minsize(640, 520)

        self._config = Config()
        self._processor: Optional[FileProcessor] = None
        self._thread: Optional[threading.Thread] = None

        self._build_ui()
        self.after(100, self._check_dependencies)

    # ── UI Construction ──────────────────────────────────────────────────────

    def _build_ui(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        root = ttk.Frame(self, padding=16)
        root.pack(fill=tk.BOTH, expand=True)

        # Title
        ttk.Label(
            root,
            text="Document OCR File Renamer",
            font=("Helvetica", 17, "bold"),
        ).pack(anchor="w", pady=(0, 14))

        # Section 1 — Folder
        f1 = ttk.LabelFrame(root, text="1.  Select Folder", padding=10)
        f1.pack(fill=tk.X, pady=(0, 10))

        row = ttk.Frame(f1)
        row.pack(fill=tk.X)
        self._folder_var = tk.StringVar(value=self._config.get("folder"))
        ttk.Entry(row, textvariable=self._folder_var, font=("Helvetica", 10)).pack(
            side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8)
        )
        ttk.Button(row, text="Browse…", command=self._browse_folder).pack(side=tk.RIGHT)
        ttk.Label(
            f1,
            text="Only files directly inside this folder are processed (subfolders are not scanned).",
            foreground="gray",
            font=("Helvetica", 9),
        ).pack(anchor="w", pady=(6, 0))

        # Section 2 — Pattern
        f2 = ttk.LabelFrame(root, text="2.  Search Pattern (regex)", padding=10)
        f2.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(
            f2,
            text="Enter a regex pattern that matches the ID/number in your documents:",
            font=("Helvetica", 10),
        ).pack(anchor="w")
        ttk.Label(
            f2,
            text="Examples:  [A-Z]{2}-\\d{6}  matches AB-123456    |    INV-\\d{4,8}  matches INV-200345",
            foreground="gray",
            font=("Helvetica", 9),
        ).pack(anchor="w", pady=(2, 6))

        pat_row = ttk.Frame(f2)
        pat_row.pack(fill=tk.X)
        self._pattern_var = tk.StringVar(value=self._config.get("pattern"))
        self._pattern_entry = ttk.Entry(
            pat_row, textvariable=self._pattern_var, font=("Courier", 11), width=40
        )
        self._pattern_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        ttk.Button(pat_row, text="Test Pattern", command=self._test_pattern).pack(side=tk.RIGHT)

        # Pattern test sub-area
        test_frame = ttk.Frame(f2)
        test_frame.pack(fill=tk.X, pady=(8, 0))

        ttk.Label(test_frame, text="Paste sample text to test against:", font=("Helvetica", 9)).pack(anchor="w")
        self._test_var = tk.StringVar()
        ttk.Entry(test_frame, textvariable=self._test_var, font=("Courier", 10)).pack(fill=tk.X)

        self._test_result_var = tk.StringVar()
        self._test_result_label = ttk.Label(
            test_frame, textvariable=self._test_result_var,
            font=("Helvetica", 9, "italic"), foreground="blue"
        )
        self._test_result_label.pack(anchor="w", pady=(4, 0))

        ttk.Label(
            f2,
            text="Regex tips:  \\d = any digit  |  [A-Z] = uppercase letter  |  {n} = exactly n times  "
                 "|  + = one or more",
            foreground="gray",
            font=("Helvetica", 8),
        ).pack(anchor="w", pady=(6, 0))

        # Section 3 — Output info
        f3 = ttk.LabelFrame(root, text="3.  Output Format", padding=10)
        f3.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(
            f3,
            text=(
                "Files are renamed to:  DATE_PATTERN.ext\n"
                "  • DATE  is extracted from the document content (e.g. 2024-03-15)\n"
                "  • PATTERN  is the matched ID found by the pattern above\n"
                "  • Files where no pattern is found are moved to an  'unmatched'  subfolder"
            ),
            font=("Helvetica", 10),
            justify=tk.LEFT,
        ).pack(anchor="w")

        # Action bar
        action_row = ttk.Frame(root)
        action_row.pack(fill=tk.X, pady=(0, 8))

        self._start_btn = ttk.Button(
            action_row, text="▶  Start Processing", command=self._start_processing
        )
        self._start_btn.pack(side=tk.LEFT, padx=(0, 8))

        self._stop_btn = ttk.Button(
            action_row, text="■  Stop", command=self._stop_processing, state=tk.DISABLED
        )
        self._stop_btn.pack(side=tk.LEFT)

        self._prog_label = ttk.Label(action_row, text="", font=("Helvetica", 9))
        self._prog_label.pack(side=tk.RIGHT, padx=(8, 0))

        self._progress_var = tk.DoubleVar()
        ttk.Progressbar(
            action_row, variable=self._progress_var, maximum=100, length=200
        ).pack(side=tk.RIGHT)

        # Log area
        log_frame = ttk.LabelFrame(root, text="Processing Log", padding=5)
        log_frame.pack(fill=tk.BOTH, expand=True)

        self._log_text = scrolledtext.ScrolledText(
            log_frame, font=("Courier", 9), state=tk.DISABLED, wrap=tk.WORD, height=10
        )
        self._log_text.pack(fill=tk.BOTH, expand=True)

    # ── Actions ──────────────────────────────────────────────────────────────

    def _browse_folder(self):
        folder = filedialog.askdirectory(
            title="Select folder containing documents",
            initialdir=self._folder_var.get() or os.path.expanduser("~"),
        )
        if folder:
            self._folder_var.set(folder)
            self._config.set("folder", folder)

    def _test_pattern(self):
        pattern = self._pattern_var.get().strip()
        text = self._test_var.get().strip()

        if not pattern:
            self._set_test_result("Enter a pattern first.", "red")
            return
        if not text:
            self._set_test_result("Enter some sample text to search in.", "red")
            return

        try:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                self._set_test_result(f"✓  Match found: '{m.group(0)}'", "green")
            else:
                self._set_test_result("✗  No match found in the sample text.", "orange")
        except re.error as e:
            self._set_test_result(f"Invalid regex: {e}", "red")

    def _set_test_result(self, msg: str, color: str):
        self._test_result_var.set(msg)
        self._test_result_label.config(foreground=color)

    def _start_processing(self):
        folder = self._folder_var.get().strip()
        pattern = self._pattern_var.get().strip()

        if not folder:
            messagebox.showerror("Error", "Please select a folder first.")
            return
        if not os.path.isdir(folder):
            messagebox.showerror("Error", f"Folder does not exist:\n{folder}")
            return
        if not pattern:
            messagebox.showerror("Error", "Please enter a search pattern.")
            return
        try:
            re.compile(pattern)
        except re.error as e:
            messagebox.showerror("Invalid Pattern", f"Not a valid regex:\n{e}")
            return

        self._config.set("pattern", pattern)
        self._config.set("folder", folder)

        self._clear_log()
        self._progress_var.set(0)
        self._prog_label.config(text="")
        self._start_btn.config(state=tk.DISABLED)
        self._stop_btn.config(state=tk.NORMAL)

        self._processor = FileProcessor(log_callback=self._log)

        def run():
            self._processor.process_folder(folder, pattern, self._update_progress)
            self.after(0, self._done)

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()

    def _stop_processing(self):
        if self._processor:
            self._processor.stop()
        self._stop_btn.config(state=tk.DISABLED)

    def _done(self):
        self._start_btn.config(state=tk.NORMAL)
        self._stop_btn.config(state=tk.DISABLED)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _log(self, message: str):
        def _update():
            self._log_text.config(state=tk.NORMAL)
            self._log_text.insert(tk.END, message + "\n" if not message.endswith("\n") else message)
            self._log_text.see(tk.END)
            self._log_text.config(state=tk.DISABLED)
        self.after(0, _update)

    def _clear_log(self):
        self._log_text.config(state=tk.NORMAL)
        self._log_text.delete("1.0", tk.END)
        self._log_text.config(state=tk.DISABLED)

    def _update_progress(self, current: int, total: int):
        def _update():
            self._progress_var.set((current / total) * 100 if total else 0)
            self._prog_label.config(text=f"{current} / {total}")
        self.after(0, _update)

    def _check_dependencies(self):
        missing_pkgs = []
        if not OCR_AVAILABLE:
            missing_pkgs.append("pytesseract Pillow")
        if not PDF_AVAILABLE:
            missing_pkgs.append("pdf2image")

        if missing_pkgs:
            self._log(
                "⚠  Missing Python packages — install with:\n"
                f"   pip install {' '.join(missing_pkgs)}\n"
                "   (For pdf2image, Poppler is also required — see README)\n"
            )

        if OCR_AVAILABLE:
            try:
                pytesseract.get_tesseract_version()
                self._log("✓  Tesseract OCR detected. Ready.\n")
            except Exception:
                self._log(
                    "⚠  Tesseract OCR engine not found.\n"
                    "   Install from: https://tesseract-ocr.github.io/tessdoc/Installation.html\n"
                    "   (Windows: use the installer; Mac: brew install tesseract; "
                    "Linux: sudo apt install tesseract-ocr)\n"
                )


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    App().mainloop()
