# Focus Forest V1 — 프론트엔드 개발 계획 (fe_plan)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-10 | FE-Plan | architecture.md v1.3에서 분리 + 태스크 분해 신규 작성 |
| v1.1 | 2026-03-12 | FE-Plan | 상위 architecture v2.0 및 BE 최신 계약 반영, 오탈자 정리, 구현 계획 재정렬 |

## 참조 문서

- FE 설계: docs/06. fe/fe_design.md
- 상위 아키텍처: docs/03. architecture/architecture.md
- API 명세: docs/04. be/be_api.md
- 백엔드 설계: docs/04. be/be_design.md
- PRD: docs/01. po/PRD_FocusForest.md
- 디자인 시스템: docs/02. ui/design_system.md
- UI 레퍼런스: docs/02. ui/ui_reference_design_master.html
- UI 레퍼런스(타이머): docs/02. ui/ui_reference_design_timer.html
- UI 레퍼런스(인증): docs/02. ui/ui_reference_design_auth.html

---

## 1. 아키텍처 핸드오프 요약

상위 architecture v2.0 및 BE 문서를 기준으로 FE 구현 전제를 아래와 같이 확정한다.

- 실시간 동기화: 로그인 상태에서는 상태 전이 이벤트를 즉시 API 호출하고, 실패 시 Sync Outbox에 적재하여 재시도한다.
- 충돌 처리: `409 Conflict` 수신 시 서버의 `serverSnapshot`으로 로컬 엔터티를 교체한다. V1에서는 manual merge UI를 제공하지 않는다.
- 타이머 로컬 계산: 초 단위 카운트다운은 `Date.now()` 기준으로 클라이언트에서 처리하고, `visibilitychange`로 보정한다.
- 토큰 저장 규칙: Access Token은 메모리 전용, Refresh Token은 HttpOnly + Secure + SameSite=Strict Cookie로 관리한다.
- bootstrap 배치 분할: 로그인 직후 로컬 데이터를 서버와 병합할 때 대량 데이터를 여러 배치로 나눠 전송한다.
- 세션 상태 매핑: `RUNNING`, `PAUSED`, `COMPLETED`, `BREAK_RUNNING`, `BREAK_COMPLETED`, `BREAK_SKIPPED`, `GIVEN_UP`, `GIVEN_UP_TIMEOUT`에 대응하는 UI를 구현한다.
- 휴식 자동 전이: 표준 UX는 `complete -> start-break -> complete-break/skip-break` 흐름을 FE 자동 호출로 연결한다.
- metrics queue: KPI 이벤트는 핵심 Sync Outbox와 별도 큐로 관리하고, `POST /api/v1/metrics/events`로 재전송한다.
- V1 범위: Reward Stats UI는 `totalSp`, `level`, `totalCompletedSessions` 기준으로 구성하며, `currentStreak`는 V1 필수 범위에서 제외한다.

---

## 2. 구현 태스크 분해

### Phase 1: 프로젝트 초기화

| # | 태스크 | 설명 |
|---|--------|------|
| 1-1 | Vite + React + TypeScript 프로젝트 생성 | 프로젝트 스캐폴딩 및 tsconfig 설정 |
| 1-2 | Tailwind CSS + Pretendard 설정 | `design_system.md` 토큰을 Tailwind config에 매핑 |
| 1-3 | IndexedDB 초기화 모듈 | DB 스키마 정의, 버전 관리, 마이그레이션 유틸 |
| 1-4 | 라우팅 설정 | React Router 설정, 인증 가드 라우트 구성 |
| 1-5 | 전역 상태 관리 초기화 | 인증 상태, 세션 상태 등 전역 스토어 설정 |
| 1-6 | 공통 컴포넌트 기반 | 버튼, 입력, 모달 등 디자인 시스템 기본 컴포넌트 |

### Phase 2: 로컬 모드 완성

| # | 태스크 | 설명 |
|---|--------|------|
| 2-1 | Task CRUD UI | Task 생성, 조회, 수정, 삭제, 완료/복원, 핵심 과제 지정 |
| 2-2 | Task IndexedDB 저장 | Task 데이터의 로컬 영속화 |
| 2-3 | 타이머 UI + 집중 모드 | `Date.now()` 기반 카운트다운, `visibilitychange` 보정 |
| 2-4 | 세션 상태 머신 구현 | `RUNNING -> PAUSED -> COMPLETED -> BREAK_RUNNING` 등 상태 전이 로직 |
| 2-5 | Pause / Resume / Give Up UI | 일시정지 오버레이, `pauseDeadlineAt` 만료 처리 |
| 2-6 | Break 타이머 + Skip Break | 휴식 타이머, 자연 종료, 건너뛰기 기능 |
| 2-7 | 로컬 통계 표시 | IndexedDB 기반 오늘 집중 시간, 완료 세션 수, 나무 수 계산 |
| 2-8 | 대시보드 UI | 할 일 목록, 오늘 통계, 핵심 과제, 보상 요약 표시 |
| 2-9 | Metrics Queue 로컬 수집 | 비로그인 KPI 이벤트 적재 및 재전송 준비 |

### Phase 3: 인증

| # | 태스크 | 설명 |
|---|--------|------|
| 3-1 | 회원가입 UI | 이메일, 비밀번호, 닉네임 입력 폼 + 유효성 검증 |
| 3-2 | 로그인 UI | 이메일, 비밀번호 입력 + 에러 표시 |
| 3-3 | Access Token 메모리 관리 | 전역 상태에 토큰 보관, API 호출 시 헤더 주입 |
| 3-4 | silent refresh 구현 | `401` 수신 시 자동 refresh + 원 요청 재시도 |
| 3-5 | 인증 가드 | 비인증 사용자의 인증 필요 페이지 접근 차단 |
| 3-6 | 로그아웃 처리 | 서버 로그아웃 API 호출 + 로컬 상태 초기화 |

### Phase 4: 동기화 및 세션 연동

| # | 태스크 | 설명 |
|---|--------|------|
| 4-1 | bootstrap 배치 전송 | 로그인 직후 로컬 데이터 서버 병합 (배치 분할) |
| 4-2 | Sync Outbox 구현 | IndexedDB 기반 이벤트 적재 + 재전송 |
| 4-3 | push 구현 | outbox 이벤트를 서버에 업로드 |
| 4-4 | pull 구현 | cursor 기반 서버 delta 수신 + 로컬 반영 |
| 4-5 | coalesce 로직 | mutable 엔터티 병합, 상태 전이 이벤트 개별 유지 |
| 4-6 | 충돌 처리 UI | `409` 수신 시 `serverSnapshot` 교체 + 안내 표시 |
| 4-7 | 오프라인 감지 + 복구 | `navigator.onLine` + `online` 이벤트로 outbox 자동 재전송 |
| 4-8 | 휴식 자동 전이 구현 | `complete -> start-break -> complete-break/skip-break` 자동 호출 |
| 4-9 | Metrics 재전송 | `metricsQueue`를 `POST /api/v1/metrics/events`로 재전송 |

### Phase 5: 대시보드/통계/설정 완성

| # | 태스크 | 설명 |
|---|--------|------|
| 5-1 | 서버 통계 조회 | Reward Stats API 연동 (`totalSp`, `level`, `totalCompletedSessions`) |
| 5-2 | 보상 표시 | 세션 완료 시 보상 애니메이션 + 나무 시각화 |
| 5-3 | 보상 원장 조회 | Reward Ledger API 연동 + 히스토리 표시 |
| 5-4 | 프로필/설정 UI | 프로필 조회/수정, 테마/타임존/동기화 설정 |
| 5-5 | 테마 설정 | 라이트/다크/시스템 테마 전환 + localStorage 저장 |
| 5-6 | 반응형 레이아웃 | 모바일/데스크톱 대응 Tailwind 반응형 클래스 적용 |
| 5-7 | 에러 상태 폴리싱 | Loading / Error / Empty 상태 및 경계 처리 보강 |

---

## 3. bootstrap 배치 분할 전송 구현 가이드

### 3.1 배치 크기 기준

- 기본 권고: Task 100건 + FocusSession 100건 이하 또는 요청 본문 1MB 이하
- 로컬 데이터가 기준을 초과하면 여러 배치로 분할하여 순차 전송한다.
- 각 배치는 독립적으로 처리 가능해야 하며, 이전 배치 실패가 이후 배치를 영구 차단하지 않도록 설계한다.

### 3.2 배치 재시도 전략

- 모든 로컬 생성 엔터티는 `clientGeneratedId`(UUIDv7)를 생성 시점에 부여한다.
- 서버는 동일 `clientGeneratedId`가 이미 존재하면 서버 레코드를 우선 채택한다.
- 따라서 배치 재시도 시 중복 삽입이 발생하지 않으며, 동일 배치를 안전하게 재전송할 수 있다.
- 네트워크 오류 시 지수 백오프(exponential backoff)로 재시도하되, 최대 재시도 횟수를 제한한다.

### 3.3 다중 배치 진행률 UI

- 전체 배치 수와 현재 진행 중인 배치 번호를 사용자에게 표시한다.
- 예: `데이터 동기화 중... (2/5)`
- 모든 배치 완료 후 `동기화 완료` 안내를 표시한다.
- 실패 배치가 있을 경우 재시도 옵션을 제공한다.

---

## 4. Outbox + Metrics Queue 구현 가이드

### 4.1 deviceSequence 단조 증가 구현

- 디바이스별 `deviceSequence` 카운터를 IndexedDB에 저장한다.
- 새로운 outbox 이벤트 생성 시마다 카운터를 1 증가시키고, 해당 값을 이벤트에 할당한다.
- `occurredAt` 타임스탬프는 보조 정렬 및 감사 용도로만 사용한다.
- 서버는 동일 디바이스 배치 내 이벤트를 `deviceSequence` 오름차순으로 적용한다.

### 4.2 mutable 엔터티 coalesce 규칙

대상: Task, Profile, Setting

- push 전에 outbox에서 동일 엔터티에 대한 연속 수정 이벤트를 탐색한다.
- 여러 수정 이벤트가 존재하면 최종 상태 하나로 병합하여 전송한다.
- 예: Task 제목을 `A -> B -> C`로 수정했다면 `C` 상태만 전송한다.
- coalesce 시 `deviceSequence`는 병합된 이벤트 중 가장 큰 값을 사용한다.

### 4.3 상태 전이 이벤트 개별 유지

대상: 세션 완료, 세션 포기, 휴식 시작/종료, 휴식 Skip, Pause, Resume

- 의미 있는 상태 전이 이벤트는 coalesce하지 않고 개별적으로 유지한다.
- 각 이벤트가 고유한 비즈니스 의미를 가지므로 병합 시 정보가 손실될 수 없다.
- 서버는 이러한 이벤트를 순서대로 적용하여 세션 상태 머신의 무결성을 보장한다.

### 4.4 metrics queue 운영 원칙

- KPI 이벤트는 `syncOutbox`와 별도 `metricsQueue`에 저장한다.
- 비로그인 상태에서도 `POST /api/v1/metrics/events`를 호출할 수 있어야 한다.
- 오프라인 시 큐에 적재하고, 온라인 복귀 시 배치 재전송한다.
- KPI 이벤트는 append-only로 유지하며 coalesce하지 않는다.

---

## 5. API 연동 구현 가이드

### 5.1 연동 순서

| 순서 | API 그룹 | 엔드포인트 | 구현 Phase |
|------|----------|------------|------------|
| 1 | Auth API | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | Phase 3 |
| 2 | Task API | `GET /tasks`, `POST /tasks`, `PATCH /tasks/:taskId`, `DELETE /tasks/:taskId` | Phase 4 |
| 3 | Session API | `POST /focus-sessions`, `PATCH /focus-sessions/:id/pause`, `PATCH /focus-sessions/:id/resume`, `POST /focus-sessions/:id/give-up`, `POST /focus-sessions/:id/complete`, `POST /focus-sessions/:id/start-break`, `POST /focus-sessions/:id/complete-break`, `POST /focus-sessions/:id/skip-break` | Phase 4 |
| 4 | Sync API | `POST /sync/bootstrap`, `POST /sync/push`, `GET /sync/pull` | Phase 4 |
| 5 | Metrics API | `POST /metrics/events` | Phase 2, 4 |
| 6 | Reward API | `GET /rewards/stats`, `GET /rewards/ledger` | Phase 5 |
| 7 | Profile / Setting API | `GET /profile`, `PATCH /profile`, `GET /settings`, `PATCH /settings` | Phase 5 |

> 모든 엔드포인트의 Base Path는 `/api/v1`이다. 인증이 필요한 API는 Bearer Access Token을 사용하며, refresh/logout은 Refresh Cookie + CSRF Header를 병행한다.

### 5.2 FE가 특별히 주의할 계약

- `TASK_409_COMPLETED`: 완료된 Task에 대한 집중 시작/핵심 과제 지정은 서버가 최종 차단한다.
- `SESSION_409_ALREADY_RUNNING`: 활성 세션이 이미 있으면 새 시작 대신 현재 세션 UI로 복귀한다.
- `SESSION_409_INVALID_STATE`: 중복 클릭 또는 지연 응답 시 현재 세션 스냅샷 기준으로 복구한다.
- `GET /rewards/stats`: V1 응답은 `currentStreak` 없이 `totalSp`, `level`, `totalCompletedSessions`를 기준으로 사용한다.

---

## 6. Done Criteria

### 6.1 로컬 모드 단독 동작 확인

- [ ] 비로그인 상태에서 Task CRUD(생성, 조회, 수정, 삭제, 완료/복원, 핵심 과제 지정)가 모두 동작한다.
- [ ] 비로그인 상태에서 타이머 시작, Pause, Resume, Give Up, Complete, Break, Skip Break가 모두 동작한다.
- [ ] 비로그인 상태에서 오늘 통계(집중 시간, 완료 세션 수, 나무 수)가 정확히 표시된다.
- [ ] 브라우저 새로고침 후에도 진행 중인 타이머가 정확히 복원된다.
- [ ] 탭 백그라운드 전환 후 복귀 시 타이머 시간이 정확히 보정된다.
- [ ] 비로그인 KPI 이벤트가 metrics queue에 적재되고 온라인 복귀 시 재전송된다.

### 6.2 동기화 시나리오 확인

- [ ] bootstrap: 로그인 직후 로컬 데이터가 서버와 정상 병합된다.
- [ ] push 성공: 로컬 변경 사항이 서버에 정상 반영된다.
- [ ] pull 성공: 서버 변경 사항이 로컬에 정상 반영된다.
- [ ] `409 Conflict`: `serverSnapshot`으로 로컬이 교체되고 안내가 표시된다.
- [ ] 오프라인 -> 온라인 복구: outbox에 적재된 이벤트가 자동으로 재전송된다.
- [ ] 배치 분할: 대량 데이터(100건 초과)가 여러 배치로 분할 전송된다.

### 6.3 silent refresh 동작 확인

- [ ] Access Token 만료 후 자동으로 refresh가 1회 시도된다.
- [ ] refresh 성공 시 원래 요청이 자동으로 재시도된다.
- [ ] refresh 실패 시 로그인 화면으로 이동한다.

### 6.4 에러 코드별 UI 대응 확인

- [ ] `AUTH_401_REFRESH_REVOKED`: 세션 종료 + 로그인 이동
- [ ] `SYNC_409_CONFLICT`: `serverSnapshot` 교체 + 안내 문구
- [ ] `TASK_409_COMPLETED`: 시작 버튼 비활성화 유지 + 서버 메시지 노출
- [ ] `SESSION_409_ALREADY_RUNNING`: 현재 세션 화면으로 복귀
- [ ] `SESSION_409_PAUSE_LIMIT`: Pause 버튼 비활성화 + 안내 문구
- [ ] `SESSION_409_INVALID_STATE`: 현재 세션 스냅샷 기준 UI 복구
- [ ] `SESSION_409_TIMEOUT`: 포기 처리 UI 강제 전환

### 6.5 반응형 대응 확인

- [ ] 모바일 뷰포트(320px~767px)에서 모든 화면이 정상 표시된다.
- [ ] 데스크톱 뷰포트(768px~)에서 모든 화면이 정상 표시된다.
- [ ] 대시보드, 집중 화면, 설정 화면 모두 반응형이 적용된다.

### 6.6 테마 전환 확인

- [ ] 라이트 모드에서 모든 화면이 정상 표시된다.
- [ ] 다크 모드에서 모든 화면이 정상 표시된다.
- [ ] 테마 전환 시 즉시 반영되고 localStorage에 저장된다.
- [ ] 브라우저 새로고침 후에도 선택한 테마가 유지된다.

---

## 7. 결론 및 다음 단계

본 문서는 상위 architecture v2.0과 `be_api.md` 최신 계약을 기준으로, 프론트엔드 구현에 필요한 태스크 분해, 동기화 구현 가이드, API 연동 순서, 완료 기준을 정의한다.

다음 단계:

1. `fe_design.md` 기준으로 화면 상태와 저장 전략을 최종 확인한다.
2. `be_api.md` 기준으로 DTO와 오류 코드를 FE 타입/쿼리 레이어에 반영한다.
3. Phase 1부터 순차적으로 착수하되, 로컬 모드를 먼저 완성하고 이후 인증/동기화를 연결한다.
4. UI 리뷰 시 `design_system.md`와 `ui_reference_design_*.html` 3종을 기준 레퍼런스로 사용한다.