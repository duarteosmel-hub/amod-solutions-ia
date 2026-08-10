export interface OpenDriveDocOptions {
  fileId?: string;
  fileName?: string;
  targetPath?: string;
  webViewLink?: string;
}

/**
 * Utility to reliably open a Google Drive PDF/document in a new browser tab.
 * Uses the official Google Drive webViewLink or resolves the real fileId from Google Drive API.
 */
export async function openGoogleDriveDocument(opts: OpenDriveDocOptions): Promise<void> {
  // 1. If webViewLink is already a valid Google Drive URL, open it directly
  if (opts.webViewLink && typeof opts.webViewLink === 'string' && opts.webViewLink.startsWith('http') && !opts.webViewLink.includes('undefined')) {
    window.open(opts.webViewLink, '_blank', 'noopener,noreferrer');
    return;
  }

  // 2. If fileId is present, construct official Google Drive view link
  if (opts.fileId && typeof opts.fileId === 'string' && opts.fileId.trim().length > 3) {
    const directLink = `https://drive.google.com/file/d/${opts.fileId.trim()}/view`;
    window.open(directLink, '_blank', 'noopener,noreferrer');
    return;
  }

  // 3. Otherwise, resolve the fileId & webViewLink from the server using Google Drive API
  try {
    const res = await fetch('/api/drive/resolve-file-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: opts.fileId,
        fileName: opts.fileName,
        targetPath: opts.targetPath
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.webViewLink) {
        window.open(data.webViewLink, '_blank', 'noopener,noreferrer');
        return;
      }
    }
  } catch (err) {
    console.error('Error resolving document link from Google Drive API:', err);
  }

  // 4. Fallback if fileId exists or alert user
  if (opts.fileId) {
    window.open(`https://drive.google.com/file/d/${opts.fileId}/view`, '_blank', 'noopener,noreferrer');
  } else if (opts.fileName) {
    alert(`No se pudo encontrar el enlace directo del archivo "${opts.fileName}" en Google Drive.`);
  }
}
