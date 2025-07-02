export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

export interface S3Object {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  type: 'file' | 'folder';
  extension?: string;
  isFolder: boolean;
}

export interface FilePreview {
  url: string;
  type: string;
  name: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FileOperation {
  type: 'copy' | 'move';
  sourceKey: string;
  sourceName: string;
}