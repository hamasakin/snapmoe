import { Card, Typography, Space, Button, Popconfirm } from "antd";
import { DeleteOutlined, LinkOutlined } from "@ant-design/icons";
import type { Image } from "../lib/supabase";
import { useDeleteImage } from "../hooks/useImages";

const { Text } = Typography;

interface ImageCardProps {
  image: Image;
}

export default function ImageCard({ image }: ImageCardProps) {
  const deleteImage = useDeleteImage();

  const handleDelete = () => {
    deleteImage.mutate(image.id);
  };

  return (
    <Card
      hoverable
      cover={
        <img
          alt={image.title || "图片"}
          src={image.r2_url}
          style={{ width: "100%", height: "auto" }}
          loading="lazy"
        />
      }
      actions={[
        <a
          href={image.source_page_url || image.original_url}
          target="_blank"
          rel="noopener noreferrer"
          key="link"
        >
          <LinkOutlined /> 来源
        </a>,
        <Popconfirm
          title="确定要删除这张图片吗？"
          onConfirm={handleDelete}
          okText="确定"
          cancelText="取消"
          key="delete"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        title={image.title || "未命名"}
        description={
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Text type="secondary" ellipsis>
              来源：{image.source_website}
            </Text>
            {image.width && image.height && (
              <Text type="secondary">
                尺寸：{image.width} × {image.height}
              </Text>
            )}
            {image.file_size && (
              <Text type="secondary">
                大小：{(image.file_size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
          </Space>
        }
      />
    </Card>
  );
}
