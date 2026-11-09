import * as FileSystem from 'expo-file-system/legacy';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';

import { storage } from './firebase';

type UploadAlertMediaInput = {
  uri: string;
  userId: string;
  contentType?: string;
};

function assertStorage() {
  if (!storage) {
    throw new Error('Firebase Storage no esta configurado.');
  }

  return storage;
}

function getFileExtension(contentType?: string) {
  if (contentType?.includes('mp4')) {
    return 'mp4';
  }

  if (contentType?.includes('quicktime')) {
    return 'mov';
  }

  if (contentType?.includes('png')) {
    return 'png';
  }

  if (contentType?.includes('webp')) {
    return 'webp';
  }

  return 'jpg';
}

async function readMediaAsBase64(uri: string) {
  if (uri.startsWith('data:')) {
    const [, base64Payload] = uri.split(',');
    if (!base64Payload) {
      throw new Error('La imagen seleccionada no tiene datos validos.');
    }

    return base64Payload;
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function uploadAlertMedia({
  uri,
  userId,
  contentType = 'image/jpeg',
}: UploadAlertMediaInput) {
  const readyStorage = assertStorage();
  const extension = getFileExtension(contentType);
  const mediaRef = ref(
    readyStorage,
    `alerts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
  );
  const base64 = await readMediaAsBase64(uri);

  await uploadString(mediaRef, base64, 'base64', { contentType });

  return getDownloadURL(mediaRef);
}
