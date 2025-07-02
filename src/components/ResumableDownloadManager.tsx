import { useState, useEffect } from 'react';
import { Download, Play, X } from 'lucide-react';
import { resumableService, DownloadProgress } from '../services/resumableService';

interface ResumableDownloadManagerProps {
  onClose: () => void;
  onStatusChange?: (hasActiveDownloads: boolean, hasPendingDownloads: boolean) => void;
}

export function ResumableDownloadManager({ onClose, onStatusChange }: ResumableDownloadManagerProps) {
  const [pendingDownloads, setPendingDownloads] = useState<{ [key: string]: DownloadProgress }>({});
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());

  useEffect(() => {
    const pending = resumableService.getPendingDownloads();
    setPendingDownloads(pending);
  }, []);

  useEffect(() => {
    if (onStatusChange) {
      const hasActiveDownloads = activeDownloads.size > 0;
      const hasPendingDownloads = Object.keys(pendingDownloads).length > 0;
      onStatusChange(hasActiveDownloads, hasPendingDownloads);
    }
  }, [activeDownloads, pendingDownloads, onStatusChange]);

  const resumeDownload = async (key: string, download: DownloadProgress) => {
    setActiveDownloads(prev => new Set(prev.add(key)));
    
    try {
      const blob = await resumableService.resumableDownload(
        download.key,
        download.fileName,
        (downloaded) => {
          setPendingDownloads(prev => ({
            ...prev,
            [key]: { ...prev[key], downloadedSize: downloaded }
          }));
        }
      );
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = download.fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      setPendingDownloads(prev => {
        const newPending = { ...prev };
        delete newPending[key];
        return newPending;
      });
      
    } catch (error) {
      console.error('Resume download failed:', error);
    } finally {
      setActiveDownloads(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const cancelDownload = (key: string) => {
    const download = pendingDownloads[key];
    if (download) {
      localStorage.removeItem(`resumable_download_${download.key}_${download.fileName}`);
    }
    
    setPendingDownloads(prev => {
      const newPending = { ...prev };
      delete newPending[key];
      return newPending;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pendingKeys = Object.keys(pendingDownloads);

  if (pendingKeys.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Download Manager</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-8 text-center">
            <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Downloads</h3>
            <p className="text-gray-500">Your downloads will appear here when you start downloading large files.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Download Manager</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your resumable downloads
          </p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-hide">
            {pendingKeys.map(key => {
              const download = pendingDownloads[key];
              const progress = (download.downloadedSize / download.totalSize) * 100;
              const isActive = activeDownloads.has(key);
              
              return (
                <div key={key} className="p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-blue-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-900 block" title={download.fileName}>
                          {download.fileName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(download.downloadedSize)} / {formatFileSize(download.totalSize)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isActive ? (
                        <button
                          onClick={() => resumeDownload(key, download)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Resume download"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="p-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => cancelDownload(key)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel download"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Status and Progress */}
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span className={`px-2 py-1 rounded ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isActive ? 'Downloading...' : 'Paused'}
                    </span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
