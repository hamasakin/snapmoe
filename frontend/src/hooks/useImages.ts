import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { imagesAPI } from '../services/images'
import { message } from 'antd'

export function useImages(params: {
  page?: number
  pageSize?: number
  website?: string
}) {
  return useQuery({
    queryKey: ['images', params],
    queryFn: () => imagesAPI.getImages(params)
  })
}

export function useDeleteImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: imagesAPI.deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] })
      message.success('删除成功')
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败')
    }
  })
}

export function useUploadImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: imagesAPI.uploadImageFromUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] })
      message.success('上传成功')
    },
    onError: (error: any) => {
      message.error(error.message || '上传失败')
    }
  })
}
