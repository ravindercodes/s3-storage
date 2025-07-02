# Resumable Upload & Download Implementation

This implementation provides chunked, resumable file upload and download functionality for large files, allowing users to continue where they left off if their internet connection breaks.

## Key Features

### 📤 Resumable Uploads
- **Chunked Upload**: Files larger than 10MB are automatically uploaded in 5MB chunks using AWS S3 multipart upload
- **Progress Persistence**: Upload progress is saved to localStorage and can be resumed even after browser refresh
- **Pause/Resume**: Users can pause and resume uploads at any time
- **Error Recovery**: Failed uploads can be retried from the last successful chunk
- **Background Processing**: Multiple files can be uploaded simultaneously

### 📥 Resumable Downloads
- **Chunked Download**: Files larger than 50MB are downloaded in 5MB chunks using HTTP range requests
- **Progress Persistence**: Download progress is saved to localStorage for resumption
- **Error Recovery**: Failed downloads can be resumed from the last successful chunk
- **Background Processing**: Multiple files can be downloaded simultaneously

## How It Works

### Upload Process
1. **File Selection**: When a large file (>10MB) is selected for upload
2. **Multipart Initialization**: AWS S3 multipart upload is initiated
3. **Chunking**: File is split into 5MB chunks
4. **Upload**: Each chunk is uploaded individually with progress tracking
5. **Progress Saving**: After each successful chunk, progress is saved to localStorage
6. **Completion**: When all chunks are uploaded, multipart upload is completed
7. **Cleanup**: Progress data is removed from localStorage

### Download Process
1. **File Request**: When a large file (>50MB) is requested for download
2. **Head Request**: File metadata is retrieved to get total size
3. **Chunking**: Download is split into 5MB chunks using Range headers
4. **Download**: Each chunk is downloaded individually with progress tracking
5. **Progress Saving**: After each successful chunk, progress is saved to localStorage
6. **Assembly**: All chunks are combined into the final file blob
7. **Save**: File is saved to user's device
8. **Cleanup**: Progress data is removed from localStorage

## Files Overview

### Core Service
- **`resumableService.ts`**: Main service handling chunked operations and progress persistence

### Components
- **`FileUpload.tsx`**: Enhanced upload component with pause/resume controls
- **`FileList.tsx`**: Enhanced file list with resumable download support
- **`ResumableDownloadManager.tsx`**: UI for managing pending downloads

### Key Methods

#### ResumableService
```typescript
// Upload a file with resumable support
resumableUpload(file: File, key: string, onProgress?: (uploaded: number, total: number) => void): Promise<void>

// Download a file with resumable support
resumableDownload(key: string, fileName: string, onProgress?: (downloaded: number, total: number) => void): Promise<Blob>

// Abort an ongoing upload
abortUpload(key: string, fileName: string): Promise<void>

// Get upload progress for a file
getUploadProgress(key: string, fileName: string, fileSize: number, lastModified: number): ChunkProgress | null

// Get all pending uploads/downloads
getPendingUploads(): { [key: string]: ChunkProgress }
getPendingDownloads(): { [key: string]: DownloadProgress }
```

## Usage Examples

### Starting a Resumable Upload
```typescript
// Large files (>10MB) automatically use resumable upload
await resumableService.resumableUpload(
  file,
  's3-key',
  (uploaded, total) => {
    console.log(`Progress: ${(uploaded/total*100).toFixed(1)}%`);
  }
);
```

### Starting a Resumable Download
```typescript
// Large files (>50MB) automatically use resumable download
const blob = await resumableService.resumableDownload(
  's3-key',
  'filename.zip',
  (downloaded, total) => {
    console.log(`Progress: ${(downloaded/total*100).toFixed(1)}%`);
  }
);
```

### Checking for Pending Operations
```typescript
// Check for uploads that can be resumed
const pendingUploads = resumableService.getPendingUploads();

// Check for downloads that can be resumed
const pendingDownloads = resumableService.getPendingDownloads();
```

## Configuration

### Chunk Size
- **Upload Chunks**: 5MB (configurable via `CHUNK_SIZE` constant)
- **Download Chunks**: 5MB (configurable via `CHUNK_SIZE` constant)

### File Size Thresholds
- **Resumable Uploads**: Files > 10MB
- **Resumable Downloads**: Files > 50MB

### Storage
- **Progress Data**: Stored in browser's localStorage
- **Storage Keys**: Prefixed with `resumable_upload_` or `resumable_download_`

## Error Handling

### Upload Errors
- **Network Errors**: Automatically retry with exponential backoff
- **S3 Errors**: Surface error messages to user with retry option
- **Validation Errors**: Prevent invalid operations

### Download Errors
- **Network Errors**: Pause download and allow manual resume
- **Range Request Errors**: Fallback to regular download
- **File Changes**: Detect if file was modified on server and restart

## Browser Compatibility

### Requirements
- **Fetch API**: For HTTP requests with progress tracking
- **Blob API**: For file assembly and downloads
- **localStorage**: For progress persistence
- **File API**: For file chunking and upload

### Supported Browsers
- Chrome 42+
- Firefox 39+
- Safari 10+
- Edge 14+

## Performance Considerations

### Memory Usage
- **Chunk Processing**: Only one chunk is held in memory at a time
- **Large Files**: Memory usage remains constant regardless of file size
- **Cleanup**: Blob URLs are properly cleaned up to prevent memory leaks

### Network Efficiency
- **Parallel Processing**: Multiple files can be processed simultaneously
- **Chunk Retry**: Only failed chunks are retried, not entire files
- **Progress Tracking**: Minimal overhead for progress reporting

## Security Considerations

### Data Privacy
- **Local Storage**: Progress data stays in user's browser
- **No Server Storage**: No upload/download state stored on servers
- **Automatic Cleanup**: Progress data is removed after completion

### AWS S3 Integration
- **Signed URLs**: All S3 operations use properly signed URLs
- **Permissions**: Respects existing S3 bucket permissions
- **CORS**: Requires proper CORS configuration on S3 bucket

## Troubleshooting

### Common Issues

#### Upload Fails
1. Check S3 credentials and permissions
2. Verify bucket CORS configuration
3. Check multipart upload limits on S3 bucket

#### Download Fails
1. Verify file exists and is accessible
2. Check if Range requests are supported by S3 configuration
3. Ensure proper CORS headers for Range requests

#### Progress Not Saved
1. Check if localStorage is available and not full
2. Verify browser privacy settings allow localStorage
3. Check for localStorage quota exceeded errors

### Debug Mode
Enable console logging in the ResumableService to see detailed progress information:

```typescript
// Add this to resumableService.ts for debugging
console.log('Upload progress:', uploaded, 'of', total);
console.log('Download progress:', downloaded, 'of', total);
```

## Future Enhancements

### Potential Improvements
1. **Compression**: Compress chunks before upload to save bandwidth
2. **Encryption**: Client-side encryption for sensitive files
3. **Deduplication**: Skip uploading chunks that already exist
4. **Smart Retry**: Adaptive retry strategies based on error types
5. **Background Sync**: Continue operations when app is in background
6. **Cross-Tab Sync**: Sync progress across multiple browser tabs
