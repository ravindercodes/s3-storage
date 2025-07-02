import { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, FolderPlus, Upload as UploadIcon, AlertCircle, LogOut, Download, HelpCircle } from 'lucide-react';
import { useS3 } from './hooks/useS3';
import { S3Object } from './types';
import { SettingsModal } from './components/SettingsModal';
import { Breadcrumb } from './components/Breadcrumb';
import { SearchBar } from './components/SearchBar';
import { FileList } from './components/FileList';
import { FileUpload } from './components/FileUpload';
import { FilePreview } from './components/FilePreview';
import { ResumableDownloadManager } from './components/ResumableDownloadManager';
import { UploadQueue } from './components/UploadQueue';
import { SetupGuide } from './components/SetupGuide';

function App() {
  const {
    isConfigured,
    objects,
    loading,
    error,
    currentPath,
    configure,
    loadObjects,
    uploadFile,
    createFolder,
    deleteObject,
    renameObject,
    setCurrentPath,
    logout,
  } = useS3();

  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isUploadQueueOpen, setIsUploadQueueOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExtension, setFilterExtension] = useState('');
  const [previewFile, setPreviewFile] = useState<S3Object | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [addFilesToQueue, setAddFilesToQueue] = useState<((files: File[]) => void) | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [hasActiveDownloads, setHasActiveDownloads] = useState(false);
  const [hasPendingDownloads, setHasPendingDownloads] = useState(false);

  const handleDownloadStatusChange = (activeDownloads: boolean, pendingDownloads: boolean) => {
    setHasActiveDownloads(activeDownloads);
    setHasPendingDownloads(pendingDownloads);
  };

  const handleUploadQueueVisibilityChange = (isOpen: boolean) => {
    setIsUploadQueueOpen(isOpen);
  };

  useEffect(() => {
    if (isConfigured) {
      loadObjects(currentPath).catch(console.error);
    }
  }, [isConfigured, currentPath, loadObjects]);

  useEffect(() => {
    if (addFilesToQueue && pendingFiles.length > 0) {
      addFilesToQueue(pendingFiles);
      setPendingFiles([]);
      setShowUpload(false);
    }
  }, [addFilesToQueue, pendingFiles]);

  useEffect(() => {
    const handleRefreshFileList = () => {
      if (isConfigured) {
        loadObjects(currentPath).catch(console.error);
      }
    };

    window.addEventListener('refreshFileList', handleRefreshFileList);
    return () => window.removeEventListener('refreshFileList', handleRefreshFileList);
  }, [isConfigured, currentPath, loadObjects]);

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      if (searchQuery && !obj.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (filterExtension && (!obj.extension || obj.extension !== filterExtension)) {
        return false;
      }
      
      return true;
    });
  }, [objects, searchQuery, filterExtension]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await createFolder(newFolderName.trim(), currentPath);
        setNewFolderName('');
        setShowCreateFolder(false);
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    try {
      for (const file of files) {
        await uploadFile(file, currentPath);
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    if (addFilesToQueue) {
      addFilesToQueue(files);
      setShowUpload(false);
    } else {
      setPendingFiles(prev => [...prev, ...files]);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleGlobalDrag = (e: React.DragEvent) => {
    if (showUpload) return;
    
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      if (!e.relatedTarget) {
        setDragActive(false);
      }
    }
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    if (showUpload) return;
    
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleFilesSelected(files);
    }
  };

  return (
    <div 
      className={`min-h-screen bg-gray-50 relative ${dragActive ? 'bg-blue-50' : ''}`}
      onDragEnter={handleGlobalDrag}
      onDragLeave={handleGlobalDrag}
      onDragOver={handleGlobalDrag}
      onDrop={handleGlobalDrop}
    >
      {/* Global Drag Overlay */}
      {dragActive && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="text-center">
              <UploadIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop files to upload</h3>
              <p className="text-gray-600">Files will be added to the upload queue</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">S3 Drive</h1>
              <p className="text-sm text-gray-500">Secure cloud file management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConfigured && (
              <>
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UploadIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Files</span>
                </button>
                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                {/* Download Manager Button - Show if there are downloads and upload queue is not open */}
                {((hasActiveDownloads || hasPendingDownloads) && !showUpload && !isUploadQueueOpen) && (
                  <button
                    onClick={() => setShowDownloadManager(true)}
                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors relative ${
                      hasActiveDownloads ? 'text-green-600 animate-pulse' : 
                      hasPendingDownloads ? 'text-green-600' : 'text-gray-500'
                    }`}
                    title="Download Manager"
                  >
                    <Download className="w-5 h-5" />
                    {(hasActiveDownloads || hasPendingDownloads) && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowSetupGuide(true)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Setup Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {!isConfigured ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to S3 Drive</h2>
            <p className="text-gray-600 mb-6">Configure your Amazon S3 credentials to get started</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowSetupGuide(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📖 Setup Guide
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ⚙️ Quick Setup
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb path={currentPath} onNavigate={handleNavigate} />

            {/* Search and Filters */}
            <SearchBar
              onSearch={setSearchQuery}
              onFilter={setFilterExtension}
              searchQuery={searchQuery}
              activeFilter={filterExtension}
            />

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* File List */}
            <FileList
              objects={filteredObjects}
              onNavigate={handleNavigate}
              onDelete={deleteObject}
              onRename={renameObject}
              onPreview={setPreviewFile}
              loading={loading}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={configure}
      />

      {/* Upload Modal */}
      {showUpload && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUpload(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Files to Upload Queue</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-500 transform rotate-45" />
              </button>
            </div>
            <div className="p-6">
              {pendingFiles.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    {pendingFiles.length} file(s) are waiting to be added to the upload queue...
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Queue status: {addFilesToQueue ? 'Ready' : 'Initializing...'}
                  </p>
                </div>
              )}
              <FileUpload
                loading={false}
                onFilesSelected={handleFilesSelected}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCreateFolder(false);
            setNewFolderName('');
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Folder</h2>
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-500 transform rotate-45" />
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }
                }}
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      <FilePreview
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Resumable Download Manager */}
      {showDownloadManager && (
        <ResumableDownloadManager
          onClose={() => setShowDownloadManager(false)}
          onStatusChange={handleDownloadStatusChange}
        />
      )}

      {/* Setup Guide */}
      <SetupGuide
        isOpen={showSetupGuide}
        onClose={() => setShowSetupGuide(false)}
      />

      {/* Upload Queue - Always mounted but conditionally visible */}
      {isConfigured && (
        <UploadQueue
          currentPath={currentPath}
          onUpload={handleUploadFiles}
          onAddFiles={(fn) => {
            setAddFilesToQueue(() => fn);
          }}
          onVisibilityChange={handleUploadQueueVisibilityChange}
          forceHide={showDownloadManager}
        />
      )}
    </div>
  );
}

export default App;