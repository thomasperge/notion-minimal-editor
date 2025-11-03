/**
 * Compresse et optimise une image pour réduire drastiquement sa taille
 * - Redimensionne à max 800px (largeur ou hauteur)
 * - Compresse avec qualité 0.75
 * - Convertit en WebP si possible, sinon JPEG
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number; // Taille max cible en KB
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75,
    maxSizeKB = 200,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) {
        reject(new Error("Failed to read file"));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          // Calculer les nouvelles dimensions en conservant le ratio
          let { width, height } = img;
          const aspectRatio = width / height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Créer un canvas pour redimensionner et compresser
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Essayer WebP d'abord, puis JPEG en fallback
          const tryCompress = (targetQuality: number, format: "webp" | "jpeg" = "webp") => {
            return new Promise<string>((resolveFormat, rejectFormat) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    rejectFormat(new Error("Failed to compress image"));
                    return;
                  }

                  // Vérifier la taille
                  const sizeKB = blob.size / 1024;

                  // Si c'est trop gros, réessayer avec une qualité plus basse (compression agressive)
                  if (sizeKB > maxSizeKB && targetQuality > 0.4) {
                    // Réduction plus agressive : -0.15 au lieu de -0.1, et limite à 0.4 au lieu de 0.5
                    const newQuality = Math.max(0.4, targetQuality - 0.15);
                    tryCompress(newQuality, format).then(resolveFormat).catch(rejectFormat);
                    return;
                  }

                  // Convertir en Data URL
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = reader.result as string;
                    console.log(
                      `✅ Image compressée: ${(file.size / 1024).toFixed(2)}KB → ${sizeKB.toFixed(2)}KB (${((1 - sizeKB / (file.size / 1024)) * 100).toFixed(1)}% réduction)`
                    );
                    resolveFormat(dataUrl);
                  };
                  reader.onerror = () => rejectFormat(new Error("Failed to read compressed blob"));
                  reader.readAsDataURL(blob);
                },
                format === "webp" ? "image/webp" : "image/jpeg",
                targetQuality
              );
            });
          };

          // Essayer WebP d'abord
          tryCompress(quality, "webp")
            .then(resolve)
            .catch(() => {
              // Si WebP échoue (navigateur non supporté), utiliser JPEG
              console.log("WebP non supporté, utilisation de JPEG");
              tryCompress(quality, "jpeg")
                .then(resolve)
                .catch(reject);
            });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      if (typeof result === "string") {
        img.src = result;
      } else {
        reject(new Error("Unexpected file reader result type"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

