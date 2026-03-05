import multer from 'multer';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'application/sql',
  'text/x-sql',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const MAX_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_MB ?? '50', 10) * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, DOCX, TXT, CSV, JSON, SQL, PNG, JPG'));
    }
  },
});
