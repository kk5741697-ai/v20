'use client';

import { useState } from 'react';
import { ImageToolsLayout } from '@/components/image-tools-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Upload, Compress } from 'lucide-react';
import { ImageProcessor } from '@/lib/processors/image-processor';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useDownloadManager } from '@/hooks/use-download-manager';
import { ProcessingStatus } from '@/components/processing-status';

export default function ImageCompressorPage() {
  const [quality, setQuality] = useState([80]);
  const [format, setFormat] = useState<string>('jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const { files, handleFileUpload, clearFiles } = useFileUpload({
    accept: 'image/*',
    multiple: false,
  });

  const { downloadFile } = useDownloadManager();

  const handleCompress = async () => {
    if (!files.length) return;

    setIsProcessing(true);
    try {
      const file = files[0];
      setOriginalSize(file.size);

      const result = await ImageProcessor.compressImage(file, {
        quality: quality[0] / 100,
        format: format as 'jpeg' | 'png' | 'webp',
      });

      setCompressedImage(result.url);
      setCompressedSize(result.size);
    } catch (error) {
      console.error('Compression failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (compressedImage) {
      const filename = `compressed-${files[0]?.name.split('.')[0]}.${format}`;
      downloadFile(compressedImage, filename);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressionRatio = originalSize && compressedSize 
    ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
    : 0;

  return (
    <ImageToolsLayout
      title="Image Compressor"
      description="Reduce image file sizes while maintaining quality"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload & Settings
            </CardTitle>
            <CardDescription>
              Choose your image and compression settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="file-upload">Select Image</Label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <Label>Output Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quality: {quality[0]}%</Label>
              <Slider
                value={quality}
                onValueChange={setQuality}
                max={100}
                min={10}
                step={5}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lower size</span>
                <span>Higher quality</span>
              </div>
            </div>

            <Button
              onClick={handleCompress}
              disabled={!files.length || isProcessing}
              className="w-full"
            >
              <Compress className="h-4 w-4 mr-2" />
              {isProcessing ? 'Compressing...' : 'Compress Image'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Result
            </CardTitle>
            <CardDescription>
              Preview and download your compressed image
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing && <ProcessingStatus message="Compressing image..." />}
            
            {compressedImage && (
              <div className="space-y-4">
                <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    src={compressedImage}
                    alt="Compressed"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Original Size</p>
                    <p className="text-gray-600">{formatFileSize(originalSize)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Compressed Size</p>
                    <p className="text-gray-600">{formatFileSize(compressedSize)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-medium">Size Reduction</p>
                    <p className="text-green-600">{compressionRatio}% smaller</p>
                  </div>
                </div>

                <Button onClick={handleDownload} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Compressed Image
                </Button>
              </div>
            )}

            {!files.length && !isProcessing && (
              <div className="text-center py-8 text-gray-500">
                Upload an image to get started
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ImageToolsLayout>
  );
}