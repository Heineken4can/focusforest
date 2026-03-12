# Focus Forest V1 — 백엔드 개발 계획 (be_plan)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-10 | BE-Plan | architecture.md v1.3에서 분리 + 태스크 분해 신규 작성 |
| v1.1 | 2026-03-10 | BE-Plan | API 계약 상세화, 세션 시작/휴식 종료 흐름, 문서 참조 정합성 보강 |
| v1.2 | 2026-03-12 | BE-Plan | 상위 architecture 재편 반영, metrics 수집과 V1 범위 정합성 보강 |
| v1.3 | 2026-03-12 | BE-Plan | Auth 429/CSRF 전달 경로 및 Pause timeout sweeper 정합화 반영 |

## 참조 문서

- 백엔드 설계: [docs/04. be/be_design.md](./be_design.md)
- API 명세: [docs/04. be/be_api.md](./be_api.md)
- DB 설계: [docs/05. db/db_design.md](../05. db/db_design.md)
- PRD: [docs/01. po/PRD_FocusForest.md](../01. po/PRD_FocusForest.md)
- BE 가이드: [.agents/standards/BE_GUIDE.md](../../.agents/standards/BE_GUIDE.md)

---

## 1. 구현 태스크 분해

### Phase 1: 기반 인프라

| # | 태스크 | 설명 |
|---|--------|------|
| 1-1 | NestJS 프로젝트 초기화 | 모듈형 모놀리스 구조, TypeScript strict 모드 |
| 1-2 | Prisma 설정 | PostgreSQL 연결, 스키마 파일 생성, 마이그레이션 파이프라인 |
| 1-3 | Redis 연결 | Redis 클라이언트 모듈, 연결 상태 확인 |
| 1-4 | 환경변수 설정 | ConfigModule 기반 환경변수 로드, 타입 검증, fail-fast (2절 참조) |
| 1-5 | Health Module | `/health/live`, `/health/ready` (PostgreSQL + Redis readiness) |
| 1-6 | Pino 로깅 | JSON 구조화 로그, requestId 자동 주입 |
| 1-7 | Sentry 연동 | 런타임 예외 추적, 배포 식별자 태깅 |
| 1-8 | `.env.example` 작성 | 2절 환경변수 테이블 기반 템플릿 |

### Phase 2: 인증 모듈

| # | 태스크 | 설명 |
|---|--------|------|
| 2-1 | Auth Module 스캐폴딩 | Controller -> Service -> Repository 계층 |
| 2-2 | 회원가입 | Argon2id 비밀번호 해시, DTO 검증 |
| 2-3 | 로그인 | JWT Access Token 발급 + Refresh Token (HttpOnly Secure SameSite=Strict Cookie) + `csrfToken` Cookie 발급 |
| 2-4 | 토큰 Rotation | `POST /auth/refresh` — `refreshToken`/`csrfToken` 동시 rotation + 이전 token revoke |
| 2-5 | 로그아웃 | Refresh token 폐기, `refreshToken`/`csrfToken` Cookie 만료, CSRF 검증 |
| 2-6 | JWT Guard | 전역 인증 Guard, Public 데코레이터 |
| 2-7 | Rate Limiting | Auth 엔드포인트 rate limit (Redis 기반), 환경변수 임계값 |

### Phase 3: 핵심 도메인

| # | 태스크 | 설명 |
|---|--------|------|
| 3-1 | Task Module CRUD | 생성, 조회, 수정, 삭제 + version 기반 낙관적 잠금 |
| 3-2 | 핵심 과제 지정 | Task 핵심 과제 플래그 전환 |
| 3-3 | Task 상태 가드 | 진행 중 수정/삭제 차단 + 완료 과제 집중 시작 방지 (`TASK_409_ACTIVE_LOCK`, `TASK_409_COMPLETED`) |
| 3-4 | Focus Session Module | 세션 시작, Pause, Resume, Give Up, Complete, Start Break, Complete Break, Skip Break |
| 3-5 | 세션 상태 전이 검증 | 상태 머신 기반 전이 규칙 적용, Pause 1회 제한, 사용자당 활성 세션 1개 제한 |
| 3-6 | 세션 idempotency | complete, give-up, start-break, complete-break, skip-break에 Redis idempotency key 적용 |
| 3-7 | Reward Module | SP 적립, RewardLedger append, DailyFocusStat/UserProgressSnapshot 갱신 |
| 3-8 | 세션 완료 트랜잭션 | Session + RewardLedger + DailyFocusStat + UserProgressSnapshot 원자적 갱신 |

### Phase 4: 동기화

| # | 태스크 | 설명 |
|---|--------|------|
| 4-1 | Sync Module 스캐폴딩 | Controller -> Service -> Repository |
| 4-2 | Bootstrap | 로그인 직후 로컬-서버 병합, 배치 분할 수신, clientGeneratedId 기반 중복 처리 |
| 4-3 | Push | outbox 이벤트 수신, deviceSequence 순서 적용, version 충돌 감지 |
| 4-4 | Pull | cursor 기반 delta 응답, 최신 cursor 반환 |
| 4-5 | Sync Rate Limiting | Sync 엔드포인트 rate limit (Redis 기반) |
| 4-6 | Sync idempotency | push 요청 중복 처리 방지 |

### Phase 5: 운영 기반

| # | 태스크 | 설명 |
|---|--------|------|
| 5-1 | Metrics Module | `POST /metrics/events`, 익명/로그인 KPI 수집, 중복 적재 방지 |
| 5-2 | Metrics Rate Limiting | Metrics 엔드포인트 rate limit (Redis 기반), 익명 수집 임계값 분리 |
| 5-3 | Pause timeout sweeper | 1분 주기 스케줄러, Redis 분산 락 기반 (3.3절 참조) |
| 5-4 | 모니터링/알림 기준 검증 | p95 응답 시간, 5xx 에러율, health check 실패 알림 기준 확인 |
| 5-5 | Swagger `/api-docs` 최종 검증 | 전체 엔드포인트 스키마 노출 확인 |

---

## 2. 환경변수 기준

### 2.1 환경변수 테이블

| 키 | 설명 |
|----|------|
| `NODE_ENV` | 실행 환경 |
| `APP_VERSION` | 빌드/배포 식별자 |
| `PORT` | HTTP 포트 |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `REDIS_URL` | Redis 연결 문자열 |
| `JWT_ACCESS_SECRET` | 액세스 토큰 서명 키 |
| `JWT_REFRESH_SECRET` | 리프레시 토큰 서명 키 |
| `ACCESS_TOKEN_TTL` | 액세스 토큰 만료 시간 |
| `REFRESH_TOKEN_TTL` | 리프레시 토큰 만료 시간 |
| `AUTH_RATE_LIMIT_MAX` | 인증 엔드포인트 최대 요청 횟수 |
| `AUTH_RATE_LIMIT_WINDOW_SEC` | 인증 엔드포인트 rate limit 윈도우 |
| `METRICS_RATE_LIMIT_MAX` | KPI 이벤트 수집 엔드포인트 최대 요청 횟수 |
| `METRICS_RATE_LIMIT_WINDOW_SEC` | KPI 이벤트 수집 rate limit 윈도우 |
| `ARGON2_MEMORY_COST` | Argon2id 메모리 비용 |
| `ARGON2_TIME_COST` | Argon2id 반복 비용 |
| `ARGON2_PARALLELISM` | Argon2id 병렬성 |
| `CORS_ORIGINS` | 허용 Origin 목록 |
| `SYNC_RATE_LIMIT_MAX` | 동기화 요청 최대 횟수 |
| `SYNC_RATE_LIMIT_WINDOW_SEC` | 동기화 rate limit 윈도우 |
| `LOG_LEVEL` | 로그 레벨 |
| `IDEMPOTENCY_TTL_SEC` | idempotency key TTL |
| `SENTRY_DSN` | 에러 모니터링 DSN |

### 2.2 .env.example 작성 가이드

- BE-Act 단계에서 위 환경변수 목록을 반영한 `.env.example` 파일을 반드시 생성한다.
- 각 키에 대해 설명 주석과 예시 값을 포함한다.
- 민감 정보(Secret, DSN 등)는 placeholder(`changeme`, `your-secret-here`)로 표기한다.
- `.env` 파일 자체는 `.gitignore`에 등록하고, `.env.example`만 레포지토리에 커밋한다.

---

## 3. 구현 시 주의사항

### 3.1 모듈 의존 방향 위반 금지

모듈 간 의존 방향은 아래 규칙을 엄격히 준수한다. 상세 의존 방향 다이어그램은 `be_design.md` 5.3절을 참조한다.

- `SessionModule -> RewardModule` 단방향 의존만 허용한다. RewardModule의 역방향 의존은 금지한다.
- `SyncModule`은 bootstrap/push/pull 조합을 위해 `TaskService`, `SessionService`, `Profile/SettingService`를 호출할 수 있으나, 각 도메인 모듈이 `SyncModule`에 역의존하는 것은 금지한다.
- 모듈 간 데이터 접근은 다른 모듈의 `Repository` 직접 호출보다 `Service` 또는 명시적 Query Port를 우선한다.

### 3.2 forwardRef 사용 제한

NestJS `forwardRef`는 예외적 상황에서만 허용하며, 기본 원칙은 순환 의존이 없는 단방향 모듈 그래프다. `forwardRef` 사용이 필요한 경우 코드 리뷰에서 반드시 사유를 명시한다.

### 3.3 Pause timeout sweeper 구현 가이드

be_design.md 8.2절 기준으로, 구현 단계에서는 아래 운영 규칙을 추가로 준수한다.

1. **1분 주기 필수 운영**: `NestJS ScheduleModule` 기반 인프로세스 스케줄러를 기본 권고안으로 한다.
2. **Redis 분산 락**: 2 인스턴스 환경에서는 sweeper 시작 전에 Redis 분산 락(`lock:focus-session-timeout-sweeper`)을 획득한 인스턴스만 작업을 수행한다.
3. **순수 상태 마킹만 수행**: sweeper는 보상 지급이나 알림 발송을 하지 않고, `WHERE status = 'PAUSED' AND pauseDeadlineAt < now()` 조건의 상태 마킹(`GIVEN_UP_TIMEOUT`)만 수행한다.

### 3.4 idempotency Redis 실패 시 복구 절차

idempotency key는 be_design.md 10.1절 전략을 따르며, Redis 기록 실패 시에는 아래 복구 절차를 구현한다.

- PostgreSQL 트랜잭션 커밋 후 Redis idempotency 기록이 실패하면, 서버는 DB의 최종 상태를 다시 조회하여 성공 응답을 반환한다.
- 이후 동일 요청 재시도 시 세션 terminal state 및 `sourceSessionId` unique 제약으로 중복 정산을 막는다.
- 백그라운드 재시도 또는 다음 동일 요청 시 idempotency entry를 재구성한다.

---

## 4. 핸드오프 체크리스트

### 4.1 to DB-Plan

- 핵심 엔터티 초안:
  - `User`
  - `Task`
  - `FocusSession`
  - `RewardLedger`
  - `UserProgressSnapshot`
  - `DailyFocusStat`
  - `ProductMetricEvent`
  - `SyncCursor`
  - `UserSetting`
  - `RefreshToken`
- 수정 가능 엔터티에는 `version` 필드 포함
- 로컬 병합 추적을 위해 `clientGeneratedId` 포함
- Pause 정책 구현을 위해 `pauseStartedAt`, `pauseDeadlineAt`, `pauseCount` 포함
- `FocusSession.status` 허용값에는 최소 `RUNNING`, `PAUSED`, `COMPLETED`, `BREAK_RUNNING`, `BREAK_COMPLETED`, `BREAK_SKIPPED`, `GIVEN_UP`, `GIVEN_UP_TIMEOUT`를 포함
- `DailyFocusStat.statDate`는 세션 완료 시점의 사용자 타임존 기준 local date로 저장
- `DailyFocusStat`는 `userId + statDate` 기준 unique 설계
- 관계 힌트:
  - `User 1:N Task`
  - `User 1:N FocusSession`
  - `Task 1:N FocusSession`
  - `FocusSession 1:0..1 RewardLedger(sourceSessionId unique)`
  - `User 1:N DailyFocusStat`
  - `User 1:1 UserProgressSnapshot`
  - `User 1:N ProductMetricEvent`
- 인덱스 후보:
  - `Task(userId, status, updatedAt)`
  - `FocusSession(userId, status, pauseDeadlineAt)`
  - `DailyFocusStat(userId, statDate)`
  - `RewardLedger(userId, createdAt)`
  - `ProductMetricEvent(eventName, occurredAt)`
- `RewardLedger`는 MVP에서는 일반 테이블로 시작하되, 장기 운영 시 월 단위 파티셔닝 검토 대상임을 명시
- 세션 완료 트랜잭션은 `FocusSession`, `RewardLedger`, `DailyFocusStat`, `UserProgressSnapshot`을 원자적으로 갱신해야 함

### 4.2 to FE-Plan

- 로그인 상태의 "실시간 동기화"는 즉시 API 호출 + 실패 시 outbox 재시도 의미
- 충돌(`409`) 시 서버 snapshot으로 로컬을 교체하는 정책 채택
- 타이머 초 단위 카운트다운은 서버 스트리밍 없이 로컬 계산
- theme/timezone/동기화 상태는 설정 화면과 연결
- Access Token은 메모리 보관, Refresh Token은 HttpOnly Secure SameSite=Strict Cookie 사용
- `signup`, `login`, `refresh` 성공 시 서버는 non-HttpOnly `csrfToken` Cookie를 함께 설정/회전하며, FE는 이 값을 읽어 `X-CSRF-Token` 헤더로 `auth/refresh`, `auth/logout` 요청에 전달한다.
- silent refresh는 Access Token 만료로 인한 첫 `401` 수신 시 1회 시도하고, 실패 시 로그인 화면으로 이동
- 익명 KPI 이벤트는 인증 동기화 outbox와 별도 metrics queue로 관리하고, 온라인 복귀 시 `POST /api/v1/metrics/events`로 재전송한다.
- 세션 상태 매핑:
  - `RUNNING`: 집중 진행 중
  - `PAUSED`: 일시정지 오버레이 + resume/give-up만 허용
  - `COMPLETED`: 집중 완료 및 보상 지급 직후 상태. 표준 UX에서는 응답 직후 `start-break`를 자동 호출
  - `BREAK_RUNNING`: 휴식 타이머 진행 중, `skip-break` 허용
  - `BREAK_COMPLETED`: 휴식 자연 종료 후 `complete-break` 반영 상태
  - `BREAK_SKIPPED`: 휴식 건너뛰기 종료
  - `GIVEN_UP`: 포기 안내 후 대시보드 복귀
  - `GIVEN_UP_TIMEOUT`: Pause 시간 초과 포기 처리
- 표준 뽀모도로 UX에서는 `complete -> start-break -> complete-break/skip-break` 호출을 사용자에게 보이지 않게 연쇄 실행한다.
- 주요 에러 대응:
  - `AUTH_429_RATE_LIMIT`: 회원가입/로그인/토큰 재발급 요청 제한 초과 시 재시도 대기 UX와 안내 문구 표시
  - `AUTH_401_REFRESH_REVOKED`: 세션 종료 후 로그인 화면 이동
  - `SYNC_409_CONFLICT`: `serverSnapshot`으로 교체 후 최신 상태 표시
  - `TASK_409_COMPLETED`: 완료 과제의 집중 시작 버튼 비활성화 유지 + 서버 메시지 노출
  - `SESSION_409_ALREADY_RUNNING`: 새 세션 시작 대신 현재 진행 중 세션 화면으로 복귀
  - `SESSION_409_PAUSE_LIMIT`: 두 번째 Pause 버튼 비활성화 및 안내 문구 표시
  - `SESSION_409_INVALID_STATE`: 중복/지연 클릭으로 발생한 잘못된 전이는 현재 세션 스냅샷으로 복구
  - `SESSION_409_TIMEOUT`: 세션 포기 처리 UI로 강제 전환
- bootstrap은 대량 로컬 데이터를 여러 배치로 나눠 전송할 수 있어야 하며, FE는 배치 재시도 시 `clientGeneratedId` 기준 중복 허용 정책을 전제로 구현
- FE/BE는 상세 필드 계약을 `be_api.md` 5절 기준으로 구현한다

### 4.3 to BE-Act

- NestJS 모듈형 모놀리스 + `Controller -> Service -> Repository`
- Swagger `/api-docs` 노출
- JWT Guard + Refresh Token Rotation + Argon2id 적용
- Prisma + PostgreSQL + Redis 사용
- Pino request-id 로그 + Sentry 연동
- `.env.example` 필수
- 운영 환경에서 Redis 의존 기능의 인메모리 대체 금지
- 모듈 의존 방향은 `Session -> Reward`, `Sync -> Task/Session/Profile`만 허용하고 역방향 의존은 금지
- Pause timeout sweeper는 `NestJS ScheduleModule` + Redis 분산 락 기반으로 구현하고, 부수 효과 없이 상태 마킹만 수행
- `be_api.md` 5절 DTO/응답 계약과 오류 코드를 Swagger 및 실제 구현에 동일하게 반영한다

---

## 5. Done Criteria

BE_GUIDE.md 3절(TDD) 및 8절(역할별 특별 지침) 기반으로, BE-Act 완료 시 아래 항목을 모두 충족해야 한다.

### 5.1 빌드/린터 통과

빌드 에러/경고가 없으며, 정적 타입 검증 및 린터(Linter) 규칙을 통과해야 한다.

### 5.2 Service Layer 의존성 주입 확인

Service Layer는 타 계층(Controller 유입물 등)에 강결합되지 않고, 인터페이스를 활용한 의존성 주입이 되어 있어 단위 테스트가 가능해야 한다.

### 5.3 환경변수 하드코딩 없음

데이터베이스 비밀번호, API Key, JWT Secret 등 민감한 환경변수가 코드에 하드코딩되지 않아야 한다. 모든 환경 의존 값은 ConfigModule을 통해 주입한다.

### 5.4 Service Layer 테스트 커버리지 80% 이상

핵심 비즈니스 로직이 위치하는 Service Layer의 테스트 커버리지가 80% 이상 달성되어야 한다.

### 5.5 전체 프로젝트 테스트 커버리지 60% 이상

Service Layer를 포함한 전체 프로젝트의 테스트 커버리지가 60% 이상 달성되어야 한다.

### 5.6 p95 성능 목표 달성 확인

be_design.md에 정의된 비기능 요구사항 성능 목표를 기준으로 주요 엔드포인트의 p95 응답 시간을 검증한다.

- 대시보드 초기 조회: p95 300ms 이하
- Task CRUD: p95 400ms 이하
- 세션 완료/포기/Skip: p95 500ms 이하
- sync push/pull: p95 800ms 이하

### 5.7 Swagger /api-docs 정상 노출

개발 서버에서 `/api-docs` 경로로 Swagger UI가 정상 접근 가능하고, 전체 엔드포인트의 요청/응답 스키마가 표시되어야 한다.

---

## 6. 테스트 전략

BE_GUIDE.md 3절 TDD 원칙에 따라 아래 전략을 적용한다.

### 6.1 TDD 적용 범위

**필수 대상** (Red-Green-Refactor 사이클 준수):

- Service Layer의 비즈니스 로직 (세션 상태 전이, 보상 정산, 동기화 병합 등)
- 유틸리티/헬퍼 함수
- Custom Validator

**권장 대상**:

- Repository Layer의 복잡한 쿼리 (충돌 감지, 통계 집계 등)
- 미들웨어/인터셉터의 핵심 분기 (JWT Guard, Rate Limiting 등)

### 6.2 통합 테스트 (Supertest)

- Jest + Supertest를 사용하여 API 엔드포인트의 통합 테스트를 작성한다.
- 인증 흐름(회원가입 -> 로그인 -> 토큰 갱신 -> 로그아웃) 전체 경로를 통합 테스트로 검증한다.
- 세션 상태 전이 시나리오(시작 -> Pause -> Resume -> Complete -> Start Break -> Complete Break, 그리고 Start Break -> Skip Break)를 엔드투엔드로 검증한다.
- 충돌 시나리오(version mismatch -> 409 응답 -> serverSnapshot 반환)를 검증한다.
- 완료 Task로 세션 시작 시 `TASK_409_COMPLETED`, 활성 세션 중복 시작 시 `SESSION_409_ALREADY_RUNNING`을 검증한다.
- `POST /api/v1/metrics/events`의 익명 수집, 중복 적재 방지, rate limit 동작을 검증한다.

### 6.3 커버리지 목표

| 범위 | 목표 |
|------|------|
| Service Layer | 80% 이상 |
| 전체 프로젝트 | 60% 이상 |

커버리지 리포트는 CI 파이프라인에서 자동 생성하며, 목표 미달 시 빌드를 실패 처리한다.

---

## 7. 결론 및 다음 단계

Focus Forest V1 백엔드는 **NestJS 모듈형 모놀리스 + Prisma + PostgreSQL + Redis** 조합으로, Phase 1(기반 인프라)부터 Phase 5(운영 기반)까지 단계적으로 구현한다. 각 Phase는 이전 Phase의 산출물에 의존하므로 순서를 준수한다.

**다음 단계**:

1. **DB-Plan 착수**: 4.1절 핸드오프 기반으로 엔터티/ERD 구체화 및 Prisma 스키마 설계
2. **FE-Plan 연동 준비**: 4.2절 핸드오프 기반으로 프론트엔드 동기화/인증 흐름 설계
3. **BE-Act 착수**: 4.3절 핸드오프 및 본 문서의 Phase 1부터 순차 구현 시작