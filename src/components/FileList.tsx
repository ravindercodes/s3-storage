import React, { useState, useEffect } from 'react';
import { 
  MoreVertical, 
  Download, 
  Share2, 
  Edit3, 
  Trash2, 
  Eye,
  Folder,
  Image,
  Video,
  Music,
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  Code,
  File,
  CheckSquare,
  X,
  Loader
} from 'lucide-react';
import { S3Object } from '../types';
import { getFileIcon, formatFileSize, formatDate, isPreviewable } from '../utils/fileUtils';
import { s3Service } from '../services/s3Service';
import { resumableService } from '../services/resumableService';
import { ShareModal } from './ShareModal';

interface FileListProps {
  objects: S3Object[];
  onNavigate: (path: string) => void;
  onDelete: (key: string) => void;
  onRename: (key: string, newName: string) => void;
  onPreview: (file: S3Object) => void;
  loading: boolean;
}

export function FileList({ objects, onNavigate, onDelete, onRename, onPreview, loading }: FileListProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [clickTimeout, setClickTimeout] = useState<number | null>(null);
  const [shareFile, setShareFile] = useState<S3Object | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false);
  const [bulkActionProgress, setBulkActionProgress] = useState(0);
  const [bulkActionTotal, setBulkActionTotal] = useState(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [downloadQueue, setDownloadQueue] = useState<{[key: string]: {name: string, progress: number, status: 'pending' | 'downloading' | 'completed' | 'error'}}>({});
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<{count: number, onConfirm: () => void} | null>(null);

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
      'folder': Folder,
      'image': Image,
      'video': Video,
      'music': Music,
      'file-text': FileText,
      'file-spreadsheet': FileSpreadsheet,
      'presentation': Presentation,
      'archive': Archive,
      'code': Code,
      'file': File
    };
    
    return iconMap[iconName] || File;
  };

  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeMenu) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenu]);

  const handleShare = (obj: S3Object) => {
    if (obj.isFolder) return;
    
    setShareFile(obj);
    setActiveMenu(null);
  };

  const handleDownload = async (obj: S3Object) => {
    if (obj.isFolder) return;
    
    setDownloadingFile(obj.key);
    
    try {
      if (obj.size > 50 * 1024 * 1024) {
        const blob = await resumableService.resumableDownload(
          obj.key,
          obj.name,
          (downloaded, total) => {
            console.log(`Download progress: ${(downloaded / total * 100).toFixed(1)}%`);
          }
        );
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = obj.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
        
      } else {
        const fileUrl = s3Service.getSignedUrl(obj.key);
        
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = obj.name;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 100);
          
        } catch (fetchError) {
          console.warn('Blob download failed, trying direct download:', fetchError);
          
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = obj.name;
          link.target = '_blank';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingFile(null);
    }
    
    setActiveMenu(null);
  };

  const handleRename = (obj: S3Object) => {
    setEditingName(obj.key);
    setNewName(obj.name);
    setActiveMenu(null);
  };

  const handleRenameSubmit = (obj: S3Object) => {
    if (newName && newName !== obj.name) {
      onRename(obj.key, newName);
    }
    setEditingName(null);
    setNewName('');
  };

  const handleSingleClick = (obj: S3Object) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    const timeout = window.setTimeout(() => {
      if (!obj.isFolder && isPreviewable(obj)) {
        onPreview(obj);
      }
      setClickTimeout(null);
    }, 250);
    
    setClickTimeout(timeout);
  };

  const handleDoubleClick = (obj: S3Object) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    
    if (obj.isFolder) {
      onNavigate(obj.key);
    } else if (isPreviewable(obj)) {
      onPreview(obj);
    }
  };

  const toggleFileSelection = (obj: S3Object, e: React.MouseEvent<Element> | Event) => {
    if (e instanceof Event) {
      e.stopPropagation();
    } else {
      e.stopPropagation();
    }
    
    const newSelectedFiles = new Set(selectedFiles);
    if (selectedFiles.has(obj.key)) {
      newSelectedFiles.delete(obj.key);
    } else {
      newSelectedFiles.add(obj.key);
    }
    
    setSelectedFiles(newSelectedFiles);
    
    if (newSelectedFiles.size > 0 && !selectionMode) {
      setSelectionMode(true);
    } 
    else if (newSelectedFiles.size === 0 && selectionMode) {
      setSelectionMode(false);
    }
  };
  
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedFiles(new Set());
      setSelectionMode(false);
    } else {
      setSelectionMode(true);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedFiles.size === objects.length) {
      setSelectedFiles(new Set());
      setSelectionMode(false);
    } else {
      const allKeys = objects.map(obj => obj.key);
      setSelectedFiles(new Set(allKeys));
    }
  };
  
  const showSnack = (message: string) => {
    setSnackMessage(message);
    setTimeout(() => setSnackMessage(null), 3000);
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return;
    
    const selectedObjects = objects.filter(obj => selectedFiles.has(obj.key) && !obj.isFolder);
    
    const newQueue = {...downloadQueue};
    selectedObjects.forEach(obj => {
      newQueue[obj.key] = {
        name: obj.name,
        progress: 0,
        status: 'pending'
      };
    });
    setDownloadQueue(newQueue);
    
    showSnack(`Starting download of ${selectedObjects.length} file(s)`);
    
    setShowProgressModal(true);
    setIsProcessingBulkAction(true);
    setBulkActionTotal(prev => prev + selectedObjects.length);
    
    setSelectedFiles(new Set());
    setSelectionMode(false);
    
    for (const obj of selectedObjects) {
      try {
        setDownloadQueue(prev => ({
          ...prev,
          [obj.key]: {...prev[obj.key], status: 'downloading'}
        }));
        
        if (obj.size > 50 * 1024 * 1024) {
          const blob = await resumableService.resumableDownload(
            obj.key,
            obj.name,
            (downloaded, total) => {
              const progress = Math.round((downloaded / total) * 100);
              setDownloadQueue(prev => ({
                ...prev,
                [obj.key]: {...prev[obj.key], progress}
              }));
            }
          );
          
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = obj.name;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 100);
          
        } else {
          const fileUrl = s3Service.getSignedUrl(obj.key);
          
          const progressInterval = setInterval(() => {
            setDownloadQueue(prev => {
              const current = prev[obj.key];
              if (current && current.progress < 90) {
                return {
                  ...prev,
                  [obj.key]: {...current, progress: current.progress + 10}
                };
              }
              return prev;
            });
          }, 300);
          
          try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = obj.name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
              window.URL.revokeObjectURL(blobUrl);
            }, 100);
            
          } catch (fetchError) {
            console.warn('Blob download failed, trying direct download:', fetchError);
            
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = obj.name;
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          
          clearInterval(progressInterval);
        }
        setDownloadQueue(prev => ({
          ...prev,
          [obj.key]: {...prev[obj.key], progress: 100, status: 'completed'}
        }));
        
        setBulkActionProgress(prev => prev + 1);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Download failed for ${obj.name}:`, error);
        setDownloadQueue(prev => ({
          ...prev,
          [obj.key]: {...prev[obj.key], status: 'error'}
        }));
        setBulkActionProgress(prev => prev + 1);
      }
    }
    
    setTimeout(() => {
      setDownloadQueue(prev => {
        const allCompleted = Object.values(prev).every(item => 
          item.status === 'completed' || item.status === 'error'
        );
        if (allCompleted) {
          setIsProcessingBulkAction(false);
          showSnack('All downloads completed!');
          setTimeout(() => {
            setDownloadQueue({});
            setBulkActionProgress(0);
            setBulkActionTotal(0);
          }, 2000);
        }
        return prev;
      });
    }, 1000);
  };
  
  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    setDeleteModalData({
      count: selectedFiles.size,
      onConfirm: async () => {
        setShowDeleteModal(false);
        setDeleteModalData(null);
        
        showSnack(`Starting deletion of ${selectedFiles.size} file(s)`);
        setIsProcessingBulkAction(true);
        setBulkActionProgress(0);
        setBulkActionTotal(selectedFiles.size);
        setShowProgressModal(true);
        
        try {
          let completedCount = 0;
          
          const keysToDelete = Array.from(selectedFiles);
          
          for (const key of keysToDelete) {
            try {
              await onDelete(key);
              
              completedCount++;
              setBulkActionProgress(completedCount);
              
              setSelectedFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
              });
              
            } catch (error) {
              console.error(`Delete failed for ${key}:`, error);
              setBulkActionProgress(prev => prev + 1);
            }
          }
          
          setTimeout(() => {
            setSelectionMode(false);
            setIsProcessingBulkAction(false);
            showSnack('Deletion completed!');
            setBulkActionProgress(0);
            setBulkActionTotal(0);
          }, 500);
          
        } catch (error) {
          console.error('Bulk delete failed:', error);
          showSnack('Some files failed to delete. Please try again.');
          setIsProcessingBulkAction(false);
        }
      }
    });
    setShowDeleteModal(true);
  };
  
  const cancelSelection = () => {
    setSelectedFiles(new Set());
    setSelectionMode(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="w-8 h-8 bg-gray-300 rounded mb-3"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm8-2a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900">This folder is empty</p>
        <p className="text-gray-500">Upload files or create folders to get started</p>
      </div>
    );
  }

  return (
    <>
      {!selectionMode && objects.length > 0 && (
        <div className="flex justify-end mb-4">
          <button 
            onClick={toggleSelectionMode}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Select Files</span>
          </button>
        </div>
      )}
      {selectionMode && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                checked={selectedFiles.size === objects.length && objects.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                {selectedFiles.size === objects.length && objects.length > 0 
                  ? 'All selected' 
                  : `${selectedFiles.size} selected`}
              </label>
            </div>
            <button 
              onClick={cancelSelection}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownload}
              disabled={selectedFiles.size === 0}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download ({selectedFiles.size})</span>
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={selectedFiles.size === 0}
              className="flex items-center gap-2 px-3 py-2 text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete ({selectedFiles.size})</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{
        objects.map((obj) => {
          const IconComponent = getIconComponent(getFileIcon(obj));
          const isSelected = selectedFiles.has(obj.key);

          return (
          <div
            key={obj.key}
            className={`bg-white border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group relative ${
              isSelected ? 'border-blue-400 shadow-md bg-gradient-to-br from-blue-50 to-white' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={(e) => selectionMode ? toggleFileSelection(obj, e) : handleSingleClick(obj)}
            onDoubleClick={() => !selectionMode && handleDoubleClick(obj)}
          >
            {/* Checkbox appears on hover only */}
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => toggleFileSelection(obj, e.nativeEvent)}
                onClick={(e) => e.stopPropagation()}
                className={`h-4 w-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 ${
                  isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                }`}
              />
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${obj.isFolder ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'} shadow-sm`}>
                <IconComponent className="w-8 h-8" />
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === obj.key ? null : obj.key);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                
                {activeMenu === obj.key && (
                  <div 
                    className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        toggleSelectionMode();
                        setActiveMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Select Multiple
                    </button>
                    {!obj.isFolder && isPreviewable(obj) && (
                      <button
                        onClick={() => {
                          onPreview(obj);
                          setActiveMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                    )}
                    {!obj.isFolder && (
                      <>
                        <button
                          onClick={() => handleDownload(obj)}
                          disabled={downloadingFile === obj.key}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="w-4 h-4" />
                          {downloadingFile === obj.key ? 'Downloading...' : 'Download'}
                        </button>
                        <button
                          onClick={() => handleShare(obj)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleRename(obj)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit3 className="w-4 h-4" />
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setDeleteModalData({
                          count: 1,
                          onConfirm: async () => {
                            setShowDeleteModal(false);
                            setDeleteModalData(null);
                            await onDelete(obj.key);
                            setActiveMenu(null);
                            showSnack('File deleted successfully');
                          }
                        });
                        setShowDeleteModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {editingName === obj.key ? (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => handleRenameSubmit(obj)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(obj);
                    if (e.key === 'Escape') {
                      setEditingName(null);
                      setNewName('');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-900 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              ) : (
                <h3 className="font-semibold text-gray-900 truncate text-sm leading-tight" title={obj.name}>
                  {obj.name}
                </h3>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                <span className="font-medium">{obj.isFolder ? 'Folder' : formatFileSize(obj.size)}</span>
                <span>{formatDate(obj.lastModified)}</span>
              </div>
            </div>
          </div>
        );
      })}
      </div>

      <ShareModal 
        file={shareFile}
        onClose={() => setShareFile(null)}
      />

      {/* Progress Modal - Show individual file progress */}
      {(selectedFiles.size > 0 || isProcessingBulkAction || Object.keys(downloadQueue).length > 0) && (
        <div className={`fixed bottom-4 right-4 z-20 transition-all duration-300 ${
          showProgressModal ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-90'
        }`}>
          {showProgressModal ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-96">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  {selectedFiles.size > 0 ? `Selected: ${selectedFiles.size} of ${objects.length}` : 
                   Object.keys(downloadQueue).length > 0 ? 'Download Progress' : 'Progress'}
                </h4>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title="Minimize"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Overall Progress */}
              {isProcessingBulkAction && bulkActionTotal > 0 && (
                <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between text-xs text-blue-700 mb-2">
                    <span className="font-medium">Overall Progress</span>
                    <span className="font-mono">{bulkActionProgress}/{bulkActionTotal}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${bulkActionTotal > 0 ? (bulkActionProgress / bulkActionTotal) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-600">
                    <span className="font-medium">✓ Completed: {bulkActionProgress}</span>
                    <span className="font-medium">⏳ Pending: {bulkActionTotal - bulkActionProgress}</span>
                  </div>
                </div>
              )}
              
              {/* Individual File Progress */}
              {Object.keys(downloadQueue).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">Individual Files:</h5>
                  {Object.entries(downloadQueue).map(([key, file]) => (
                    <div key={key} className="p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          file.status === 'completed' ? 'bg-green-100 text-green-700' :
                          file.status === 'downloading' ? 'bg-blue-100 text-blue-700' :
                          file.status === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {file.status === 'completed' ? '✓ Done' :
                           file.status === 'downloading' ? `${file.progress}%` :
                           file.status === 'error' ? '✗ Error' : 'Pending'}
                        </span>
                      </div>
                      {file.status === 'downloading' && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!isProcessingBulkAction && selectedFiles.size > 0 && Object.keys(downloadQueue).length === 0 && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600">Ready for bulk actions</p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowProgressModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-105"
              title="Show progress"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedFiles.size > 0 ? selectedFiles.size : Object.keys(downloadQueue).length}
                </span>
                {isProcessingBulkAction && (
                  <Loader className="w-4 h-4 animate-spin" />
                )}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete {deleteModalData.count} selected item{deleteModalData.count > 1 ? 's' : ''}?
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteModalData(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteModalData.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete {deleteModalData.count} item{deleteModalData.count > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snack Message */}
      {snackMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-30 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{snackMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}