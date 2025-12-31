-- ============================================
-- Pic Collect 数据库初始化脚本
-- ============================================

-- 1. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建 images 表
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 图片信息
    original_url TEXT NOT NULL,
    r2_url TEXT NOT NULL,  -- R2 存储的公开 URL
    r2_path TEXT NOT NULL, -- R2 存储路径（用于删除）

    -- 来源信息
    source_website VARCHAR(255) NOT NULL,
    source_page_url TEXT,

    -- 元数据
    title VARCHAR(255),
    width INTEGER,
    height INTEGER,
    file_size BIGINT,
    file_hash VARCHAR(64) UNIQUE,  -- SHA256
    mime_type VARCHAR(50),

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_images_source_website ON images(source_website);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_file_hash ON images(file_hash);

-- 4. 创建 tags 表
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 5. 创建 image_tags 关联表
CREATE TABLE IF NOT EXISTS image_tags (
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (image_id, tag_id)
);

-- 6. 创建 websites 统计表
CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) UNIQUE NOT NULL,
    image_count INTEGER DEFAULT 0,
    last_collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain);

-- 7. 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_images_updated_at ON images;
CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 创建触发器：自动更新网站统计
CREATE OR REPLACE FUNCTION update_website_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO websites (domain, image_count, last_collected_at)
        VALUES (NEW.source_website, 1, NOW())
        ON CONFLICT (domain) DO UPDATE
        SET image_count = websites.image_count + 1,
            last_collected_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE websites
        SET image_count = GREATEST(0, image_count - 1)
        WHERE domain = OLD.source_website;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_website_stats ON images;
CREATE TRIGGER trigger_update_website_stats
    AFTER INSERT OR DELETE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_website_stats();

-- 9. 启用 Row Level Security (RLS)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- 10. 创建 RLS 策略（允许公开访问 - 个人使用）
DROP POLICY IF EXISTS "Allow all operations on images" ON images;
CREATE POLICY "Allow all operations on images"
    ON images
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on tags" ON tags;
CREATE POLICY "Allow all operations on tags"
    ON tags
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on image_tags" ON image_tags;
CREATE POLICY "Allow all operations on image_tags"
    ON image_tags
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on websites" ON websites;
CREATE POLICY "Allow all operations on websites"
    ON websites
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 初始化完成
-- ============================================
