# Huong dan trien khai va mo rong AI Chatbox (Ollama + qwen2.5:7b)

Ngay cap nhat: 2026-03-16
Pham vi: Frontend React + Backend Express/Prisma trong du an AI_Biz.

## 1. Muc tieu

- Cung cap chatbox AI trong giao dien de nhan yeu cau nghiep vu bang ngon ngu tu nhien.
- Dung agentic flow (LLM goi tool) de thuc hien tac vu thuc te tren database.
- Ban dau ho tro tac vu: them mat hang moi vao danh muc hang hoa.

## 2. Kien truc tong quan

Nguoi dung nhap yeu cau trong chatbox.

Frontend goi API POST /api/ai/chat.

Backend route AI gui context + tools cho Ollama theo OpenAI-compatible API.

Model qwen2.5:7b quyet dinh co goi tool hay khong.

Neu co tool call, server thuc thi logic qua Prisma.

Server tra ket qua tool lai cho model de model phan hoi cau tra loi cuoi.

Frontend hien thi phan hoi va badge ket qua thao tac.

## 3. Cau hinh can co

### 3.1 Ollama local

Yeu cau:
- Ollama da cai va dang chay local.
- Model da tai: qwen2.5:7b.

Lenh huu ich:
- ollama list
- ollama pull qwen2.5:7b

### 3.2 Bien moi truong backend

Cap nhat file server/.env:

- OLLAMA_BASE_URL=http://localhost:11434/v1
- OLLAMA_MODEL=qwen2.5:7b

## 4. Cac file lien quan da implement

- server/src/routes/ai.ts
- server/src/index.ts
- src/components/AiChatBox.tsx
- src/App.tsx
- server/.env

## 5. Luong xu ly agentic

1. Frontend gui message va history qua POST /api/ai/chat.
2. Backend tao messages gom: system prompt + history + user message.
3. Backend goi model voi tools va tool_choice=auto.
4. Neu model tra ve tool_calls:
   - Parse arguments.
   - Goi executeTool(name, args).
   - Day ket qua tool vao messages voi role tool.
   - Goi model lai de ra cau tra loi cho nguoi dung.
5. Neu khong co tool_calls thi tra thang reply cho frontend.
6. Gioi han vong lap toi da 5 de tranh loop vo han.

## 6. Tool hien tai

### 6.1 add_product

Muc dich:
- Them mat hang moi vao bang products.

Tham so:
- code (bat buoc, duy nhat)
- name (bat buoc)
- costPrice (tuy chon, mac dinh 0)
- sellPrice (tuy chon, mac dinh 0)
- alertQty (tuy chon, mac dinh 0)

Kiem tra:
- Neu trung code dang hoat dong thi tra loi error.

Ket qua:
- success + product neu tao thanh cong.

### 6.2 list_products

Muc dich:
- Tim danh sach san pham theo tu khoa.

Tham so:
- q (tuy chon)
- limit (tuy chon, mac dinh 5)

Ket qua:
- products[]

## 7. Huong dan mo rong chatbox cho chuc nang moi

Moi chuc nang moi can lam 3 buoc chinh.

### Buoc 1: Them tool definition

Sua server/src/routes/ai.ts trong mang TOOLS:
- Dat ten theo quy uoc action_resource. Vi du: add_customer, create_sale, add_purchase_payment.
- Viet description ro rang, dung ngon ngu nghiep vu.
- Khai bao schema parameters day du, danh dau required chinh xac.

### Buoc 2: Them xu ly trong executeTool

Sua server/src/routes/ai.ts:
- Them case if (name === '...').
- Validate nghiep vu can thiet truoc khi ghi DB.
- Thuc thi Prisma trong 1 diem tap trung.
- Tra ve JSON ket qua co cau truc on dinh:
  - Thanh cong: { success: true, <resource> }
  - Loi: { error: '...' }

Khuyen nghi:
- Voi thao tac phuc tap, tach logic vao service rieng de test de hon.

### Buoc 3: Cap nhat giao dien chatbox

Sua src/components/AiChatBox.tsx trong ham renderActionBadge:
- Them case hien thi ket qua theo tool moi.
- Neu tool thanh cong va can refresh du lieu tren man hinh, dung callback onDataChange.

Sua src/App.tsx:
- Bo sung case onDataChange de goi loadWorkspace hoac ham refresh tuong ung.

## 8. Mau mo rong nhanh (add_customer)

Muc tieu: Cho phep user yeu cau AI them khach hang.

Can sua:
1. TOOLS: them add_customer.
2. executeTool: them case add_customer voi prisma.customer.create.
3. renderActionBadge: hien thi Da them khach hang.
4. App onDataChange: neu tool la add_customer thi refresh customers.

## 9. Quy uoc de giu he thong on dinh

- Dat ten tool nhat quan theo action_resource.
- Moi tool phai co validation toi thieu.
- Khong de model ghi truc tiep DB ngoai executeTool.
- Tra ve JSON gon, de model tong hop phan hoi de doc.
- Gioi han history gui len (hien tai 10 turns) de tranh ton token.
- Gioi han vong lap agentic (hien tai 5 rounds).

## 10. Kiem thu toi thieu sau moi lan mo rong

Backend:
- API POST /api/ai/chat tra 400 khi message rong.
- Tool moi chay dung voi input hop le.
- Tool moi tra loi loi ro rang voi input khong hop le.

Frontend:
- Chatbox mo/dong binh thuong.
- Gui tin nhan va nhan phan hoi.
- Badge action hien dung ket qua tool.
- Du lieu man hinh duoc refresh neu co thay doi.

## 11. Van de thuong gap va cach xu ly

### Loi model khong goi tool

Nguyen nhan:
- System prompt mo ta chua ro.
- Description tool qua mo ho.

Khac phuc:
- Viet prompt theo huong hanh dong cu the.
- Lam ro dieu kien khi nao phai goi tool.

### Loi TypeScript voi tool_calls union type

Bieu hien:
- Bao loi Property function does not exist on type ChatCompletionMessageToolCall.

Khac phuc:
- Check call.type === 'function' truoc.
- Cast an toan roi moi doc call.function.

### Loi ket noi Ollama

Kiem tra:
- OLLAMA_BASE_URL dung chua.
- Ollama service dang chay chua.
- Model qwen2.5:7b da pull chua.

## 12. Checklist khi ban giao cho nguoi thuc hien

- Da co huong dan setup Ollama local.
- Da co bien moi truong OLLAMA_BASE_URL va OLLAMA_MODEL.
- Da co route /api/ai/chat.
- Da co it nhat 1 tool hoat dong end-to-end.
- Da co cach mo rong tool theo 3 buoc (TOOLS, executeTool, UI badge/refresh).
- Da test manual luong them mat hang thanh cong.
