/**
 * Cloudflare Worker: 上传图片到 R2
 * 
 * 环境变量：
 * - R2_BUCKET: R2 存储桶绑定（通过 wrangler.toml 配置）
 * - R2_PUBLIC_URL: R2 公开访问 URL
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: '只允许 POST 请求' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // 解析请求体
      const body = await request.json() as {
        imageUrl: string;
        fileHash: string;
        imageId?: string;
        imageName?: string;
        timestamp?: number;
        originalUrl?: string;
        sourceWebsite?: string;
        sourcePageUrl?: string;
      };

      console.log('开始处理图片上传:', {
        imageUrl: body.imageUrl,
        fileHash: body.fileHash,
        imageId: body.imageId,
        imageName: body.imageName,
      });

      // 验证必需参数
      if (!body.imageUrl || !body.fileHash) {
        throw new Error('缺少必需参数: imageUrl 和 fileHash');
      }

      // 1. 下载图片
      console.log('正在下载图片...');
      const imageResponse = await fetch(body.imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`下载图片失败: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      console.log('图片下载成功，大小:', imageBuffer.byteLength, 'bytes');

      // 2. 确定文件路径和元数据
      const contentType = imageBlob.type || 'image/jpeg';
      const extension = contentType.split('/')[1] || 'jpg';

      const useTimestamp = body.timestamp || Date.now();
      const useImageName = body.imageName || `image.${extension}`;
      const useImageId = body.imageId || body.fileHash.substring(0, 8);

      // R2 路径：时间戳-图片ID-文件名
      const r2Path = `${useTimestamp}-${useImageId}-${useImageName}`;
      console.log('R2 存储路径:', r2Path);

      // 3. 上传到 R2（原生支持，无需 SDK）
      await env.R2_BUCKET.put(r2Path, imageBuffer, {
        httpMetadata: {
          contentType: contentType,
        },
        customMetadata: {
          'file-hash': body.fileHash,
          'image-id': body.imageId || '',
          'image-name': body.imageName || '',
          'original-url': body.originalUrl?.substring(0, 255) || '',
          'source-website': body.sourceWebsite?.substring(0, 100) || '',
        },
      });

      // 4. 生成公开 URL
      const r2Url = `${env.R2_PUBLIC_URL}/${r2Path}`;
      console.log('上传成功:', r2Url);

      // 5. 返回结果
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            r2Url,
            r2Path,
            fileSize: imageBuffer.byteLength,
            mimeType: contentType,
            width: 0,
            height: 0,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('上传失败:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : '上传失败',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
