// Helpers for the Google Drive links instructors paste (videos and lesson resources).

const ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

// Accepts a share link (file, slides, docs, sheets) or a bare file id.
export function parseDriveId(input) {
  const value = (input || '').trim();
  if (!value) return null;
  if (ID_PATTERN.test(value) && !value.includes('/')) return value;

  const patterns = [
    /\/(?:file|presentation|document|spreadsheets|forms)\/d\/([A-Za-z0-9_-]+)/,
    /[?&]id=([A-Za-z0-9_-]+)/,
    /\/d\/([A-Za-z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function detectResourceKind(url) {
  const value = (url || '').toLowerCase();
  if (value.includes('/presentation/')) return 'slides';
  if (value.includes('/document/')) return 'doc';
  if (value.includes('/spreadsheets/')) return 'sheet';
  if (value.endsWith('.pdf')) return 'pdf';
  if (value.includes('drive.google.com') || value.includes('drive.usercontent.google.com')) return 'file';
  return 'link';
}

// Turns a share link into a direct download, so the button saves the file instead of opening an editor.
export function resourceDownloadUrl(url, kind) {
  const id = parseDriveId(url);
  if (!id) return url;
  const exports = {
    slides: `https://docs.google.com/presentation/d/${id}/export/pptx`,
    doc: `https://docs.google.com/document/d/${id}/export?format=docx`,
    sheet: `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,
  };
  if (exports[kind]) return exports[kind];
  if ((url || '').includes('drive.google.com') || kind === 'file' || kind === 'pdf') {
    return `https://drive.usercontent.google.com/download?id=${id}&export=download`;
  }
  return url;
}
