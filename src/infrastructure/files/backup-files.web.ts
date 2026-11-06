/** Web preview has no app file system or share sheet; the backup screen says so instead. */
export async function shareTextFile(_fileName: string, _content: string): Promise<void> {
  throw new Error('backup files are not available on web');
}

export async function pickTextFile(_maxBytes: number): Promise<{ text: string } | { tooLarge: true } | null> {
  throw new Error('backup files are not available on web');
}

export const backupFilesSupported = false;
