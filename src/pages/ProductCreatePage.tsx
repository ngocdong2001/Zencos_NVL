import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ProductCreateForm } from '../components/catalog/ProductCreateForm'

export function ProductCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [latestCreatedCode, setLatestCreatedCode] = useState('')

  const returnToPath = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const returnTo = params.get('returnTo')
    if (!returnTo || !returnTo.startsWith('/')) return '/catalog'
    return returnTo
  }, [location.search])

  return (
    <section className="catalog-page-shell">
      <div className="catalog-page-top">
        <section className="title-bar">
          <div>
            <h2>Tạo Product Mới</h2>
            <p>Nhập nhanh mã product mới để dùng ngay ở các màn hình nghiệp vụ.</p>
          </div>
          <div className="title-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(returnToPath)}>
              <i className="pi pi-arrow-left" /> Quay lại màn trước
            </button>
          </div>
        </section>
        {latestCreatedCode ? (
          <section className="catalog-inline-notice success">
            <span>Product {latestCreatedCode} đã sẵn sàng để chọn ở các màn hình nhập liệu khác.</span>
            <button type="button" className="catalog-inline-notice-close" onClick={() => setLatestCreatedCode('')} aria-label="Đóng thông báo">
              x
            </button>
          </section>
        ) : null}
      </div>

      <div className="catalog-page-table product-create-page-table">
        <ProductCreateForm
          returnToPath={returnToPath}
          onCreated={(product) => {
            setLatestCreatedCode(product.code)
          }}
          onCancel={() => navigate(returnToPath)}
        />
      </div>
    </section>
  )
}
