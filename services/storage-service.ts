import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { storage } from "@/firebase/storage";

// ============================================================
// UPLOAD MATCH SCREENSHOT
// ============================================================

export async function uploadMatchScreenshot(
  matchId: string,
  file: File
) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const extension =
    file.name.split(".").pop() || "jpg";

  const fileName =
    `match-${matchId}-${Date.now()}.${extension}`;

  const storagePath =
    `match-screenshots/${matchId}/${fileName}`;

  const storageRef =
    ref(storage, storagePath);

  await uploadBytes(
    storageRef,
    file,
    {
      contentType: file.type,
    }
  );

  const downloadUrl =
    await getDownloadURL(storageRef);

  return {
    downloadUrl,
    storagePath,
    fileName,
  };
}