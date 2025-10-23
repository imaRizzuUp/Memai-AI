import type { CropRect } from '../types';

export const createExtendedImageAndMask = (
  originalImageSrc: string, 
  rect: { x: number; y: number; width: number; height: number; }
): Promise<{ extendedImage: string; mask: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;

        const newWidth = Math.round(originalWidth * rect.width);
        const newHeight = Math.round(originalHeight * rect.height);

        const offsetX = Math.round(-rect.x * originalWidth);
        const offsetY = Math.round(-rect.y * originalHeight);

        // Create extended image canvas
        const extendedCanvas = document.createElement('canvas');
        extendedCanvas.width = newWidth;
        extendedCanvas.height = newHeight;
        const extendedCtx = extendedCanvas.getContext('2d');
        if (!extendedCtx) return reject(new Error('Could not get extended canvas context'));
        
        extendedCtx.drawImage(img, offsetX, offsetY);

        // Create mask canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = newWidth;
        maskCanvas.height = newHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return reject(new Error('Could not get mask canvas context'));
        
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, newWidth, newHeight);

        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(offsetX, offsetY, originalWidth, originalHeight);

        resolve({
          extendedImage: extendedCanvas.toDataURL('image/png'),
          mask: maskCanvas.toDataURL('image/png')
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for extension.'));
    img.src = originalImageSrc;
  });
};

// Helper function to apply a mask to an image using canvas
export const applyMaskToImage = (originalImageSrc: string, maskImageSrc: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const originalImg = new Image();
    const maskImg = new Image();

    let loadedImages = 0;
    const onImageLoad = () => {
      loadedImages++;
      if (loadedImages === 2) {
        try {
          const canvas = document.createElement('canvas');
          // Use willReadFrequently for performance with getImageData
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (!ctx) {
            return reject(new Error('Could not get canvas context'));
          }

          canvas.width = originalImg.naturalWidth;
          canvas.height = originalImg.naturalHeight;

          // Draw original image to the main canvas
          ctx.drawImage(originalImg, 0, 0);
          const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Use a temporary canvas to draw and get data from the mask
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          if (!tempCtx) {
            return reject(new Error('Could not get temporary canvas context'));
          }
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          // Draw mask resized to fit the original image dimensions
          tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
          const maskImageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Iterate through each pixel of the mask
          for (let i = 0; i < maskImageData.data.length; i += 4) {
            // Calculate the luminance of the mask pixel. This will handle pure B&W masks
            // as well as masks with anti-aliased (gray) edges gracefully, resulting in a smooth blend.
            // Using a standard luminance calculation is robust even if the mask isn't perfectly grayscale.
            const r = maskImageData.data[i];
            const g = maskImageData.data[i + 1];
            const b = maskImageData.data[i + 2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // The luminance value (0-255) is used directly as the alpha value for the original image.
            // White pixels from the mask (luminance ≈ 255) will make the corresponding original pixel opaque.
            // Black pixels (luminance ≈ 0) will make it transparent.
            // Gray pixels will create a smooth, semi-transparent transition.
            originalImageData.data[i + 3] = luminance;
          }
          
          // Clear the canvas and put the modified image data back
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(originalImageData, 0, 0);

          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      }
    };

    originalImg.onload = onImageLoad;
    maskImg.onload = onImageLoad;
    originalImg.onerror = () => reject(new Error('Failed to load original image.'));
    maskImg.onerror = () => reject(new Error('Failed to load mask image.'));

    originalImg.crossOrigin = "anonymous";
    maskImg.crossOrigin = "anonymous";
    
    originalImg.src = originalImageSrc;
    maskImg.src = maskImageSrc;
  });
};


export const createMaskFromCrop = (imageSrc: string, crop: CropRect): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Fill the entire canvas with black
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate the pixel coordinates and dimensions of the crop area
            const sx = crop.x * img.naturalWidth;
            const sy = crop.y * img.naturalHeight;
            const sWidth = crop.width * img.naturalWidth;
            const sHeight = crop.height * img.naturalHeight;
            
            // Draw a simple, hard-edged white rectangle for the mask.
            // This is more reliable for the AI model than a feathered mask.
            ctx.fillStyle = 'white';
            ctx.fillRect(sx, sy, sWidth, sHeight);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image for mask creation.'));
        img.src = imageSrc;
    });
};

export const resizeImage = (base64Str: string, maxDimension: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            let { width, height } = img;

            if (width <= maxDimension && height <= maxDimension) {
                // No resizing needed
                resolve(base64Str);
                return;
            }

            if (width > height) {
                if (width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for resizing'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            // Extract original mime type, default to jpeg for resized images if not found
            const mimeType = base64Str.match(/^data:(image\/.+);base64,/)?.[1] || 'image/jpeg';
            resolve(canvas.toDataURL(mimeType));
        };
        img.onerror = (err) => {
            reject(new Error('Failed to load image for resizing.'));
        };
    });
};