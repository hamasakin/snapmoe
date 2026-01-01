import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { imagesAPI, websitesAPI, tagsAPI } from "../services/images";
import { toast } from "sonner";
import type { Tag } from "../lib/supabase";

export function useImages(params: {
  pageSize?: number;
  website?: string | string[];
  tags?: string[];
}) {
  const pageSize = params.pageSize || 20;

  return useInfiniteQuery({
    queryKey: ["images", params.website, params.tags],
    queryFn: ({ pageParam = 0 }) =>
      imagesAPI.getImages({
        offset: pageParam,
        pageSize,
        website: params.website,
        tags: params.tags,
      }),
    getNextPageParam: (lastPage, allPages) => {
      // 安全检查
      if (!lastPage || !lastPage.items || !Array.isArray(lastPage.items)) {
        return undefined;
      }
      if (!allPages || !Array.isArray(allPages)) {
        return undefined;
      }

      // 如果返回的数据少于 pageSize，说明没有更多数据了
      if (lastPage.items.length < pageSize) {
        return undefined;
      }
      // 返回下一个偏移量
      return allPages.length * pageSize;
    },
    initialPageParam: 0,
  });
}

export function useWebsites() {
  return useQuery({
    queryKey: ["websites"],
    queryFn: () => websitesAPI.getWebsites(),
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: imagesAPI.deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast.success("删除成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "删除失败");
    },
  });
}

export function useAllTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => tagsAPI.getTags(),
  });
}

export function useUpdateImageTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageId,
      tagsToAdd,
      tagsToRemove,
    }: {
      imageId: string;
      tagsToAdd: string[];
      tagsToRemove: string[];
    }) => {
      // 添加tags
      for (const tagId of tagsToAdd) {
        await tagsAPI.addTagToImage(imageId, tagId);
      }
      // 删除tags
      for (const tagId of tagsToRemove) {
        await tagsAPI.removeTagFromImage(imageId, tagId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast.success("标签更新成功");
    },
    onError: (error: any) => {
      toast.error(error.message || "标签更新失败");
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => tagsAPI.createTag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "创建标签失败");
    },
  });
}
