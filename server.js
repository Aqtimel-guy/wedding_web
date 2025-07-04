// ─────────────────────────── server.js ────────────────────────────
const express  = require("express");
const cors     = require("cors");
const fs       = require("fs");
const path     = require("path");
const XLSX     = require("xlsx");
const multer   = require("multer");

// ───── Config ─────
const PORT         = 3001;
const DATA_DIR     = path.join(__dirname, "data");
const EXCEL_PATH   = path.join(DATA_DIR, "registered guests.xlsx");
const PASSPORT_DIR = path.join(DATA_DIR, "passport pictures - guests");
const MAX_FILE_MB  = 100;

// ───── Ensure folders ─────
if (!fs.existsSync(DATA_DIR))     fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PASSPORT_DIR)) fs.mkdirSync(PASSPORT_DIR, { recursive: true });

/** Build a safe filename:
 *  1.  keep Hebrew / UTF-8
 *  2.  replace spaces → _
 *  3.  strip Windows-forbidden chars  \ / : * ? " < > |
 */
function safeName(raw) {
  return raw
    .replace(/[\s]+/g, "_")
    .replace(/[\\/:*?"<>|]+/g, "")
    .trim();
}

// ───── Multer: save exactly as received, after sanitising ─────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, PASSPORT_DIR),
  filename   : (_, file, cb) => cb(null, safeName(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /^image\//.test(f.mimetype))
});

// ───── Workbook helpers ─────
function loadWorkbook() {
  if (fs.existsSync(EXCEL_PATH)) {
    const wb = XLSX.readFile(EXCEL_PATH);
    return { wb, ws: wb.Sheets[wb.SheetNames[0]] };
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([]);
  XLSX.utils.book_append_sheet(wb, ws, "RSVP");
  return { wb, ws };
}

// write with retry – fixes “file in use” on mobile browsers
function writeWorkbookWithRetry(wb, attempt = 1) {
  try {
    const tmp = EXCEL_PATH + ".tmp";
    XLSX.writeFile(wb, tmp);
    fs.renameSync(tmp, EXCEL_PATH);
  } catch (err) {
    if (err.code === "EBUSY" && attempt < 6) {
      console.warn(`Excel busy – retry ${attempt}/5`);
      return setTimeout(() => writeWorkbookWithRetry(wb, attempt + 1), 500);
    }
    throw err;
  }
}

// ───── Express app ─────
const app = express();
app.use(cors({ origin: true }));

// ───── POST /submit-rsvp ─────
app.post("/submit-rsvp", upload.array("passports"), (req, res) => {
  try {
    const mainEmail = (req.body.mainEmail || "").trim();
    const guests    = JSON.parse(req.body.guests || "[]");
    if (!mainEmail || !guests.length)
      return res.status(400).json({ ok:false, error:"bad_request" });

    // 1. Build set of uploaded filenames (without extension)
    const passportSet = new Set(
      req.files.map(f => path.parse(f.filename).name.toLowerCase())
    );

    // 2. Open / create workbook
    const { wb, ws } = loadWorkbook();
    const before     = XLSX.utils.sheet_to_json(ws);

    // 3. Build new rows
    const newRows = guests.map((g, idx) => {
      const norm = [
        g.firstName, g.middleName, g.lastName, idx + 1
      ].filter(Boolean).join("_")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_\u0590-\u05FF]/g, "") // keep Hebrew letters too
        .toLowerCase();

      return {
        guest_id      : `${mainEmail}_${idx + 1}`,
        main_email    : mainEmail,
        guest_index   : idx + 1,
        first_name    : g.firstName,
        middle_name   : g.middleName,
        last_name     : g.lastName,
        guest_email   : g.email,
        age_group     : g.ageGroup,
        attendance    : g.attendance,
        allergies     : (g.allergies || []).join(", "),
        other_allergy : g.otherAllergy,
        passport      : passportSet.has(norm) ? "yes" : g.passport
      };
    });

    // 4. Save workbook (with retry)
    wb.Sheets[wb.SheetNames[0]] =
      XLSX.utils.json_to_sheet(before.concat(newRows));
    writeWorkbookWithRetry(wb);

    res.json({ ok:true, guests:newRows.length, images:req.files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, error:"server_error" });
  }
});

// ───── Listen ─────
app.listen(PORT, "0.0.0.0",
  () => console.log(`✅  API ready on http://localhost:${PORT}`));
