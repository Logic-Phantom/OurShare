import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes the backup to the app cache and opens the share sheet. The user decides where it goes. */
export async function shareTextFile(fileName: string, content: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '우리몫 백업 보내기', UTI: 'public.json' });
}

/** Returns null when the user cancels. Rejects files over `maxBytes` before reading them. */
export async function pickTextFile(maxBytes: number): Promise<{ text: string } | { tooLarge: true } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], multiple: false, copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const file = new File(asset.uri);
  if ((asset.size ?? file.size ?? 0) > maxBytes) return { tooLarge: true };
  const text = await file.text();
  if (file.exists) file.delete();
  return { text };
}

export const backupFilesSupported = true;
