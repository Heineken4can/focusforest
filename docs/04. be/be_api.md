# Focus Forest V1 — API 명세 (be_api)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-10 | BE-Plan | architecture.md v1.3에서 분리 |
| v1.1 | 2026-03-10 | BE-Plan | 구현 착수용 API 계약 구체화, 세션/휴식 상태 전이 및 오류 코드 보강 |
| v1.2 | 2026-03-12 | BE-Plan | metrics/events 계약 추가, reward streak V1 제외, rate limit 정책 정합화 |
| v1.3 | 2026-03-12 | BE-Plan | UI 계약 기준 start/bootstrap 응답 범위, conflict payload, KPI dedupe, timezone 정책 확정 |

## 참조 문서

- 백엔드 설계: [docs/04. be/be_design.md](./be_design.md)
- PRD: [docs/01. po/PRD_FocusForest.md](../01. po/PRD_FocusForest.md)

---

## 1. 공통 원칙

- **Base Path**: `/api/v1`
- **인증 방식**:
  - 기본: Bearer Access Token (Authorization 헤더)
  - `auth/refresh`, `auth/logout`: HttpOnly Refresh Cookie + `X-CSRF-Token` 헤더 검증 (double-submit 패턴)
- **문서화 방식**: Swagger(OpenAPI), 개발 서버 `/api-docs`
- **시간 필드 형식**: 모든 datetime 필드는 UTC ISO 8601 (`2026-03-10T08:30:00Z`) 문자열을 사용한다.
- **낙관적 잠금 필드**: Task, FocusSession, Profile, Setting 변경 요청은 최신 `version`을 포함해야 한다.
- **클라이언트 생성 식별자**: 로컬에서 생성된 Task, FocusSession, sync 이벤트는 `clientGeneratedId` 또는 `eventId(UUIDv7)`를 사용한다.
- **세션 상태 전이 이벤트**: `give-up`, `complete`, `start-break`, `complete-break`, `skip-break`, `sync/push`는 재시도 안전성을 위해 `eventId`를 필수로 받는다.
- **공통 응답 형태**:

```json
{
  "status": "success",
  "message": "요청이 처리되었습니다.",
  "data": {},
  "meta": {}
}
```

- **공통 오류 형태**:

```json
{
  "status": "error",
  "message": "충돌이 발생했습니다.",
  "code": "SYNC_409_CONFLICT",
  "data": {
    "entityType": "TASK",
    "entityId": "tsk_123",
    "clientVersion": 3,
    "serverVersion": 7,
    "serverSnapshot": {},
    "conflictFields": [
      "title",
      "status"
    ],
    "resolutionStrategy": "REPLACE_LOCAL_WITH_SERVER",
    "retryable": false
  }
}
```

- `409 Conflict`의 `data` payload는 `entityType`, `entityId`, `clientVersion?`, `serverVersion`, `serverSnapshot`, `conflictFields?`, `resolutionStrategy`, `retryable`를 공통 사용한다.

---

## 2. 엔드포인트 목록

| 도메인 | 메서드 | URI | 인증 | 용도 | Rate Limit |
|--------|--------|-----|------|------|:----------:|
| Auth | `POST` | `/api/v1/auth/signup` | Public | 회원가입 | Y |
| Auth | `POST` | `/api/v1/auth/login` | Public | 로그인 | Y |
| Auth | `POST` | `/api/v1/auth/refresh` | Refresh Cookie + CSRF Header | 액세스 토큰 재발급 및 rotation | Y |
| Auth | `POST` | `/api/v1/auth/logout` | Bearer + Refresh Cookie + CSRF Header | 로그아웃 및 refresh token revocation | - |
| Metrics | `POST` | `/api/v1/metrics/events` | Public / Bearer Optional | KPI 이벤트 수집 | Y |
| Task | `GET` | `/api/v1/tasks` | Bearer | Task 목록 조회 | - |
| Task | `POST` | `/api/v1/tasks` | Bearer | Task 생성 | - |
| Task | `PATCH` | `/api/v1/tasks/:taskId` | Bearer | Task 수정 및 상태 전환(완료/복원/핵심 지정) | - |
| Task | `DELETE` | `/api/v1/tasks/:taskId` | Bearer | Task 삭제 | - |
| Focus Session | `POST` | `/api/v1/focus-sessions` | Bearer | 집중 세션 시작 | - |
| Focus Session | `PATCH` | `/api/v1/focus-sessions/:sessionId/pause` | Bearer | Pause | - |
| Focus Session | `PATCH` | `/api/v1/focus-sessions/:sessionId/resume` | Bearer | Resume | - |
| Focus Session | `POST` | `/api/v1/focus-sessions/:sessionId/give-up` | Bearer | 포기 처리 | - |
| Focus Session | `POST` | `/api/v1/focus-sessions/:sessionId/complete` | Bearer | 세션 완료 및 보상 정산 | - |
| Focus Session | `POST` | `/api/v1/focus-sessions/:sessionId/start-break` | Bearer | 휴식 시작 (COMPLETED -> BREAK_RUNNING 전이) | - |
| Focus Session | `POST` | `/api/v1/focus-sessions/:sessionId/complete-break` | Bearer | 휴식 자연 종료 처리 (BREAK_RUNNING -> BREAK_COMPLETED) | - |
| Focus Session | `POST` | `/api/v1/focus-sessions/:sessionId/skip-break` | Bearer | 휴식 Skip | - |
| Reward | `GET` | `/api/v1/rewards/stats` | Bearer | 오늘 통계/누적 SP/레벨 조회 | - |
| Reward | `GET` | `/api/v1/rewards/ledger` | Bearer | 보상 원장 조회 | - |
| Profile | `GET` | `/api/v1/profile` | Bearer | 프로필 조회 | - |
| Profile | `PATCH` | `/api/v1/profile` | Bearer | 프로필 수정 | - |
| Setting | `GET` | `/api/v1/settings` | Bearer | 사용자 설정 조회 | - |
| Setting | `PATCH` | `/api/v1/settings` | Bearer | 사용자 설정 수정 | - |
| Sync | `POST` | `/api/v1/sync/bootstrap` | Bearer | 로그인 직후 로컬-서버 병합 | Y |
| Sync | `POST` | `/api/v1/sync/push` | Bearer | outbox 변경 이벤트 업로드 | Y |
| Sync | `GET` | `/api/v1/sync/pull` | Bearer | cursor 이후 delta pull | Y |
| Health | `GET` | `/health/live` | Internal/Public 제한 | 프로세스 생존 확인 | - |
| Health | `GET` | `/health/ready` | Internal/Public 제한 | PostgreSQL/Redis readiness 확인 | - |

---

## 3. 대표 오류 코드 범주

| 코드 | 의미 |
|------|------|
| `AUTH_401_UNAUTHORIZED` | 인증 실패 |
| `AUTH_401_REFRESH_REVOKED` | refresh token 무효 또는 회전 후 폐기됨 |
| `AUTH_403_CSRF_INVALID` | CSRF 검증 실패 |
| `TASK_409_ACTIVE_LOCK` | 진행 중 세션이 연결된 Task라 수정/삭제 불가 |
| `TASK_409_COMPLETED` | 완료된 Task는 집중 시작 또는 핵심 과제 지정 불가 |
| `SESSION_409_ALREADY_RUNNING` | 동일 사용자에게 이미 진행 중인 집중/휴식 세션이 존재 |
| `SESSION_409_PAUSE_LIMIT` | Pause 최대 1회 정책 위반 |
| `SESSION_409_INVALID_STATE` | 현재 세션 상태에서 허용되지 않는 전이 요청 |
| `SESSION_409_TIMEOUT` | Pause 제한 시간 초과로 세션이 이미 포기 처리됨 |
| `SYNC_409_CONFLICT` | `version` 충돌 |
| `SYNC_400_BATCH_TOO_LARGE` | bootstrap 배치 크기 제한 초과 |
| `SYNC_429_RATE_LIMIT` | 동기화 또는 metrics 요청 rate limit 초과 |

---

## 4. Rate Limiting 정책

Rate Limiting 대상 엔드포인트는 Auth, Metrics, Sync 계열로 나뉘며, 임계값을 분리하여 운영한다.

### 4.1 Auth 엔드포인트

- 대상: `signup`, `login`, `refresh`
- 목적: brute force 방지
- 기준: 더 낮은 한도 적용 (환경변수 `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_SEC`로 제어)

### 4.2 Metrics 엔드포인트

- 대상: `metrics/events`
- 목적: 익명 포함 KPI 이벤트 남용 방지
- 기준: Auth보다 높고 Sync보다 낮은 한도 적용 (환경변수 `METRICS_RATE_LIMIT_MAX`, `METRICS_RATE_LIMIT_WINDOW_SEC`로 제어)

### 4.3 Sync 엔드포인트

- 대상: `sync/bootstrap`, `sync/push`, `sync/pull`
- 목적: 과도한 동기화 요청 억제
- 기준: 사용자 경험을 해치지 않는 범위에서 더 높은 한도 사용 (환경변수 `SYNC_RATE_LIMIT_MAX`, `SYNC_RATE_LIMIT_WINDOW_SEC`로 제어)

운영 환경에서 Rate Limiting 카운터는 Redis를 필수 사용하며, 인메모리 대체는 금지한다.

---

## 5. 엔드포인트별 계약 스키마

본 절은 FE/BE/DB가 병렬로 구현을 시작할 수 있도록, MVP 범위에 필요한 최소 계약을 고정한다. 필드명은 Swagger/OpenAPI의 DTO 명세에서도 동일하게 유지한다.

### 5.1 Auth

#### `POST /auth/signup`

| 항목 | 값 |
|------|----|
| Request Body | `email: string(email)`, `password: string(8~72)`, `displayName: string(1~24)`, `timezone?: string(IANA TZ)` |
| Success `data` | `user: { id, email, displayName, timezone, createdAt }`, `accessToken`, `accessTokenExpiresAt` |
| 비고 | Refresh Token은 HttpOnly Cookie로 설정, 응답 바디에는 포함하지 않음 |

#### `POST /auth/login`

| 항목 | 값 |
|------|----|
| Request Body | `email: string(email)`, `password: string` |
| Success `data` | `user: { id, email, displayName, timezone }`, `accessToken`, `accessTokenExpiresAt`, `bootstrapRequired: boolean` |
| 비고 | 로그인 성공 직후 FE는 로컬 데이터가 있으면 `sync/bootstrap`을 호출한다 |

#### `POST /auth/refresh`

| 항목 | 값 |
|------|----|
| Header | `X-CSRF-Token: string` |
| Cookie | `refreshToken=<httpOnly>` |
| Success `data` | `accessToken`, `accessTokenExpiresAt` |
| Error | `AUTH_401_REFRESH_REVOKED`, `AUTH_403_CSRF_INVALID` |

#### `POST /auth/logout`

| 항목 | 값 |
|------|----|
| Header | `Authorization: Bearer <token>`, `X-CSRF-Token: string` |
| Cookie | `refreshToken=<httpOnly>` |
| Success `data` | `revoked: true` |
| Error | `AUTH_403_CSRF_INVALID` |

### 5.2 Task

#### Task 공통 모델

```json
{
  "id": "tsk_123",
  "clientGeneratedId": "0195d7fe-....",
  "title": "백엔드 문서 정리",
  "description": "be_api 계약 구체화",
  "status": "PENDING",
  "isCore": true,
  "version": 3,
  "createdAt": "2026-03-10T08:30:00Z",
  "updatedAt": "2026-03-10T08:35:00Z"
}
```

- V1의 저장 enum은 `PENDING`, `COMPLETED`만 허용한다. UI의 `진행중` 필터는 활성 `FocusSession` 연결 여부로 파생한다.

#### `GET /tasks`

| 항목 | 값 |
|------|----|
| Query | `status?: PENDING|COMPLETED`, `isCore?: boolean`, `cursor?: string`, `limit?: number(<=100)` |
| Success `data` | `items: Task[]` |
| Success `meta` | `nextCursor?: string` |

#### `POST /tasks`

| 항목 | 값 |
|------|----|
| Request Body | `clientGeneratedId: uuidv7`, `title: string(1~120)`, `description?: string(0~1000)`, `isCore?: boolean` |
| Success `data` | `task: Task` |
| 비고 | 생성 직후 `version=1` |

#### `PATCH /tasks/:taskId`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `title?: string(1~120)`, `description?: string(0~1000)`, `status?: PENDING|COMPLETED`, `isCore?: boolean` |
| Success `data` | `task: Task` |
| Error | `SYNC_409_CONFLICT`, `TASK_409_ACTIVE_LOCK`, `TASK_409_COMPLETED` |
| 비고 | `isCore=true` 또는 세션 시작 대상인 Task는 `status=COMPLETED`일 수 없다 |

#### `DELETE /tasks/:taskId`

| 항목 | 값 |
|------|----|
| Query | `version: number` |
| Success `data` | `deletedTaskId`, `deletedAt` |
| Error | `TASK_409_ACTIVE_LOCK`, `SYNC_409_CONFLICT` |

### 5.3 Focus Session

#### Focus Session 공통 모델

```json
{
  "focusSessionId": "ses_123",
  "taskId": "tsk_123",
  "status": "RUNNING",
  "startedAt": "2026-03-10T09:00:00Z",
  "plannedFocusSec": 1500,
  "pauseCount": 0,
  "pauseStartedAt": null,
  "pauseDeadlineAt": null,
  "focusEndedAt": null,
  "givenUpAt": null,
  "breakStartedAt": null,
  "breakEndsAt": null,
  "breakEndedAt": null,
  "version": 1
}
```

#### `POST /focus-sessions`

| 항목 | 값 |
|------|----|
| Request Body | `taskId: string`, `taskVersion: number`, `clientGeneratedId: uuidv7`, `startedAt: datetime` |
| Success `data` | `activeSession: FocusSession`, `currentTask: { taskId, title, status, isCore, isLocked }`, `sidebarSummary: { completedFocusSessionCount }`, `nextTaskCandidates: [{ taskId, title, status }]`, `policy: { focusDurationSec: 1500, breakDurationSec: 300, pauseLimitSec: 300, maxPauseCount: 1 }` |
| Error | `TASK_409_COMPLETED`, `SESSION_409_ALREADY_RUNNING`, `SYNC_409_CONFLICT` |
| 비고 | 완료된 Task는 세션 시작 불가, 동일 사용자당 활성 세션은 1개만 허용. `nextTaskCandidates`는 최대 2건이며 reward/history/dashboard 전체 목록은 응답 범위에서 제외한다 |

#### `PATCH /focus-sessions/:sessionId/pause`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `pausedAt: datetime` |
| Success `data` | `session: FocusSession` |
| Error | `SESSION_409_PAUSE_LIMIT`, `SESSION_409_INVALID_STATE`, `SESSION_409_TIMEOUT` |

#### `PATCH /focus-sessions/:sessionId/resume`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `resumedAt: datetime` |
| Success `data` | `session: FocusSession` |
| Error | `SESSION_409_INVALID_STATE`, `SESSION_409_TIMEOUT` |

#### `POST /focus-sessions/:sessionId/give-up`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `eventId: uuidv7`, `occurredAt: datetime`, `reason?: USER_CANCEL|PAUSE_TIMEOUT` |
| Success `data` | `session: FocusSession`, `reward: { awardedSp: 0, awardedTrees: 0 }` |
| Error | `SESSION_409_INVALID_STATE`, `SESSION_409_TIMEOUT` |

#### `POST /focus-sessions/:sessionId/complete`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `eventId: uuidv7`, `occurredAt: datetime` |
| Success `data` | `session: FocusSession`, `reward: { awardedSp: 100, awardedTrees: 1, totalSp, level }`, `dailyStat`, `progressSnapshot` |
| Error | `SESSION_409_INVALID_STATE`, `SESSION_409_TIMEOUT`, `SYNC_409_CONFLICT` |
| 비고 | 표준 UX에서는 성공 응답 직후 FE가 `start-break`를 즉시 호출해 25분 집중 후 5분 휴식 흐름을 자동으로 이어간다 |

#### `POST /focus-sessions/:sessionId/start-break`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `eventId: uuidv7`, `occurredAt: datetime` |
| Success `data` | `session: { focusSessionId, status: BREAK_RUNNING, breakStartedAt, breakEndsAt, version }` |
| Error | `SESSION_409_INVALID_STATE` |
| 비고 | 허용 선행 상태는 `COMPLETED`만이다 |

#### `POST /focus-sessions/:sessionId/complete-break`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `eventId: uuidv7`, `occurredAt: datetime` |
| Success `data` | `session: { focusSessionId, status: BREAK_COMPLETED, breakEndedAt, version }` |
| Error | `SESSION_409_INVALID_STATE` |
| 비고 | 휴식 타이머가 `00:00`에 도달하면 FE가 호출한다 |

#### `POST /focus-sessions/:sessionId/skip-break`

| 항목 | 값 |
|------|----|
| Request Body | `version: number`, `eventId: uuidv7`, `occurredAt: datetime` |
| Success `data` | `session: { focusSessionId, status: BREAK_SKIPPED, breakEndedAt, version }` |
| Error | `SESSION_409_INVALID_STATE` |
| 비고 | 허용 선행 상태는 `BREAK_RUNNING`만이다 |

### 5.4 Reward / Profile / Setting

#### `GET /rewards/stats`

| 항목 | 값 |
|------|----|
| Success `data` | `today: { statDate, completedSessions, plantedTrees, focusedSeconds }`, `progress: { totalSp, level, totalCompletedSessions }` |
| 비고 | `progress`에 streak 계열 필드는 V1에서 포함하지 않는다 |

#### `GET /rewards/ledger`

| 항목 | 값 |
|------|----|
| Query | `cursor?: string`, `limit?: number(<=100)` |
| Success `data` | `items: [{ id, sourceSessionId, spAmount, treeCount, createdAt }]` |
| Success `meta` | `nextCursor?: string` |

#### `GET /profile`, `PATCH /profile`

| 항목 | 값 |
|------|----|
| PATCH Request Body | `version: number`, `displayName?: string(1~24)`, `avatarUrl?: string` |
| Success `data` | `profile: { userId, displayName, avatarUrl, version, updatedAt }` |

#### `GET /settings`, `PATCH /settings`

| 항목 | 값 |
|------|----|
| PATCH Request Body | `version: number`, `theme?: LIGHT|DARK|SYSTEM`, `timezone?: string(IANA TZ)`, `syncEnabled?: boolean` |
| Success `data` | `setting: { userId, theme, timezone, syncEnabled, version, updatedAt }` |
| 비고 | timezone 변경은 과거 `DailySummary`/`DailyFocusStat` backfill 없이 이후 완료 세션부터 적용한다 |

### 5.5 Metrics

#### `POST /metrics/events`

| 항목 | 값 |
|------|----|
| 인증 | 비로그인 수집 허용. 로그인 상태에서는 Bearer Access Token 포함 가능 |
| Request Body | `deviceId: string`, `events: [{ eventId: uuidv7, eventName: APP_FIRST_OPEN|AUTH_SIGNUP_SUCCESS|AUTH_LOGIN_SUCCESS|DASHBOARD_TASK_SET|FOCUS_SESSION_COMPLETED|REWARD_GRANTED_FIRST_TIME, occurredAt: datetime, dedupeKey?: string, focusSessionId?: string, rewardGrantId?: string, payload?: object }]` |
| Success `data` | `acceptedEventIds: string[]`, `deduplicatedEventIds?: string[]` |
| Error | `SYNC_429_RATE_LIMIT` |
| 비고 | 서버는 `eventId` unique와 `eventName + dedupeKey`를 함께 사용해 중복 적재를 방지한다. `APP_FIRST_OPEN`, `AUTH_SIGNUP_SUCCESS`, `FOCUS_SESSION_COMPLETED`, `REWARD_GRANTED_FIRST_TIME`는 고정 dedupeKey 사용이 필수다 |

### 5.6 Sync

#### `POST /sync/bootstrap`

| 항목 | 값 |
|------|----|
| Request Body | `deviceId: string`, `batches: [{ batchId, tasks: TaskUpsertInput[], sessions: SessionFactInput[], profile?: ProfileInput, setting?: SettingInput }]` |
| Success `data` | `accepted: { tasks, sessions }`, `serverSnapshot: { tasks, activeSession?, dashboardSummary, rewardSnapshot, profile, setting, syncState }`, `cursor` |
| Error | `SYNC_400_BATCH_TOO_LARGE`, `SYNC_409_CONFLICT` |
| 비고 | 배치당 권고치 `Task <= 100`, `FocusSession <= 100`, 요청 본문 `<= 1MB`. reward ledger/history 전체와 metrics 원장 전체는 응답 범위에서 제외한다 |

#### `POST /sync/push`

| 항목 | 값 |
|------|----|
| Request Body | `deviceId: string`, `events: [{ eventId, deviceSequence, entityType, entityId, operation, version?, payload, occurredAt }]` |
| Success `data` | `acceptedEventIds: string[]`, `rejected?: [{ eventId, code, entityType, entityId, clientVersion?, serverVersion, serverSnapshot, conflictFields?, resolutionStrategy, retryable }]`, `cursor` |
| Error | `SYNC_409_CONFLICT`, `SYNC_429_RATE_LIMIT` |

#### `GET /sync/pull`

| 항목 | 값 |
|------|----|
| Query | `cursor: string`, `limit?: number(<=200)` |
| Success `data` | `changes: { tasks, sessions, activeSession?, rewardSnapshot, profile, setting, syncState }` |
| Success `meta` | `cursor`, `hasMore` |

### 5.7 구현 메모

- `TASK_409_COMPLETED`와 `SESSION_409_ALREADY_RUNNING`은 FE 비활성화만으로는 막을 수 없는 우회 호출을 서버에서 차단하기 위한 필수 계약이다.
- `complete -> start-break -> complete-break/skip-break` 흐름은 PRD의 25분 집중 + 5분 휴식 세트를 API 수준에서 분해한 것이다. 표준 UX는 이 전이를 자동 호출로 묶어서 사용자에게는 끊김 없이 보이도록 한다.
- `metrics/events`는 인증 동기화 outbox와 별도의 로컬 metrics queue와 연결되며, 비로그인 상태에서도 호출 가능해야 한다.
- V1 범위 밖인 항목은 `Task.status` 추가 저장 enum, bootstrap history 전체 반환, conflict manual merge, streak 필드, timezone historical backfill이다.
- DTO 세부 enum 값, validation decorator, Swagger example payload는 본 절의 필드명을 기준으로 BE-Act 단계에서 코드에 반영한다.