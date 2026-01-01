import { Masonry } from "masonic";
import { useWindowSize } from "@react-hook/window-size";
import { useCallback, useMemo } from "react";
import type { Image } from "../lib/supabase";
import ImageCard from "./ImageCard";

interface ImageGridProps {
  images: Image[];
  onImageClick?: (index: number) => void;
}

export default function ImageGrid({ images, onImageClick }: ImageGridProps) {
  const [width] = useWindowSize();

  // 响应式列宽
  const getColumnWidth = () => {
    if (width >= 1400) return 260; // 5列
    if (width >= 1000) return 240; // 4列
    if (width >= 700) return 220; // 3列
    if (width >= 500) return 280; // 2列
    return width - 40; // 1列
  };

  // 过滤掉无效的图片项，确保 id 是有效的字符串
  const validImages = useMemo(
    () =>
      images.filter(
        (img) =>
          img && img.id && typeof img.id === "string" && img.id.length > 0
      ),
    [images]
  );

  // 稳定的 render 函数，使用 useCallback 缓存
  const renderCard = useCallback(
    ({ data: image, index }: { data: Image; index: number }) => {
      if (!image || !image.id) return null;
      return (
        <ImageCard image={image} index={index} onImageClick={onImageClick} />
      );
    },
    [onImageClick]
  );

  // 安全的 itemKey 函数，确保总是返回有效的字符串
  // masonic 的 itemKey 接收 item 作为参数，但可能在某些情况下传入 undefined
  const getItemKey = useCallback((data: Image | undefined) => {
    // 添加安全检查，防止访问 undefined 的属性
    if (!data) {
      // 如果 data 完全无效，使用一个稳定的 fallback
      // 这种情况不应该发生，因为我们已经过滤了 validImages
      console.warn("ImageGrid: itemKey received undefined data");
      return "invalid-item";
    }
    if (!data.id) {
      // 如果 id 不存在，尝试使用其他唯一标识符
      return data.r2_path || data.original_url || `fallback-${data.file_hash}`;
    }
    return data.id;
  }, []);

  // 生成稳定的key，当数组长度或第一个item变化时强制Masonry重新挂载
  // 这可以防止WeakMap使用已失效的对象引用
  const masonryKey = useMemo(() => {
    if (validImages.length === 0) return "empty";
    return `${validImages.length}-${validImages[0]?.id || "unknown"}`;
  }, [validImages]);

  return (
    <Masonry
      key={masonryKey}
      items={validImages}
      columnGutter={16}
      columnWidth={getColumnWidth()}
      overscanBy={5}
      itemKey={getItemKey}
      render={renderCard}
    />
  );
}
