# S3 Drive - Cloud File Manager

A modern, web-based file manager for Amazon S3 with support for resumable uploads, download management, and an intuitive interface.

## Features

- 🚀 **Resumable Uploads**: Large files support chunked, resumable uploads
- 📥 **Download Manager**: Manage and resume interrupted downloads
- 🔄 **Upload Queue**: Batch upload multiple files with progress tracking
- 📁 **Folder Management**: Create, navigate, and organize folders
- 🔍 **Search & Filter**: Find files quickly with search and filtering
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔐 **Secure**: Direct communication with AWS S3 using your credentials
- ⚡ **Fast**: Optimized for performance with modern web technologies

## Quick Start

### 1. Setup AWS S3 Bucket

Follow our comprehensive [S3 Setup Guide](./S3_SETUP_GUIDE.md) to:
- Create an S3 bucket
- Configure CORS policy
- Set up IAM user and permissions
- Configure security settings

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Configure S3 Credentials

1. Open the application in your browser
2. Click the Settings (⚙️) icon
3. Enter your AWS credentials:
   - **Access Key ID**: Your IAM user's access key
   - **Secret Access Key**: Your IAM user's secret key
   - **Region**: Your bucket's region (e.g., `us-east-1`)
   - **Bucket Name**: Your S3 bucket name

### 5. Start Using S3 Drive

- **Upload Files**: Click "Add Files" or drag & drop
- **Download Files**: Click on any file to download
- **Create Folders**: Use the "New Folder" button
- **Manage Uploads**: Use the upload queue in the bottom-right
- **Manage Downloads**: Use the download manager for resumable downloads

## Project Structure

```
src/
├── components/           # React components
│   ├── FileUpload.tsx   # File upload modal
│   ├── UploadQueue.tsx  # Upload queue manager
│   ├── ResumableDownloadManager.tsx # Download manager
│   ├── FileList.tsx     # File browser
│   └── ...
├── services/            # Core services
│   ├── s3Service.ts     # S3 API integration
│   └── resumableService.ts # Resumable upload/download logic
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
└── utils/               # Utility functions
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **AWS SDK** - S3 integration
- **Lucide Icons** - Icon library

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Features Implementation

#### Resumable Uploads
- Files >10MB use multipart upload with resume capability
- Progress is persisted in localStorage
- Support for pause/resume/cancel operations

#### Upload Queue
- Sequential processing of multiple files
- Visual progress tracking
- Persistent across page reloads

#### Download Manager
- Resumable downloads for large files
- Progress tracking and management
- Background download capability

## Security Considerations

- **Never commit AWS credentials** to version control
- Use **IAM policies** with minimal required permissions
- Configure **CORS** properly for your domain
- Enable **bucket encryption** and **versioning**
- Regularly **rotate access keys**

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check your S3 bucket CORS configuration
2. **Access Denied**: Verify IAM permissions and bucket policy
3. **Upload Failures**: Check file size limits and bucket quotas
4. **Connection Issues**: Verify AWS credentials and region settings

### Debug Mode

Add `?debug=true` to the URL to enable debug logging in the browser console.


## Support

- 📖 [S3 Setup Guide](./S3_SETUP_GUIDE.md)
- 🐛 [Report Issues](https://github.com/ravindercodes/s3-storage/issues)

---

**⚠️ Important**: This application runs entirely in your browser and communicates directly with AWS S3. Your credentials are stored locally and never sent to any third-party servers.
