/**
 * Cloudflare Worker: 图片收藏服务（v2.5.0 精简版）
 *
 * 功能：
 * - POST / : 上传图片到 R2 并返回 URL
 * - DELETE /?r2Path=xxx : 从 R2 删除图片
 *
 * 环境变量（通过 wrangler.toml 配置）：
 * - R2_BUCKET: R2 存储桶绑定
 * - R2_PUBLIC_URL: R2 公开访问 URL（通过 wrangler secret 设置）
 * - API_KEY: API 密钥（通过 wrangler secret 设置，用于身份验证）
 *
 * 说明：
 * - 前端直接使用 Supabase SDK 保存/查询元数据
 * - Worker 只负责 R2 存储操作（需要 Access Key）
 * - 生产环境需要配置 API_KEY 以防止未授权访问
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  API_KEY?: string; // 可选，如果未设置则不验证（仅用于开发环境）
}

// CORS 头
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

/**
 * 验证 API Key
 */
function verifyApiKey(request: Request, env: Env): boolean {
  // 如果未配置 API_KEY，则不验证（仅用于开发环境）
  if (!env.API_KEY) {
    console.warn("⚠️ API_KEY 未配置，跳过身份验证（仅用于开发环境）");
    return true;
  }

  // 从请求头获取 API Key
  const apiKey = request.headers.get("X-API-Key");
  
  if (!apiKey) {
    return false;
  }

  // 使用时间安全比较防止时序攻击
  return constantTimeEqual(apiKey, env.API_KEY);
}

/**
 * 时间安全字符串比较（防止时序攻击）
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 验证 API Key（除了 OPTIONS 请求）
    if (!verifyApiKey(request, env)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "未授权访问：缺少或无效的 API Key" 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST 请求：上传图片到 R2
    if (request.method === "POST") {
      return handleUpload(request, env);
    }

    // DELETE 请求：从 R2 删除图片
    if (request.method === "DELETE") {
      return handleDelete(request, env);
    }

    // 其他请求返回 404
    return new Response(
      JSON.stringify({ success: false, error: "未找到接口" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  },
};

/**
 * 处理图片上传到 R2
 */
async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    // 解析请求体
    const body = (await request.json()) as {
      imageData: string; // base64 图片数据（必需）
      fileHash: string; // SHA256 哈希
      imageId?: string; // 图片唯一 ID
      imageName?: string; // 图片文件名
      timestamp?: number; // 时间戳
      mimeType?: string; // MIME 类型
      width?: number; // 图片宽度
      height?: number; // 图片高度
    };

    console.log("开始处理图片上传:", {
      hasImageData: !!body.imageData,
      fileHash: body.fileHash,
      imageId: body.imageId,
      imageName: body.imageName,
    });

    // 验证必需参数
    if (!body.imageData || !body.fileHash) {
      throw new Error("缺少必需参数: imageData 和 fileHash");
    }

    // 1. 解码 base64 图片数据
    console.log("解码图片数据...");
    const binaryString = atob(body.imageData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBuffer = bytes.buffer;
    const contentType = body.mimeType || "image/jpeg";
    console.log("图片数据解码成功，大小:", imageBuffer.byteLength, "bytes");

    // 2. 确定文件路径
    const extension = contentType.split("/")[1] || "jpg";
    const useTimestamp = body.timestamp || Date.now();
    const useImageName = body.imageName || `image.${extension}`;
    const useImageId = body.imageId || body.fileHash.substring(0, 8);

    // R2 路径：时间戳-图片ID-文件名
    const r2Path = `${useTimestamp}-${useImageId}-${useImageName}`;
    console.log("R2 存储路径:", r2Path);

    // 3. 上传到 R2
    await env.R2_BUCKET.put(r2Path, imageBuffer, {
      httpMetadata: {
        contentType: contentType,
      },
      customMetadata: {
        "file-hash": body.fileHash,
        "image-id": body.imageId || "",
        "image-name": body.imageName || "",
      },
    });

    // 4. 生成公开 URL
    const r2Url = `${env.R2_PUBLIC_URL}/${r2Path}`;
    console.log("R2 上传成功:", r2Url);

    // 5. 返回结果（前端负责保存元数据到 Supabase）
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          r2Url,
          r2Path,
          fileSize: imageBuffer.byteLength,
          mimeType: contentType,
          width: body.width || 0,
          height: body.height || 0,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("上传失败:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "上传失败",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * 处理删除图片
 */
async function handleDelete(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const r2Path = url.searchParams.get("r2Path");

    if (!r2Path) {
      throw new Error("缺少 r2Path 参数");
    }

    console.log("删除图片:", r2Path);

    // 从 R2 删除文件
    await env.R2_BUCKET.delete(r2Path);

    console.log("R2 删除成功");

    // 返回成功（前端负责删除 Supabase 记录）
    return new Response(
      JSON.stringify({
        success: true,
        message: "删除成功",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("删除失败:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "删除失败",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
