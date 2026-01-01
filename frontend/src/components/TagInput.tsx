import { useState, useRef, useEffect, useCallback, memo } from "react";
import { X, Plus } from "lucide-react";
import type { Tag } from "../lib/supabase";

interface TagInputProps {
  tags: Tag[];
  allTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  isLoading?: boolean;
}

function TagInput({ tags, allTags, onTagsChange, onCreateTag, isLoading = false }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 过滤已选择的tags和匹配输入的tags
  const suggestions = allTags.filter(
    (tag) =>
      !tags.some((t) => t.id === tag.id) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTag = useCallback(
    (tag: Tag) => {
      if (!tags.some((t) => t.id === tag.id)) {
        onTagsChange([...tags, tag]);
      }
      setInputValue("");
      setShowSuggestions(false);
      inputRef.current?.focus();
    },
    [tags, onTagsChange]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onTagsChange(tags.filter((t) => t.id !== tagId));
    },
    [tags, onTagsChange]
  );

  const handleCreateAndAddTag = useCallback(
    async (name: string) => {
      if (!onCreateTag) return;
      
      setIsCreatingTag(true);
      try {
        const newTag = await onCreateTag(name.trim());
        handleAddTag(newTag);
      } catch (error) {
        console.error("创建标签失败:", error);
      } finally {
        setIsCreatingTag(false);
      }
    },
    [onCreateTag, handleAddTag]
  );

  const handleInputKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault();
        // 尝试查找匹配的tag
        const matchedTag = suggestions.find(
          (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
        );
        if (matchedTag) {
          handleAddTag(matchedTag);
        } else if (suggestions.length > 0) {
          // 如果有建议，添加第一个
          handleAddTag(suggestions[0]);
        } else if (onCreateTag) {
          // 如果没有匹配的tag，尝试创建新tag
          await handleCreateAndAddTag(inputValue);
        }
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        // 删除最后一个tag
        handleRemoveTag(tags[tags.length - 1].id);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    },
    [inputValue, suggestions, tags, handleAddTag, handleRemoveTag, onCreateTag, handleCreateAndAddTag]
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-md bg-white min-h-[40px] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
          >
            {tag.name}
            {!isLoading && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                aria-label={`移除标签 ${tag.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={tags.length === 0 ? "添加标签..." : ""}
          className="flex-1 min-w-[120px] outline-none text-sm"
          disabled={isLoading || isCreatingTag}
        />
      </div>

      {showSuggestions && (suggestions.length > 0 || (inputValue.trim() && onCreateTag)) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleAddTag(tag)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-gray-400" />
              {tag.name}
            </button>
          ))}
          {inputValue.trim() && 
           !suggestions.some(t => t.name.toLowerCase() === inputValue.toLowerCase()) &&
           onCreateTag && (
            <button
              type="button"
              onClick={() => handleCreateAndAddTag(inputValue)}
              disabled={isCreatingTag}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 text-blue-600 font-medium"
            >
              <Plus className="w-4 h-4" />
              {isCreatingTag ? "创建中..." : `创建标签 "${inputValue.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TagInput);
