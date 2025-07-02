import { useRef, useState } from 'react';
import { Upload, X, File, FileText, FileImage, FileVideo, FileAudio } from 'lucide-react';

interface FileUploadProps {
  loading: boolean;
  onFilesSelected: (files: File[]) => void;
}

interface SelectedFile {
  file: File;
  id: string;
}

function getFileIcon(file: File) {
  const type = file.type.toLowerCase();
  
  if (type.startsWith('image/')) {
    return <FileImage className="w-5 h-5 text-blue-500" />;
  } else if (type.startsWith('video/')) {
    return <FileVideo className="w-5 h-5 text-purple-500" />;
  } else if (type.startsWith('audio/')) {
    return <FileAudio className="w-5 h-5 text-green-500" />;
  } else if (type.includes('text') || type.includes('json') || type.includes('xml')) {
    return <FileText className="w-5 h-5 text-yellow-500" />;
  } else {
    return <File className="w-5 h-5 text-gray-500" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FileUpload({ loading, onFilesSelected }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const newFiles: SelectedFile[] = fileArray.map(file => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const uploadFiles = () => {
    if (selectedFiles.length === 0) return;
    
    const files = selectedFiles.map(sf => sf.file);
    onFilesSelected(files);
    setSelectedFiles([]);
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

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Files to Upload</h3>
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

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="border rounded-lg bg-gray-50">
          <div className="p-4 border-b bg-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Selected Files ({selectedFiles.length})
              </h4>
              <button
                onClick={clearAllFiles}
                className="text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto scrollbar-hide">
            {selectedFiles.map((selectedFile) => (
              <div
                key={selectedFile.id}
                className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(selectedFile.file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.file.size)}
                      {selectedFile.file.size >= 10 * 1024 * 1024 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          Resumable
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(selectedFile.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Upload Button */}
          <div className="p-4 bg-white border-t rounded-b-lg">
            <button
              onClick={uploadFiles}
              disabled={loading || selectedFiles.length === 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
