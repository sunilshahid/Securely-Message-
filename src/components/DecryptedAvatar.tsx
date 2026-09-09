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
    if (!photoUrl) return;
    if (!photoUrl.includes("|")) {
      setUrl(photoUrl);
      return;
    }
    
    let active = true;
    const [attachmentId, keyHex, mimeType] = photoUrl.split("|");
    import("../crypto").then(({ decryptFile }) => {
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
          const objectUrl = URL.createObjectURL(decryptedBlob);
          setUrl(objectUrl);
        })
        .catch(err => { if (err.message !== 'Failed to fetch') console.error(err); });
    });
    
    return () => {
      active = false;
      if (url && photoUrl.includes("|")) URL.revokeObjectURL(url);
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
