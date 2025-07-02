import { useState } from 'react';
import { X, Download, Share2, ExternalLink, Loader } from 'lucide-react';
import { S3Object } from '../types';
import { s3Service } from '../services/s3Service';
import { getPreviewType } from '../utils/fileUtils';
import { ShareModal } from './ShareModal';

interface FilePreviewProps {
  file: S3Object | null;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  if (!file) return null;

  const previewType = getPreviewType(file);
  const fileUrl = s3Service.getSignedUrl(file.key);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const fileUrl = s3Service.getSignedUrl(file.key);
      
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
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
        link.download = file.name;
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderPreview = () => {
    switch (previewType) {
      case 'image':
        return (
          <img
            src={fileUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        );
      case 'video':
        return (
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <audio src={fileUrl} controls className="w-full max-w-md" />
            <p className="mt-4 text-gray-600">{file.name}</p>
          </div>
        );
      case 'pdf':
        return (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.name}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <ExternalLink className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Preview not available</p>
            <p className="text-sm">Click download to view this file</p>
          </div>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{file.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Share file"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isDownloading ? "Downloading..." : "Download file"}
            >
              {isDownloading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="h-full flex items-center justify-center">
            {renderPreview()}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal 
          file={file}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}