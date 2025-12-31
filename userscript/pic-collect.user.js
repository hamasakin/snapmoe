// ==UserScript==
// @name         图片收藏助手 (Cloudflare Worker + R2)
// @version      2.0.0
// @description  基于 Cloudflare Worker + R2 的图片收藏工具
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // ========== 配置 ==========
  const SUPABASE_URL = "https://nenpnltcvapjgaakntha.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbnBubHRjdmFwamdhYWtudGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxOTAyNTcsImV4cCI6MjA4Mjc2NjI1N30.dt4JlJLj5_iLL8H8OfRuwDO4RZtfouybDyxAX2Fg-gE";

  // ⭐ Cloudflare Worker URL（部署后需要修改为你的 Worker URL）
  const WORKER_URL = "https://pic-collect-upload.sorasahsx.workers.dev/";

  // R2 配置（Worker 会使用，这里保留用于日志）
  const R2_PUBLIC_URL = "https://pub-503f8ebc7e1d4c8eacc08af4f823286d.r2.dev";

  // ========== Supabase REST API 封装 ==========
  const supabaseAPI = {
    async query(table, options = {}) {
      const { select = "*", filter = {}, single = false } = options;
      let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;

      // 添加过滤条件
      Object.entries(filter).forEach(([key, value]) => {
        url += `&${key}=eq.${encodeURIComponent(value)}`;
      });

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: single ? "return=representation" : "return=representation",
        },
      });

      if (!response.ok) {
        let errorMsg = "查询失败";
        try {
          const error = await response.json();
          errorMsg = error.message || error.hint || errorMsg;
        } catch (e) {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return single ? data[0] || null : data;
    },

    async insert(table, data) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMsg = "插入失败";
        try {
          const error = await response.json();
          errorMsg = error.message || error.hint || error.details || errorMsg;
        } catch (e) {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      return Array.isArray(result) ? result[0] : result;
    },
  };

  // ========== 初始化 ==========
  // ⭐ 使用 Cloudflare Worker 来处理 R2 上传（原生支持，零依赖）
  console.log("[Pic Collect] 初始化成功，使用 REST API");
  console.log("[Pic Collect] Cloudflare Worker URL:", WORKER_URL);
  console.log("[Pic Collect] 提示: 部署 Worker 后请修改 WORKER_URL");

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
    } catch (e) {
      return "image";
    }
  }

  /**
   * 上传图片
   */
  async function uploadImage(imgUrl) {
    console.log("[Pic Collect] 开始处理图片:", imgUrl);

    try {
      const pageUrl = window.location.href;
      const imageName = extractImageName(imgUrl);

      // 1. 生成唯一标识（基于页面 URL + 图片 URL）
      const imageId = generateImageId(pageUrl, imgUrl);
      console.log("[Pic Collect] 图片唯一标识:", imageId);
      console.log("[Pic Collect] 页面 URL:", pageUrl);
      console.log("[Pic Collect] 图片名称:", imageName);

      // 2. 检查是否已存在（基于页面 URL + 原始 URL）
      console.log("[Pic Collect] 检查图片是否已存在...");
      const cleanPageUrl = pageUrl.split("?")[0].split("#")[0];
      const cleanImgUrl = imgUrl.split("?")[0];

      const existing = await supabaseAPI.query("images", {
        select: "*",
        filter: {
          source_page_url: cleanPageUrl,
          original_url: cleanImgUrl,
        },
        single: true,
      });

      if (existing) {
        console.log("[Pic Collect] 图片已存在，跳过上传");
        return { success: true, message: "图片已存在" };
      }

      // 3. 下载图片
      console.log("[Pic Collect] 正在下载图片...");
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      console.log("[Pic Collect] 图片下载成功，大小:", blob.size, "bytes");

      // 4. 计算文件哈希（用于 R2 存储路径，避免文件名冲突）
      console.log("[Pic Collect] 正在计算哈希...");
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      console.log("[Pic Collect] 文件哈希:", fileHash);

      // 5. 通过 Cloudflare Worker 上传到 R2
      // R2 路径使用：时间戳-图片ID-原文件名，确保唯一且可读
      console.log("[Pic Collect] 调用 Cloudflare Worker 上传到 R2...");

      const timestamp = Date.now();
      const cleanName = imageName.replace(/[^a-zA-Z0-9._-]/g, "_");

      let r2Url, r2Path, uploadedWidth, uploadedHeight;

      try {
        const uploadResponse = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: imgUrl,
            fileHash: fileHash,
            imageId: imageId, // 传递唯一 ID
            imageName: cleanName, // 传递图片名称
            timestamp: timestamp, // 传递时间戳
            originalUrl: imgUrl,
            sourceWebsite: window.location.hostname,
            sourcePageUrl: cleanPageUrl,
          }),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || "Worker 调用失败");
        }

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "上传失败");
        }

        r2Url = uploadResult.data.r2Url;
        r2Path = uploadResult.data.r2Path;
        uploadedWidth = uploadResult.data.width;
        uploadedHeight = uploadResult.data.height;

        console.log("[Pic Collect] R2 上传成功:", {
          url: r2Url,
          path: r2Path,
          size: uploadResult.data.fileSize,
        });
      } catch (uploadError) {
        console.error("[Pic Collect] R2 上传失败:", uploadError);
        console.warn("[Pic Collect] 使用原始 URL 作为备选方案");

        // 如果上传失败，使用原始 URL
        r2Url = imgUrl;
        r2Path = `${timestamp}-${imageId}-${cleanName}`;
        uploadedWidth = 0;
        uploadedHeight = 0;
      }

      // 6. 获取图片尺寸（如果 Worker 没有返回）
      let width = uploadedWidth;
      let height = uploadedHeight;

      if (!width || !height) {
        console.log("[Pic Collect] 获取图片尺寸...");
        try {
          const img = await createImageBitmap(blob);
          width = img.width;
          height = img.height;
        } catch (e) {
          console.warn("[Pic Collect] 无法获取图片尺寸:", e);
          width = 0;
          height = 0;
        }
      }

      // 7. 保存元数据到 Supabase
      console.log("[Pic Collect] 保存元数据到 Supabase...");
      await supabaseAPI.insert("images", {
        original_url: cleanImgUrl, // 保存清理后的 URL
        r2_url: r2Url,
        r2_path: r2Path,
        source_website: window.location.hostname,
        source_page_url: cleanPageUrl, // 保存清理后的页面 URL
        title: imageName, // 保存图片名称
        width: width,
        height: height,
        file_size: blob.size,
        file_hash: fileHash,
        mime_type: blob.type,
      });

      console.log("[Pic Collect] 收藏成功！");
      return { success: true, message: "收藏成功" };
    } catch (error) {
      console.error("[Pic Collect] 上传失败:", error);
      console.error("[Pic Collect] 错误堆栈:", error.stack);
      return {
        success: false,
        message: error.message || "上传失败",
      };
    }
  }

  // ========== UI 逻辑 ==========

  let currentButton = null;
  let currentImage = null;

  function createButton() {
    const btn = document.createElement("div");
    btn.className = "pic-collect-button";
    btn.innerHTML = "⭐ 收藏";
    return btn;
  }

  function showButton(img) {
    // 过滤小图标
    if (img.naturalWidth < 100 || img.naturalHeight < 100) {
      return;
    }

    // 调试日志
    console.log(
      "[Pic Collect] 显示按钮，图片尺寸:",
      img.naturalWidth,
      "x",
      img.naturalHeight
    );

    hideButton();

    currentImage = img;
    currentButton = createButton();

    const rect = img.getBoundingClientRect();
    currentButton.style.cssText = `
            position: absolute;
            left: ${rect.left + window.scrollX + 10}px;
            top: ${rect.top + window.scrollY + 10}px;
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.2s;
            user-select: none;
        `;

    currentButton.onclick = async () => {
      currentButton.innerHTML = "⏳ 收藏中...";
      currentButton.style.opacity = "0.6";

      const result = await uploadImage(img.src);

      if (result.success) {
        currentButton.innerHTML = "✅ 成功";
        currentButton.style.background =
          "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)";
      } else {
        currentButton.innerHTML = "❌ 失败";
        currentButton.style.background =
          "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)";
      }

      setTimeout(hideButton, 1500);
    };

    currentButton.onmouseenter = () => {
      currentButton.style.transform = "translateY(-2px)";
    };

    currentButton.onmouseleave = () => {
      currentButton.style.transform = "translateY(0)";
    };

    document.body.appendChild(currentButton);
  }

  function hideButton() {
    if (currentButton) {
      currentButton.remove();
      currentButton = null;
      currentImage = null;
    }
  }

  // ========== 事件监听 ==========

  let hideTimeout = null;

  // 等待 DOM 加载完成
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", attachListeners);
    } else {
      attachListeners();
    }
  }

  function attachListeners() {
    console.log("[Pic Collect] 脚本已加载，开始监听图片");

    document.addEventListener(
      "mouseover",
      (e) => {
        if (e.target.tagName === "IMG") {
          clearTimeout(hideTimeout);
          showButton(e.target);
        }
      },
      true
    );

    document.addEventListener(
      "mouseout",
      (e) => {
        if (e.target.tagName === "IMG") {
          hideTimeout = setTimeout(hideButton, 300);
        }
      },
      true
    );
  }

  // 初始化
  init();
})();
