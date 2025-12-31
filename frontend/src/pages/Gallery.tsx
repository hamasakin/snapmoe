import { useState } from 'react'
import { Layout, Spin, Pagination, Select, Space, Typography } from 'antd'
import { useImages } from '../hooks/useImages'
import ImageGrid from '../components/ImageGrid'

const { Content } = Layout
const { Title } = Typography

export default function Gallery() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [website, setWebsite] = useState<string | undefined>(undefined)

  const { data, isLoading, error } = useImages({ page, pageSize, website })

  if (error) {
    return <div>加载失败：{(error as Error).message}</div>
  }

  return (
    <Layout style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2}>图片收藏库</Title>
            <Select
              style={{ width: 200 }}
              placeholder="筛选网站"
              allowClear
              onChange={(value) => {
                setWebsite(value)
                setPage(1)
              }}
            >
              {/* TODO: 从 API 获取网站列表 */}
            </Select>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              <ImageGrid images={data?.items || []} />
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={data?.total || 0}
                  onChange={(newPage, newPageSize) => {
                    setPage(newPage)
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize)
                    }
                  }}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 张图片`}
                />
              </div>
            </>
          )}
        </Space>
      </Content>
    </Layout>
  )
}
