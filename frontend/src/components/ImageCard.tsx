import {
  Trash2,
  ExternalLink,
  Tag as TagIcon,
  MoreVertical,
  Maximize2,
  HardDrive,
} from "lucide-react";
import type { Image, Tag } from "../lib/supabase";
import {
  useDeleteImage,
  useAllTags,
  useUpdateImageTags,
  useCreateTag,
} from "../hooks/useImages";
import ConfirmDialog from "./ConfirmDialog";
import LazyImage from "./LazyImage";
import TagInput from "./TagInput";
import { useState, memo, useCallback, useRef, useEffect } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleImageClick = useCallback(() => {
    if (onImageClick && index !== undefined) {
      onImageClick(index);
    }
  }, [onImageClick, index]);

  const handleDelete = useCallback(() => {
    deleteImage.mutate(image.id);
  }, [deleteImage, image.id]);

  const handleTagsChange = useCallback(
    async (newTags: Tag[]) => {
      const currentTagIds = (image.tags || []).map((t) => t.id);
      const newTagIds = newTags.map((t) => t.id);

      // 找出需要添加和删除的tags
      const tagsToAdd = newTagIds.filter((id) => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter(
        (id) => !newTagIds.includes(id)
      );

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

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmOpen(true);
  }, []);

  const isDeleting = deleteImage.isPending;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative">
      {/* 图片区域，包含右上角操作按钮 */}
      <div className="relative group">
        <LazyImage
          src={image.r2_url}
          alt={image.title || "图片"}
          width={image.width}
          height={image.height}
          onClick={onImageClick ? handleImageClick : undefined}
        />
        {/* 右上角操作按钮组 */}
        <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {/* 来源按钮 */}
          <a
            href={image.source_page_url || image.original_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white hover:shadow-lg transition-all"
            title="查看来源"
          >
            <ExternalLink className="w-4 h-4 text-gray-700" />
          </a>
          {/* 三点菜单按钮 */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuToggle}
              className={`p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white hover:shadow-lg transition-all ${
                menuOpen ? "bg-white shadow-lg" : ""
              }`}
              title="更多操作"
            >
              <MoreVertical className="w-4 h-4 text-gray-700" />
            </button>
            {/* 下拉菜单 */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 transition-all duration-200">
                <ConfirmDialog
                  open={confirmOpen}
                  onOpenChange={(open) => {
                    setConfirmOpen(open);
                    if (!open) {
                      setMenuOpen(false);
                    }
                  }}
                  title="确定要删除这张图片吗？"
                  confirmText="确定"
                  cancelText="取消"
                  onConfirm={handleDelete}
                >
                  <button
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>删除中...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>删除图片</span>
                      </>
                    )}
                  </button>
                </ConfirmDialog>
              </div>
            )}
          </div>
        </div>
      </div>
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

        {/* 图片信息 - 使用图标和横向布局 */}
        {(image.width || image.file_size) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {image.width && image.height && (
              <div className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">
                  {image.width} × {image.height}
                </span>
              </div>
            )}
            {image.file_size && (
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">
                  {(image.file_size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 使用 memo 避免不必要的重新渲染
export default memo(ImageCard);
