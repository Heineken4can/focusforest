---
name: sk-cross-doc-consistency-review
description: |
  여러 설계 문서 간의 정합성을 체계적으로 리뷰하는 스킬.
  PRD -> Architecture -> UI -> BE -> FE -> DB 문서 체인에서 결정 사항이 누락 없이
  전파되었는지 검증하고 표준화된 리뷰 리포트를 생성합니다.
  Antigravity, Claude Code, Codex 등 어떤 AI 툴에서도 동일하게 사용됩니다.
---

# Cross-Doc Consistency Review Skill

## 개요

설계 결정은 하나의 문서에서 내려지지만, 그 영향은 여러 문서에 파급됩니다.
이 스킬은 파급 범위를 체계적으로 추적하고 누락을 자동 감지합니다.

## 이 스킬을 사용하는 시점

- 특정 설계 결정 후 "전부 반영됐는지" 확인할 때
- 검수(rv) 사이클 전 사전 자가 점검 시
- 문서 버전이 올라갔을 때 하위 문서 동기화 여부 확인 시
- PRD 업데이트 후 UI/BE/DB 파급 범위 파악이 필요할 때

---

## 1. 문서 계층 구조 (이 워크스페이스 기준)

```text
docs/01. po/PRD_FocusForest.md                  <- 최상위 원본
   └─ docs/03. architecture/architecture.md     <- 시스템 아키텍처
       ├─ docs/02. ui/ui_text_definition.md     <- UI/UX 화면 정의
       │   ├─ docs/02. ui/ui_design.md
       │   ├─ docs/02. ui/ui_data_contract.md
       │   └─ docs/02. ui/ui_reference_design_*.html
       ├─ docs/04. be/be_design.md              <- BE 아키텍처 설계
       │   ├─ docs/04. be/be_api.md
       │   └─ docs/04. be/be_plan.md
       ├─ docs/05. db/db_design.md              <- DB 스키마 설계
       └─ docs/06. fe/fe_design.md              <- FE 아키텍처 설계
```

---

## 2. 리뷰 실행 절차

### STEP 1: 리뷰 대상 결정

사용자가 다음 중 하나를 요청하면 이 스킬을 적용합니다:

- `"전체 문서 정합성 리뷰해줘"`
- `"[특정 결정사항]이 모든 문서에 반영됐는지 확인해줘"`
- `$sk-cross-doc-consistency-review`
- `/sk-cross-doc-review`

리뷰 범위는 아래 둘 중 선택합니다:

| 모드 | 설명 | 사용 시점 |
|------|------|----------|
| **전체 리뷰** | 모든 문서 쌍 검사 | 마일스톤 완료, 대규모 변경 후 |
| **타겟 리뷰** | 특정 결정사항 파급 범위만 검사 | 단일 이슈 수정 후 재확인 |

### STEP 2: 문서 쌍별 정합성 체크포인트 실행

아래 체크포인트 목록을 순서대로 실행합니다.

---

## 3. 체크포인트 카탈로그

### CP-01: PRD ↔ 화면 정의 정합성

**리뷰 내용**: PRD의 User Story가 ui_text_definition.md에 매핑되었는가

```text
확인 항목:
□ PRD의 US-1 ~ US-N이 각각 SCR-XX에 연결되어 있는가
□ PRD에서 언급된 핵심 기능(집중 타이머, 보상, 동기화 등)이 화면에 존재하는가
□ PRD의 KPI 이벤트가 해당 화면 SCR에 명시되어 있는가
□ PRD의 NFR(비기능 요구사항)이 화면 정의에 반영되어 있는가
```

### CP-02: UI 화면정의 ↔ UI 설계 요약 정합성

**리뷰 내용**: ui_text_definition.md의 보조 레이어가 ui_design.md에 동일하게 등록되었는가

### CP-03: UI 데이터 계약 ↔ BE API 정합성

**리뷰 내용**: ui_data_contract.md의 액션/API 후보가 be_api.md에 실제 엔드포인트로 존재하는가

### CP-04: BE 설계 ↔ DB 설계 정합성

**리뷰 내용**: be_design.md의 모듈/엔터티 정의가 db_design.md와 일치하는가

핵심 체크 예시:
- FocusSession 상태 enum 일치 여부
- `currentStreak` 등 V1 제외 결정 반영 여부
- `metrics/events` 적재 정책 및 rate limit 대상 일치 여부
- soft delete / hard delete 정책 일치 여부

### CP-05: BE 설계 ↔ FE 설계 정합성

**리뷰 내용**: be_design.md의 API 계약과 에러 코드가 fe_design.md에 올바르게 반영되어 있는가

핵심 체크 예시:
- `TASK_409_COMPLETED`, `SESSION_409_ALREADY_RUNNING`, `SESSION_409_INVALID_STATE` 대응 여부
- `complete -> start-break -> complete-break/skip-break` 흐름 일치 여부
- `metricsQueue` 및 bootstrap 정책 반영 여부
- 참조 파일 경로 실재 여부

### CP-06: Architecture ↔ 하위 문서 중복/차이 감지

**리뷰 내용**: architecture.md의 내용이 하위 문서에 중복 정의된 채 다른 값으로 발산하지 않았는가

---

## 4. 판정 기준

| 심각도 | 기준 | 예시 |
|--------|------|------|
| CRITICAL | 핵심 로직이 누락/불일치하여 구현 시 버그 유발 | 에러코드가 한쪽에만 존재, 상태값이 다름 |
| WARN | 불명확하거나 한쪽에만 언급되어 혼란 가능 | 참조 파일 경로가 존재하지 않음 |
| INFO | 완전히 잘못된 건 아니지만 개선 권고 | 중복 기술로 문서 비효율 발생 |
| PASS | 정합성 확인됨 | - |

---

## 5. 리포트 출력 포맷

```markdown
## Cross-Doc Consistency Review Report

리뷰 시각: YYYY-MM-DD HH:mm
리뷰 모드: 전체 / 타겟 ([대상 결정사항 명])
리뷰 범위: [확인한 문서 목록]

### 결과 요약

| 판정 | 건수 |
|------|------|
| CRITICAL | N |
| WARN | N |
| INFO | N |
| PASS | N |

**종합 판정**: PASS / CONDITIONAL PASS / FAIL
```

---

## 6. 공용 사용 규칙

- 이 스킬의 단일 원본은 `.agents/skills/sk-cross-doc-consistency-review/SKILL.md` 입니다.
- Codex, Claude Code, Antigravity는 아래 3가지 신호를 동일한 호출로 취급합니다.
  - `$sk-cross-doc-consistency-review`
  - `/sk-cross-doc-review [범위]`
  - `"문서 정합성 리뷰해줘"`, `"[문서명]과 [문서명] 정합성 확인해줘"`처럼 의미가 같은 자연어 요청
- 툴별 진입 문서는 다를 수 있지만, 실제 절차와 체크포인트는 이 파일을 기준으로 유지합니다.

---

## 7. 빠른 트리거

- `$sk-cross-doc-consistency-review`
- `/sk-cross-doc-review`
- `/sk-cross-doc-review [결정사항]`
- `"문서 정합성 리뷰해줘"`
- `"[문서명]과 [문서명] 정합성 확인해줘"`