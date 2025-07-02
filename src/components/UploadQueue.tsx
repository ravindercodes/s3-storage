import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, Pause, Play, RotateCcw, ChevronRight, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import { resumableService } from '../services/resumableService';

interface UploadQueueItem {
  id: string;
  file: File;
  key: string;
  progress: number;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'error' | 'resuming';
  error?: string;
  isResumable: boolean;
  addedAt: Date;
}

interface UploadQueueProps {
  currentPath: string;
  onUpload: (files: File[]) => Promise<void>;
  onAddFiles?: (addFilesFunction: (files: File[]) => void) => void;
  onStatusChange?: (hasActiveUploads: boolean, hasQueuedFiles: boolean) => void;
  onVisibilityChange?: (isOpen: boolean) => void;
  forceHide?: boolean;
}

export function UploadQueue({ currentPath, onUpload, onAddFiles, onStatusChange, onVisibilityChange, forceHide }: UploadQueueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const loadedPendingRef = useRef(false);

  useEffect(() => {
    if (loadedPendingRef.current) return;
    
    loadedPendingRef.current = true;
    console.log('UploadQueue: Initializing and loading pending uploads');
    
    resumableService.clearCompletedUploads();
    loadPendingUploads();
  }, []);

  useEffect(() => {
    if (onStatusChange) {
      const hasActiveUploads = queue.some(item => 
        item.status === 'uploading' || item.status === 'resuming' || item.status === 'paused'
      );
      const hasQueuedFiles = queue.length > 0;
      onStatusChange(hasActiveUploads, hasQueuedFiles);
    }
  }, [queue, onStatusChange]);

  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isOpen);
    }
  }, [isOpen, onVisibilityChange]);

  const addFilesToQueue = useCallback((files: File[]) => {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return;
    }

    const newItems: UploadQueueItem[] = [];
    
    files.forEach(file => {
      const key = `${currentPath}${file.name}`;
      
      const existingInQueue = queue.find(q => 
        q.key === key && 
        q.file.name === file.name && 
        q.file.size === file.size && 
        q.file.lastModified === file.lastModified
      );
      
      if (existingInQueue) {
        console.log(`File ${file.name} is already in the queue, skipping...`);
        return;
      }
      
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const existingProgress = resumableService.getUploadProgress(
        key,
        file.name,
        file.size,
        file.lastModified
      );
      
      newItems.push({
        id,
        file,
        key,
        progress: existingProgress ? (existingProgress.uploadedSize / existingProgress.totalSize) * 100 : 0,
        status: existingProgress ? 'paused' : 'queued',
        isResumable: file.size >= 10 * 1024 * 1024,
        addedAt: new Date()
      });
    });

    if (newItems.length > 0) {
      setQueue(prev => [...prev, ...newItems]);
      setIsOpen(true);
    }
  }, [currentPath, queue]);

  useEffect(() => {
    if (onAddFiles) {
      onAddFiles(addFilesToQueue);
    }
  }, [onAddFiles, addFilesToQueue]);

  const loadPendingUploads = () => {
    const pendingUploads = resumableService.getPendingUploads();
    const queueItems: UploadQueueItem[] = [];
    
    console.log('Loading pending uploads:', Object.keys(pendingUploads));
    
    Object.entries(pendingUploads).forEach(([uploadKey, progress]) => {
      const isAlreadyInQueue = queue.some(item => {
        const itemKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
        return itemKey === uploadKey;
      });
      
      if (isAlreadyInQueue) {
        console.log(`Upload ${uploadKey} already in queue, skipping`);
        return;
      }
      
      const progressPercent = (progress.uploadedSize / progress.totalSize) * 100;
      console.log(`Upload ${uploadKey}: ${progressPercent}% complete`);
      
      if (progressPercent >= 99.9) {
        console.log(`Removing completed upload from storage: ${uploadKey}`);
        resumableService.clearUploadFromStorage(uploadKey);
        return;
      }
      
      if (progress.uploadedSize >= progress.totalSize) {
        console.log(`Removing fully uploaded file from storage: ${uploadKey}`);
        resumableService.clearUploadFromStorage(uploadKey);
        return;
      }
      
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
      
      queueItems.push({
        id: `pending_${uploadKey}`,
        file: placeholderFile,
        key: uploadKey,
        progress: progressPercent,
        status: 'paused',
        isResumable: true,
        addedAt: new Date(progress.lastModified)
      });
    });
    
    if (queueItems.length > 0) {
      setQueue(queueItems);
    }
  };

  useEffect(() => {
    const hasQueuedItems = queue.some(item => item.status === 'queued' || item.status === 'paused');
    
    if (hasQueuedItems && !isProcessing && !processingRef.current) {
      console.log('Queue changed: triggering processing for queued items');
      const timer = setTimeout(() => {
        processQueue();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [queue, isProcessing]);

  const processQueue = async () => {
    if (processingRef.current || isProcessing) {
      console.log('ProcessQueue: Already processing, skipping');
      return;
    }
    
    const itemsToProcess = queue.filter(item => 
      item.status === 'queued'
    );
    
    if (itemsToProcess.length === 0) {
      console.log('ProcessQueue: No items to process');
      return;
    }
    
    console.log(`ProcessQueue: Starting to process ${itemsToProcess.length} items`);
    
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const nextItem = itemsToProcess[0];

      console.log(`ProcessQueue: Processing item ${nextItem.file.name} (${nextItem.status})`);
      await processUploadItem(nextItem);

    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const processUploadItem = async (item: UploadQueueItem) => {
    try {
      const currentItem = queue.find(q => q.id === item.id);
      if (!currentItem || currentItem.status === 'completed' || currentItem.status === 'error') {
        console.log(`Item ${item.file.name} is no longer available for processing (status: ${currentItem?.status})`);
        return;
      }

      const fileKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
      if (resumableService.isUploadActive(fileKey)) {
        console.log(`Upload ${item.file.name} is already active, skipping`);
        return;
      }

      console.log(`Starting upload for ${item.file.name}`);
      
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'uploading' as const, error: undefined } : q
      ));

      if (item.isResumable) {
        await resumableService.resumableUpload(
          item.file,
          item.key,
          (uploaded, total) => {
            const progress = (uploaded / total) * 100;
            setQueue(prev => prev.map(q => 
              q.id === item.id ? { ...q, progress } : q
            ));
          }
        );
      } else {
        const startTime = Date.now();
        let isPaused = false;
        
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, progress: 10 } : q
        ));
        
        const progressInterval = setInterval(() => {
          const currentItem = queue.find(q => q.id === item.id);
          if (currentItem?.status === 'paused') {
            isPaused = true;
            return;
          }
          
          if (!isPaused) {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(90, 10 + (elapsed / 50));
            setQueue(prev => prev.map(q => 
              q.id === item.id ? { ...q, progress } : q
            ));
          }
        }, 100);
        
        try {
          while (isPaused) {
            const currentItem = queue.find(q => q.id === item.id);
            if (currentItem?.status !== 'paused') {
              isPaused = false;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          await onUpload([item.file]);
        } finally {
          clearInterval(progressInterval);
        }
      }

      console.log(`Upload completed for ${item.file.name}`);
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'completed' as const, progress: 100 } : q
      ));

      if (item.isResumable) {
        const fileKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
        resumableService.clearUploadFromStorage(fileKey);
        console.log(`Cleared upload from storage: ${fileKey}`);
      }

      if (window.location.pathname === '/' || window.location.pathname.startsWith('/folder/')) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('refreshFileList'));
        }, 1000);
      }

      setTimeout(() => {
        setQueue(prev => prev.filter(q => q.id !== item.id));
      }, 3000);

    } catch (error) {
      console.error(`Upload failed for ${item.file.name}:`, error);
      
      if (error instanceof Error && error.message === 'Upload paused') {
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: 'paused' as const } : q
        ));
      } else {
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { 
            ...q, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Upload failed'
          } : q
        ));
      }
    }
  };

  const pauseUpload = (id: string) => {
    const item = queue.find(q => q.id === id);
    if (item) {
      if (item.isResumable) {
        const fileKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
        resumableService.pauseUpload(fileKey);
      }
    }
    
    setQueue(prev => prev.map(q => 
      q.id === id ? { ...q, status: 'paused' as const } : q
    ));
    
    console.log(`Paused upload for item ${id}`);
  };

  const resumeUpload = (id: string) => {
    const item = queue.find(q => q.id === id);
    if (item && item.isResumable) {
      const fileKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
      resumableService.resumeUpload(fileKey);
    }
    
    const newStatus = item?.isResumable ? 'uploading' : 'queued';
    setQueue(prev => prev.map(q => 
      q.id === id ? { ...q, status: newStatus } : q
    ));
    
    console.log(`Resumed upload for item ${id}`);
  };

  const retryUpload = (id: string) => {
    setQueue(prev => prev.map(q => 
      q.id === id ? { ...q, status: 'queued' as const, error: undefined } : q
    ));
  };

  const removeFromQueue = async (id: string) => {
    const item = queue.find(q => q.id === id);
    if (item) {
      const fileKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
      
      if (item.isResumable) {
        try {
          resumableService.cancelUpload(fileKey);
          
          if (item.status === 'uploading') {
            await resumableService.abortUpload(item.key, item.file.name, item.file.size, item.file.lastModified);
          }
        } catch (error) {
          console.error('Failed to abort upload:', error);
        }
      }

      const alternativeKeys = [
        fileKey,
        `${item.key}_${item.file.name}`,
        item.key
      ];

      alternativeKeys.forEach(key => {
        try {
          localStorage.removeItem(`resumable_upload_${key}`);
        } catch (error) {
        }
      });
    }

    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(q => q.status !== 'completed'));
  };

  const clearAll = async () => {
    for (const item of queue) {
      if (item.isResumable && item.status !== 'completed') {
        try {
          const fileKey = `${item.key}_${item.file.name}_${item.file.size}_${item.file.lastModified}`;
          resumableService.cancelUpload(fileKey);
          await resumableService.abortUpload(item.key, item.file.name, item.file.size, item.file.lastModified);

          const alternativeKeys = [
            fileKey,
            `${item.key}_${item.file.name}`,
            item.key
          ];

          alternativeKeys.forEach(key => {
            try {
              localStorage.removeItem(`resumable_upload_${key}`);
            } catch (error) {
            }
          });
        } catch (error) {
          console.error('Failed to abort upload:', error);
        }
      }
    }
    setQueue([]);
  };

  const getQueueStats = () => {
    const total = queue.length;
    const completed = queue.filter(q => q.status === 'completed').length;
    const uploading = queue.filter(q => q.status === 'uploading').length;
    const queued = queue.filter(q => q.status === 'queued').length;
    const paused = queue.filter(q => q.status === 'paused').length;
    const errors = queue.filter(q => q.status === 'error').length;
    
    return { total, completed, uploading, queued, paused, errors };
  };

  const stats = getQueueStats();
  const hasActiveUploads = stats.uploading > 0 || stats.queued > 0 || stats.paused > 0;
  
  const shouldShowButton = queue.length > 0 && !forceHide;

  return (
    <>
      {/* Upload Queue Button - Conditionally visible at bottom right */}
      {shouldShowButton && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed right-6 bottom-6 z-40 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            hasActiveUploads
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : queue.length > 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
          title="Upload Queue"
        >
          <Upload className="w-5 h-5" />
          {queue.length > 0 && (
            <span className="bg-white bg-opacity-20 rounded-full px-2 py-1 text-xs font-medium">
              {stats.completed}/{stats.total}
            </span>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      )}

      {/* Upload Queue Panel - Slide up from bottom */}
      <div className={`fixed bottom-0 right-0 w-96 h-96 bg-white shadow-2xl border border-gray-200 rounded-t-lg z-30 transform transition-transform duration-300 ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Upload Queue</h2>
            <div className="flex items-center gap-2">
              {stats.total > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {stats.completed}
                  </span>
                  {stats.uploading > 0 && (
                    <span className="flex items-center gap-1">
                      <Upload className="w-4 h-4 text-blue-500" />
                      {stats.uploading}
                    </span>
                  )}
                  {stats.queued > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-orange-500" />
                      {stats.queued}
                    </span>
                  )}
                  {stats.errors > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {stats.errors}
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Queue Actions */}
          {queue.length > 0 && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={clearCompleted}
                  disabled={stats.completed === 0}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Clear Completed
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Upload className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No uploads in queue</p>
                <p className="text-sm text-center px-4">
                  Drag and drop files anywhere or use the upload button to add files to the queue.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {queue.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      {item.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : item.status === 'uploading' ? (
                        <Upload className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      ) : item.status === 'paused' ? (
                        <Pause className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 min-w-0">
                        {/* File Info */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 truncate" title={item.file.name}>
                            {item.file.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {/* Upload Controls */}
                            {item.status !== 'completed' && (
                              <>
                                {item.status === 'uploading' ? (
                                  <button
                                    onClick={() => pauseUpload(item.id)}
                                    className="p-1 text-orange-500 hover:text-orange-700 rounded"
                                    title="Pause upload"
                                  >
                                    <Pause className="w-3 h-3" />
                                  </button>
                                ) : (item.status === 'paused' || item.status === 'queued') ? (
                                  <button
                                    onClick={() => resumeUpload(item.id)}
                                    className="p-1 text-blue-500 hover:text-blue-700 rounded"
                                    title="Resume/Start upload"
                                  >
                                    <Play className="w-3 h-3" />
                                  </button>
                                ) : null}
                                
                                {item.status === 'error' && (
                                  <button
                                    onClick={() => retryUpload(item.id)}
                                    className="p-1 text-green-500 hover:text-green-700 rounded"
                                    title="Retry upload"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                            
                            <button
                              onClick={() => removeFromQueue(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 rounded"
                              title="Remove from queue"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              item.status === 'error' ? 'bg-red-500' :
                              item.status === 'completed' ? 'bg-green-500' :
                              item.status === 'paused' ? 'bg-orange-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>

                        {/* Status and Progress Text */}
                        <div className="flex justify-between items-center text-xs">
                          <span className={`${
                            item.status === 'error' ? 'text-red-600' :
                            item.status === 'completed' ? 'text-green-600' :
                            item.status === 'paused' ? 'text-orange-600' :
                            item.status === 'uploading' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            {item.status === 'uploading' ? 'Uploading...' :
                             item.status === 'paused' ? 'Paused' :
                             item.status === 'resuming' ? 'Resuming...' :
                             item.status === 'completed' ? 'Completed' :
                             item.status === 'error' ? `Error: ${item.error}` :
                             'Queued'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{Math.round(item.progress)}%</span>
                            {item.isResumable && (
                              <span className="text-gray-400">Resumable</span>
                            )}
                          </div>
                        </div>

                        {/* File Size */}
                        <div className="text-xs text-gray-400 mt-1">
                          {(item.file.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop - only show when panel is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
