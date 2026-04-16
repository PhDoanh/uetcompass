# Hướng Dẫn YAML Format Cho Manual Roadmap

##  Tổng Quát

Tính năng **Manual Roadmap (Lộ trình thủ công)** cho phép bạn định nghĩa các con đường học tập bằng cú pháp **YAML**. Quy trình hoạt động:

1. **Lưu trữ** - YAML được lưu nguyên văn trong database (để chỉnh sửa sau)
2. **Phân tích** - Chuyển đổi thành cấu trúc đồ thị (nodes + edges)
3. **Bố cục** - Tự động sắp xếp bằng ELK.js
4. **Render** - Hiển thị tương tác với ReactFlow

---

##  Cấu Trúc Cơ Bản

```yaml
title: Tiêu Đề Lộ Trình
description: Mô tả ngắn gọn về lộ trình học tập

nodes:
  - nodeId: node-1
    type: main_topic              # Loại node
    roadmapName: Tên Hiển Thị
    description: Mô tả chi tiết (không bắt buộc)
    parentNodeId: null            # ID của node cha (null = node gốc)
    skillName: kỹ-năng-1          # Tên kỹ năng (không bắt buộc)
    resources:                     # Tài liệu học (không bắt buộc)
      - title: Tiêu Đề Tài Liệu
        url: https://example.com
        type: link
    elkOptions:                    # Cấu hình bố cục (không bắt buộc)
      width: 220
      height: 80

edges:                             # Kết nối giữa nodes (tự động nếu bỏ trống)
  - id: e_1
    source: node-1
    target: node-2
    type: default
```

---

##  Các Loại Node

### 1️ `main_topic` - Node Chính (Root)

Các lĩnh vực học tập chính, được hiển thị **to lớn** (220×80px).

```yaml
- nodeId: frontend-dev
  type: main_topic
  roadmapName: Phát Triển Frontend
  parentNodeId: null              # KHÔNG có node cha
  description: Nền tảng phát triển web
```

**Ví dụ:** Frontend Development, Backend APIs, DevOps Basics

---

### 2️ `sub_topic` - Node Con (Child)

Các kỹ năng con nằm dưới một main_topic, hiển thị **nhỏ hơn** (160×60px).

```yaml
- nodeId: html-basics
  type: sub_topic
  roadmapName: HTML Cơ Bản
  parentNodeId: frontend-dev      # PHẢI có node cha
  description: HTML5, semantic markup
```

**Ví dụ:** HTML Basics, CSS Styling, JavaScript DOM

---

### 3️ `group_container` - Nhóm Container

Vùng chứa để nhóm các node liên quan.

```yaml
- nodeId: testing-tools
  type: group_container
  roadmapName: Công Cụ Kiểm Thử
  description: Jest, Mocha, Cypress, ...
```

---

### 4️ `choice_item` - Lựa Chọn Thay Thế

Đại diện cho các con đường học tập tùy chọn hoặc thay thế.

```yaml
- nodeId: js-or-ts
  type: choice_item
  roadmapName: JavaScript HOẶC TypeScript
  description: Chọn một để học
```

---

##  Bảng Định Nghĩa Các Trường

### Trường Cấp Top-Level

| Trường | Kiểu | Bắt Buộc | Mô Tả |
|--------|------|----------|--------|
| **title** | chuỗi | ✅ | Tiêu đề lộ trình (tối đa 200 ký tự) |
| **description** | chuỗi | ❌ | Mô tả lộ trình (tối đa 1000 ký tự) |
| **nodes** | mảng | ✅ | Danh sách các node |
| **edges** | mảng | ❌ | Danh sách kết nối (tự động nếu bỏ trống) |

### Trường Node

| Trường | Kiểu | Bắt Buộc | Mô Tả |
|--------|------|----------|--------|
| **nodeId** | chuỗi | ✅ | ID duy nhất (không có khoảng trắng) |
| **roadmapName** | chuỗi | ✅ | Tên hiển thị trên đồ thị |
| **type** | chuỗi | ❌ | Loại node (mặc định: main_topic) |
| **description** | chuỗi | ❌ | Mô tả chi tiết |
| **parentNodeId** | chuỗi | ❌ | ID node cha (cho phân cấp) |
| **skillName** | chuỗi | ❌ | Tên kỹ năng |
| **resources** | mảng | ❌ | Danh sách tài liệu học |
| **elkOptions** | object | ❌ | Cấu hình bố cục |

### Trường Resource (Tài Liệu)

| Trường | Kiểu | Bắt Buộc | Mô Tả |
|--------|------|----------|--------|
| **title** | chuỗi | ✅ | Tiêu đề tài liệu |
| **url** | chuỗi | ✅ | Liên kết URL |
| **type** | chuỗi | ❌ | Loại (link, docs, course, video, book) |

---

##  Ví Dụ Hoàn Chỉnh

```yaml
title: Full-Stack Engineering Bootcamp
description: Từ HTML đến triển khai production

nodes:
  # === Frontend ===
  - nodeId: frontend-core
    type: main_topic
    roadmapName: Frontend Cơ Bản
    description: Nền tảng phát triển web
    parentNodeId: null
    skillName: html5
    resources:
      - title: MDN Web Docs
        url: https://mdn.org
        type: docs
      - title: W3Schools HTML
        url: https://w3schools.com/html
        type: course

  - nodeId: react-basics
    type: sub_topic
    roadmapName: React Cơ Bản
    description: Components, Props, State, Hooks
    parentNodeId: frontend-core
    skillName: react
    resources:
      - title: React Chính Thức
        url: https://react.dev
        type: docs

  - nodeId: react-advanced
    type: sub_topic
    roadmapName: React Nâng Cao
    description: Context API, Redux, Performance
    parentNodeId: frontend-core
    skillName: react-advanced

  # === Backend ===
  - nodeId: backend-core
    type: main_topic
    roadmapName: Backend Development
    description: API REST, Database, Authentication
    parentNodeId: null
    skillName: nodejs
    resources:
      - title: Node.js Docs
        url: https://nodejs.org/docs
        type: docs

  - nodeId: nodejs-express
    type: sub_topic
    roadmapName: Express.js
    description: Web framework cho Node.js
    parentNodeId: backend-core
    skillName: expressjs

  - nodeId: database
    type: sub_topic
    roadmapName: Database (SQL/NoSQL)
    description: PostgreSQL hoặc MongoDB
    parentNodeId: backend-core
    skillName: database

  # === DevOps ===
  - nodeId: devops-core
    type: main_topic
    roadmapName: DevOps & Deployment
    description: Docker, Kubernetes, CI/CD
    parentNodeId: null
    skillName: docker

edges:
  - id: e_1
    source: frontend-core
    target: react-basics
    type: default

  - id: e_2
    source: frontend-core
    target: react-advanced
    type: default

  - id: e_3
    source: backend-core
    target: nodejs-express
    type: default

  - id: e_4
    source: backend-core
    target: database
    type: default
```

---

##  Best Practices (Thực Hành Tốt Nhất)

### 1. Sử Dụng kebab-case cho ID

✅ **Đúng:**
```yaml
nodeId: react-hooks-advanced
nodeId: html-semantic-markup
```

❌ **Sai:**
```yaml
nodeId: ReactHooksAdvanced
nodeId: react hooks advanced
nodeId: react_hooks_advanced
```

### 2. Mô tả ngắn gọn, rõ ràng

✅ **Tốt:**
```yaml
description: Learn React Hooks, State Management, Custom Hooks
```

❌ **Tệ:**
```yaml
description: In this module we will learn about many things related to React including hooks...
```

### 3. Phân cấp rõ ràng

```yaml
nodes:
  - nodeId: javascript           # main_topic (gốc)
    type: main_topic
    parentNodeId: null

  - nodeId: dom-manipulation     # sub_topic (con)
    type: sub_topic
    parentNodeId: javascript     #  Rõ ràng phân cấp
```

### 4. Giữ số main_topic hợp lý

- **Tốt:** 3-5 main_topic trên một hàng
- **Tẻ:** 10+ main_topic sẽ làm đồ thị rối loạn

### 5. Thêm tài liệu học cho mỗi node

```yaml
resources:
  - title: Tên Tài Liệu
    url: https://link-to-resource
    type: docs  # hoặc: link, course, video, book
```

---

##  Quy Tắc Xác Thực (Validation)

Hệ thống sẽ kiểm tra:

| Lỗi | Thông Báo | Cách Sửa |
|-----|-----------|---------|
| Thiếu `title` | "Tiêu đề là bắt buộc" | Thêm `title:` ở đầu |
| Thiếu `nodes` | "Cần ít nhất 1 node" | Thêm danh sách `nodes:` |
| Thiếu `nodeId` | "Mỗi node cần `nodeId`" | Thêm `nodeId: unique-id` |
| Thiếu `roadmapName` | "Mỗi node cần `roadmapName`" | Thêm tên hiển thị |
| Lỗi YAML Syntax | "YAML chứa lỗi cú pháp" | Kiểm tra thụt lề (2 space) |
| ID trùng lặp | "ID bị trùng" | Đảm bảo mỗi nodeId duy nhất |
| Parent không tồn tại | "Node cha không tìm thấy" | Kiểm tra parentNodeId tồn tại |

---

##  Gợi Ý Chỉnh Sửa

### Trong Monaco Editor

| Phím Tắt | Chức Năng |
|----------|-----------|
| **Ctrl+/** | Comment/Uncomment dòng |
| **Ctrl+Z** | Undo |
| **Ctrl+F** | Tìm kiếm node |
| **Hover** | Xem lỗi validation (dòng đỏ) |
| **Ctrl+Shift+P** | Mở Command Palette |

### Màu Sắc Phản Hồi

- 🔵 **main_topic** → Xanh lam đậm
- 🔵 **sub_topic** → Xanh lam nhạt
- 🟣 **group_container** → Tím
- 🔴 **Validation errors** → Đỏ (underline)

---

## 🔧 Khắc Phục Sự Cố

###  Node không xuất hiện trên đồ thị

**Kiểm tra:**
- [ ] Mỗi `nodeId` có duy nhất?
- [ ] Có trường `title` và `nodes`?
- [ ] Thụt lề đúng (bội số của 2 space)?

###  Node không kết nối đúng

**Kiểm tra:**
- [ ] `parentNodeId` có khớp với `nodeId` hiện tại?
- [ ] Có lỗi gõ trong ID?
- [ ] Node cha có tồn tại?

###  Đồ thị trông chật chội

**Giải pháp:**
- [ ] Giảm số node trên một hàng
- [ ] Sử dụng `sub_topic` để phân cấp
- [ ] Điều chỉnh `elkOptions` nếu cần layout tùy chỉnh

---

##  Định Dạng Khi Lưu

Sau khi lưu, lộ trình được lưu trữ với cấu trúc:

```json
{
  "_id": "unique-id",
  "title": "Tiêu đề",
  "description": "Mô tả",
  "yamlCode": "... YAML gốc ...",         // Dùng để chỉnh sửa
  "nodes": [...],                          // Nodes đã phân tích
  "edges": [...],                          // Edges tính toán sẵn
  "positions": {...},                      // Vị trí bố cục (cached)
  "status": "draft",
  "createdAt": "2026-04-16T...",
  "updatedAt": "2026-04-16T..."
}
```

- **Chỉnh sửa** → Dùng `yamlCode` (để sửa đổi)
- **Xem** → Dùng `nodes`, `edges`, `positions` (nhanh hơn)

---

##  Mẹo Thêm

- **Lớp lót**: Tối đa 3-4 cấp phân cấp để dễ đọc
- **Loại node**: Mỗi loại có color và size khác nhau
- **Resource**: Thêm link tài liệu để người dùng học
- **Description**: Giúp người dùng hiểu mục đích của node

---

##  Học Thêm

Nhấp vào dropdown **"Chọn mẫu roadmap"** để xem các ví dụ thực tế!

---

**Hỏi? Bấm nút `?` lại để xem hướng dẫn này bất cứ lúc nào!** ❓