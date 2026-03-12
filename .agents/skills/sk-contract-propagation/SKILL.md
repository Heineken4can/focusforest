---
name: sk-contract-propagation
description: |
  설계 결정이 내려졌을 때, 그 결정이 파급되어야 할 모든 문서를
  자동으로 식별하고 전파하는 스킬.
  "이 변경사항이 어디까지 반영돼야 하나?"를 즉시 답합니다.
  Antigravity, Claude Code, Codex 등 어디서든 동일하게 사용됩니다.
---

# Contract Propagation Skill

## 개요

설계 결정 하나가 여러 문서에 파급될 때,
파급 범위를 빠뜨리면 문서 간 불일치가 발생합니다.
이 스킬은 변경 사항의 파급 범위를 자동으로 열거하고,
각 문서에서 수정할 위치를 정확히 가리킵니다.

## 이 스킬을 사용하는 시점

- PRD 요구사항이 변경됐을 때
- API 필드명/엔드포인트가 바뀌었을 때
- DB 스키마 컬럼이 추가/삭제/변경됐을 때
- 정책(보상 공식, 상태 전이 규칙, 타임존 기준 등)이 변경됐을 때
- V1 → V2 마이그레이션 계획 수립 시

---

## 1. 파급 방향 매핑 (이 프로젝트 기준)

```text
결정이 내려진 문서 -> 파급되어야 할 문서
─────────────────────────────────────────
PRD                -> architecture, ui_text_definition, be_design, db_design, fe_design
architecture       -> be_design, fe_design, db_design
ui_text_definition -> ui_design, ui_data_contract, ui_reference_design_*.html
be_design          -> fe_design (에러 코드, API 계약), db_design (스키마 일관성)
be_api             -> fe_design (에러 코드 대응), ui_data_contract (API 매핑)
db_design          -> be_design (트랜잭션 정합성)
```

---

## 2. 변경 유형별 파급 체크리스트

### TYPE-A: 필드명/컬럼명 변경

```text
변경 예) currentStreak -> 제거, V1 범위 외

파급 체크:
□ db_design.md ERD 다이어그램 — 컬럼 제거
□ db_design.md 필드 정의 테이블 — 행 제거 + V1 제외 주석 추가
□ db_design.md 트랜잭션 섹션 — 해당 컬럼 참조 수정
□ be_design.md 파생 뷰 섹션 — V1 제외 명시
□ be_design.md 트랜잭션 언급 — 컬럼 참조 수정
□ fe_design.md 상태 관리 섹션 — currentStreak 기반 UI 제거
□ be_api.md 응답 DTO — 필드 제거
```

### TYPE-B: API 엔드포인트 추가

```text
변경 예) POST /api/v1/metrics/events 추가

파급 체크:
□ be_design.md — Metrics Module 책임 추가
□ be_design.md — Rate Limiting 대상 목록에 추가
□ be_design.md — 공개 API 목록에 추가 (인증 불필요 시)
□ be_api.md — 엔드포인트 스펙 추가
□ fe_design.md — Metrics Queue IndexedDB 저장소 추가
□ fe_design.md — 비로그인 이벤트 전송 정책 추가
□ ui_data_contract.md — KPI 이벤트 발화 조건 추가
□ architecture.md Rate Limiting 섹션 — 대상 추가
```

### TYPE-C: 상태 전이 규칙 변경

```text
변경 예) COMPLETED -> (자동으로 BREAK_RUNNING 전이)

파급 체크:
□ be_design.md 세션 상태 머신 — 전이 추가
□ be_api.md complete 엔드포인트 응답 — nextState 명시
□ fe_design.md 세션 상태-UI 매핑표 — COMPLETED 허용 액션 수정
□ fe_design.md §5.3 — 자동 전이 절차 추가
□ ui_text_definition.md — 해당 화면 상태 설명 업데이트
□ db_design.md SessionStatus ENUM — 필요시 상태 추가
```

### TYPE-D: 정책 변경 (보상 공식, 타임존, Pause 제한 등)

```text
변경 예) Pause 최대 횟수 1회 -> 2회

파급 체크:
□ be_design.md §8 세션 정책 — Pause 횟수 제한 수정
□ be_api.md — 관련 에러 코드 설명 수정
□ db_design.md — pauseCount CHECK 제약 수정
□ fe_design.md — Pause 클라이언트 행동 수정
□ fe_design.md — SESSION_409_PAUSE_LIMIT 에러 대응 수정
□ ui_text_definition.md — Pause 관련 UI 텍스트 수정
```

### TYPE-E: V1 → V2 범위 이동

```text
변경 예) streak를 V1 제외에서 V2 포함으로 결정

파급 체크:
□ PRD — V2 기능 명세 추가
□ db_design.md §3.5 — V1 제외 주석 삭제, 컬럼 정의 추가
□ db_design.md ERD — currentStreak 컬럼 추가
□ be_design.md §11.1 — V1 제외 주석 삭제, streak 업데이트 로직 추가
□ fe_design.md §10.4 — streak V1 제외 주석 삭제, streak 배지 UI 추가
□ be_api.md — UserProgressSnapshot 응답 DTO에 currentStreak 추가
```

---

## 3. 실행 절차

### STEP 1: 변경 사항 분류

```text
1. 변경 내용을 입력받는다
2. TYPE-A~E 중 해당 유형 선택
3. 복합 유형이면 해당 체크리스트를 모두 합산
```

### STEP 2: 파급 범위 테이블 출력

```markdown
## Contract Propagation 분석

변경 내용: [변경 사항 요약]
변경 유형: TYPE-[A/B/C/D/E]

| # | 파일 | 섹션 | 수정 내용 | 우선순위 |
|---|------|------|----------|---------|
| 1 | db_design.md | §3.5 UserProgressSnapshot | currentStreak 제거 | 높음 |
| 2 | be_design.md | §11.1 파생 뷰 모델 | streak V1 제외 명시 | 높음 |
| 3 | fe_design.md | §10.4 서버/로컬 데이터 상태 | streak V1 제외 주석 | 중간 |
```

### STEP 3: 수정 실행 확인

사용자 확인 후, 각 파일을 순서대로 수정합니다.
수정 완료된 항목은 ✅, 미완료는 ⬜로 표시합니다.

### STEP 4: 버전 이력 업데이트

수정된 모든 파일의 버전 이력에 변경 사항을 기록합니다.

```markdown
| v1.2 | YYYY-MM-DD | [역할] | [변경 사항] 파급 반영 |
```

---

## 4. 공용 사용 규칙

- 이 스킬의 단일 원본은 `.agents/skills/sk-contract-propagation/SKILL.md` 입니다.
- Codex, Claude Code, Antigravity는 아래 3가지 신호를 동일한 호출로 취급합니다.
  - `$sk-contract-propagation`
  - `/sk-propagate-contract "[변경사항]"`
  - `"이 변경사항 파급 반영 범위 정리해줘"`, `"[변경내용] 파급 범위 알려줘"`처럼 의미가 같은 자연어 요청
- 툴별 진입 문서는 다를 수 있지만, 실제 절차는 이 파일을 기준으로 유지합니다.

**트리거**: `$sk-contract-propagation`, `/sk-propagate-contract "[변경사항]"`, 또는 `"이 변경사항 파급 반영 범위 정리해줘"`
