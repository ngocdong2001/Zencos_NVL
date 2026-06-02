import { readFileSync, writeFileSync } from 'fs'

const file = 'd:/!Project/Zencos_NVL/src/pages/ProductionBomPage.tsx'
let src = readFileSync(file, 'utf8')

const oldFooter = `      <div className="outbound-page-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '1rem 0' }}>
        {(isNew || bom?.status === 'draft') && (
          <Button
            type="button"
            label="Lưu bản nháp"
            icon="pi pi-save"
            className="btn btn-primary"
            loading={saving}
            onClick={handleSave}
          />
        )}
        {!isNew && bom?.status === 'draft' && (
          <Button
            type="button"
            label="Gửi duyệt"
            icon="pi pi-send"
            className="btn"
            severity="warning"
            loading={saving}
            onClick={() => handleTransition(() => submitProductionBom(id!))}
          />
        )}
        {!isNew && bom?.status === 'submitted' && (
          <Button
            type="button"
            label="Thu hồi"
            icon="pi pi-undo"
            className="btn"
            severity="secondary"
            loading={saving}
            onClick={() => handleTransition(() => recallProductionBom(id!))}
          />
        )}
        {!isNew && bom?.status === 'submitted' && (
          <Button
            type="button"
            label="Phê duyệt"
            icon="pi pi-check"
            className="btn"
            severity="success"
            loading={saving}
            onClick={() => handleTransition(() => approveProductionBom(id!))}
          />
        )}
        {!isNew && bom?.status === 'approved' && (
          <Button
            type="button"
            label="Ngưng hiệu lực"
            icon="pi pi-ban"
            outlined
            severity="danger"
            loading={saving}
            onClick={() => handleTransition(() => deactivateProductionBom(id!))}
          />
        )}
        <Button
          type="button"
          label="Quay lại"
          icon="pi pi-arrow-left"
          className="btn btn-ghost"
          onClick={() => navigate('/production-bom')}
        />
      </div>`

const newFooter = `      <footer className="inbound-create-footer">
        <p>
          <i className="pi pi-info-circle" />
          {isNew ? 'Điền đầy đủ thông tin rồi lưu bản nháp.' : isReadonly ? 'Phiếu chỉ xem, không thể chỉnh sửa.' : 'Cập nhật xong nhấn Lưu.'}
        </p>
        <div className="inbound-create-footer-actions">
          <Button
            type="button"
            label="Quay lại"
            icon="pi pi-angle-left"
            className="btn btn-ghost"
            onClick={() => navigate('/production-bom')}
          />
          {!isNew && bom?.status === 'approved' && (
            <Button
              type="button"
              label="Ngưng hiệu lực"
              icon="pi pi-ban"
              outlined
              severity="danger"
              loading={saving}
              onClick={() => handleTransition(() => deactivateProductionBom(id!))}
            />
          )}
          {!isNew && bom?.status === 'submitted' && (
            <Button
              type="button"
              label="Thu hồi"
              icon="pi pi-undo"
              className="btn btn-ghost"
              loading={saving}
              onClick={() => handleTransition(() => recallProductionBom(id!))}
            />
          )}
          {!isNew && bom?.status === 'submitted' && (
            <Button
              type="button"
              label="Phê duyệt"
              icon="pi pi-check"
              className="btn btn-primary inbound-next-btn"
              loading={saving}
              onClick={() => handleTransition(() => approveProductionBom(id!))}
            />
          )}
          {!isNew && bom?.status === 'draft' && (
            <Button
              type="button"
              label="Gửi duyệt"
              icon="pi pi-send"
              className="btn btn-primary inbound-next-btn"
              loading={saving}
              onClick={() => handleTransition(() => submitProductionBom(id!))}
            />
          )}
          {(isNew || bom?.status === 'draft') && (
            <Button
              type="button"
              label="Lưu bản nháp"
              icon="pi pi-save"
              className="btn btn-primary inbound-next-btn"
              loading={saving}
              onClick={handleSave}
            />
          )}
        </div>
      </footer>`

// Normalize to CRLF for matching, then normalize old footer too
const oldFooterCRLF = oldFooter.replace(/\r?\n/g, '\r\n')
const newFooterCRLF = newFooter.replace(/\r?\n/g, '\r\n')

if (!src.includes(oldFooterCRLF)) {
  console.error('ERROR: old footer not found in file')
  process.exit(1)
}

src = src.replace(oldFooterCRLF, newFooterCRLF)
writeFileSync(file, src, 'utf8')
console.log('OK: footer replaced')
