import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Select from "react-select";
import { useImages, useWebsites, useAllTags } from "../hooks/useImages";
import ImageGrid from "../components/ImageGrid";
import Loading from "../components/Loading";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Download from "yet-another-react-lightbox/plugins/download";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

export default function Gallery() {
  const [pageSize] = useState(20);
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useImages({
    pageSize,
    website: selectedWebsites.length > 0 ? selectedWebsites : undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  });
  const { data: websites, isLoading: websitesLoading } = useWebsites();
  const { data: allTags, isLoading: tagsLoading } = useAllTags();

  // 使用 useMemo 避免不必要的数组重新创建
  const allImages = useMemo(
    () => data?.pages.flatMap((page) => page.items) || [],
    [data?.pages]
  );

  // 计算 Select 组件的选项和值
  const websiteOptions = useMemo(
    () =>
      websites?.map((site) => ({
        label: `${site.domain} (${site.image_count})`,
        value: site.domain,
      })) || [],
    [websites]
  );

  const selectedWebsiteValues = useMemo(() => {
    if (selectedWebsites.length === 0) return undefined;
    return selectedWebsites.map((selectedSite) => {
      const siteInfo = websites?.find((s) => s.domain === selectedSite);
      return {
        label: siteInfo
          ? `${siteInfo.domain} (${siteInfo.image_count})`
          : selectedSite,
        value: selectedSite,
      };
    });
  }, [selectedWebsites, websites]);

  // 计算 Tag Select 组件的选项和值
  const tagOptions = useMemo(
    () =>
      allTags?.map((tag) => ({
        label: tag.name,
        value: tag.id,
      })) || [],
    [allTags]
  );

  const selectedTagValues = useMemo(() => {
    if (selectedTags.length === 0) return undefined;
    return selectedTags.map((tagId) => {
      const tagInfo = allTags?.find((t) => t.id === tagId);
      return {
        label: tagInfo?.name || tagId,
        value: tagId,
      };
    });
  }, [selectedTags, allTags]);

  // 使用 useCallback 缓存回调函数
  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // 监听滚动到底部，自动加载更多
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" } // 提前 200px 开始加载
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 text-base sm:text-lg">
            加载失败：{(error as Error).message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 固定头部 - 标题和筛选器区域 */}
        <div className="shrink-0 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
              <h2 className="mb-0 text-xl sm:text-2xl lg:text-3xl font-semibold">
                SnapMoe
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  className="w-full sm:w-48 lg:w-56"
                  placeholder="筛选网站"
                  isMulti
                  isClearable
                  isLoading={websitesLoading}
                  onChange={(options) => {
                    setSelectedWebsites(options?.map((opt) => opt.value) || []);
                  }}
                  value={selectedWebsiteValues}
                  options={websiteOptions}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "32px",
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      minHeight: "32px",
                      padding: "0 8px",
                    }),
                    input: (base) => ({
                      ...base,
                      margin: "0px",
                    }),
                    indicatorsContainer: (base) => ({
                      ...base,
                      height: "32px",
                    }),
                    multiValue: (base) => ({
                      ...base,
                      fontSize: "12px",
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      fontSize: "12px",
                    }),
                  }}
                />
                <Select
                  className="w-full sm:w-48 lg:w-56"
                  placeholder="筛选标签"
                  isMulti
                  isClearable
                  isLoading={tagsLoading}
                  onChange={(options) => {
                    setSelectedTags(options?.map((opt) => opt.value) || []);
                  }}
                  value={selectedTagValues}
                  options={tagOptions}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "32px",
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      minHeight: "32px",
                      padding: "0 8px",
                    }),
                    input: (base) => ({
                      ...base,
                      margin: "0px",
                    }),
                    indicatorsContainer: (base) => ({
                      ...base,
                      height: "32px",
                    }),
                    multiValue: (base) => ({
                      ...base,
                      fontSize: "12px",
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      fontSize: "12px",
                    }),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 可滚动的内容区域 */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {isLoading && allImages.length === 0 ? (
            <div className="text-center py-20 sm:py-32">
              <Loading size="large" />
            </div>
          ) : (
            <>
              <ImageGrid images={allImages} onImageClick={handleImageClick} />

              {/* 滚动加载触发器 */}
              <div ref={loadMoreRef} className="text-center py-8">
                {isFetchingNextPage && <Loading size="large" />}
                {!hasNextPage && allImages.length > 0 && (
                  <p className="text-gray-500 text-sm">已加载全部图片</p>
                )}
              </div>
            </>
          )}
        </div>

        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={allImages.map((image) => ({
            src: image.r2_url,
            alt: image.title || "图片",
            description: image.source_website
              ? `来源：${image.source_website}`
              : undefined,
            downloadUrl: image.r2_url,
            downloadFilename: image.title || `image-${image.id}`,
          }))}
          plugins={[Zoom, Fullscreen, Download, Thumbnails]}
          controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
        />
      </div>
    </div>
  );
}
