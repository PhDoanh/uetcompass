# Hướng Dẫn YAML Cho Manual Roadmap

## Tổng Quan

Manual Roadmap dùng YAML để mô tả một lộ trình học dưới dạng đồ thị gồm `nodes` và `edges`.

Quy trình xử lý:

1. YAML được lưu nguyên văn để có thể chỉnh sửa lại sau.
2. Hệ thống phân tích YAML thành dữ liệu chuẩn.
3. ELK.js tính vị trí hiển thị cho từng node.
4. Graph renderer hiển thị roadmap trực quan trên giao diện.

---

## Cấu Trúc Tối Thiểu

```yaml
title: Tên Lộ Trình
description: Mô tả ngắn gọn về lộ trình

nodes:
  - nodeId: frontend-core
    label: Frontend Cơ Bản
    type: main_topic
    description: Nền tảng phát triển giao diện web
    parentNodeId: null
    skillName: html5
    resources:
      - title: MDN Web Docs
        url: https://developer.mozilla.org/
        type: link

edges:
  - id: e_1
    source: frontend-core
    target: html-basics
    type: default
```

---

## Trường Quan Trọng

### Top-level fields

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `title` | Có | Tiêu đề của roadmap |
| `description` | Không | Mô tả ngắn cho roadmap |
| `nodes` | Có | Danh sách các node |
| `edges` | Không | Danh sách cạnh; có thể để hệ thống tự sinh |

### Node fields

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `nodeId` | Có | ID duy nhất của node |
| `label` | Có | Tên hiển thị trên đồ thị |
| `type` | Không | `main_topic`, `sub_topic`, `group_container`, `choice_item` |
| `description` | Không | Mô tả chi tiết cho node |
| `parentNodeId` | Không | ID node cha để tạo phân cấp |
| `skillName` | Không | Tên kỹ năng dùng cho logic tiến trình |
| `prerequisites` | Không | Danh sách node phải học trước |
| `resources` | Không | Tài nguyên học tập |
| `elkOptions` | Không | Tùy chỉnh bố cục cho ELK.js |

### Resource fields

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `title` | Có | Tên tài nguyên |
| `url` | Có | Đường dẫn tài nguyên |
| `type` | Không | Loại tài nguyên như `link`, `docs`, `course`, `video`, `book` |

---

## Các Loại Node

### `main_topic`
Node cấp cao nhất, thường đại diện cho một mảng kiến thức lớn.

```yaml
- nodeId: frontend-core
  label: Frontend Cơ Bản
  type: main_topic
  parentNodeId: null
```

### `sub_topic`
Node con nằm dưới một `main_topic`.

```yaml
- nodeId: html-basics
  label: HTML Cơ Bản
  type: sub_topic
  parentNodeId: frontend-core
```

### `group_container`
Node dùng để gom nhóm các node liên quan.

```yaml
- nodeId: testing-group
  label: Nhóm Kiểm Thử
  type: group_container
```

### `choice_item`
Node đại diện cho một lựa chọn thay thế.

```yaml
- nodeId: react-or-vue
  label: React hoặc Vue
  type: choice_item
```

---

## Ví Dụ Hoàn Chỉnh

```yaml
title: Full-Stack Engineering Bootcamp
description: Lộ trình từ nền tảng web đến triển khai production

nodes:
  - nodeId: frontend-core
    label: Frontend Fundamentals
    type: main_topic
    description: Nền tảng phát triển giao diện web
    parentNodeId: null
    skillName: html5
    resources:
      - title: MDN Web Docs
        url: https://developer.mozilla.org/
        type: docs

  - nodeId: html-basics
    label: HTML Cơ Bản
    type: sub_topic
    description: Semantic HTML và cấu trúc trang
    parentNodeId: frontend-core
    skillName: html

  - nodeId: css-basics
    label: CSS Cơ Bản
    type: sub_topic
    description: Layout, responsive design và styling
    parentNodeId: frontend-core
    skillName: css

  - nodeId: javascript-core
    label: JavaScript Core
    type: sub_topic
    description: Biến, hàm, DOM và async
    parentNodeId: frontend-core
    skillName: javascript
    prerequisites:
      - html-basics
      - css-basics

  - nodeId: backend-core
    label: Backend Development
    type: main_topic
    description: API, database và authentication
    parentNodeId: null
    skillName: nodejs

  - nodeId: devops-core
    label: DevOps & Deployment
    type: main_topic
    description: Docker, CI/CD và triển khai
    parentNodeId: null
    skillName: docker

edges:
  - id: e_1
    source: frontend-core
    target: html-basics
    type: default
  - id: e_2
    source: frontend-core
    target: css-basics
    type: default
  - id: e_3
    source: html-basics
    target: javascript-core
    type: dashed
  - id: e_4
    source: backend-core
    target: devops-core
    type: dashed
```

---

## Quy Tắc Viết YAML

1. **Luôn dùng `label` cho tên hiển thị của node**.
2. **`nodeId` phải duy nhất** trong toàn bộ roadmap.
3. **`parentNodeId` phải trỏ tới một node có thật** nếu bạn muốn tạo phân cấp.
4. **`prerequisites` phải là danh sách `nodeId` hợp lệ**.
5. **Tránh vòng lặp phụ thuộc** giữa các node.
6. **Giữ YAML dưới 10KB** cho mỗi roadmap.

---

## Ví Dụ Tốt / Chưa Tốt

### Tốt

```yaml
- nodeId: react-hooks
  label: React Hooks
  type: sub_topic
  parentNodeId: frontend-core
```

### Chưa tốt

```yaml
- nodeId: React Hooks
  label: React Hooks
  type: sub_topic
```

Lý do: `nodeId` không nên chứa khoảng trắng.

---

## Thông Báo Lỗi Thường Gặp

| Lỗi | Cách sửa |
|---|---|
| Thiếu `title` | Thêm tiêu đề ở đầu file YAML |
| Thiếu `nodes` | Thêm danh sách node |
| Thiếu `nodeId` | Thêm `nodeId` cho từng node |
| Thiếu `label` | Thêm tên hiển thị cho node |
| `nodeId` bị trùng | Đổi sang ID khác |
| `parentNodeId` không tồn tại | Kiểm tra lại ID node cha |
| YAML sai cú pháp | Kiểm tra thụt lề, dấu `:` và danh sách `-` |

---

## Mẹo Thực Tế

- Dùng thụt lề 2 spaces cho dễ đọc.
- Viết `label` ngắn, rõ nghĩa.
- Tách roadmap lớn thành nhiều `main_topic`.
- Thêm `resources` nếu muốn roadmap hữu ích hơn.
- Dùng `prerequisites` để thể hiện thứ tự học.

---

## Ghi Chú Về Lưu Trữ

Sau khi lưu, roadmap sẽ có:

- `yamlCode`: YAML gốc để chỉnh sửa lại
- `nodes`: dữ liệu node đã chuẩn hóa
- `edges`: cạnh đã được tính sẵn
- `positions`: vị trí bố cục cho graph

---

**Mẹo nhanh:** Nếu bạn chỉ cần xem cách viết, hãy mở dropdown mẫu roadmap và sao chép cấu trúc gần giống nhất với nhu cầu của bạn.
