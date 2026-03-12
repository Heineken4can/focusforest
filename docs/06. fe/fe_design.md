# Focus Forest V1 — 프론트엔드 아키텍처 설계 (fe_design)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-10 | FE-Plan | architecture.md v1.3에서 분리 |
| v1.1 | 2026-03-10 | FE-Plan | 상위 아키텍처 문서 경로를 docs/03. architecture/architecture.md로 정리 |
| v1.2 | 2026-03-12 | FE-Plan | 문서 템플릿 정규화, 실제 UI 참조 경로로 교정 |

## 참조 문서

- 상위 아키텍처: `docs/03. architecture/architecture.md`
- PRD: `docs/01. po/PRD_FocusForest.md`
- UI 텍스트 정의: `docs/02. ui/ui_text_definition.md`
- UI 설계 요약: `docs/02. ui/ui_design.md`
- 디자인 시스템: `docs/02. ui/design_system.md`
- UI 레퍼런스: `docs/02. ui/ui_reference_design_master.html`
- UI 레퍼런스: `docs/02. ui/ui_reference_design_timer.html`
- UI 레퍼런스: `docs/02. ui/ui_reference_design_auth.html`
- UI 공통 스타일: `docs/02. ui/base.css`

## 참고 및 작업 파일

### 읽기 전용 참고 파일

아래 파일은 FE 설계와 구현 시 **참고 전용(Read-Only)** 기준 파일이다.

- `docs/01. po/PRD_FocusForest.md`
- `docs/02. ui/design_system.md`
- `docs/02. ui/ui_text_definition.md`
- `docs/02. ui/ui_design.md`
- `docs/02. ui/ui_reference_design_master.html`
- `docs/02. ui/ui_reference_design_timer.html`
- `docs/02. ui/ui_reference_design_auth.html`
- `docs/02. ui/base.css`
- `docs/03. architecture/architecture.md`

### FE 설계 작업 파일

아래 문서는 FE-Plan 단계에서 직접 수정/갱신하는 문서다.

- `docs/06. fe/fe_design.md`
- `docs/06. fe/fe_plan.md`

### FE 구현 대상 파일 범위

FE-Act 단계에서는 아래 범위를 구현 대상으로 본다. 현재 저장소에는 앱 소스 디렉터리가 아직 없으므로, 실제 구현 경로는 FE-Act 착수 시 생성/확정한다.

- `frontend/` 또는 동등한 FE 앱 루트 하위의 `routes`, `pages`, `components`, `features`, `hooks`, `stores`, `lib`
- `docs/02. ui/ui_reference_design_*.html` 파일은 퍼블리싱 레퍼런스이며 직접 구현 파일로 간주하지 않는다.

---

## 1. FE 기술 스택

### 1.1 Client: React + TypeScript + Vite

빠른 개발 속도, 상태 관리 및 반응형 UI 구성에 용이하다. Vite의 HMR로 개발 생산성을 확보하고, TypeScript로 타입 안전성을 보장한다.

### 1.2 UI: Tailwind CSS + Pretendard

design_system.md의 토큰 및 접근성 정책 반영에 용이하다. Pretendard 폰트를 기본 서체로 사용하며, Tailwind CSS 유틸리티 클래스로 디자인 시스템 토큰을 매핑한다.

### 1.3 Local Storage: IndexedDB + localStorage

PRD의 Local-First 요구를 충족한다. 구조화 데이터는 IndexedDB에, 단순 설정과 타임스탬프는 localStorage에 저장한다.

---

## 2. Local-First 원칙

### 2.1 비로그인 모드 동작

1. 사용자는 Task 생성, 세션 시작, 완료, 통계 조회를 모두 로컬에서 수행한다.
2. Task와 세션 기록은 IndexedDB에 저장한다.
3. 타이머 진행 중 기준 시각과 남은 시간 계산용 최소 값은 localStorage에 별도 보관한다.
4. 회원가입/로그인 전까지 서버 호출은 발생하지 않는다.

### 2.2 로그인 후 동기화 모드

로그인 상태에서의 "실시간 동기화"는 아래와 같이 정의한다.

- 사용자가 로그인 상태이고 온라인이면 Task CRUD, 세션 상태 전환, 프로필/설정 변경 시 **즉시 API를 호출**한다.
- 호출이 성공하면 로컬 캐시를 서버 응답 기준으로 갱신한다.
- 호출이 실패하면 변경 이벤트를 Sync Outbox에 적재하고, 네트워크 복구 또는 사용자의 수동 동기화 시 재시도한다.
- **타이머 카운트다운 자체는 서버와 실시간 동기화하지 않는다.** 서버는 세션 시작/중단/완료 시점과 정책 검증만 담당한다.

> 상세 동기화 흐름(bootstrap, push/pull, 충돌 처리)은 be_design.md를 참조한다.

---

## 3. 로컬 저장소 아키텍처

### 3.1 IndexedDB 저장 대상

| 대상 | 설명 |
|------|------|
| Task 목록 | 사용자가 생성한 할 일 전체 |
| Focus Session 임시 상태 | 진행 중/완료된 집중 세션 기록 |
| Reward Ledger 캐시 | 보상 원장의 로컬 캐시 |
| Sync Outbox | 서버 전송 실패 시 대기 이벤트 저장소 |
| Sync Cursor | 마지막 동기화 기준점 |
| 프로필/설정 캐시 | 서버 프로필 및 설정의 로컬 캐시 |

### 3.2 localStorage 저장 대상

| 대상 | 설명 |
|------|------|
| 타이머 시작 시각 | 탭 갱신/백그라운드 복귀 시 오차 교정용 |
| 현재 세션 식별자 | 진행 중인 세션의 빠른 참조 |
| 테마 모드 | 라이트/다크 테마 설정 |
| 간단한 UI 설정 | 레이아웃 선호값 등 |
| 마지막 동기화 시각 | 동기화 상태 표시 및 판단 기준 |

### 3.3 로컬 전용 데이터

V1에서는 아래 항목을 서버에 강제 저장하지 않는다.

- 비로그인 사용자의 임시 세션 상태
- UI 레이아웃 선호값 중 계정 간 공유 필요가 없는 값
- 단순 로딩/오버레이/뷰 상태

---

## 4. 타이머 아키텍처

### 4.1 Date.now() 기반 계산

집중 타이머는 클라이언트가 `Date.now()` 기준으로 계산한다. 서버는 초 단위 틱을 계산하지 않으며, 상태 전환 시점의 정책 검증만 수행한다. V1에서 WebSocket이나 Server-side timer tick은 도입하지 않는다.

### 4.2 visibilitychange 이벤트 보정

탭이 백그라운드로 전환된 후 복귀할 때 `visibilitychange` 이벤트를 감지하고, 저장된 시작 시각(timestamp)과 현재 `Date.now()`를 비교하여 경과 시간을 정확히 보정한다.

### 4.3 localStorage에 타이머 시작 시각 보존

타이머 시작 시각을 localStorage에 저장하여, 탭 갱신(새로고침)이나 백그라운드 복귀 시에도 정확한 남은 시간을 계산할 수 있도록 한다. 이 값은 세션 시작 시 기록하고, 세션 종료/포기 시 제거한다.

---

## 5. 세션 상태별 UI 매핑

### 5.1 상태-UI 매핑표

| 상태 | UI 의미 | 허용 액션 |
|------|---------|-----------|
| `RUNNING` | 집중 진행 중 | Pause, Give Up |
| `PAUSED` | 일시정지 오버레이 표시 | Resume, Give Up만 허용 |
| `COMPLETED` | 집중 완료 및 보상 지급 직후 | Break 시작, Skip Break |
| `BREAK_RUNNING` | 휴식 타이머 진행 중 | Skip Break 허용 |
| `BREAK_COMPLETED` | 휴식 자연 종료 | 대시보드 복귀 |
| `BREAK_SKIPPED` | 휴식 건너뛰기 종료 | 대시보드 복귀 |
| `GIVEN_UP` | 포기 안내 후 대시보드 복귀 | 대시보드 이동 |
| `GIVEN_UP_TIMEOUT` | Pause 시간 초과 포기 처리 | 대시보드 이동 |

### 5.2 Pause 클라이언트 행위

1. **Pause 진입 시**: `pauseStartedAt`, `pauseDeadlineAt`, `pauseCount=1`을 로컬에 저장하고, 온라인이면 즉시 `PATCH /api/v1/focus-sessions/:id/pause`를 호출한다.
2. **pauseDeadlineAt 도달 시**: 자동으로 give-up 처리 UI를 수행하고, 온라인이면 `POST /api/v1/focus-sessions/:id/give-up`를 호출한다.
3. **오프라인 만료 시**: 클라이언트가 로컬 상태를 `GIVEN_UP_TIMEOUT`으로 표시하고, 재연결 시 give-up 이벤트를 동기화한다.

> Pause는 집중 세션당 최대 1회만 허용된다. 서버는 두 번째 Pause 요청을 `SESSION_409_PAUSE_LIMIT`으로 거절한다.

---

## 6. 인증 흐름 아키텍처

### 6.1 Access Token: 브라우저 메모리 전용

Access Token은 JavaScript 변수(메모리)에만 보관한다. localStorage, IndexedDB, sessionStorage에 저장하지 않는다. 페이지 새로고침 시 토큰이 소실되므로 silent refresh로 재발급한다.

### 6.2 Refresh Token: HttpOnly + Secure + SameSite=Strict Cookie

Refresh Token은 서버가 `Set-Cookie` 헤더로 발급하며, `HttpOnly`, `Secure`, `SameSite=Strict` 속성을 적용한다. 클라이언트 JavaScript에서 직접 접근할 수 없다. `/api/v1/auth/refresh`와 `/api/v1/auth/logout` 호출 시에는 refresh cookie와 함께 `X-CSRF-Token` 헤더를 전송하는 double-submit 패턴을 적용한다.

### 6.3 silent refresh 흐름

1. API 호출 시 `401` 응답을 수신한다.
2. `POST /api/v1/auth/refresh`를 1회 호출하여 새 Access Token을 발급받는다.
3. 발급 성공 시, 원래 실패했던 요청을 1회 재시도한다.
4. refresh가 실패하면(`AUTH_401_REFRESH_REVOKED` 등) 로그인 화면으로 이동한다.

---

## 7. 클라이언트 보안

### 7.1 토큰 저장 규칙

- Access Token: 메모리 전용 (6.1 참조)
- Refresh Token: HttpOnly Secure SameSite=Strict Cookie (6.2 참조)

### 7.2 React 기본 escaping 전제

React의 JSX는 기본적으로 모든 삽입 값을 escape 처리한다. 이를 XSS 방어의 기본 전제로 삼는다.

### 7.3 dangerouslySetInnerHTML 사용 금지

`dangerouslySetInnerHTML`은 XSS 공격 벡터를 열 수 있으므로 전면 금지한다.

### 7.4 사용자 입력 HTML 렌더링 금지

사용자가 입력한 텍스트를 HTML로 파싱하거나 렌더링하지 않는다. 모든 사용자 입력은 텍스트로만 표시한다.

---

## 8. 에러 코드별 FE 대응 설계

### 8.1 AUTH_401_REFRESH_REVOKED

refresh token이 무효화되었거나 회전 후 폐기된 상태이다. 현재 세션을 즉시 종료하고 로그인 화면으로 이동한다. 로컬에 캐시된 인증 관련 상태를 모두 초기화한다.

### 8.2 SYNC_409_CONFLICT

version 충돌이 발생한 경우이다. 서버 응답의 `serverSnapshot`으로 해당 엔터티의 로컬 데이터를 교체하고, "다른 기기에서 변경 사항이 반영되었습니다" 수준의 안내를 사용자에게 표시한다. 재수정은 최신 스냅샷 기준으로 사용자가 다시 수행한다.

### 8.3 SESSION_409_PAUSE_LIMIT

집중 세션당 Pause 최대 1회 정책을 위반한 경우이다. Pause 버튼을 비활성화하고 "이 세션에서는 이미 일시정지를 사용했습니다" 안내 문구를 표시한다.

### 8.4 SESSION_409_TIMEOUT

Pause 제한 시간(5분)이 초과되어 서버에서 세션이 이미 포기 처리된 경우이다. 클라이언트 UI를 세션 포기 처리 화면(`GIVEN_UP_TIMEOUT`)으로 강제 전환한다.

---

## 9. 클라이언트 동기화 설계

### 9.1 Sync Outbox 아키텍처

IndexedDB에 `syncOutbox` 오브젝트 스토어를 생성하여, 서버 전송에 실패한 변경 이벤트를 저장한다. 각 이벤트는 `deviceSequence`, `occurredAt`, 엔터티 유형, 페이로드를 포함한다. 네트워크 복구 시 또는 사용자 수동 동기화 시 outbox의 이벤트를 순차적으로 재전송한다.

### 9.2 coalesce 규칙

- **mutable 엔터티**(Task, Profile, Setting): push 전에 동일 엔터티에 대한 연속 수정을 **최종 상태로 병합**(coalesce)한다. 예를 들어 Task 제목을 3번 수정했다면, 마지막 상태만 전송한다.
- **상태 전이 이벤트**(세션 완료, 포기, 휴식 Skip 등): 의미가 있는 개별 이벤트를 유지하며 coalesce하지 않는다.

### 9.3 409 Conflict 처리

오프라인 기기에서 누적된 이벤트 중 특정 엔터티가 `409 Conflict`를 받으면, 해당 엔터티의 stale outbox 이벤트를 폐기하고 `serverSnapshot`으로 로컬을 교체한다. 사용자는 최신 스냅샷 기준으로 다시 수정하여 새 이벤트를 생성할 수 있다.

### 9.4 deviceSequence 단조 증가 값으로 순서 보장

outbox 이벤트는 디바이스별 단조 증가 값 `deviceSequence`로 순서를 보장한다. `occurredAt`은 보조 정렬 및 감사 용도로 사용한다. 서버는 동일 디바이스 배치 내 이벤트를 `deviceSequence` 오름차순으로 적용한다.

---

## 10. 상태 관리 설계

### 10.1 전역 상태 vs 로컬 상태 전략 개요

프론트엔드 상태를 전역 상태와 로컬(컴포넌트) 상태로 명확히 분리한다. 전역 상태는 여러 컴포넌트에서 공유되어야 하는 데이터에 한정하며, UI 임시 상태는 컴포넌트 로컬로 관리하여 불필요한 리렌더링과 복잡성을 방지한다.

### 10.2 인증 상태 (전역)

| 항목 | 저장 위치 | 설명 |
|------|-----------|------|
| Access Token | 메모리 (전역 상태) | API 호출 시 Authorization 헤더에 사용 |
| 로그인 여부 | 전역 상태 | `isAuthenticated` 플래그로 인증 가드 및 UI 분기에 사용 |
| 사용자 기본 정보 | 전역 상태 | 닉네임, 프로필 등 헤더/사이드바에 표시되는 정보 |

### 10.3 현재 세션 상태 (전역)

| 항목 | 저장 위치 | 설명 |
|------|-----------|------|
| 세션 상태 | 전역 상태 | `RUNNING`, `PAUSED`, `COMPLETED` 등 현재 세션의 상태 |
| 타이머 시작 시각 | localStorage + 전역 상태 | 탭 갱신 시 복원 가능하도록 localStorage에도 보관 |
| pauseDeadlineAt | 전역 상태 | Pause 만료 시점 추적용 |
| 연결된 Task 정보 | 전역 상태 | 현재 집중 중인 Task의 ID 및 제목 |

### 10.4 Task 목록 (IndexedDB + React Query 또는 유사 캐시)

Task 데이터는 IndexedDB를 원본 저장소로 사용하고, React Query(또는 유사한 서버 상태 관리 라이브러리)를 통해 캐시와 동기화를 관리한다. 로그인 상태에서는 서버 API 응답을 캐시하되, 오프라인 시에는 IndexedDB의 로컬 데이터로 폴백한다.

### 10.5 UI 임시 상태 (로컬 컴포넌트)

아래 항목은 컴포넌트 로컬 상태(`useState`, `useReducer`)로 관리하며 전역 상태에 포함하지 않는다.

- 모달/오버레이 열림/닫힘 상태
- 폼 입력 중간값
- 로딩/스피너 표시 여부
- 드롭다운/토글 등 인터랙션 상태
- 애니메이션 진행 상태



### 10.2 인증 상태 (전역)

| 항목 | 저장 위치 | 설명 |
|------|-----------|------|
| Access Token | 메모리 (전역 상태) | API 호출 시 Authorization 헤더에 사용 |
| 로그인 여부 | 전역 상태 | `isAuthenticated` 플래그로 인증 가드 및 UI 분기에 사용 |
| 사용자 기본 정보 | 전역 상태 | 닉네임, 프로필 등 헤더/사이드바에 표시되는 정보 |

### 10.3 현재 세션 상태 (전역)

| 항목 | 저장 위치 | 설명 |
|------|-----------|------|
| 세션 상태 | 전역 상태 | `RUNNING`, `PAUSED`, `COMPLETED`, `BREAK_RUNNING` 등 현재 세션 상태 |
| 타이머 시작 시각 | localStorage + 전역 상태 | 탭 갱신 시 복원 가능하도록 localStorage에도 보관 |
| pauseDeadlineAt | 전역 상태 | Pause 만료 시점 추적용 |
| 연결된 Task 정보 | 전역 상태 | 현재 집중 중인 Task의 ID 및 제목 |

### 10.4 서버/로컬 데이터 상태

| 항목 | 저장 위치 | 설명 |
|------|-----------|------|
| Task 목록 | IndexedDB + React Query 또는 유사 캐시 | 로그인 시 서버 응답과 동기화, 오프라인 시 로컬 폴백 |
| Reward Stats | 서버 캐시 + IndexedDB 보조 캐시 | `totalSp`, `level`, `totalCompletedSessions` 기준 표시 |
| Reward Ledger | IndexedDB + 서버 재조회 | 히스토리 화면 조회와 오프라인 폴백 |
| Metrics Queue | IndexedDB | 비로그인/오프라인 KPI 이벤트 재전송 큐 |

> `currentStreak`는 PRD V1 범위 외다. FE는 V1에서 streak 배지를 필수 UI로 가정하지 않는다.

### 10.5 UI 임시 상태 (로컬 컴포넌트)

아래 항목은 컴포넌트 로컬 상태(`useState`, `useReducer`)로 관리하며 전역 상태에 포함하지 않는다.

- 모달/오버레이 열림/닫힘 상태
- 폼 입력 중간값
- 로딩/스피너 표시 여부
- 드롭다운/토글 등 인터랙션 상태
- 애니메이션 진행 상태