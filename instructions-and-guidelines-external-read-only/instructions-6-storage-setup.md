# Supabase Storage Setup Guide

This guide provides step-by-step instructions for setting up and using Supabase Storage for file uploads, downloads, and management in your Next.js application.

## Overview

Supabase Storage provides a simple way to store and serve files. This guide covers:
- **Storage Bucket Configuration**: Setting up buckets with proper permissions
- **File Upload**: Uploading files from your application
- **File Download**: Serving files to users
- **File Management**: Organizing and managing stored files
- **Security**: Implementing proper access controls

## Prerequisites

Before implementing storage operations, ensure you have:
1. Supabase project set up with authentication
2. `@supabase/supabase-js` installed
3. Basic project structure configured
4. Storage permissions configured in Supabase dashboard

## Step 1: Configure Storage Buckets

### Step 1.1: Create Storage Buckets

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create the following buckets:
   - `avatars` - For user profile pictures
   - `uploads` - For general file uploads
   - `documents` - For document storage

### Step 1.2: Configure Bucket Policies

For each bucket, set up Row Level Security policies:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view their own avatars
CREATE POLICY "Users can view avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload to uploads bucket
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to view uploads
CREATE POLICY "Users can view uploads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
  );
```

## Step 2: Set up Storage Client

Create `src/lib/storage.ts`:

```typescript
import { supabaseAdmin } from './supabase-admin';

export class StorageService {
  // Upload file to bucket
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Blob,
    options?: {
      contentType?: string;
      upsert?: boolean;
    }
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    return data;
  }

  // Download file from bucket
  async downloadFile(bucket: string, path: string) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    return data;
  }

  // Get public URL for file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Delete file from bucket
  async deleteFile(bucket: string, paths: string | string[]) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove(Array.isArray(paths) ? paths : [paths]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return data;
  }

  // List files in bucket
  async listFiles(
    bucket: string,
    path?: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
      search?: string;
    }
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(path, {
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        sortBy: options?.sortBy || { column: 'name', order: 'asc' },
        search: options?.search,
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  }

  // Create signed URL for private files
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600 // 1 hour
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  // Move/rename file
  async moveFile(
    bucket: string,
    fromPath: string,
    toPath: string
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      throw new Error(`Failed to move file: ${error.message}`);
    }

    return data;
  }

  // Copy file
  async copyFile(
    bucket: string,
    fromPath: string,
    toPath: string
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }

    return data;
  }
}

export const storageService = new StorageService();
```

## Step 3: Implement File Upload Component

Create `src/components/ui/FileUpload.tsx`:

```tsx
'use client'

import { useState, useRef } from 'react';
import { Upload, X, File, Image } from 'lucide-react';
import { Button } from '../interaction';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  placeholder?: string;
  disabled?: boolean;
  selectedFile?: File | null;
  showPreview?: boolean;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  accept = "image/*",
  maxSize = 5,
  placeholder = "Click to upload or drag and drop",
  disabled = false,
  selectedFile,
  showPreview = true,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  };

  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${selectedFile ? 'border-green-500 bg-green-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-2">
            {isImage && showPreview ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="mx-auto h-20 w-20 object-cover rounded"
              />
            ) : (
              <File className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600">{placeholder}</p>
            <p className="text-xs text-gray-500">
              Max size: {maxSize}MB • {accept}
            </p>
          </div>
        )}
      </div>

      {/* Remove Button */}
      {selectedFile && onFileRemove && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-2" />
            Remove File
          </Button>
        </div>
      )}
    </div>
  );
}
```

## Step 4: Implement Avatar Upload Component

Create `src/components/ui/AvatarUpload.tsx`:

```tsx
'use client'

import { useState } from 'react';
import { Camera, User } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { storageService } from '@/lib/storage';

interface AvatarUploadProps {
  userId: string;
  currentAvatar?: string;
  onAvatarUpdate: (url: string) => void;
  size?: number;
}

export function AvatarUpload({
  userId,
  currentAvatar,
  onAvatarUpdate,
  size = 100
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Upload to avatars bucket with user ID as folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      await storageService.uploadFile('avatars', filePath, file, {
        contentType: file.type,
        upsert: true,
      });

      // Get public URL
      const publicUrl = storageService.getPublicUrl('avatars', filePath);

      // Update user profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (error) throw error;

      onAvatarUpdate(publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="relative rounded-full overflow-hidden border-4 border-white shadow-lg"
        style={{ width: size, height: size }}
      >
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Upload Overlay */}
        <label
          htmlFor="avatar-upload"
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        >
          <Camera className="w-6 h-6 text-white" />
        </label>

        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}
```

## Step 5: Create Storage API Routes

Create `src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/storage';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'uploads';
    const folder = formData.get('folder') as string || user.id;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload file
    const uploadResult = await storageService.uploadFile(bucket, filePath, file);

    // Get public URL
    const publicUrl = storageService.getPublicUrl(bucket, filePath);

    return NextResponse.json({
      url: publicUrl,
      path: filePath,
      bucket,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

Create `src/app/api/files/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/storage';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [bucket, ...pathParts] = params.path;
    const filePath = pathParts.join('/');

    // Download file
    const fileData = await storageService.downloadFile(bucket, filePath);

    // Return file as response
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [bucket, ...pathParts] = params.path;
    const filePath = pathParts.join('/');

    // Delete file
    await storageService.deleteFile(bucket, filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
```

## Step 6: Add File Upload to Forms

Example usage in a profile form:

```tsx
'use client'

import { useState } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { FileUpload } from '@/components/ui/FileUpload';
import { AvatarUpload } from '@/components/ui/AvatarUpload';

export function ProfileForm() {
  const user = useUser();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('bucket', 'uploads');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Upload successful:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="flex justify-center">
        <AvatarUpload
          userId={user.id}
          currentAvatar={user.user_metadata?.avatar_url}
          onAvatarUpdate={(url) => {
            console.log('Avatar updated:', url);
          }}
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Document
        </label>
        <FileUpload
          onFileSelect={setSelectedFile}
          onFileRemove={() => setSelectedFile(null)}
          accept=".pdf,.doc,.docx"
          maxSize={10}
          selectedFile={selectedFile}
        />
        {selectedFile && (
          <button
            onClick={handleFileUpload}
            disabled={uploading}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Step 7: Implement File Gallery Component

Create `src/components/ui/FileGallery.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react';
import { Download, Trash2, File, Image, Video, Music } from 'lucide-react';
import { Button } from '../interaction';
import { storageService } from '@/lib/storage';

interface FileItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
}

interface FileGalleryProps {
  bucket: string;
  path?: string;
  onFileSelect?: (file: FileItem) => void;
  allowDelete?: boolean;
  allowDownload?: boolean;
}

export function FileGallery({
  bucket,
  path,
  onFileSelect,
  allowDelete = true,
  allowDownload = true,
}: FileGalleryProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [bucket, path]);

  const loadFiles = async () => {
    try {
      const fileList = await storageService.listFiles(bucket, path);
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const fileData = await storageService.downloadFile(bucket, file.name);
      const url = URL.createObjectURL(fileData);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Download failed');
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Delete ${file.name}?`)) return;

    try {
      await storageService.deleteFile(bucket, file.name);
      setFiles(files.filter(f => f.id !== file.id));
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Delete failed');
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return Image;
    if (mimetype.startsWith('video/')) return Video;
    if (mimetype.startsWith('audio/')) return Music;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="text-center py-8">Loading files...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => {
        const Icon = getFileIcon(file.metadata.mimetype);
        const isImage = file.metadata.mimetype.startsWith('image/');

        return (
          <div
            key={file.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onFileSelect?.(file)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {isImage ? (
                  <img
                    src={storageService.getPublicUrl(bucket, file.name)}
                    alt={file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <Icon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.metadata.size)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">
                {new Date(file.created_at).toLocaleDateString()}
              </span>
              <div className="flex space-x-1">
                {allowDownload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    className="p-1 h-auto"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                {allowDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    className="p-1 h-auto text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {files.length === 0 && (
        <div className="col-span-full text-center py-8 text-gray-500">
          No files found
        </div>
      )}
    </div>
  );
}
```

## Security Best Practices

1. **Validate File Types**: Always validate uploaded file types server-side
2. **Size Limits**: Implement file size limits to prevent abuse
3. **Storage Policies**: Use RLS policies to control access to files
4. **Secure URLs**: Use signed URLs for private files
5. **File Scanning**: Consider virus scanning for uploaded files
6. **Rate Limiting**: Implement upload rate limiting
7. **Access Logging**: Log file access for security monitoring
8. **Backup Strategy**: Regularly backup storage data
9. **CDN Integration**: Use CDN for better performance and security
10. **Encryption**: Files are encrypted at rest in Supabase Storage

This storage setup provides a comprehensive solution for file management in your Supabase-powered application.