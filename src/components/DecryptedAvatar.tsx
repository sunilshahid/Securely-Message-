import React, { useState, useEffect } from "react";
import { decryptFile } from "../crypto";

export function DecryptedAvatar({ 
  photoUrl, 
  fallback,
  className
}: { 
  photoUrl?: string; 
  fallback: string;
  className: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setUrl(null);
      return;
    }
    if (!photoUrl.includes("|")) {
      setUrl(photoUrl);
      return;
    }
    
    let active = true;
    let createdUrl: string | null = null;
    const [rawAttachmentId, keyHex, mimeType] = photoUrl.split("|");
    const attachmentId = (rawAttachmentId || "").replace(/^(\/?api\/v1\/attachments\/)+/, "");

    fetch(`/api/v1/attachments/${attachmentId}`)
      .then((res) => {
        if (!res.ok) {
          console.warn("Avatar attachment missing, skipping.");
          return null;
        }
        return res.blob();
      })
      .then((blob) => {
        if (!blob) return null;
        return decryptFile(blob, keyHex, mimeType || "application/octet-stream");
      })
      .then((decryptedBlob) => {
        if (!active || !decryptedBlob) return;
        createdUrl = URL.createObjectURL(decryptedBlob);
        setUrl(createdUrl);
      })
      .catch((err) => {
        if (err?.message !== "Failed to fetch") console.error(err);
      });
    
    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
        createdUrl = null;
      }
    };
  }, [photoUrl]);

  return url ? (
    <img src={url} alt="Avatar" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-indigo-600 text-white font-semibold ${className}`}>
      <span>{fallback}</span>
    </div>
  );
}
