import { useState, useEffect, useCallback } from 'react';
import { s3Service } from '../services/s3Service';
import { S3Config, S3Object } from '../types';

export function useS3() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    const savedConfig = localStorage.getItem('s3Config');
    if (savedConfig) {
      try {
        const config: S3Config = JSON.parse(savedConfig);
        s3Service.configure(config);
        setIsConfigured(true);
      } catch (err) {
        console.error('Error loading S3 config:', err);
        setError('Failed to load S3 configuration');
      }
    }
  }, []);

  const configure = useCallback((config: S3Config) => {
    try {
      s3Service.configure(config);
      localStorage.setItem('s3Config', JSON.stringify(config));
      setIsConfigured(true);
      setError(null);
    } catch (err) {
      setError('Failed to configure S3');
    }
  }, []);

  const loadObjects = useCallback(async (path: string = '') => {
    if (!isConfigured) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await s3Service.listObjects(path);
      setObjects(data);
      setCurrentPath(path);
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  const uploadFile = useCallback(async (file: File, path: string) => {
    if (!isConfigured) return;
    
    setLoading(true);
    try {
      const key = path ? `${path}${file.name}` : file.name;
      await s3Service.uploadFile(file, key);
      await loadObjects(currentPath);
    } catch (err) {
      setError('Failed to upload file');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, currentPath, loadObjects]);

  const createFolder = useCallback(async (folderName: string, path: string) => {
    if (!isConfigured) return;
    
    setLoading(true);
    try {
      const folderPath = path ? `${path}${folderName}/` : `${folderName}/`;
      await s3Service.createFolder(folderPath);
      await loadObjects(currentPath);
    } catch (err) {
      setError('Failed to create folder');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, currentPath, loadObjects]);

  const deleteObject = useCallback(async (key: string) => {
    if (!isConfigured) return;
    
    setLoading(true);
    try {
      await s3Service.deleteObject(key);
      await loadObjects(currentPath);
    } catch (err) {
      setError('Failed to delete object');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, currentPath, loadObjects]);

  const renameObject = useCallback(async (oldKey: string, newName: string) => {
    if (!isConfigured) return;
    
    setLoading(true);
    try {
      const pathParts = oldKey.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newKey = pathParts.join('/');
      await s3Service.renameObject(oldKey, newKey);
      await loadObjects(currentPath);
    } catch (err) {
      setError('Failed to rename object');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, currentPath, loadObjects]);

  const logout = useCallback(() => {
    localStorage.removeItem('s3Config');
    setIsConfigured(false);
    setObjects([]);
    setCurrentPath('');
    setError(null);
  }, []);

  return {
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
  };
}