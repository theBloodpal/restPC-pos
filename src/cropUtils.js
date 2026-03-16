export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    // Set the canvas size to exactly 400x400 to keep it lightweight
    canvas.width = 400;
    canvas.height = 400;

    // Draw the cropped image onto the canvas
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        400,
        400
    );

    return new Promise((resolve, reject) => {
        // 🔥 THE FIX: Export as a WebP image at 80% quality instead of a heavy JPEG
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }
            // Create a new File object from the blob
            const file = new File([blob], 'menu_image.webp', { type: 'image/webp' });
            resolve(file);
        }, 'image/webp', 0.8);
    });
}