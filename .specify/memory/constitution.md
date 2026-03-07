<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- List of modified principles:
    - [PRINCIPLE_1_NAME] → I. Modular Monolithic — Keep It Simple
    - [PRINCIPLE_2_NAME] → II. UET-First Scope (No Premature Generalization)
    - [PRINCIPLE_3_NAME] → III. Privacy by Minimalism
    - [PRINCIPLE_4_NAME] → IV. AI-Assisted, Human-Controlled
    - [PRINCIPLE_5_NAME] → V. Test What Matters
- Added sections: Additional Constraints, Development Workflow
- Removed sections: None
- Templates requiring updates:
    - .specify/templates/plan-template.md (✅ updated)
    - .specify/templates/spec-template.md (✅ updated)
    - .specify/templates/tasks-template.md (✅ updated)
- Follow-up TODOs: None.
-->

# UETCompass Constitution

## Core Principles

### I. Modular Monolithic — Keep It Simple
Hệ thống được tổ chức theo modules rõ ràng (auth, curriculum, roadmap, scraping, recommendation) nhưng deploy như một monolith duy nhất. Không tách microservices khi chưa có nhu cầu thực tế. YAGNI enforced. Mỗi module phải có boundary rõ ràng: không cross-import trực tiếp giữa các domain modules — đi qua service layer.

### II. UET-First Scope (No Premature Generalization)
Hệ thống được thiết kế exclusively cho sinh viên UET-VNU. Không abstract hóa để "mở rộng sang trường khác" trong giai đoạn hiện tại. Data schema, business logic, và UI assumptions đều được phép hardcode cho UET context. Nếu cần generalize trong tương lai, đó là một architectural decision riêng — không build-in từ đầu.

### III. Privacy by Minimalism
Credential sinh viên (username/password UET portal) KHÔNG ĐƯỢC lưu dưới bất kỳ hình thức nào — không database, không log, không cache. Session Playwright bị hủy ngay sau khi extract đủ dữ liệu transcript. Chỉ lưu dữ liệu tối thiểu cần thiết cho recommendation engine: danh sách môn đã học, điểm số, học kỳ. Không lưu thông tin cá nhân ngoài phạm vi này.

### IV. AI-Assisted, Human-Controlled
Gemini API chỉ đóng vai trò parse/transform (HTML → JSON, Markdown → structured data) và hỗ trợ recommendation — không phải decision-maker. Sinh viên LUÔN có quyền override bất kỳ recommendation nào của hệ thống. Kết quả từ Gemini PHẢI được validate trước khi lưu vào database (schema validation bắt buộc). Free tier constraint: Thiết kế prompts để minimize token usage; không gọi LLM cho logic có thể xử lý bằng code thuần.

### V. Test What Matters
Unit test bắt buộc cho: recommendation engine (DAG traversal logic), skill-mapping logic, Playwright scraping pipeline, và Gemini response parsing/validation. Không yêu cầu full coverage — ưu tiên test các phần có side effects hoặc complex business logic. Test phải chạy được locally mà không cần external service (mock Gemini API và Playwright trong test).

## Additional Constraints

### Deployment & Environment
- Frontend → Vercel; Backend → Render (free tier); Database → MongoDB Atlas (free tier).
- Tất cả secrets (API keys, DB URI) phải được quản lý qua environment variables — không hardcode trong source code.
- Free tier limitations của Render (cold start ~50s) phải được acknowledge trong UX — frontend cần handle loading state gracefully.

### Data Architecture
- Curriculum data (CTĐT UET) được modeled dưới dạng DAG với quan hệ prerequisite giữa các CourseUnit.
- Mỗi CourseUnit được ánh xạ sang một hoặc nhiều Skill nodes.
- Self-report là primary data input cho MVP — Playwright scraping là optional enhancement, không phải blocker.

## Development Workflow
- Tất cả pull requests phải được review bởi ít nhất 1 thành viên khác trước khi merge.
- Constitution supersedes mọi convention cá nhân của thành viên trong team.

## Governance
Constitution được sở hữu và amend bởi project owner. Mọi thay đổi principle phải được document với rationale rõ ràng và version bump theo semantic versioning.

**Version**: 1.0.0 | **Ratified**: 2026-03-04 | **Last Amended**: 2026-03-07
