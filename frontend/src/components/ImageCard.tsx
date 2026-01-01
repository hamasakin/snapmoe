import { Trash2, ExternalLink } from "lucide-react";
import type { Image } from "../lib/supabase";
import { useDeleteImage } from "../hooks/useImages";
import ConfirmDialog from "./ConfirmDialog";
import LazyImage from "./LazyImage";
import { useState, memo, useCallback } from "react";

interface ImageCardProps {
  image: Image;
  index?: number;
  onImageClick?: (index: number) => void;
}

function ImageCard({ image, index, onImageClick }: ImageCardProps) {
  const deleteImage = useDeleteImage();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleImageClick = useCallback(() => {
    if (onImageClick && index !== undefined) {
      onImageClick(index);
    }
  }, [onImageClick, index]);

  const handleDelete = useCallback(() => {
    deleteImage.mutate(image.id);
  }, [deleteImage, image.id]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  }, []);

  const isDeleting = deleteImage.isPending;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <LazyImage
        src={image.r2_url}
        alt={image.title || "图片"}
        width={image.width}
        height={image.height}
        onClick={onImageClick ? handleImageClick : undefined}
      />
      <div className="p-4">
        <h3 className="text-base font-semibold mb-2 line-clamp-1">
          {image.title || "未命名"}
        </h3>
        <div className="flex flex-col gap-1 text-sm text-gray-600">
          <p className="truncate">来源：{image.source_website}</p>
          {image.width && image.height && (
            <p>尺寸：{image.width} × {image.height}</p>
          )}
          {image.file_size && (
            <p>大小：{(image.file_size / 1024 / 1024).toFixed(2)} MB</p>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 flex">
        <a
          href={image.source_page_url || image.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          来源
        </a>
        {deleteImage && (
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="确定要删除这张图片吗？"
            confirmText="确定"
            cancelText="取消"
            onConfirm={handleDelete}
          >
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDeleting}
              onClick={handleButtonClick}
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              删除
            </button>
          </ConfirmDialog>
        )}
      </div>
    </div>
  );
}

// 使用 memo 避免不必要的重新渲染
export default memo(ImageCard);
