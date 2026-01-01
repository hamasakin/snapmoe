import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { imagesAPI, websitesAPI } from "../services/images";
import { toast } from "sonner";

export function useImages(params: {
  pageSize?: number;
  website?: string | string[];
}) {
  const pageSize = params.pageSize || 20;

  return useInfiniteQuery({
    queryKey: ["images", params.website],
    queryFn: ({ pageParam = 0 }) =>
      imagesAPI.getImages({
        offset: pageParam,
        pageSize,
        website: params.website,
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
