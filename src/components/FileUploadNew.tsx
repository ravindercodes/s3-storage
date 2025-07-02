import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, File, CheckCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { resumableService } from '../services/resumableService';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  currentPath: string;
  loading: boolean;
}

interface UploadStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'resuming';
  error?: string;
  isResumable?: boolean;
}

export function FileUpload({ onUpload, currentPath, loading }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<{ [key: string]: UploadStatus }>({});
  const [pausedUploads, setPausedUploads] = useState<Set<string>>(new Set());

  useEffect(() => {
    const pendingUploads = resumableService.getPendingUploads();
    const resumableStatuses: { [key: string]: UploadStatus } = {};
    
    Object.entries(pendingUploads).forEach(([, progress]) => {
      const fileName = progress.fileName;
      const placeholderFile = {
        name: fileName,
        size: progress.totalSize,
        type: '',
        lastModified: progress.lastModified,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        slice: () => new Blob(),
        stream: () => new ReadableStream(),
        text: () => Promise.resolve(''),
        webkitRelativePath: ''
      } as File;
      
      resumableStatuses[fileName] = {
        file: placeholderFile,
        progress: (progress.uploadedSize / progress.totalSize) * 100,
        status: 'paused',
        isResumable: true
      };
    });
    
    setUploadStatuses(resumableStatuses);
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    
    const newStatuses: { [key: string]: UploadStatus } = {};
    fileArray.forEach(file => {
      const existingProgress = resumableService.getUploadProgress(
        `${currentPath}${file.name}`,
        file.name,
        file.size,
        file.lastModified
      );
      
      newStatuses[file.name] = {
        file,
        progress: existingProgress ? (existingProgress.uploadedSize / existingProgress.totalSize) * 100 : 0,
        status: existingProgress ? 'paused' : 'pending',
        isResumable: existingProgress ? true : file.size > 10 * 1024 * 1024 // Files > 10MB are resumable
      };
    });
    
    setUploadStatuses(prev => ({ ...prev, ...newStatuses }));

    for (const file of fileArray) {
      if (!pausedUploads.has(file.name)) {
        await startUpload(file);
      }
    }
  };

  const startUpload = async (file: File) => {
    const fileName = file.name;
    const key = `${currentPath}${fileName}`;
    
    try {
      setUploadStatuses(prev => ({
        ...prev,
        [fileName]: { ...prev[fileName], status: 'uploading', error: undefined }
      }));

      if (uploadStatuses[fileName]?.isResumable) {
        await resumableService.resumableUpload(
          file,
          key,
          (uploaded, total) => {
            const progress = (uploaded / total) * 100;
            setUploadStatuses(prev => ({
              ...prev,
              [fileName]: { ...prev[fileName], progress }
            }));
          }
        );
      } else {
        await onUpload([file]);
      }

      setUploadStatuses(prev => ({
        ...prev,
        [fileName]: { ...prev[fileName], status: 'completed', progress: 100 }
      }));

    } catch (error) {
      console.error(`Upload failed for ${fileName}:`, error);
      setUploadStatuses(prev => ({
        ...prev,
        [fileName]: { 
          ...prev[fileName], 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
    }
  };

  const pauseUpload = (fileName: string) => {
    setPausedUploads(prev => new Set(prev.add(fileName)));
    setUploadStatuses(prev => ({
      ...prev,
      [fileName]: { ...prev[fileName], status: 'paused' }
    }));
  };

  const resumeUpload = async (fileName: string) => {
    setPausedUploads(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    
    setUploadStatuses(prev => ({
      ...prev,
      [fileName]: { ...prev[fileName], status: 'resuming' }
    }));

    await startUpload(uploadStatuses[fileName].file);
  };

  const cancelUpload = async (fileName: string) => {
    const status = uploadStatuses[fileName];
    if (status && status.isResumable) {
      const key = `${currentPath}${fileName}`;
      try {
        await resumableService.abortUpload(key, fileName);
      } catch (error) {
        console.error('Failed to abort upload:', error);
      }
    }

    setPausedUploads(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });

    setUploadStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[fileName];
      return newStatuses;
    });
  };

  const retryUpload = async (fileName: string) => {
    await startUpload(uploadStatuses[fileName].file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const hasActiveUploads = Object.keys(uploadStatuses).length > 0;

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Files</h3>
        <p className="text-gray-500 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Large files (&gt;10MB) support resumable upload
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Select Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {hasActiveUploads && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Upload Progress</h3>
          <div className="space-y-3">
            {Object.entries(uploadStatuses).map(([fileName, status]) => (
              <div key={fileName} className="flex items-center gap-3">
                {status.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : status.status === 'error' ? (
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate" title={fileName}>
                      {fileName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {Math.round(status.progress)}%
                      </span>
                      
                      {/* Upload Controls */}
                      {status.isResumable && status.status !== 'completed' && (
                        <div className="flex gap-1">
                          {status.status === 'uploading' ? (
                            <button
                              onClick={() => pauseUpload(fileName)}
                              className="p-1 text-gray-500 hover:text-gray-700 rounded"
                              title="Pause upload"
                            >
                              <Pause className="w-3 h-3" />
                            </button>
                          ) : status.status === 'paused' ? (
                            <button
                              onClick={() => resumeUpload(fileName)}
                              className="p-1 text-blue-500 hover:text-blue-700 rounded"
                              title="Resume upload"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                          ) : null}
                          
                          {status.status === 'error' && (
                            <button
                              onClick={() => retryUpload(fileName)}
                              className="p-1 text-orange-500 hover:text-orange-700 rounded"
                              title="Retry upload"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => cancelUpload(fileName)}
                            className="p-1 text-red-500 hover:text-red-700 rounded"
                            title="Cancel upload"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        status.status === 'error' ? 'bg-red-500' :
                        status.status === 'completed' ? 'bg-green-500' :
                        status.status === 'paused' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${status.progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Status Text */}
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${
                      status.status === 'error' ? 'text-red-600' :
                      status.status === 'completed' ? 'text-green-600' :
                      status.status === 'paused' ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {status.status === 'uploading' ? 'Uploading...' :
                       status.status === 'paused' ? 'Paused - Click play to resume' :
                       status.status === 'resuming' ? 'Resuming...' :
                       status.status === 'completed' ? 'Upload complete' :
                       status.status === 'error' ? `Error: ${status.error}` :
                       'Pending'}
                    </span>
                    
                    {status.isResumable && (
                      <span className="text-xs text-gray-400">Resumable</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
