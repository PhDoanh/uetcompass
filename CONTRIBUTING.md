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

## 2. Cách Tiếp Cận A — Tuần Tự (Mặc Định của Spec-Kit)

**Phù hợp khi:** Đóng góp một feature độc lập, không phụ thuộc nhiều vào feature khác đang trong giai đoạn spec.

**Luồng đầy đủ từ spec đến code:**

```
main
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
 └─► Tạo PR → Review → Merge vào main
```

### Quy Trình Git Chi Tiết

#### Bước 1 — Chuẩn bị

```bash
git checkout main
git pull origin main
```

#### Bước 2 — Tạo spec (Spec-Kit tự tạo branch)

Mở GitHub Copilot Chat, chạy:

```
/speckit.specify Mô tả tính năng của bạn ở đây
```

Spec-Kit sẽ tự động:
- Tạo branch `NNN-ten-feature` (ví dụ: `011-study-reminder`)
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

Tạo Pull Request trên GitHub với base branch là `main`. Yêu cầu **ít nhất 1 reviewer** trước khi merge (theo Constitution).

## 3. Cách Tiếp Cận B — Song Song nhiều Spec (Trước Khi Implement)

**Phù hợp khi:** Cần thiết kế nhiều feature cùng lúc để thấy toàn cảnh kiến trúc, phát hiện xung đột data model sớm (ví dụ: feature A và B cùng sử dụng `users` collection theo cách khác nhau).

> **Tại sao cần tiếp cận này?**  
> Spec-Kit mặc định tạo branch ngay khi `/speckit.specify` được gọi. Nếu chạy feat-B liền sau feat-A mà không merge, branch của feat-B sẽ được tạo **từ branch feat-A** (không phải từ `main`), gây ra dependency chain không mong muốn và AI không thấy được context của feat-A khi đặc tả feat-B.

**Luồng tổng quát:**

```
main ──► specify feat-A ──► plan feat-A ──► commit ──► PR ──► merge vào main
          └────────────────────────────────────────────────────────────────┘
main ──► specify feat-B ──► plan feat-B ──► commit ──► PR ──► merge vào main
          └────────────────────────────────────────────────────────────────┘
main ──► specify feat-C ──► plan feat-C ──► commit ──► PR ──► merge vào main

[Review toàn bộ backlog spec trên main — kiểm tra data model consistency]

main ──► checkout branch 001-feat-a ──► merge main ──► tasks ──► implement ──► PR
main ──► checkout branch 002-feat-b ──► merge main ──► tasks ──► implement ──► PR
main ──► checkout branch 003-feat-c ──► merge main ──► tasks ──► implement ──► PR
```

### Quy Trình Git Chi Tiết

#### Phase 1 — Spec toàn bộ backlog

Lặp lại cho **mỗi feature** theo thứ tự:

```bash
# Đảm bảo bắt đầu từ main mới nhất
git checkout main
git pull origin main

# Spec-Kit tự tạo branch NNN-feat-name và checkout vào đó
# (chạy trong Copilot Chat)
# /speckit.specify Mô tả feature X
# /speckit.clarify
# /speckit.plan

# Commit artifacts đặc tả (KHÔNG có code)
git add specs/
git commit -m "spec(NNN-feat-x): add spec and plan for feature X"
git push origin NNN-feat-x

# Tạo PR → Merge vào main → Pull
# (có thể self-merge nếu là phase spec thuần túy)
git checkout main
git pull origin main

# Bắt đầu feature tiếp theo từ main đã có spec của feat-x
```

> **Tại sao không có conflict khi merge?**  
> Mỗi feature tạo thư mục riêng `specs/NNN-feature-name/` — tên luôn khác nhau, không bao giờ conflict. Script `create-new-feature.ps1` tự động quét số cao nhất trên toàn bộ branches và thư mục `specs/` rồi +1, đảm bảo không trùng số.

#### Phase 2 — Review backlog spec tổng thể

Sau khi tất cả spec đã merge vào `main`, review cross-feature để kiểm tra:

- **Data model consistency**: Ví dụ `users` collection được dùng như thế nào ở Feature 005 (account-management) và Feature 001 (profile-onboarding)?
- **API boundary**: Endpoint nào overlap? Module nào cần share?
- **Dependency order**: Feature nào phải implement trước?

```bash
git checkout main
git pull origin main
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

# Cập nhật với context đầy đủ từ main (bao gồm spec của tất cả feature khác)
git merge main

# Sinh tasks và implement
# /speckit.tasks
# /speckit.implement

git add .
git commit -m "feat(001-profile-onboarding): implement profile onboarding feature"
git push origin 001-profile-onboarding
# Tạo PR → Review → Merge
```

### Ưu Điểm & Hạn Chế

| Tiêu chí | Cách A (Tuần Tự) | Cách B (Song Song) |
|---|---|---|
| Phát hiện xung đột data model sớm | ❌ Chỉ thấy sau khi implement | ✅ Thấy ngay khi review backlog |
| Tốc độ bắt đầu code | ✅ Nhanh hơn | ❌ Chậm hơn (spec xong rồi mới code) |
| Phù hợp team | Solo dev / feature độc lập | Team nhiều người / nhiều feature liên quan |
| Git overhead | Thấp | Trung bình (thêm bước merge spec vào main) |
| AI có đủ context | ❌ Mỗi feature spec riêng lẻ | ✅ Feature sau thấy spec của feature trước |

---

## 4. Lựa Chọn Cách Tiếp Cận

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

## 5. Refine Artifacts Đã Tồn Tại

Khi cần chỉnh sửa các artifacts đã được Spec-Kit tạo ra (không phải tạo mới), **không nên chạy lại lệnh Spec-Kit từ đầu** vì sẽ ghi đè toàn bộ nội dung.

### 5.1. Refine `spec.md` (Đặc Tả Yêu Cầu)

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

### 5.2. Refine `plan.md`, `data-model.md`, `contracts/`, `research.md`

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

### 5.3. Refine `tasks.md`

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

### 5.4. Refine `checklists/`

**Cách làm — Tái sinh checklist:**

```
/speckit.checklist "Loại checklist + context cần cập nhật"
```

**Hoặc sửa thủ công:**
- Đánh dấu item đã hoàn thành: `- [x] CHK001 ...`
- Thêm ghi chú inline nếu có vấn đề phát hiện
- Không xóa item đã fail — comment lý do giải quyết thay vì xóa

### 5.5. Refine `constitution.md`

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

## 6. Quy Tắc Commit Convention

Dự án tuân thủ **[Conventional Commits](https://www.conventionalcommits.org/)** — tiêu chuẩn quốc tế giúp tự động sinh CHANGELOG và semantic versioning.

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Các Type Được Dùng

| Type | Ý nghĩa | Ví dụ |
|---|---|---|
| `feat` | Tính năng mới | `feat(005-account-management): add JWT refresh token rotation` |
| `fix` | Sửa bug | `fix(001-profile-onboarding): resolve draft not persisting on session expiry` |
| `docs` | Thay đổi tài liệu | `docs(002-seed-ctdt-dag): update data-model with TTL index decision` |
| `spec` | Tạo/cập nhật artifact đặc tả | `spec(011-study-reminder): add spec and plan` |
| `refactor` | Tái cấu trúc không thay đổi behavior | `refactor(auth): extract token validation to shared middleware` |
| `test` | Thêm/sửa test | `test(002-seed-ctdt-dag): add cycle detection unit tests` |
| `chore` | Công việc build, dependency... | `chore: update mongoose to 8.x` |
| `perf` | Cải thiện hiệu suất | `perf(009-roadmap-generator): optimize DAG traversal algorithm` |
| `ci` | Thay đổi CI/CD | `ci: add lint check to PR workflow` |
| `style` | Format code (không ảnh hưởng logic) | `style: fix trailing whitespace in auth module` |

### Scope

Scope là tên thư mục feature (không bắt buộc có số prefix):

- `001-profile-onboarding` → `spec(001-profile-onboarding):`
- `auth` → `fix(auth):`
- `constitution` → `docs(constitution):`
- `global` hoặc bỏ trống → khi thay đổi ảnh hưởng toàn dự án

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
# Khi tạo spec mới (Phase spec)
spec(011-study-reminder): add feature specification and technical plan

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

## 7. Quy Tắc Chung Cho Mọi Đóng Góp

### 7.1. Trước Khi Bắt Đầu

- [ ] **Đọc Constitution** tại `.specify/memory/constitution.md` — đây là tài liệu bắt buộc
- [ ] **Kiểm tra Issues** để tránh làm trùng việc đang có người làm
- [ ] **Fork nếu là external contributor** — team member thì clone trực tiếp
- [ ] **Cấu hình AI Agent**: Mở repo bằng VS Code, đảm bảo GitHub Copilot extension đã active

### 7.2. Trong Quá Trình Đóng Góp

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
- Backend: Node.js 20 LTS + Express.js (JavaScript).
- Frontend: React 18
- Database: MongoDB Atlas (Mongoose) — tuân theo naming convention của các collections hiện tại
- Free tier Render có cold start ~50s — frontend phải handle loading state gracefully

### 7.3. Pull Request

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

### 7.4. Review Checklist (Dành Cho Reviewer)

- [ ] Spec có vi phạm Constitution không?
- [ ] Data model có conflict với các feature khác không? (Kiểm tra `copilot-instructions.md` — Active Technologies section)
- [ ] Code có cross-import trực tiếp giữa domain modules không?
- [ ] Có secrets hardcode không?
- [ ] Gemini output có được validate schema không?

## 8. Kiến Trúc & Technology Stack Tham Chiếu

Dựa trên `specs/*/plan.md` và `.github/agents/copilot-instructions.md`:

```
backend/          ← Node.js 20 LTS + Express.js (JavaScript)
  src/
    modules/
      auth/       ← Feature 005 (Account Management)
      curriculum/ ← Feature 002 (Seed CTDT DAG)
      roadmap/    ← Feature 009 (Roadmap Generator)
      scraping/   ← Feature 003 (Resource Curation)
      recommendation/ ← Feature 004 (Skill Tree logic)

frontend/         ← React 18
  src/
    features/
      onboarding/ ← Feature 001
      progress/   ← Feature 007
      resources/  ← Feature 003

tests/
  unit/           ← Unit tests cho complex business logic
```

**Database Collections (MongoDB Atlas):**

| Collection | Owner Feature |
|---|---|
| `users` | 005-account-management |
| `refresh_tokens` | 005-account-management |
| `student_profiles` | 001-profile-onboarding |
| `course_units` | 002-seed-ctdt-dag |
| `skills` | Roadmap module |
| `roadmap_nodes` / `student_roadmaps` | 004-skill-tree |
| `roadmap_progress_cache` | 007-progress-tracking |
| `learning_resources` | 003-resource-curation |
| `academic_documents` | 003-resource-curation |
| `skill_trend_snapshots` | 003-resource-curation |
| `roadmap_snapshots` / `share_links` / `community_entries` | 010-roadmap-community |

**Deployment:**
- Frontend → **Vercel**
- Backend → **Render** (free tier, cold start ~50s)
- Database → **MongoDB Atlas** (free tier)

## 9. Tài Nguyên Tham Khảo

| Tài liệu | Đường dẫn |
|---|---|
| Constitution (bắt buộc đọc) | [`.specify/memory/constitution.md`](.specify/memory/constitution.md) |
| Spec-Kit official repo | [github/spec-kit](https://github.com/github/spec-kit) |
| Conventional Commits | [conventionalcommits.org](https://www.conventionalcommits.org/) |
| Tất cả specs hiện tại | [`specs/`](specs/) |
| Copilot agent files | [`.github/agents/`](.github/agents/) |
| Spec-Kit AGENTS.md | [github/spec-kit AGENTS.md](https://github.com/github/spec-kit/blob/main/AGENTS.md) |

*Tài liệu này được duy trì bởi project owner. Mọi đề xuất thay đổi quy trình hãy mở Issue với label `documentation`.*
