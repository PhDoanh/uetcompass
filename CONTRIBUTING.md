# Hướng dẫn đóng góp cho UETCompass

> Dự án tuân thủ **Spec-Driven Development (SDD)** thông qua [Spec-Kit](https://github.com/github/spec-kit). Mọi đóng góp mới — từ feature lớn đến fix nhỏ — đều bắt đầu từ _đặc tả_, không phải từ code.  
> Trước khi bắt đầu, hãy đọc [Constitution](.specify/memory/constitution.md) (Constitution **supersedes** mọi convention cá nhân).

## 1. Tổng Quan Về Quy Trình SDD

**Spec-Driven Development (SDD)** đặt câu hỏi *"Cần gì và tại sao?"* trước khi hỏi *"Làm thế nào?"*. Mỗi feature trong UETCompass đều có một thư mục spec riêng biệt:

```
specs/NNN-feature-name/
├── spec.md          ← Đặc tả yêu cầu (AI tạo bằng /speckit.specify)
├── plan.md          ← Kế hoạch kỹ thuật (AI tạo bằng /speckit.plan)
├── research.md      ← Quyết định kỹ thuật được nghiên cứu
├── data-model.md    ← Schema entities & relationships
├── quickstart.md    ← Hướng dẫn chạy local & test scenarios
├── contracts/       ← API contracts (REST endpoints...)
│   └── rest-api.md
├── checklists/      ← Checklist kiểm tra chất lượng đặc tả
│   └── requirements.md
└── tasks.md         ← Danh sách task triển khai (AI tạo bằng /speckit.tasks)
```

**Các lệnh Spec-Kit** được cấu hình sẵn tại `.github/agents/` và chạy trong **GitHub Copilot** (VS Code / GitHub.com):

| Lệnh | Mô tả | Đầu ra |
|---|---|---|
| `/speckit.constitution` | Cập nhật hoặc tạo constitution | `.specify/memory/constitution.md` |
| `/speckit.specify` | Tạo đặc tả từ mô tả tính năng | `specs/NNN-feat/spec.md` + tạo branch |
| `/speckit.clarify` | Làm rõ các điểm mơ hồ trong spec | `spec.md` được cập nhật |
| `/speckit.plan` | Sinh kế hoạch kỹ thuật | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| `/speckit.checklist` | Sinh checklist kiểm tra chất lượng | `checklists/*.md` |
| `/speckit.tasks` | Sinh danh sách task | `tasks.md` |
| `/speckit.analyze` | Phân tích consistency giữa spec/plan/tasks | Báo cáo ngay trong phiên chat (read-only) |
| `/speckit.implement` | Thực thi triển khai theo tasks.md | Code thực tế |
| `/speckit.taskstoissues` | Chuyển tasks thành GitHub Issues | Issues trên repo |

> **AI Agent dùng trong dự án:** GitHub Copilot (files tại `.github/agents/`). Tất cả lệnh dùng PowerShell scripts tại `.specify/scripts/powershell/`.

## 2. Nhánh Chính & Chiến Lược Git

Dự án sử dụng mô hình **2 nhánh dài hạn**:

| Nhánh | Vai trò | Ai merge vào? |
|---|---|---|
| `dev` | Nhánh tích hợp chính — mọi hoạt động phát triển đều hướng về đây | Feature branches, bug fix branches |
| `main` | Nhánh ổn định — chỉ nhận merge từ `dev` khi sẵn sàng release | `dev` (qua PR, do project owner quyết định) |

> **Lý do tách `dev` và `main`:** `main` là nguồn sự thật cho release-please — mọi merge vào `main` đều có thể trigger version bump và cập nhật `CHANGELOG.md` tự động. Không bao giờ commit hay merge trực tiếp vào `main` ngoại trừ PR từ `dev`.

## 3. Cách Tiếp Cận A — Tuần Tự (Mặc Định của Spec-Kit)

**Phù hợp khi:** Đóng góp một feature độc lập, không phụ thuộc nhiều vào feature khác đang trong giai đoạn spec.

**Luồng đầy đủ từ spec đến code:**

```
dev
 │
 ├─► /speckit.specify "Mô tả tính năng"   ← Tạo branch NNN-feat-name + spec.md
 │      └─► /speckit.clarify              ← (Khuyến nghị) Làm rõ trước khi plan
 │      └─► /speckit.plan                 ← Sinh plan.md, research.md, data-model.md...
 │      └─► /speckit.checklist            ← Sinh checklists/
 │      └─► /speckit.tasks                ← Sinh tasks.md
 │      └─► /speckit.analyze              ← Kiểm tra consistency (optional nhưng nên làm)
 │      └─► /speckit.implement            ← Viết code theo tasks.md
 │
 ├─► git add . && git commit
 ├─► git push origin NNN-feat-name
 └─► Tạo PR → Review → Merge vào dev
```

### Quy Trình Git Chi Tiết

#### Bước 1 — Chuẩn bị

```bash
git checkout dev
git pull origin dev
```

#### Bước 2 — Tạo spec (Spec-Kit tự tạo branch)

Mở GitHub Copilot Chat, chạy:

```
/speckit.specify Mô tả tính năng của bạn ở đây
```

Spec-Kit sẽ tự động:
- Tạo branch `NNN-ten-feature` (ví dụ: `011-study-reminder`) từ `dev`
- Tạo thư mục `specs/011-study-reminder/`
- Tạo file `spec.md` với nội dung được AI sinh

#### Bước 3 — Làm rõ đặc tả (Khuyến nghị)

```
/speckit.clarify
```

Lệnh này sẽ hỏi tối đa 5 câu hỏi, trả lời xong spec sẽ được cập nhật tự động.

#### Bước 4 — Lập kế hoạch kỹ thuật

```
/speckit.plan
```

Sinh ra: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

> **Constitution Check** được thực hiện tự động trong bước này. Nếu vi phạm nguyên tắc Constitution (ví dụ: đề xuất tách microservice khi chưa cần — vi phạm Nguyên Tắc I), lệnh sẽ báo lỗi.

#### Bước 5 — Sinh checklist & tasks

```
/speckit.checklist "Loại checklist cần tạo (ví dụ: security, UX)"
/speckit.tasks
```

#### Bước 6 — Phân tích tính nhất quán (Khuyến nghị trước khi implement)

```
/speckit.analyze
```

Đây là lệnh read-only, không thay đổi file — chỉ báo cáo vấn đề.

#### Bước 7 — Triển khai

```
/speckit.implement
```

Trước khi implement, lệnh sẽ kiểm tra tất cả checklists. Nếu có checklist chưa hoàn thành, bạn sẽ được hỏi xác nhận.

#### Bước 8 — Commit & Push & PR

```bash
git add .
git commit -m "feat(011-study-reminder): implement study reminder with notification support"
git push origin 011-study-reminder
```

Tạo Pull Request trên GitHub với **base branch là `dev`**. Yêu cầu **ít nhất 1 reviewer** trước khi merge (theo Constitution).

## 4. Cách Tiếp Cận B — Song Song nhiều Spec (Trước Khi Implement)

**Phù hợp khi:** Cần thiết kế nhiều feature cùng lúc để thấy toàn cảnh kiến trúc, phát hiện xung đột data model sớm (ví dụ: feature A và B cùng sử dụng `users` collection theo cách khác nhau).

> **Tại sao cần tiếp cận này?**  
> Spec-Kit mặc định tạo branch ngay khi `/speckit.specify` được gọi. Nếu chạy feat-B liền sau feat-A mà không merge, branch của feat-B sẽ được tạo **từ branch feat-A** (không phải từ `dev`), gây ra dependency chain không mong muốn và AI không thấy được context của feat-A khi đặc tả feat-B.

**Luồng tổng quát:**

```
dev ──► specify feat-A ──► plan feat-A ──► commit ──► PR ──► merge vào dev
          └────────────────────────────────────────────────────────────────┘
dev ──► specify feat-B ──► plan feat-B ──► commit ──► PR ──► merge vào dev
          └────────────────────────────────────────────────────────────────┘
dev ──► specify feat-C ──► plan feat-C ──► commit ──► PR ──► merge vào dev

[Review toàn bộ backlog spec trên dev — kiểm tra data model consistency]

dev ──► checkout branch 001-feat-a ──► merge dev ──► tasks ──► implement ──► PR
dev ──► checkout branch 002-feat-b ──► merge dev ──► tasks ──► implement ──► PR
dev ──► checkout branch 003-feat-c ──► merge dev ──► tasks ──► implement ──► PR
```

### Quy Trình Git Chi Tiết

#### Phase 1 — Spec toàn bộ backlog

Lặp lại cho **mỗi feature** theo thứ tự:

```bash
# Đảm bảo bắt đầu từ dev mới nhất
git checkout dev
git pull origin dev

# Spec-Kit tự tạo branch NNN-feat-name và checkout vào đó
# (chạy trong Copilot Chat)
# /speckit.specify Mô tả feature X
# /speckit.clarify
# /speckit.plan

# Commit artifacts đặc tả (KHÔNG có code)
git add specs/
git commit -m "docs(NNN-feat-x): add spec and plan for feature X"
git push origin NNN-feat-x

# Tạo PR → Merge vào dev → Pull
# (có thể self-merge nếu là phase spec thuần túy)
git checkout dev
git pull origin dev

# Bắt đầu feature tiếp theo từ dev đã có spec của feat-x
```

> **Tại sao không có conflict khi merge?**  
> Mỗi feature tạo thư mục riêng `specs/NNN-feature-name/` — tên luôn khác nhau, không bao giờ conflict. Script `create-new-feature.ps1` tự động quét số cao nhất trên toàn bộ branches và thư mục `specs/` rồi +1, đảm bảo không trùng số.

#### Phase 2 — Review backlog spec tổng thể

Sau khi tất cả spec đã merge vào `dev`, review cross-feature để kiểm tra:

- **Data model consistency**: Ví dụ `users` collection được dùng như thế nào ở Feature 005 (account-management) và Feature 001 (profile-onboarding)?
- **API boundary**: Endpoint nào overlap? Module nào cần share?
- **Dependency order**: Feature nào phải implement trước?

```bash
git checkout dev
git pull origin dev
# Đọc toàn bộ specs/NNN-*/data-model.md và contracts/
```

Có thể dùng lệnh này để phân tích:
```
/speckit.analyze
```
(chạy từ branch của feature cần kiểm tra)

#### Phase 3 — Implement từng feature

```bash
# Checkout lại branch đã tạo từ Phase 1
git checkout 001-profile-onboarding

# Cập nhật với context đầy đủ từ dev (bao gồm spec của tất cả feature khác)
git merge dev

# Sinh tasks và implement
# /speckit.tasks
# /speckit.implement

git add .
git commit -m "feat(001-profile-onboarding): implement profile onboarding feature"
git push origin 001-profile-onboarding
# Tạo PR → Review → Merge vào dev
```

### Ưu Điểm & Hạn Chế

| Tiêu chí | Cách A (Tuần Tự) | Cách B (Song Song) |
|---|---|---|
| Phát hiện xung đột data model sớm | ❌ Chỉ thấy sau khi implement | ✅ Thấy ngay khi review backlog |
| Tốc độ bắt đầu code | ✅ Nhanh hơn | ❌ Chậm hơn (spec xong rồi mới code) |
| Phù hợp team | Solo dev / feature độc lập | Team nhiều người / nhiều feature liên quan |
| Git overhead | Thấp | Trung bình (thêm bước merge spec vào dev) |
| AI có đủ context | ❌ Mỗi feature spec riêng lẻ | ✅ Feature sau thấy spec của feature trước |

---

## 5. Lựa Chọn Cách Tiếp Cận

```
Bạn đang đóng góp feature mới?
    │
    ├─► Feature có liên quan nhiều đến feature khác trong giai đoạn spec?
    │       └─► CÓ  → Dùng Cách B (Song Song)
    │       └─► KHÔNG → Dùng Cách A (Tuần Tự)
    │
    └─► Bạn đang fix bug / cải thiện tính năng đã có spec?
            └─► Xem phần Refine Artifacts bên dưới
```

## 6. Refine Artifacts Đã Tồn Tại

Khi cần chỉnh sửa các artifacts đã được Spec-Kit tạo ra (không phải tạo mới), **không nên chạy lại lệnh Spec-Kit từ đầu** vì sẽ ghi đè toàn bộ nội dung.

### 6.1. Refine `spec.md` (Đặc Tả Yêu Cầu)

**Khi nào cần refine:** Yêu cầu thay đổi sau khi spec đã được tạo, phát hiện inconsistency, hoặc reviewer yêu cầu làm rõ.

**Cách làm:**

```
# Dùng lệnh /speckit.clarify để thêm clarification mà không ghi đè toàn bộ
/speckit.clarify [Mô tả điểm cần làm rõ]
```

Lệnh `clarify` sẽ:
1. Đặt tối đa 5 câu hỏi có trọng tâm
2. Ghi câu hỏi + câu trả lời vào section `## Clarifications / ### Session YYYY-MM-DD`
3. Cập nhật đúng section liên quan (FR, data model, edge cases...) mà không xáo trộn phần còn lại
4. Lưu file sau mỗi câu trả lời được chấp nhận (tránh mất dữ liệu)

**Nếu phải sửa trực tiếp spec.md** (ví dụ: sửa requirement đã bị hiểu sai):
- Chỉnh sửa đúng section cần thay đổi
- Không xóa section `## Clarifications` đã tồn tại
- Đảm bảo thuật ngữ nhất quán (xem `## Terminology & Consistency` trong spec)
- Commit với message: `docs(NNN-feat): refine spec - clarify [tên requirement]`

### 6.2. Refine `plan.md`, `data-model.md`, `contracts/`, `research.md`

**Khi nào cần refine:** Phát hiện lỗi kỹ thuật, thay đổi tech stack, hoặc review phát hiện design issue sau khi spec đã được cập nhật.

**Cách làm — Dùng `/speckit.plan` có chọn lọc:**

```
# Nếu chỉ cần cập nhật data model do thay đổi ở spec
# Chạy plan từ bước Phase 1 (không chạy Phase 0/research lại nếu đã ổn)
/speckit.plan [Mô tả phần cần cập nhật, ví dụ: "Update data model to add refresh_tokens collection"]
```

**Nếu chỉnh sửa thủ công:**
- `data-model.md`: Thêm/sửa entity, giữ nguyên format; update phần `Relationships` nếu thêm foreign reference
- `contracts/rest-api.md`: Thêm endpoint mới tuân thủ format đang dùng (HTTP method, path, request/response schema)
- `research.md`: Thêm decision mới theo format `Decision: / Rationale: / Alternatives considered:`
- `plan.md` — **Constitution Check section**: Không được xóa hoặc tự ý pass gates; nếu có violation phải justify rõ ràng trong `## Complexity Tracking`

> **Nguyên Tắc I — Modular Monolithic**: Mọi thay đổi ở `plan.md` liên quan đến kiến trúc phải đảm bảo không tách service khi chưa cần thiết. Violation phải được ghi vào `## Complexity Tracking`.

### 6.3. Refine `tasks.md`

**Khi nào cần refine:** Sau khi implement một phần và phát hiện task bị thiếu, hoặc spec thay đổi kéo theo scope thay đổi.

**Cách làm — Tái sinh tasks (khuyến nghị):**

```
# Sau khi spec/plan đã được cập nhật
/speckit.tasks
```

Lệnh sẽ sinh lại `tasks.md` dựa trên các artifacts mới nhất.

**Nếu chỉnh sửa thủ công** (chỉ thêm task nhỏ):
- Giữ đúng format: `- [ ] T0XX [P?] [US?] Mô tả với file path`
- Số task phải theo thứ tự liên tiếp
- Đánh dấu task đã hoàn thành bằng `[X]` (không xóa)

### 6.4. Refine `checklists/`

**Cách làm — Tái sinh checklist:**

```
/speckit.checklist "Loại checklist + context cần cập nhật"
```

**Hoặc sửa thủ công:**
- Đánh dấu item đã hoàn thành: `- [x] CHK001 ...`
- Thêm ghi chú inline nếu có vấn đề phát hiện
- Không xóa item đã fail — comment lý do giải quyết thay vì xóa

### 6.5. Refine `constitution.md`

Constitution là tài liệu quan trọng nhất và **phải dùng lệnh Spec-Kit để sửa** — không sửa trực tiếp thủ công:

```
/speckit.constitution [Mô tả nguyên tắc cần thêm/sửa/bỏ]
```

Lệnh sẽ:
- Bump version theo semantic versioning (MAJOR/MINOR/PATCH)
- Propagate changes sang `plan-template.md`, `spec-template.md`, `tasks-template.md`
- Tạo Sync Impact Report
- Yêu cầu commit message chuẩn: `docs: amend constitution to vX.Y.Z (reason)`

> Thay đổi Constitution yêu cầu approval của **project owner** trước khi merge.

## 7. Quy Tắc Commit Convention

Dự án tuân thủ **[Conventional Commits](https://www.conventionalcommits.org/)** — tiêu chuẩn quốc tế giúp tự động sinh CHANGELOG và semantic versioning.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Các Type Được Dùng

| Type | Ý nghĩa | Trigger version bump? | Ví dụ |
|---|---|---|---|
| `feat` | Tính năng mới | ✅ minor | `feat(005-account-management): add JWT refresh token rotation` |
| `fix` | Sửa bug | ✅ patch | `fix(001-profile-onboarding): resolve draft not persisting on session expiry` |
| `perf` | Cải thiện hiệu suất | ✅ patch | `perf(009-roadmap-generator): optimize DAG traversal algorithm` |
| `refactor` | Tái cấu trúc không thay đổi behavior | ❌ | `refactor(auth): extract token validation to shared middleware` |
| `docs` | Thay đổi tài liệu — bao gồm spec artifacts | ❌ | `docs(002-seed-ctdt-dag): update data-model with TTL index decision` |
| `test` | Thêm/sửa test | ❌ | `test(002-seed-ctdt-dag): add cycle detection unit tests` |
| `chore` | Công việc build, dependency... | ❌ | `chore: update mongoose to 8.x` |
| `ci` | Thay đổi CI/CD | ❌ | `ci: add lint check to PR workflow` |
| `style` | Format code (không ảnh hưởng logic) | ❌ | `style: fix trailing whitespace in auth module` |

> **Lưu ý:** Artifacts đặc tả (`spec.md`, `plan.md`, `data-model.md`...) dùng type `docs` — không còn type `spec` riêng để tránh duplicate với `docs` và đảm bảo tương thích với release-please.

### Scope

Scope là tên thư mục feature hoặc module:

- `001-profile-onboarding` → `docs(001-profile-onboarding):`
- `auth` → `fix(auth):`
- `constitution` → `docs(constitution):`
- bỏ trống → khi thay đổi ảnh hưởng toàn dự án

### Short Description

- Viết thường, không viết hoa chữ đầu
- Không kết thúc bằng dấu chấm
- Tối đa 72 ký tự
- Dùng tiếng Anh (khuyến nghị) hoặc tiếng Việt (chấp nhận được)
- Dùng thì hiện tại (imperative mood): `add`, `fix`, `update` — không dùng `added`, `fixed`

### Breaking Changes

```bash
feat(005-account-management)!: change refresh token storage from Redis to MongoDB

BREAKING CHANGE: refresh_tokens collection replaces Redis cache.
Migration script available at scripts/migrate-refresh-tokens.js
```

### Ví Dụ Thực Tế Từ UETCompass

```bash
# Khi tạo spec mới (Phase spec) — dùng docs thay vì spec
docs(011-study-reminder): add feature specification and technical plan

# Khi triển khai code
feat(005-account-management): implement OTP verification with 2-minute expiry
feat(002-seed-ctdt-dag): add Playwright-based CTDT crawler with cycle detection
fix(004-skill-tree): prevent locked nodes from being clickable via keyboard navigation
test(003-resource-curation): add unit tests for Gemini response schema validation

# Khi refine artifacts
docs(009-roadmap-generator): clarify RoadmapPreview in-memory expiry behavior
docs(constitution): amend constitution to v1.1.0 (add observability principle)

# Khi làm việc với infrastructure
chore: bump @google/generative-ai to 0.21.0
ci: add pre-commit hook for conventional commit validation
```

## 8. Quy Tắc Chung Cho Mọi Đóng Góp

### 8.1. Trước Khi Bắt Đầu

- [ ] **Đọc Constitution** tại `.specify/memory/constitution.md` — đây là tài liệu bắt buộc
- [ ] **Kiểm tra Issues** để tránh làm trùng việc đang có người làm
- [ ] **Fork nếu là external contributor** — team member thì clone trực tiếp
- [ ] **Cấu hình AI Agent**: Mở repo bằng VS Code, đảm bảo GitHub Copilot extension đã active

### 8.2. Trong Quá Trình Đóng Góp

**Về đặc tả (spec):**

- Spec PHẢI viết ở góc nhìn người dùng — không đề cập framework, library, API cụ thể
- Ví dụ ✅: `"Người dùng đăng ký trong vòng 2 phút"` | ❌: `"API /auth/register trả về 201"`
- Tối đa 3 marker `[NEEDS CLARIFICATION]` trong toàn bộ spec
- Mỗi User Story phải có **Independent Test** — phải test được độc lập mà không cần story khác

**Về Constitution:**

- **Nguyên Tắc I (Modular Monolithic)**: Không tách module mới nếu không có lý do rõ ràng. Cross-import giữa domain modules phải đi qua service layer
- **Nguyên Tắc II (UET-First)**: Không thêm abstraction cho "mở rộng đa trường" — hardcode UET context là OK
- **Nguyên Tắc III (Privacy)**: Credentials sinh viên KHÔNG bao giờ được lưu ở bất kỳ đâu. Playwright session bị hủy ngay sau khi extract xong
- **Nguyên Tắc IV (AI-Assisted)**: Mọi output từ Gemini API phải qua schema validation trước khi lưu DB. Sinh viên luôn có quyền override
- **Nguyên Tắc V (Test What Matters)**: Chỉ test các phần có side effects hoặc complex business logic. Mock Gemini API và Playwright trong test

**Về code:**

- Không hardcode secrets — dùng environment variables
- Backend: Node.js 20 LTS + Express.js (JavaScript)
- Frontend: React 18
- Testing: Jest 29 — unit tests only; mock tất cả external services (`@google/generative-ai`, Playwright, Mongoose)
- Database: MongoDB Atlas (Mongoose 8) — tuân theo naming convention và ownership boundary của các collections hiện tại
- Free tier Render có cold start ~50s — frontend phải handle loading state gracefully

### 8.3. Pull Request

- **Base branch**: luôn là **`dev`** — không bao giờ mở PR trực tiếp vào `main`
- **Title**: Theo Conventional Commits format: `feat(scope): short description`
- **Description**: Mô tả rõ WHAT và WHY (không cần HOW chi tiết — đã có trong `plan.md`)
- **Link Issue**: Dùng `Closes #XX` hoặc `Refs #XX` trong description
- **Checklist trước khi submit PR:**
  - [ ] Tất cả checklists trong `specs/NNN-feat/checklists/` đã pass
  - [ ] `/speckit.analyze` không báo lỗi CRITICAL
  - [ ] Unit tests pass (đặc biệt: recommendation engine, Gemini parsing, Playwright pipeline)
  - [ ] Không có secrets hardcode
  - [ ] `copilot-instructions.md` đã được cập nhật (script `update-agent-context.ps1` chạy tự động trong `/speckit.plan`)
- **Reviewer**: Yêu cầu **ít nhất 1 reviewer** (theo Constitution). Với thay đổi Constitution: bắt buộc reviewer là project owner

### 8.4. Review Checklist (Dành Cho Reviewer)

- [ ] Spec có vi phạm Constitution không?
- [ ] Data model có conflict với các feature khác không? (Kiểm tra `copilot-instructions.md` — Active Technologies section)
- [ ] Code có cross-import trực tiếp giữa domain modules không?
- [ ] Có secrets hardcode không?
- [ ] Gemini output có được validate schema không?

## 9. Kiến Trúc & Technology Stack Tham Chiếu

Dựa trên `specs/*/plan.md`:

```
backend/                    ← Node.js 20 LTS + Express.js (JavaScript)
  src/
    modules/
      onboarding/           ← Feature 001 (Profile Onboarding)
      curriculum/           ← Feature 002 (Seed CTDT DAG)
      resources/            ← Feature 003 (Resource Curation)
      skillTree/            ← Feature 004 (Skill Tree)
      auth/                 ← Feature 005 (Account Management)
      tagging/              ← Feature 006 (AI Auto-Tagging)
      progress/             ← Feature 007 (Progress Tracking)
      search/               ← Feature 008 (Advanced Tag Search)
      roadmap/              ← Feature 009 (Roadmap Generator)
      community/            ← Feature 010 (Roadmap Community)
    middleware/
      auth.middleware.js    ← JWT verify — shared across modules
    app.js                  ← Express bootstrap + route mounting

frontend/                   ← React 18 + React Router v6
  src/
    features/
      onboarding/           ← Feature 001
      resources/            ← Feature 003
      skillTree/            ← Feature 004
      auth/                 ← Feature 005
      progress/             ← Feature 007
      roadmap/              ← Feature 009
      community/            ← Feature 010
    guards/                 ← React Router route guards
    services/               ← Fetch wrappers per module

tests/
  unit/                     ← Jest 29 unit tests (complex logic + side effects only)
```

**Database Collections (MongoDB Atlas — Mongoose 8):**

| Collection | Owner Feature | Ghi chú |
|---|---|---|
| `users` | 005-account-management | Auth credentials, account status, privacySetting |
| `refresh_tokens` | 005-account-management | Hashed RT, TTL index tự purge |
| `notifications` | 005-account-management | In-app notifications — SSE delivery |
| `deleted_emails` | 005-account-management | Audit trail cho hard-deleted accounts |
| `student_profiles` | 001-profile-onboarding | Academic profile + career goals; field `repersonalizationPending` do Feature 005 write |
| `course_units` | 002-seed-ctdt-dag | CTDT DAG — read-only với tất cả feature khác |
| `roadmaps` | 009-roadmap-generator | Multi-roadmap per user; partial unique index cho `isPrimary` |

> Collections của Feature 003, 004, 006, 007, 008, 010 sẽ được bổ sung vào bảng này khi `data-model.md` của từng feature được hoàn thiện.

**Deployment:**
- Frontend → **Vercel**
- Backend → **Render** (free tier, cold start ~50s)
- Database → **MongoDB Atlas** (free tier)

## 10. Tài Nguyên Tham Khảo

| Tài liệu | Đường dẫn |
|---|---|
| Constitution (bắt buộc đọc) | [`.specify/memory/constitution.md`](.specify/memory/constitution.md) |
| Spec-Kit official repo | [github/spec-kit](https://github.com/github/spec-kit) |
| Conventional Commits | [conventionalcommits.org](https://www.conventionalcommits.org/) |
| Tất cả specs hiện tại | [`specs/`](specs/) |
| Copilot agent files | [`.github/agents/`](.github/agents/) |
| Spec-Kit AGENTS.md | [github/spec-kit AGENTS.md](https://github.com/github/spec-kit/blob/main/AGENTS.md) |

*Tài liệu này được duy trì bởi project owner. Mọi đề xuất thay đổi quy trình hãy mở Issue với label `documentation`.*
