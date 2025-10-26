import React, { useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { db, uploadImage } from '../database/db';

const ImageUploader = ({ jobId, userId, imageType, title, description, maxImages = 10 }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadImages();
  }, [jobId, imageType]);

  const loadImages = async () => {
    if (!jobId) return;
    
    const imgs = await db.jobImages
      .where({ jobId, imageType })
      .toArray();
    setImages(imgs);
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    if (images.length + fileArray.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

    try {
      for (const file of fileArray) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum size is 5MB`);
          continue;
        }

        await uploadImage(file, jobId, userId, imageType);
      }

      await loadImages();
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    
    try {
      await db.jobImages.delete(imageId);
      await loadImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting image. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition ${
          dragActive
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || images.length >= maxImages}
        />

        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-semibold">Uploading images...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold mb-2">
                Click or drag images to upload
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF up to 5MB • {images.length}/{maxImages} images
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
            >
              <img
                src={image.imageUrl}
                alt={image.caption}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                <button
                  onClick={() => deleteImage(image.id)}
                  className="opacity-0 group-hover:opacity-100 transition bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  title="Delete image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-white text-xs truncate">{image.caption}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;