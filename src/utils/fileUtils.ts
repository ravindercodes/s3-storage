import { S3Object } from '../types';

export function getFileIcon(obj: S3Object): string {
  if (obj.isFolder) return 'folder';
  
  const extension = obj.extension?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return 'image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return 'video';
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return 'music';
    case 'pdf':
      return 'file-text';
    case 'doc':
    case 'docx':
      return 'file-text';
    case 'xls':
    case 'xlsx':
      return 'file-spreadsheet';
    case 'ppt':
    case 'pptx':
      return 'presentation';
    case 'zip':
    case 'rar':
    case '7z':
      return 'archive';
    case 'txt':
      return 'file-text';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
      return 'code';
    default:
      return 'file';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isPreviewable(obj: S3Object): boolean {
  if (obj.isFolder) return false;
  
  const extension = obj.extension?.toLowerCase();
  const previewableTypes = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'mp4', 'avi', 'mov', 'wmv',
    'mp3', 'wav', 'flac', 'aac',
    'pdf', 'txt', 'json', 'html', 'css', 'js', 'ts'
  ];
  
  return previewableTypes.includes(extension || '');
}

export function getPreviewType(obj: S3Object): string {
  if (obj.isFolder) return 'none';
  
  const extension = obj.extension?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return 'image';
  }
  
  if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
    return 'video';
  }
  
  if (['mp3', 'wav', 'flac', 'aac'].includes(extension || '')) {
    return 'audio';
  }
  
  if (extension === 'pdf') {
    return 'pdf';
  }
  
  if (['txt', 'json', 'html', 'css', 'js', 'ts'].includes(extension || '')) {
    return 'text';
  }
  
  return 'none';
}