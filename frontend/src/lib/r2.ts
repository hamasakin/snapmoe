// ⚠️ 已切换到 Cloudflare Worker 方案
// 前端不再直接调用 R2，而是通过 Worker

// Cloudflare Worker URL（部署后需要修改）
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://pic-collect-upload.YOUR-ACCOUNT.workers.dev'

const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL

/**
 * 通过 Cloudflare Worker 上传文件到 R2
 */
export async function uploadToR2(file: File): Promise<{
  r2Url: string
  r2Path: string
  fileHash: string
}> {
  // 计算文件哈希
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // 将文件转换为 base64 或直接上传 URL（这里我们先上传到临时位置）
  // 注意：实际使用中，可能需要先上传文件到临时位置，然后传递 URL 给 Worker
  // 为了简化，这里假设文件已经有公开 URL

  throw new Error('请使用 uploadFromUrlToR2 方法，通过 Worker 上传')
}

/**
 * 从 URL 通过 Worker 上传到 R2
 */
export async function uploadFromUrlToR2(imageUrl: string, options?: {
  imageId?: string
  imageName?: string
  timestamp?: number
  originalUrl?: string
  sourceWebsite?: string
}): Promise<{
  r2Url: string
  r2Path: string
  fileHash: string
  width: number
  height: number
  fileSize: number
  mimeType: string
}> {
  // 下载图片以获取基本信息
  const response = await fetch(imageUrl)
  const blob = await response.blob()

  // 计算文件哈希
  const arrayBuffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // 获取图片尺寸
  const img = await createImageBitmap(blob)
  const width = img.width
  const height = img.height

  // 调用 Worker 上传
  const workerResponse = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      fileHash,
      imageId: options?.imageId,
      imageName: options?.imageName,
      timestamp: options?.timestamp || Date.now(),
      originalUrl: options?.originalUrl || imageUrl,
      sourceWebsite: options?.sourceWebsite,
    }),
  })

  if (!workerResponse.ok) {
    const error = await workerResponse.json()
    throw new Error(error.error || 'Worker 上传失败')
  }

  const result = await workerResponse.json()

  if (!result.success) {
    throw new Error(result.error || '上传失败')
  }

  return {
    r2Url: result.data.r2Url,
    r2Path: result.data.r2Path,
    fileHash,
    width,
    height,
    fileSize: blob.size,
    mimeType: blob.type,
  }
}

/**
 * 从 R2 删除文件（需要通过 Worker 或直接调用 R2 API）
 * 注意：当前 Worker 不支持删除，如需删除功能需要扩展 Worker
 */
export async function deleteFromR2(r2Path: string): Promise<void> {
  // TODO: 需要在 Worker 中实现删除接口
  console.warn('删除功能需要扩展 Worker，当前仅支持通过 Cloudflare Dashboard 手动删除')
  throw new Error('删除功能暂未实现')
}
