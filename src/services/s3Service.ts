import AWS from 'aws-sdk';
import { S3Config, S3Object } from '../types';

class S3Service {
  private s3: AWS.S3 | null = null;
  private config: S3Config | null = null;

  configure(config: S3Config) {
    this.config = config;
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });
    this.s3 = new AWS.S3();
  }

  isConfigured(): boolean {
    return this.s3 !== null && this.config !== null;
  }

  private handleS3Error(error: any): never {
    console.error('S3 Error:', error);
    
    // Check for CORS-related errors
    if (error.code === 'NetworkingError' || error.message?.includes('Network Failure')) {
      throw new Error(
        'CORS Configuration Required: Your S3 bucket needs to be configured to allow cross-origin requests. ' +
        'Please add a CORS policy to your S3 bucket that allows requests from your application domain. ' +
        'Go to AWS S3 Console → Your Bucket → Permissions → Cross-origin resource sharing (CORS) and add the appropriate configuration.'
      );
    }
    
    // Check for access denied errors
    if (error.code === 'AccessDenied') {
      throw new Error('Access denied. Please check your AWS credentials and bucket permissions.');
    }
    
    // Check for bucket not found
    if (error.code === 'NoSuchBucket') {
      throw new Error('The specified bucket does not exist. Please verify the bucket name.');
    }
    
    // Check for invalid credentials
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      throw new Error('Invalid AWS credentials. Please check your Access Key ID and Secret Access Key.');
    }
    
    // Generic error fallback
    throw new Error(`S3 operation failed: ${error.message || 'Unknown error'}`);
  }

  async listObjects(prefix: string = ''): Promise<S3Object[]> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.config.bucketName,
      Prefix: prefix,
      Delimiter: '/',
    };

    try {
      const data = await this.s3.listObjectsV2(params).promise();
      const objects: S3Object[] = [];

      // Add folders (CommonPrefixes)
      if (data.CommonPrefixes) {
        data.CommonPrefixes.forEach((commonPrefix) => {
          if (commonPrefix.Prefix) {
            const folderName = commonPrefix.Prefix.replace(prefix, '').replace('/', '');
            if (folderName) {
              objects.push({
                key: commonPrefix.Prefix,
                name: folderName,
                size: 0,
                lastModified: new Date(),
                type: 'folder',
                isFolder: true,
              });
            }
          }
        });
      }

      // Add files
      if (data.Contents) {
        data.Contents.forEach((object) => {
          if (object.Key && object.Key !== prefix && !object.Key.endsWith('/')) {
            const fileName = object.Key.replace(prefix, '');
            const extension = fileName.split('.').pop()?.toLowerCase();
            objects.push({
              key: object.Key,
              name: fileName,
              size: object.Size || 0,
              lastModified: object.LastModified || new Date(),
              type: 'file',
              extension,
              isFolder: false,
            });
          }
        });
      }

      return objects;
    } catch (error) {
      this.handleS3Error(error);
    }
  }

  async uploadFile(file: File, key: string): Promise<void> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.config.bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
    };

    try {
      await this.s3.upload(params).promise();
    } catch (error) {
      this.handleS3Error(error);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.config.bucketName,
      Key: folderPath.endsWith('/') ? folderPath : `${folderPath}/`,
      Body: '',
    };

    try {
      await this.s3.putObject(params).promise();
    } catch (error) {
      this.handleS3Error(error);
    }
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    const params = {
      Bucket: this.config.bucketName,
      Key: key,
    };

    try {
      await this.s3.deleteObject(params).promise();
    } catch (error) {
      this.handleS3Error(error);
    }
  }

  async renameObject(oldKey: string, newKey: string): Promise<void> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    try {
      // Copy to new location
      await this.s3.copyObject({
        Bucket: this.config.bucketName,
        CopySource: `${this.config.bucketName}/${oldKey}`,
        Key: newKey,
      }).promise();

      // Delete original
      await this.deleteObject(oldKey);
    } catch (error) {
      this.handleS3Error(error);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    try {
      await this.s3.copyObject({
        Bucket: this.config.bucketName,
        CopySource: `${this.config.bucketName}/${sourceKey}`,
        Key: destinationKey,
      }).promise();
    } catch (error) {
      this.handleS3Error(error);
    }
  }

  getSignedUrl(key: string, expiresInSeconds: number = 3600): string {
    if (!this.s3 || !this.config) {
      throw new Error('S3 not configured');
    }

    return this.s3.getSignedUrl('getObject', {
      Bucket: this.config.bucketName,
      Key: key,
      Expires: expiresInSeconds,
    });
  }

  getPublicUrl(key: string): string {
    if (!this.config) {
      throw new Error('S3 not configured');
    }
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}

export const s3Service = new S3Service();