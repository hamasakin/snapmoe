import { Trash2, ExternalLink, Tag as TagIcon } from "lucide-react";
import type { Image, Tag } from "../lib/supabase";
import { useDeleteImage, useAllTags, useUpdateImageTags, useCreateTag } from "../hooks/useImages";
import ConfirmDialog from "./ConfirmDialog";
import LazyImage from "./LazyImage";
import TagInput from "./TagInput";
import { useState, memo, useCallback } from "react";

interface ImageCardProps {
  image: Image;
  index?: number;
  onImageClick?: (index: number) => void;
}

function ImageCard({ image, index, onImageClick }: ImageCardProps) {
  const deleteImage = useDeleteImage();
  const updateImageTags = useUpdateImageTags();
  const createTag = useCreateTag();
  const { data: allTags = [] } = useAllTags();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);

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

  const handleTagsChange = useCallback(
    async (newTags: Tag[]) => {
      const currentTagIds = (image.tags || []).map((t) => t.id);
      const newTagIds = newTags.map((t) => t.id);

      // 找出需要添加和删除的tags
      const tagsToAdd = newTagIds.filter((id) => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter((id) => !newTagIds.includes(id));

      await updateImageTags.mutateAsync({
        imageId: image.id,
        tagsToAdd,
        tagsToRemove,
      });
    },
    [image.id, image.tags, updateImageTags]
  );

  const handleCreateTag = useCallback(
    async (name: string): Promise<Tag> => {
      return await createTag.mutateAsync(name);
    },
    [createTag]
  );

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
        {/* Tags区域 */}
        <div className="mb-3">
          {isEditingTags ? (
            <TagInput
              tags={image.tags || []}
              allTags={allTags}
              onTagsChange={handleTagsChange}
              onCreateTag={handleCreateTag}
              isLoading={updateImageTags.isPending || createTag.isPending}
            />
          ) : (
            <div
              className="flex flex-wrap gap-1.5 cursor-pointer min-h-[32px] items-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTags(true);
              }}
            >
              {(image.tags || []).length > 0 ? (
                (image.tags || []).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <TagIcon className="w-3 h-3" />
                  点击添加标签
                </span>
              )}
            </div>
          )}
          {isEditingTags && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTags(false);
              }}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              完成
            </button>
          )}
        </div>

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
