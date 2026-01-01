import { useState, memo } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  onClick?: () => void;
  className?: string;
}

function LazyImage({ src, alt, width, height, onClick, className = '' }: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 计算宽高比，如果有宽高信息的话
  const aspectRatio = width && height ? width / height : undefined;

  return (
    <div 
      className={`relative overflow-hidden bg-gray-200 ${className}`}
      style={aspectRatio ? { aspectRatio: aspectRatio.toString() } : undefined}
    >
      {/* Loading placeholder with shimmer effect - Next.js style */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gray-200">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"
          />
        </div>
      )}
      
      {/* Actual image */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onClick={onClick}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={`w-full h-full object-cover block transition-opacity duration-500 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${onClick ? 'cursor-pointer hover:opacity-95' : ''}`}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center min-h-[200px]">
          <span className="text-gray-400 text-sm">加载失败</span>
        </div>
      )}
    </div>
  );
}

// 使用 memo 避免不必要的重新渲染
export default memo(LazyImage);
