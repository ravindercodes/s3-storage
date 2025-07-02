import { useState, useCallback } from 'react';

interface ActivityStatus {
  uploads: {
    hasActive: boolean;
    hasQueued: boolean;
  };
  downloads: {
    hasActive: boolean;
    hasPending: boolean;
  };
  modals: {
    uploadQueueOpen: boolean;
    downloadManagerOpen: boolean;
  };
}

export function useActivityVisibility() {
  const [status, setStatus] = useState<ActivityStatus>({
    uploads: { hasActive: false, hasQueued: false },
    downloads: { hasActive: false, hasPending: false },
    modals: { uploadQueueOpen: false, downloadManagerOpen: false }
  });

  const updateUploadStatus = useCallback((hasActive: boolean, hasQueued: boolean) => {
    setStatus(prev => ({
      ...prev,
      uploads: { hasActive, hasQueued }
    }));
  }, []);

  const updateDownloadStatus = useCallback((hasActive: boolean, hasPending: boolean) => {
    setStatus(prev => ({
      ...prev,
      downloads: { hasActive, hasPending }
    }));
  }, []);

  const updateModalStatus = useCallback((uploadQueueOpen: boolean, downloadManagerOpen: boolean) => {
    setStatus(prev => ({
      ...prev,
      modals: { uploadQueueOpen, downloadManagerOpen }
    }));
  }, []);

  const shouldShowUploadQueue = () => {
    if (status.uploads.hasQueued || status.uploads.hasActive) return true;
    
    if (status.modals.downloadManagerOpen && !status.uploads.hasQueued && !status.uploads.hasActive) return false;
    
    return false; 
  };

  const shouldShowDownloadManager = () => {
    if (status.downloads.hasPending || status.downloads.hasActive) return true;
    
    if (status.modals.uploadQueueOpen && !status.downloads.hasPending && !status.downloads.hasActive) return false;
    
    return false;
  };

  const getUploadBadgeCount = () => {
    return status.uploads.hasQueued ? '•' : '';
  };

  const getDownloadBadgeCount = () => {
    return status.downloads.hasPending ? '•' : '';
  };

  return {
    status,
    updateUploadStatus,
    updateDownloadStatus,
    updateModalStatus,
    shouldShowUploadQueue: shouldShowUploadQueue(),
    shouldShowDownloadManager: shouldShowDownloadManager(),
    getUploadBadgeCount,
    getDownloadBadgeCount,
    getUploadIconClass: () => {
      if (status.uploads.hasActive) return 'text-blue-600 animate-pulse';
      if (status.uploads.hasQueued) return 'text-blue-600';
      return 'text-gray-500';
    },
    getDownloadIconClass: () => {
      if (status.downloads.hasActive) return 'text-green-600 animate-pulse';
      if (status.downloads.hasPending) return 'text-green-600';
      return 'text-gray-500';
    }
  };
}
