'use client';

import { ImageToolsLayout } from '@/components/image-tools-layout';
import { ImageProcessor } from '@/lib/processors/image-processor';

const compressionOptions = [
  { value: '0.9', label: 'High Quality (90%)' },
  { value: '0.7', label: 'Medium Quality (70%)' },
  { value: '0.5', label: 'Low Quality (50%)' },
  { value: '0.3', label: 'Very Low Quality (30%)' }
];

export default function ImageCompressorPage() {
  const processImage = async (fiimport { Download, Upload, Compass as Compress } from 'lucide-react'ality = parseFloat(options.quality || '0.7');
    return await ImageProcessor.compressImage(file, quality);
  };

  return (
    <ImageToolsLayout
      title="Image Compressor"
      description="Reduce image file size while maintaining quality"
      acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
      processImage={processImage}
      options={[
        {
          key: 'quality',
          label: 'Compression Quality',
          type: 'select',
          options: compressionOptions,
          defaultValue: '0.7'
        }
      ]}
      outputFormat="same"
    />
  );
}