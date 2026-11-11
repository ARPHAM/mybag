export interface PreparedImage {
  blob: Blob;
  base64: string;
  filename: string;
  contentType: string;
}

/**
 * Nén và thu nhỏ ảnh phía client (mặc định tối đa 1280px, JPEG 0.82)
 * để tải nhanh trên mobile và tránh lỗi payload quá lớn.
 */
export function compressImageFile(
  file: File,
  maxSize: number = 1280,
  quality: number = 0.82
): Promise<PreparedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Không thể đọc file ảnh'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              blob: file,
              base64: dataUrl,
              filename: file.name || 'photo.jpg',
              contentType: file.type || 'image/jpeg',
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            (blob) => {
              const baseName = (file.name || 'photo').replace(/\.[^/.]+$/, '');
              resolve({
                blob: blob || file,
                base64: compressedBase64,
                filename: `${baseName}.jpg`,
                contentType: 'image/jpeg',
              });
            },
            'image/jpeg',
            quality
          );
        } catch {
          resolve({
            blob: file,
            base64: dataUrl,
            filename: file.name || 'photo.jpg',
            contentType: file.type || 'image/jpeg',
          });
        }
      };
      img.onerror = () => {
        resolve({
          blob: file,
          base64: dataUrl,
          filename: file.name || 'photo.jpg',
          contentType: file.type || 'image/jpeg',
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}
