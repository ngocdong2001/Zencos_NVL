const PRODUCT_CREATE_PATH = '/catalog/products/new'

export function buildCatalogProductCreateRoute(returnTo?: string): string {
  if (!returnTo?.trim()) return PRODUCT_CREATE_PATH
  const params = new URLSearchParams({ returnTo })
  return `${PRODUCT_CREATE_PATH}?${params.toString()}`
}
