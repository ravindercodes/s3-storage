import AWS from 'aws-sdk';
import { s3Service } from './s3Service';

export interface ChunkProgress {
  uploadId?: string;
  parts: { [partNumber: number]: { etag: string; size: number } };
  totalSize: number;
  uploadedSize: number;
  fileName: string;
  key: string;
  lastModified: number;
}

export interface DownloadProgress {
  totalSize: number;
  downloadedSize: number;
  chunks: { [chunkIndex: number]: { start: number; end: number; downloaded: boolean } };
  fileName: string;
  key: string;
  lastModified: number;
}

const CHUNK_SIZE = 5 * 1024 * 1024;
const STORAGE_PREFIX = 'resumable_';

class ResumableService {
  private s3: AWS.S3 | null = null;
  private config: any = null;
  private activeUploads: Map<string, { abort: () => void; isPaused: boolean }> = new Map();

  constructor() {
    this.checkS3Configuration();
  }

  private checkS3Configuration() {
    if (s3Service.isConfigured()) {
      this.s3 = (s3Service as any).s3;
      this.config = (s3Service as any).config;
    }
  }

  private saveUploadProgress(key: string, progress: ChunkProgress) {
    localStorage.setItem(`${STORAGE_PREFIX}upload_${key}`, JSON.stringify(progress));
  }

  private loadUploadProgress(key: string): ChunkProgress | null {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}upload_${key}`);
    return stored ? JSON.parse(stored) : null;
  }

  private saveDownloadProgress(key: string, progress: DownloadProgress) {
    localStorage.setItem(`${STORAGE_PREFIX}download_${key}`, JSON.stringify(progress));
  }

  private loadDownloadProgress(key: string): DownloadProgress | null {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}download_${key}`);
    return stored ? JSON.parse(stored) : null;
  }

  private clearUploadProgress(key: string) {
    localStorage.removeItem(`${STORAGE_PREFIX}upload_${key}`);
  }

  private clearDownloadProgress(key: string) {
    localStorage.removeItem(`${STORAGE_PREFIX}download_${key}`);
  }

  clearAllUploadProgress(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}upload_`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  clearAllUploads(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}upload_`)) {
        keysToRemove.push(key);
      }
    }
    
    console.log('Clearing all uploads from localStorage:', keysToRemove);
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  clearCompletedUploads(): void {
    const uploads = this.getPendingUploads();
    
    Object.entries(uploads).forEach(([uploadKey, progress]) => {
      const progressPercent = (progress.uploadedSize / progress.totalSize) * 100;
      
      if (progressPercent >= 99.9) { // Use 99.9% to account for floating point precision
        console.log(`Clearing completed upload: ${uploadKey} (${progressPercent}%)`);
        this.clearUploadProgress(uploadKey);
      }
    });
  }

  async resumableUpload(
    file: File,
    key: string,
    onProgress?: (uploaded: number, total: number) => void
  ): Promise<void> {
    this.checkS3Configuration();
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    if (file.size < 10 * 1024 * 1024) {
      throw new Error('File too small for resumable upload. Use regular upload instead.');
    }

    const fileKey = `${key}_${file.name}_${file.size}_${file.lastModified}`;
    let progress = this.loadUploadProgress(fileKey);
    let isAborted = false;

    const abortController = {
      abort: () => {
        isAborted = true;
        this.activeUploads.delete(fileKey);
      },
      isPaused: false
    };
    this.activeUploads.set(fileKey, abortController);

    if (progress && (progress.totalSize !== file.size || progress.fileName !== file.name)) {
      progress = null;
      this.clearUploadProgress(fileKey);
    }

    if (!progress) {
      const createResponse = await this.s3.createMultipartUpload({
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: file.type || 'application/octet-stream'
      }).promise();

      progress = {
        uploadId: createResponse.UploadId!,
        parts: {},
        totalSize: file.size,
        uploadedSize: 0,
        fileName: file.name,
        key: key,
        lastModified: file.lastModified
      };
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    try {
      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        if (isAborted) {
          throw new Error('Upload cancelled');
        }
        
        if (abortController.isPaused) {
          this.saveUploadProgress(fileKey, progress);
          console.log(`Upload paused for ${file.name}, saving progress`);
          
          while (abortController.isPaused && !isAborted) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          if (isAborted) {
            throw new Error('Upload cancelled');
          }
          
          console.log(`Upload resumed for ${file.name}`);
        }

        if (progress.parts[partNumber]) {
          continue;
        }

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const uploadResponse = await this.s3.uploadPart({
          Bucket: this.config.bucketName,
          Key: key,
          PartNumber: partNumber,
          UploadId: progress.uploadId!,
          Body: chunk
        }).promise();

        progress.parts[partNumber] = {
          etag: uploadResponse.ETag!,
          size: chunk.size
        };

        progress.uploadedSize += chunk.size;

        this.saveUploadProgress(fileKey, progress);

        if (onProgress) {
          onProgress(progress.uploadedSize, progress.totalSize);
        }
      }

      const parts = Object.keys(progress.parts)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(partNumber => ({
          ETag: progress.parts[parseInt(partNumber)].etag,
          PartNumber: parseInt(partNumber)
        }));

      await this.s3.completeMultipartUpload({
        Bucket: this.config.bucketName,
        Key: key,
        UploadId: progress.uploadId!,
        MultipartUpload: { Parts: parts }
      }).promise();

      this.clearUploadProgress(fileKey);
      this.activeUploads.delete(fileKey);

    } catch (error) {
      console.error('Upload failed:', error);
      
      if (!isAborted) {
        this.saveUploadProgress(fileKey, progress);
      }
      
      this.activeUploads.delete(fileKey);
      throw error;
    }
  }

  pauseUpload(fileKey: string): void {
    const activeUpload = this.activeUploads.get(fileKey);
    if (activeUpload) {
      activeUpload.isPaused = true;
    }
  }

  resumeUpload(fileKey: string): void {
    const activeUpload = this.activeUploads.get(fileKey);
    if (activeUpload) {
      activeUpload.isPaused = false;
    }
  }

  cancelUpload(fileKey: string): void {
    const activeUpload = this.activeUploads.get(fileKey);
    if (activeUpload) {
      activeUpload.abort();
    }
    
    this.clearUploadProgress(fileKey);
    
    const keyVariations = [
      fileKey,
      fileKey.replace(/_\d+$/, ''), 
      fileKey.replace(/_\d+_\d+$/, ''),
    ];
    
    keyVariations.forEach(key => {
      try {
        this.clearUploadProgress(key);
      } catch (error) {
      }
    });
  }

  isUploadPaused(fileKey: string): boolean {
    const activeUpload = this.activeUploads.get(fileKey);
    return activeUpload ? activeUpload.isPaused : false;
  }

  isUploadActive(fileKey: string): boolean {
    return this.activeUploads.has(fileKey);
  }

  getActiveUploads(): string[] {
    return Array.from(this.activeUploads.keys());
  }

  async resumableDownload(
    key: string,
    fileName: string,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<Blob> {
    this.checkS3Configuration();
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    const fileKey = `${key}_${fileName}`;
    let progress = this.loadDownloadProgress(fileKey);

    try {
      const headResponse = await this.s3.headObject({
        Bucket: this.config.bucketName,
        Key: key
      }).promise();

      const totalSize = headResponse.ContentLength!;
      const lastModified = headResponse.LastModified!.getTime();

      if (progress && progress.lastModified !== lastModified) {
        progress = null;
        this.clearDownloadProgress(fileKey);
      }

      if (!progress) {
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const chunks: { [chunkIndex: number]: { start: number; end: number; downloaded: boolean } } = {};
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
          chunks[i] = { start, end, downloaded: false };
        }

        progress = {
          totalSize,
          downloadedSize: 0,
          chunks,
          fileName,
          key,
          lastModified
        };
      }

      const downloadedChunks: { [index: number]: ArrayBuffer } = {};
      
      for (const [chunkIndex, chunkInfo] of Object.entries(progress.chunks)) {
        const index = parseInt(chunkIndex);
        
        if (chunkInfo.downloaded) {
          continue;
        }

        const response = await this.s3.getObject({
          Bucket: this.config.bucketName,
          Key: key,
          Range: `bytes=${chunkInfo.start}-${chunkInfo.end}`
        }).promise();

        downloadedChunks[index] = response.Body as ArrayBuffer;
        progress.chunks[index].downloaded = true;
        progress.downloadedSize += (chunkInfo.end - chunkInfo.start + 1);

        this.saveDownloadProgress(fileKey, progress);

        if (onProgress) {
          onProgress(progress.downloadedSize, progress.totalSize);
        }
      }

      const allChunks: ArrayBuffer[] = [];
      for (let i = 0; i < Object.keys(progress.chunks).length; i++) {
        if (downloadedChunks[i]) {
          allChunks.push(downloadedChunks[i]);
        } else {
          const chunkInfo = progress.chunks[i];
          const response = await this.s3.getObject({
            Bucket: this.config.bucketName,
            Key: key,
            Range: `bytes=${chunkInfo.start}-${chunkInfo.end}`
          }).promise();
          allChunks.push(response.Body as ArrayBuffer);
        }
      }

      this.clearDownloadProgress(fileKey);

      return new Blob(allChunks);

    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  async abortUpload(key: string, fileName: string, fileSize?: number, lastModified?: number): Promise<void> {
    this.checkS3Configuration();
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    const fileKey = fileSize && lastModified 
      ? `${key}_${fileName}_${fileSize}_${lastModified}`
      : `${key}_${fileName}`;
    
    const progress = this.loadUploadProgress(fileKey);
    
    if (progress && progress.uploadId) {
      try {
        await this.s3.abortMultipartUpload({
          Bucket: this.config.bucketName,
          Key: key,
          UploadId: progress.uploadId
        }).promise();
      } catch (error) {
        console.error('Failed to abort upload:', error);
      }
    }

    this.clearUploadProgress(fileKey);
  }

  getUploadProgress(key: string, fileName: string, fileSize: number, lastModified: number): ChunkProgress | null {
    const fileKey = `${key}_${fileName}_${fileSize}_${lastModified}`;
    return this.loadUploadProgress(fileKey);
  }

  getDownloadProgress(key: string, fileName: string): DownloadProgress | null {
    const fileKey = `${key}_${fileName}`;
    return this.loadDownloadProgress(fileKey);
  }

  getPendingUploads(): { [key: string]: ChunkProgress } {
    const uploads: { [key: string]: ChunkProgress } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}upload_`)) {
        const uploadKey = key.replace(`${STORAGE_PREFIX}upload_`, '');
        const progress = localStorage.getItem(key);
        if (progress) {
          uploads[uploadKey] = JSON.parse(progress);
        }
      }
    }
    
    return uploads;
  }

  getPendingDownloads(): { [key: string]: DownloadProgress } {
    const downloads: { [key: string]: DownloadProgress } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${STORAGE_PREFIX}download_`)) {
        const downloadKey = key.replace(`${STORAGE_PREFIX}download_`, '');
        const progress = localStorage.getItem(key);
        if (progress) {
          downloads[downloadKey] = JSON.parse(progress);
        }
      }
    }
    
    return downloads;
  }

  clearUploadFromStorage(fileKey: string): void {
    this.clearUploadProgress(fileKey);
  }
}

export const resumableService = new ResumableService();

if (typeof window !== 'undefined') {
  (window as any).debugResumableService = {
    clearAllUploads: () => resumableService.clearAllUploads(),
    getPendingUploads: () => resumableService.getPendingUploads(),
    clearCompletedUploads: () => resumableService.clearCompletedUploads(),
    getActiveUploads: () => resumableService.getActiveUploads(),
    isUploadActive: (fileKey: string) => resumableService.isUploadActive(fileKey),
    clearAllAndReload: () => {
      resumableService.clearAllUploads();
      console.log('All uploads cleared. Reloading page...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };
}
