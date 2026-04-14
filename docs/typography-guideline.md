# Typography Guideline

Muc tieu:
- Chuan hoa heading, body text, caption va so lieu trong toan bo ung dung.
- Tat ca giao dien moi phai dung token, khong hard-code font-size theo px.

## 1. Nguon su that

Typography token duoc dinh nghia tai:
- src/App.css (:root)

Cac global rule dang ap dung:
- body su dung font-body, font-size body, line-height body
- h1-h6 su dung font-heading va line-height heading
- p, label, small, span su dung line-height body

## 2. Font family

- Body: var(--font-body)
- Heading: var(--font-heading)

Khong dung truc tiep:
- Inter, Readex Pro, hoac font-family hard-code trong component/module

## 3. Size scale

### Heading scale
- var(--font-size-page-title): 24px
- var(--font-size-section-title): 24px
- var(--font-size-subsection-title): 20px

### Body scale
- var(--font-size-body-lg): 16px
- var(--font-size-body-md): 15px
- var(--font-size-body): 14px
- var(--font-size-body-sm): 13px
- var(--font-size-caption): 12px
- var(--font-size-micro): 11px
- var(--font-size-body-xs): 10px
- var(--font-size-body-xxs): 9px

### Display/KPI scale
- var(--font-size-display): 30px
- var(--font-size-kpi): 22px
- var(--font-size-kpi-icon): 23px
- var(--font-size-emphasis): 18px
- var(--font-size-subtitle): 17px

## 4. Line-height

- var(--line-height-heading): 1.2
- var(--line-height-body): 1.5

Quy tac:
- Heading uu tien var(--line-height-heading)
- Body/caption/label uu tien var(--line-height-body)
- Chi override line-height trong truong hop dac thu (icon, badge, compact control)

## 5. Quy dinh su dung

- Khong viet font-size: xxpx trong App.css va CSS moi.
- Khong viet font-family hard-code trong module moi.
- Dung token tu :root, neu chua co token phu hop thi bo sung token truoc.
- Uu tien scale gan nhat thay vi tao token moi qua som.

## 6. Mapping nhanh theo use-case

- Tieu de trang: var(--font-size-page-title)
- Tieu de section/card lon: var(--font-size-section-title)
- Tieu de card nho/modal: var(--font-size-subsection-title)
- Noi dung chinh: var(--font-size-body)
- Meta text/phu de: var(--font-size-body-sm) hoac var(--font-size-caption)
- Note/ho tro/chu thich nho: var(--font-size-caption) hoac var(--font-size-micro)
- So KPI: var(--font-size-kpi) hoac var(--font-size-display)

## 7. Do and Don't

Do:
- Dung bien: font-size: var(--font-size-body);
- Dung bien: font-family: var(--font-heading);

Don't:
- font-size: 14px;
- font-family: 'Inter', sans-serif;

## 8. Checklist truoc khi merge UI

- Khong con font-size hard-code theo px trong file vua sua.
- Khong con font-family hard-code.
- Heading/body trong man hinh moi nhat quan theo scale.
- Build khong loi.

## 9. Lenh kiem tra nhanh

Tim font-size hard-code:
- rg "font-size:\\s*[0-9]+px;" src/App.css

Tim font-family hard-code:
- rg "font-family:\\s*'Inter'|font-family:\\s*'Readex Pro'" src/App.css
