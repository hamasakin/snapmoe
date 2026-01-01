// ========== 配置变量 ==========
// 配置在构建时从环境变量注入
const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const WORKER_API_KEY = import.meta.env.VITE_WORKER_API_KEY || "";

// ⭐ Edge Functions URLs
const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/**
 * 检查配置是否有效
 */
function validateConfig() {
  const warnings = [];

  if (!WORKER_URL || WORKER_URL.includes("YOUR-ACCOUNT")) {
    warnings.push("⚠️ WORKER_URL 未配置");
  }

  if (!SUPABASE_URL || SUPABASE_URL.includes("your-supabase-url")) {
    warnings.push("⚠️ SUPABASE_URL 未配置");
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("your-supabase-anon-key")) {
    warnings.push("⚠️ SUPABASE_ANON_KEY 未配置");
  }

  if (!WORKER_API_KEY) {
    warnings.push("⚠️ WORKER_API_KEY 未配置（如果 Worker 需要身份验证可能会失败）");
  }

  if (warnings.length > 0) {
    console.warn("[SnapMoe] 配置检查:");
    warnings.forEach((w) => console.warn(`[SnapMoe] ${w}`));
    console.log("[SnapMoe] 💡 请检查 .env 文件中的配置，然后重新构建");
  }
}

// 验证配置
validateConfig();

console.log("[SnapMoe] 初始化成功");
console.log("[SnapMoe] Cloudflare Worker URL:", WORKER_URL);
console.log("[SnapMoe] Supabase URL:", SUPABASE_URL);
console.log("[SnapMoe] Edge Functions URL:", EDGE_FUNCTIONS_URL);
if (WORKER_API_KEY) {
  console.log("[SnapMoe] Worker API Key: 已配置");
}

// ========== 已收藏图片缓存 ==========
const collectedImagesMap = new Map(); // 存储当前页面已收藏的图片：URL -> {file_hash, r2_path}

/**
 * 获取当前页面已收藏的图片列表
 */
async function loadCollectedImages() {
  try {
    const pageUrl = window.location.href;
    const cleanPageUrl = pageUrl.split("?")[0].split("#")[0];

    console.log("[SnapMoe] 正在加载已收藏图片列表...");

    // 使用 Edge Function 查询数据库（绕过 CSP）
    const result = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: `${EDGE_FUNCTIONS_URL}/get-collected-images?pageUrl=${encodeURIComponent(
          cleanPageUrl
        )}`,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (_e) {
              reject(new Error("解析响应失败"));
            }
          } else {
            try {
              const errorData = JSON.parse(response.responseText);
              reject(new Error(errorData.error || "查询失败"));
            } catch (_e) {
              reject(new Error(`查询失败: HTTP ${response.status}`));
            }
          }
        },
        onerror: () => {
          reject(new Error("网络请求失败"));
        },
      });
    });

    if (!result.success) {
      throw new Error(result.error || "查询失败");
    }

    // 存储完整的图片信息（包括 file_hash 和 r2_path）
    collectedImagesMap.clear();
    (result.data || []).forEach((img) => {
      const cleanUrl = img.original_url.split("?")[0].split("#")[0];
      collectedImagesMap.set(cleanUrl, {
        file_hash: img.file_hash,
        r2_path: img.r2_path,
      });
    });

    console.log(`[SnapMoe] 已加载 ${result.data?.length || 0} 张已收藏图片`);
    console.log(
      "[SnapMoe] 已收藏图片列表:",
      Array.from(collectedImagesMap.keys()).slice(0, 5)
    ); // 只显示前5个用于调试
  } catch (error) {
    console.error("[SnapMoe] 加载已收藏图片失败:", error);
  }
}

/**
 * 检查图片是否已被收藏
 */
function isImageCollected(imageUrl) {
  const cleanUrl = imageUrl.split("?")[0];
  return collectedImagesMap.has(cleanUrl);
}

// ========== 核心功能 ==========

/**
 * 生成图片唯一标识
 * 基于页面 URL + 图片 URL 生成唯一 ID
 */
function generateImageId(pageUrl, imageUrl) {
  // 清理 URL（移除查询参数中的动态部分）
  const cleanPageUrl = pageUrl.split("#")[0].split("?")[0];
  const cleanImageUrl = imageUrl.split("?")[0];

  // 组合两个 URL 并计算哈希作为唯一标识
  const combined = `${cleanPageUrl}|${cleanImageUrl}`;

  // 使用简单的字符串哈希（非加密哈希，仅用于唯一标识）
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 提取图片文件名
 */
function extractImageName(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const filename = pathname.split("/").pop();
    return filename || "image";
  } catch (_e) {
    return "image";
  }
}

/**
 * 上传图片
 */
async function uploadImage(imgUrl) {
  console.log("[SnapMoe] 开始处理图片:", imgUrl);

  try {
    const pageUrl = window.location.href;
    const cleanPageUrl = pageUrl.split("?")[0].split("#")[0]; // ⭐ 提前定义
    const imageName = extractImageName(imgUrl);

    // 1. 生成唯一标识（基于页面 URL + 图片 URL）
    const imageId = generateImageId(pageUrl, imgUrl);
    console.log("[SnapMoe] 图片唯一标识:", imageId);
    console.log("[SnapMoe] 页面 URL:", pageUrl);
    console.log("[SnapMoe] 图片名称:", imageName);

    // 2. 检查是否已存在（使用本地缓存）
    if (isImageCollected(imgUrl)) {
      console.log("[SnapMoe] 图片已存在，跳过上传");
      return { success: true, message: "图片已存在" };
    }

    // 3. 下载图片（使用 GM_xmlhttpRequest 绕过 CORS，带完整请求头）
    console.log("[SnapMoe] 正在下载图片...");
    const blob = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: imgUrl,
        responseType: "blob",
        headers: {
          Referer: pageUrl, // 添加 Referer，伪装成从当前页面访问
          "User-Agent": navigator.userAgent, // 使用真实浏览器 UA
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site",
        },
        onload: (response) => {
          if (response.status === 200) {
            console.log("[SnapMoe] 下载成功，状态码:", response.status);
            resolve(response.response);
          } else {
            console.error("[SnapMoe] 下载失败，状态码:", response.status);
            reject(new Error(`下载失败: HTTP ${response.status}`));
          }
        },
        onerror: () => {
          reject(new Error("网络请求失败"));
        },
      });
    });
    console.log("[SnapMoe] 图片下载成功，大小:", blob.size, "bytes");

    // 4. 计算文件哈希（用于 R2 存储路径，避免文件名冲突）
    console.log("[SnapMoe] 正在计算哈希...");
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.log("[SnapMoe] 文件哈希:", fileHash);

    // 5. 通过 Cloudflare Worker 上传到 R2
    console.log("[SnapMoe] 调用 Cloudflare Worker 上传到 R2...");

    const timestamp = Date.now();
    const cleanName = imageName.replace(/[^a-zA-Z0-9._-]/g, "_");

    // 将 blob 转换为 base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1]; // 移除 data:image/xxx;base64, 前缀
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // 获取图片尺寸
    let width = 0;
    let height = 0;
    try {
      const img = await createImageBitmap(blob);
      width = img.width;
      height = img.height;
      console.log("[SnapMoe] 图片尺寸:", width, "x", height);
    } catch (_e) {
      console.warn("[SnapMoe] 无法获取图片尺寸:", _e);
    }

    // 准备请求头
    const headers = {
      "Content-Type": "application/json",
    };

    // 如果配置了 API Key，添加到请求头
    if (WORKER_API_KEY) {
      headers["X-API-Key"] = WORKER_API_KEY;
    }

    // 使用 GM_xmlhttpRequest 绕过 CSP 限制
    const uploadResult = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: WORKER_URL,
        headers: headers,
        data: JSON.stringify({
          imageData: base64Data, // 传递 base64 图片数据
          fileHash: fileHash,
          imageId: imageId,
          imageName: cleanName,
          timestamp: timestamp,
          originalUrl: imgUrl,
          sourceWebsite: window.location.hostname,
          sourcePageUrl: cleanPageUrl,
          mimeType: blob.type, // 传递 MIME 类型
          width: width,
          height: height,
        }),
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              const result = JSON.parse(response.responseText);
              resolve(result);
            } catch (_e) {
              reject(new Error("解析响应失败"));
            }
          } else {
            try {
              const errorData = JSON.parse(response.responseText);
              reject(new Error(errorData.error || "Worker 调用失败"));
            } catch (_e) {
              reject(new Error(`Worker 调用失败: HTTP ${response.status}`));
            }
          }
        },
        onerror: () => {
          reject(new Error("网络请求失败"));
        },
      });
    });

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "上传失败");
    }

    const r2Url = uploadResult.data.r2Url;
    const r2Path = uploadResult.data.r2Path;

    console.log("[SnapMoe] 上传成功:", {
      url: r2Url,
      path: r2Path,
      size: uploadResult.data.fileSize,
    });

    // 6. 使用 Edge Function 保存元数据到 Supabase（绕过 CSP）
    console.log("[SnapMoe] 保存元数据到 Supabase...");
    const cleanImgUrl = imgUrl.split("?")[0].split("#")[0];

    const saveResult = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: `${EDGE_FUNCTIONS_URL}/save-image-metadata`,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        data: JSON.stringify({
          original_url: cleanImgUrl,
          r2_url: r2Url,
          r2_path: r2Path,
          source_website: window.location.hostname,
          source_page_url: cleanPageUrl,
          title: imageName,
          width: width,
          height: height,
          file_size: uploadResult.data.fileSize,
          file_hash: fileHash,
          mime_type: blob.type,
        }),
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (_e) {
              reject(new Error("解析响应失败"));
            }
          } else {
            try {
              const errorData = JSON.parse(response.responseText);
              reject(new Error(errorData.error || "保存元数据失败"));
            } catch (_e) {
              reject(new Error(`保存元数据失败: HTTP ${response.status}`));
            }
          }
        },
        onerror: (_error) => {
          reject(new Error("保存元数据请求失败"));
        },
      });
    });

    if (!saveResult.success) {
      console.error("[SnapMoe] 保存元数据失败:", saveResult.error);
      // R2 已上传成功，但 Supabase 保存失败
      // 可以选择删除 R2 文件或继续（这里选择继续）
    } else {
      console.log("[SnapMoe] 元数据保存成功");
    }

    // 7. 更新本地缓存
    collectedImagesMap.set(cleanImgUrl, {
      file_hash: fileHash,
      r2_path: r2Path,
    });

    console.log("[SnapMoe] 收藏成功！");
    return { success: true, message: "收藏成功" };
  } catch (error) {
    console.error("[SnapMoe] 上传失败:", error);
    console.error("[SnapMoe] 错误堆栈:", error.stack);
    return {
      success: false,
      message: error.message || "上传失败",
    };
  }
}

/**
 * 删除图片（只删除数据库记录，不删除 R2 文件）
 */
async function deleteImage(imgUrl) {
  console.log("[SnapMoe] 开始删除图片:", imgUrl);

  try {
    const cleanImgUrl = imgUrl.split("?")[0].split("#")[0];

    // 1. 从缓存中获取图片信息
    const imageInfo = collectedImagesMap.get(cleanImgUrl);
    if (!imageInfo) {
      throw new Error("图片未在缓存中，请刷新页面重试");
    }

    console.log("[SnapMoe] 使用缓存的图片信息:", imageInfo);

    // 2. 调用 Edge Function 删除数据库记录（使用 file_hash）
    console.log("[SnapMoe] 删除数据库记录...");
    const deleteResult = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: `${EDGE_FUNCTIONS_URL}/delete-image`,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        data: JSON.stringify({
          file_hash: imageInfo.file_hash,
        }),
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            try {
              resolve(JSON.parse(response.responseText));
            } catch (_e) {
              reject(new Error("解析响应失败"));
            }
          } else {
            try {
              const errorData = JSON.parse(response.responseText);
              reject(new Error(errorData.error || "删除数据库记录失败"));
            } catch (_e) {
              reject(new Error(`删除失败: HTTP ${response.status}`));
            }
          }
        },
        onerror: (_error) => {
          reject(new Error("删除请求失败"));
        },
      });
    });

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || "删除失败");
    }

    console.log(
      "[SnapMoe] 数据库记录删除成功，删除了",
      deleteResult.deleted_count,
      "条记录"
    );

    // 3. 从缓存中移除
    collectedImagesMap.delete(cleanImgUrl);

    console.log("[SnapMoe] 删除成功！");
    return { success: true, message: "删除成功" };
  } catch (error) {
    console.error("[SnapMoe] 删除失败:", error);
    return {
      success: false,
      message: error.message || "删除失败",
    };
  }
}

// ========== UI 逻辑 ==========

// 添加全局 CSS 样式（包含动画和弹窗）
const style = document.createElement("style");
style.textContent = `
  /* 收藏按钮基础样式 */
  .snapmoe-button {
    position: absolute;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 6px;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-family: system-ui, -apple-system, sans-serif;
    user-select: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: auto;
  }

  /* 未收藏按钮样式 - 默认隐藏 */
  .snapmoe-button.not-collected {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    cursor: pointer;
    opacity: 0;
    transform: translateY(-5px);
    pointer-events: none;
  }

  /* 悬停时显示未收藏按钮 */
  .snapmoe-button.not-collected.hover {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* 已收藏按钮样式 - 一直显示 */
  .snapmoe-button.collected {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    cursor: pointer;
    opacity: 0.9;
  }

  .snapmoe-button.collected:hover {
    opacity: 1;
    transform: scale(1.05);
  }

  /* Loading 状态 - 一直显示 */
  .snapmoe-button.loading {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    cursor: not-allowed;
    pointer-events: none;
    opacity: 0.9;
  }

  /* 旋转动画 */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .snapmoe-button .spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  /* 悬停效果 - 静态 */
  .snapmoe-button.not-collected:hover {
  }

  /* 自定义确认弹窗样式 */
  .snapmoe-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .snapmoe-modal {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
    min-width: 420px;
    max-width: 90vw;
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-30px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .snapmoe-modal-header {
    padding: 20px 24px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .snapmoe-modal-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.85);
    margin: 0;
    flex: 1;
    letter-spacing: 0.3px;
  }

  .snapmoe-modal-icon {
    font-size: 24px;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  .snapmoe-modal-body {
    padding: 24px;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.75);
    line-height: 1.6;
    background: #ffffff;
  }

  .snapmoe-modal-footer {
    padding: 16px 24px;
    background: #fafafa;
    border-top: 1px solid #e8e8e8;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .snapmoe-modal-button {
    padding: 6px 20px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5;
    height: 36px;
    outline: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }

  .snapmoe-modal-button:active {
    transform: translateY(1px);
  }

    .snapmoe-modal-button:not(.snapmoe-modal-button-primary):not(.snapmoe-modal-button-danger) {
    background: #ffffff;
    color: rgba(0, 0, 0, 0.75);
    border-color: #d9d9d9;
  }

    .snapmoe-modal-button:not(.snapmoe-modal-button-primary):not(.snapmoe-modal-button-danger):hover {
    color: #1890ff;
    border-color: #1890ff;
    background: #f0f9ff;
  }

  .snapmoe-modal-button-primary {
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
    border-color: #1890ff;
    color: #ffffff;
  }

  .snapmoe-modal-button-primary:hover {
    background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
    border-color: #40a9ff;
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
  }

  .snapmoe-modal-button-danger {
    background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
    border-color: #ff4d4f;
    color: #ffffff;
  }

  .snapmoe-modal-button-danger:hover {
    background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
    border-color: #ff7875;
    box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
  }
`;
document.head.appendChild(style);

// 使用 Map 存储每个图片对应的按钮，实现独立管理
const imageButtons = new Map();

/**
 * 显示自定义确认弹窗
 */
function showConfirmModal(options) {
  return new Promise((resolve) => {
    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.className = "snapmoe-modal-overlay";

    // 创建弹窗
    const modal = document.createElement("div");
    modal.className = "snapmoe-modal";

    // 创建头部
    const header = document.createElement("div");
    header.className = "snapmoe-modal-header";
    header.innerHTML = `
      <span class="snapmoe-modal-icon">${options.icon || "⚠️"}</span>
      <h3 class="snapmoe-modal-title">${options.title || "确认"}</h3>
    `;

    // 创建内容
    const body = document.createElement("div");
    body.className = "snapmoe-modal-body";
    body.textContent = options.content || "";

    // 创建底部
    const footer = document.createElement("div");
    footer.className = "snapmoe-modal-footer";

    const cancelButton = document.createElement("button");
    cancelButton.className = "snapmoe-modal-button";
    cancelButton.textContent = options.cancelText || "取消";
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const okButton = document.createElement("button");
    okButton.className = `snapmoe-modal-button ${
      options.type === "danger"
        ? "snapmoe-modal-button-danger"
        : "snapmoe-modal-button-primary"
    }`;
    okButton.textContent = options.okText || "确定";
    okButton.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    footer.appendChild(cancelButton);
    footer.appendChild(okButton);

    // 组装弹窗
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    // 点击遮罩层关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    };

    // ESC 键关闭
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", handleEsc);
        resolve(false);
      }
    };
    document.addEventListener("keydown", handleEsc);

    // 显示弹窗
    document.body.appendChild(overlay);
  });
}

function createButton(isCollected = false) {
  const btn = document.createElement("div");
  btn.className = `snapmoe-button ${
    isCollected ? "collected" : "not-collected"
  }`;
  btn.innerHTML = isCollected ? "✅ 已收藏" : "⭐ 收藏";
  return btn;
}

function showButton(img) {
  // 过滤小图标
  if (img.naturalWidth < 100 || img.naturalHeight < 100) {
    return;
  }

  // 调试日志
  console.log(
    "[SnapMoe] 显示按钮，图片尺寸:",
    img.naturalWidth,
    "x",
    img.naturalHeight
  );

  // 如果当前图片已经有按钮了，更新位置并返回
  let button = imageButtons.get(img);
  if (button && document.body.contains(button)) {
    // 更新按钮位置（防止滚动后位置错乱）
    const rect = img.getBoundingClientRect();
    button.style.left = `${rect.left + window.scrollX + 10}px`;
    button.style.top = `${rect.top + window.scrollY + 10}px`;
    return;
  }

  // 创建新按钮
  const cleanImgUrl = img.src.split("?")[0];
  const isCollected = isImageCollected(img.src);

  console.log("[SnapMoe] 图片收藏状态:", {
    url: cleanImgUrl,
    isCollected: isCollected,
    inCache: collectedImagesMap.has(cleanImgUrl),
  });

  button = createButton(isCollected);
  // 将按钮与图片关联
  imageButtons.set(img, button);

  const rect = img.getBoundingClientRect();

  // 设置按钮位置
  button.style.left = `${rect.left + window.scrollX + 10}px`;
  button.style.top = `${rect.top + window.scrollY + 10}px`;

  // 绑定点击事件
  setupButtonEvents(button, img, isCollected);

  document.body.appendChild(button);

  // 如果是已收藏的按钮，启动可见性检查
  if (isCollected) {
    startVisibilityCheck();
  }
}

/**
 * 为按钮设置事件处理
 */
function setupButtonEvents(button, img, isCollected) {
  // 清除之前的事件
  button.onclick = null;
  button.oncontextmenu = null;

  if (!isCollected) {
    // 未收藏状态：点击收藏
    button.onclick = async () => {
      // 显示 loading 状态
      button.className = "snapmoe-button loading";
      button.innerHTML = '<span class="spinner">⏳</span> 收藏中...';

      const result = await uploadImage(img.src);

      if (result.success) {
        // 收藏成功，更新为已收藏状态
        button.className = "snapmoe-button collected";
        button.innerHTML = "✅ 已收藏";
        button.style.background =
          "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";

        // 重新绑定事件为已收藏状态的事件
        setupButtonEvents(button, img, true);

        // 启动可见性检查
        startVisibilityCheck();
      } else {
        // 收藏失败
        button.className = "snapmoe-button not-collected";
        button.innerHTML = "❌ 失败";
        button.style.background =
          "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)";

        // 1.5秒后恢复为未收藏状态
        setTimeout(() => {
          button.className = "snapmoe-button not-collected";
          button.innerHTML = "⭐ 收藏";
          button.style.background = "";
        }, 1500);
      }
    };
  } else {
    // 已收藏状态：左键无操作，右键删除
    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[SnapMoe] 已收藏图片");
    };

    // 右键删除
    button.oncontextmenu = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 使用自定义弹窗确认删除
      const confirmed = await showConfirmModal({
        icon: "🗑️",
        title: "确认删除",
        content: "确定要取消收藏这张图片吗？删除后将从您的收藏库中移除。",
        okText: "确认删除",
        cancelText: "取消",
        type: "danger",
      });

      if (!confirmed) {
        return false;
      }

      // 显示删除中状态
      button.className = "snapmoe-button loading";
      button.innerHTML = '<span class="spinner">⏳</span> 删除中...';

      const result = await deleteImage(img.src);

      if (result.success) {
        // 删除成功，显示提示后更新为未收藏状态
        button.innerHTML = "🗑️ 已删除";
        button.style.background =
          "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)";

        setTimeout(() => {
          // 更新为未收藏状态
          button.className = "snapmoe-button not-collected";
          button.innerHTML = "⭐ 收藏";
          button.style.background = "";

          // 重新绑定事件为未收藏状态的事件
          setupButtonEvents(button, img, false);

          // 删除成功后变为未收藏状态，按钮会通过 CSS 自动隐藏
        }, 1500);
      } else {
        // 删除失败，恢复已收藏状态
        button.className = "snapmoe-button collected";
        button.innerHTML = "❌ 删除失败";
        button.style.background =
          "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)";

        setTimeout(() => {
          button.innerHTML = "✅ 已收藏";
          button.style.background =
            "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
        }, 1500);
      }

      return false;
    };

    // 确保样式正确
    button.style.cursor = "pointer";
    button.title = "左键：查看状态 | 右键：删除";
  }
}

/**
 * 移除指定图片的按钮
 */
function removeButton(img) {
  if (!img) return;

  const button = imageButtons.get(img);
  if (button && document.body.contains(button)) {
    button.remove();
  }

  imageButtons.delete(img);
}

/**
 * 清理无效的按钮映射（当图片不在 DOM 中时）
 */
function cleanupInvalidButtons() {
  for (const [img, button] of imageButtons.entries()) {
    // 如果图片不在 DOM 中，清理按钮和映射关系
    if (!document.body.contains(img)) {
      if (button && document.body.contains(button)) {
        button.remove();
      }
      imageButtons.delete(img);
    }
  }
}

// ========== 事件监听 ==========

let visibilityCheckInterval = null;

/**
 * 检查当前图片是否仍然可见
 */
function isImageVisible(img) {
  if (!img) return false;
  // 检查元素是否在 DOM 中
  if (!document.body.contains(img)) return false;
  // 检查元素是否被隐藏
  if (img.offsetParent === null) return false;
  // 检查元素是否在视口中（可选）
  const rect = img.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return true;
}

/**
 * 更新所有按钮的位置（用于滚动时）
 */
function updateButtonPositions() {
  for (const [img, button] of imageButtons.entries()) {
    if (button && document.body.contains(button) && isImageVisible(img)) {
      const rect = img.getBoundingClientRect();
      button.style.left = `${rect.left + window.scrollX + 10}px`;
      button.style.top = `${rect.top + window.scrollY + 10}px`;
    }
  }
}

/**
 * 启动可见性检查（检查所有需要保持显示的按钮）
 */
function startVisibilityCheck() {
  // 如果已经启动了检查，不重复启动
  if (visibilityCheckInterval) {
    return;
  }

  // 每 500ms 检查一次所有需要保持显示的按钮对应的图片是否仍然可见，并更新位置
  visibilityCheckInterval = setInterval(() => {
    // 更新所有按钮的位置
    updateButtonPositions();

    // 清理无效的按钮映射
    cleanupInvalidButtons();

    // 遍历所有按钮，检查需要保持显示的按钮（loading 或 collected 状态）
    for (const [img, button] of imageButtons.entries()) {
      if (button && document.body.contains(button)) {
        if (!isImageVisible(img)) {
          // 图片不可见，移除按钮和映射关系
          button.remove();
          imageButtons.delete(img);
        }
      }
    }
  }, 500);
}

/**
 * 停止可见性检查
 */
function stopVisibilityCheck() {
  if (visibilityCheckInterval) {
    clearInterval(visibilityCheckInterval);
    visibilityCheckInterval = null;
  }
}

// 等待 DOM 加载完成
function init() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachListeners);
  } else {
    attachListeners();
  }
}

/**
 * 扫描页面上的所有图片，为已收藏的图片显示按钮
 */
function scanAndShowCollectedImages() {
  console.log("[SnapMoe] 开始扫描已收藏的图片...");

  const images = document.querySelectorAll("img");
  let collectedCount = 0;

  images.forEach((img) => {
    // 等待图片加载完成
    if (img.complete && img.naturalWidth > 0) {
      processImage(img);
    } else {
      img.addEventListener("load", () => processImage(img), { once: true });
    }
  });

  function processImage(img) {
    // 过滤小图标
    if (img.naturalWidth < 100 || img.naturalHeight < 100) {
      return;
    }

    // 检查是否已收藏
    const cleanImgUrl = img.src.split("?")[0];
    if (collectedImagesMap.has(cleanImgUrl)) {
      // 为已收藏的图片创建按钮
      showButton(img, true);
      collectedCount++;
    }
  }

  console.log(`[SnapMoe] 扫描完成，找到 ${collectedCount} 个已收藏的图片`);
}

function attachListeners() {
  console.log("[SnapMoe] 脚本已加载，开始监听图片");

  // 先加载已收藏的图片列表，然后扫描页面
  loadCollectedImages().then(() => {
    // 立即扫描一次
    scanAndShowCollectedImages();

    // 监听新图片的加载
    observeNewImages();
  });

  // 监听滚动事件，更新按钮位置
  let scrollTimeout = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        updateButtonPositions();
      }, 50);
    },
    true
  );

  // 监听窗口大小变化，更新按钮位置
  window.addEventListener(
    "resize",
    () => {
      updateButtonPositions();
    },
    true
  );

  // 鼠标悬停到图片时显示按钮（为未收藏的图片创建按钮并添加 hover 类）
  document.addEventListener(
    "mouseover",
    (e) => {
      if (e.target.tagName === "IMG") {
        showButton(e.target);
        // 为未收藏的按钮添加 hover 类
        const button = imageButtons.get(e.target);
        if (button && button.classList.contains("not-collected")) {
          button.classList.add("hover");
        }
      }
    },
    true
  );

  // 鼠标移出图片时移除 hover 类
  document.addEventListener(
    "mouseout",
    (e) => {
      if (e.target.tagName === "IMG") {
        const button = imageButtons.get(e.target);
        if (button && button.classList.contains("not-collected")) {
          // 延迟移除，给用户时间移动到按钮上
          setTimeout(() => {
            if (button && !button.matches(":hover")) {
              button.classList.remove("hover");
            }
          }, 100);
        }
      }
    },
    true
  );
}

/**
 * 监听新图片的加载（使用 MutationObserver）
 */
function observeNewImages() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === "IMG") {
          const img = node;
          // 等待图片加载完成后检查
          if (img.complete && img.naturalWidth > 0) {
            checkAndShowButton(img);
          } else {
            img.addEventListener("load", () => checkAndShowButton(img), {
              once: true,
            });
          }
        } else if (node.querySelectorAll) {
          // 检查新添加节点中的所有图片
          node.querySelectorAll("img").forEach((img) => {
            if (img.complete && img.naturalWidth > 0) {
              checkAndShowButton(img);
            } else {
              img.addEventListener("load", () => checkAndShowButton(img), {
                once: true,
              });
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 检查图片是否已收藏，如果是则显示按钮
 */
function checkAndShowButton(img) {
  if (img.naturalWidth < 100 || img.naturalHeight < 100) {
    return;
  }

  const cleanImgUrl = img.src.split("?")[0];
  if (collectedImagesMap.has(cleanImgUrl)) {
    showButton(img, true);
  }
}

// 初始化
init();
