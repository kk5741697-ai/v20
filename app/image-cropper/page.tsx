'use client';

import { ImageToolsLayout } from '@/components/image-tools-layout';

export default function ImageCropperPage() {
  const cropperOptions = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Portrait (3:4)', value: '3:4' },
    { label: 'Landscape (4:3)', value: '4:3' },
    { label: 'Widescreen (16:9)', value: '16:9' },
    { label: 'Custom', value: 'custom' }
  ];

  const processCrop = async (file: File, options: any) => {
    return new Promise<File>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        let cropWidth = width;
        let cropHeight = height;

        // Calculate crop dimensions based on aspect ratio
        if (options.aspectRatio && options.aspectRatio !== 'custom') {
          const [ratioW, ratioH] = options.aspectRatio.split(':').map(Number);
          const targetRatio = ratioW / ratioH;
          const currentRatio = width / height;

          if (currentRatio > targetRatio) {
            cropWidth = height * targetRatio;
            cropHeight = height;
          } else {
            cropWidth = width;
            cropHeight = width / targetRatio;
          }
        }

        // Set canvas dimensions
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        // Calculate crop position (center crop)
        const startX = (width - cropWidth) / 2;
        const startY = (height - cropHeight) / 2;

        // Draw cropped image
        ctx?.drawImage(
          img,
          startX, startY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(croppedFile);
          } else {
            reject(new Error('Failed to crop image'));
          }
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  return (
    <ImageToolsLayout
      title="Image Cropper"
      description="Crop your images to different aspect ratios or custom dimensions"
      options={cropperOptions}
      optionLabel="Aspect Ratio"
      processFunction={processCrop}
      acceptedFileTypes="image/*"
      maxFileSize={10 * 1024 * 1024} // 10MB
    />
  );
}