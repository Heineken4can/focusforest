## Code Review Report: Backend

리뷰 시각: 2026-03-14 (2차 전체 리뷰)
리뷰 타겟: BE
리뷰 범위:
- `backend/src/modules/tasks/*`
- `backend/src/modules/focus-sessions/*` (Sweeper 포함)
- `backend/src/modules/rewards/*`
- `backend/src/modules/profile/*`
- `backend/src/modules/metrics/*`
- `backend/src/modules/sync/*`
- `backend/src/common/auth/current-user.decorator.ts`

---

### 공통 체크포인트 결과

| 항목 | 결과 |
|------|------|
| 죽은 코드 (미사용 변수/import/함수) | PASS |
| 마법 숫자/문자열 | WARN — `reward.service.ts` DEFAULT_TIMEZONE, `focus-session.sweeper.ts` LOCK_TTL 50 |
| TODO/FIXME/HACK 잔존 | PASS |
| console.log 잔존 | PASS |
| 하드코딩 설정값 | WARN — `reward.service.ts` 타임존 |
| 함수 길이 50줄 초과 | WARN — `sync.service.ts`의 `bootstrap()` (~135줄), `processEvent()` (~70줄) |

---

### 1차 이슈 변경 이력 (Δ)

| 코드 | 판정 | 1차 | 현재 | 비고 |
|------|------|-----|------|------|
| CR-BE-01-1 | CRITICAL | OPEN | **OPEN** | 미수정 |
| CR-BE-01-2 | CRITICAL | OPEN | **FALSE POSITIVE** | 아래 재분석 참조 |
| CR-BE-02-1 | WARN | OPEN | **RESOLVED** | SyncController JwtAuthGuard 제거 완료 |
| CR-BE-04-1 | WARN | OPEN | **RESOLVED** | @Controller('sync') 변경 완료 |
| CR-BE-05-2 | WARN | OPEN | **PARTIAL** | 클래스 레벨 Swagger 추가, 메서드 레벨 미완 |
| CR-BE-06-1 | WARN | OPEN | **RESOLVED** | FocusSessionRepository, RewardRepository에 `prisma` getter 추가 |

> **CR-BE-01-2 재분석**: `completeSession`의 PAUSED 분기에서 `handlePauseTimeout`이 성공(timeout 처리 완료)하면 내부에서 `timeoutExceeded()` (SESSION_409_TIMEOUT)를 throw한다. `throw this.invalidState`는 `handlePauseTimeout`이 반환(deadline 미경과)했을 때만 실행되며, 이 경우 PAUSED 세션을 완료할 수 없다는 INVALID_STATE 응답은 정확하다. **오탐으로 판정, 해당 코드는 정상이다.**

---

### 상세 이슈

---

#### [CR-BE-01-1] [CRITICAL] resumeSession — handlePauseTimeout과 updateWithVersion 사이 트랜잭션 미묶음

- **파일**: `backend/src/modules/focus-sessions/focus-session.service.ts:241-261`
- **상태**: OPEN
- **내용**: `resumeSession`에서 `handlePauseTimeout`(잠재적 write)과 `updateWithVersion`(write)이 별도 DB 라운드트립으로 분리되어 있다. 동일 패턴이 `giveUpSession` PAUSED 분기에도 반복된다.
- **근거**: 두 write 사이에 다른 요청이 버전을 변경하면, `handlePauseTimeout`이 GIVEN_UP_TIMEOUT 처리에 성공한 뒤 `updateWithVersion`이 version mismatch로 null을 반환하고, 클라이언트가 SESSION_409_TIMEOUT 대신 SESSION_409_CONFLICT를 받는다. OCC가 최종 데이터 정합성은 보호하지만 에러 코드가 올바르지 않다.
- **수정 방향**: `handlePauseTimeout`이 이미 `client: DbClient` 파라미터를 가지므로, `resumeSession`과 `giveUpSession` PAUSED 분기를 단일 `$transaction(Serializable)` 블록으로 묶고 그 클라이언트를 두 함수에 전달한다.

---

#### [CR-BE-01-2] [WARN] push — deviceSequence 기준 정렬 미적용

- **파일**: `backend/src/modules/sync/sync.service.ts:203`
- **상태**: OPEN
- **내용**: `dto.events`를 수신 순서대로 처리한다. `push.dto.ts`에 `deviceSequence: number` 필드가 있으나 서비스에서 사용되지 않는다.
- **근거**: 오프라인 이벤트가 네트워크 지연으로 순서가 바뀌어 도착하면 version conflict 또는 잘못된 상태 전이를 유발한다.
- **수정 방향**: `dto.events`를 처리 전 `deviceSequence` 오름차순으로 정렬.

---

#### [CR-BE-01-3] [WARN] push — eventId 기반 idempotency 없음

- **파일**: `backend/src/modules/sync/sync.service.ts:200-232`
- **상태**: OPEN
- **내용**: 동일 `eventId`의 push 이벤트가 중복 전송되어도 감지하지 않는다. 동일 이벤트 재처리 시 version increment가 두 번 발생한다.
- **근거**: `FocusSessionService`의 complete/give-up 등은 `SessionIdempotencyService`로 멱등성을 보장하나, push 이벤트 처리는 일관성 없이 멱등성이 없다.
- **수정 방향**: 처리된 `eventId`를 Redis 또는 DB에 저장하고, 중복 eventId는 accepted 응답만 반환하고 실제 처리를 생략.

---

#### [CR-BE-01-4] [WARN] bootstrap — Serializable 재시도 시 acceptedTasks 중복 누적

- **파일**: `backend/src/modules/sync/sync.service.ts:48-83`
- **상태**: OPEN
- **내용**: `acceptedTasks`, `acceptedSessions` 배열이 `$transaction` 콜백 외부에 선언되어 있다. Serializable 격리에서 직렬화 충돌로 콜백이 재시도되면 중복 push가 발생한다.
- **수정 방향**: 배열을 콜백 반환값으로 받는다.

---

#### [CR-BE-01-5] [WARN] pull — hasMore 판정 오류

- **파일**: `backend/src/modules/sync/sync.service.ts:281`
- **상태**: OPEN
- **내용**: `hasMore = tasks.length === limit || sessions.length === limit` — `take: limit`으로 조회 후 결과 수 동일 여부로만 판정. tasks/sessions 비대칭 시 오판 가능.
- **수정 방향**: 각 쿼리를 `take: limit + 1`로 변경, `result.length > limit`으로 판정 후 `slice(0, limit)`.

---

#### [CR-BE-01-6] [WARN] pull — 이종 엔티티 병합 커서 모호성

- **파일**: `backend/src/modules/sync/sync.service.ts:283-295`
- **상태**: OPEN
- **내용**: tasks + sessions를 각각 `limit`개 조회 후 병합·정렬해 단일 커서 생성. 커서가 두 엔티티에 동시 적용되므로 pagination 경계가 엔티티마다 달라져 데이터 누락 가능.
- **수정 방향**: 커서 = `max(maxtask.updatedAt, max session.updatedAt)`, 또는 pull API를 엔티티별로 분리.

---

#### [CR-BE-02-2] [WARN] ProfileController, RewardController — JwtAuthGuard 중복 등록

- **파일**: `backend/src/modules/profile/profile.controller.ts:15`, `backend/src/modules/rewards/reward.controller.ts:16`
- **상태**: OPEN (신규)
- **내용**: `AuthModule`이 `APP_GUARD`로 `JwtAuthGuard`를 전역 등록했음에도, 두 컨트롤러 모두 `@UseGuards(JwtAuthGuard)`를 추가 등록. SyncController에서 같은 패턴이 수정됐으나 여기는 아직 남아 있다.
- **수정 방향**: `@UseGuards(JwtAuthGuard)` 제거. SyncController와 동일하게 전역 가드에 위임.

---

#### [CR-BE-06-2] [WARN] SyncService — payload: any DB 직접 spread (mass assignment)

- **파일**: `backend/src/modules/sync/sync.service.ts:408-414`, `sync.service.ts:439-445`
- **상태**: OPEN
- **내용**: `updateTask` / `updateSession`에서 `payload: any`를 `data: { ...payload }` 형태로 Prisma update에 직접 spread. 클라이언트가 `userId`, `createdAt`, `deletedAt`, `version` 등 서버 소유 필드를 임의로 덮어쓸 수 있다.
- **수정 방향**: payload 타입을 허용 필드 명시 타입으로 교체, Prisma data에 필드를 명시적으로 매핑.

---

#### [CR-BE-06-3] [WARN] ProfileService — error: any 사용

- **파일**: `backend/src/modules/profile/profile.service.ts:17`, `profile.service.ts:46`
- **상태**: OPEN (신규)
- **내용**: `catch (error: any)` — TypeScript `unknown`이 아닌 `any`로 캐치. 이후 `error.code === 'P2025'` 접근이 타입 가드 없이 이루어진다.
- **근거**: `any`로 캐치하면 컴파일러가 `.code` 접근을 검증하지 않는다. 비 Prisma 에러에 `.code`가 없으면 `undefined`와 비교하므로 기능상 문제는 없으나, 의도하지 않은 에러를 조용히 삼킬 위험이 있다.
- **수정 방향**: `catch (error: unknown)` + `isPrismaError(error, 'P2025')` 형태의 타입 가드 함수로 교체.

---

#### [CR-BE-06-4] [WARN] ProfileRepository.updateSettings — theme: any 타입

- **파일**: `backend/src/modules/profile/profile.repository.ts:38`, `backend/src/modules/profile/profile.service.ts:43`
- **상태**: OPEN (신규)
- **내용**: `data: { theme?: any, ... }`로 `theme` 필드가 `any` 타입. `ThemeMode` enum(`'LIGHT' | 'DARK' | 'SYSTEM'`)이 Prisma에 정의되어 있으나 사용하지 않는다. 잘못된 값이 DB 제약 없이 전달될 수 있다.
- **수정 방향**: `import { ThemeMode } from '@prisma/client'` 후 `theme?: ThemeMode`로 교체.

---

#### [CR-BE-06-5] [WARN] MetricsService — eventsToSave: any[], MetricEventInput.payload: any

- **파일**: `backend/src/modules/metrics/metrics.service.ts:31`, `metrics.service.ts:15`
- **상태**: OPEN (신규)
- **내용**: `eventsToSave: any[]`로 누적 후 `metricsRepository.createMany` 호출. `MetricEventInput.payload?: any`로 스키마 없이 JSONB에 저장.
- **수정 방향**: `eventsToSave`를 `Prisma.ProductMetricEventCreateManyInput[]`으로 타입 지정. payload는 `Record<string, unknown>` 또는 이벤트별 유니온으로 정의.

---

#### [CR-BE-08-3] [WARN] ProfileController, MetricsController — 인라인 Body DTO (class-validator 없음)

- **파일**: `backend/src/modules/profile/profile.controller.ts:33`, `profile.controller.ts:53`, `backend/src/modules/metrics/metrics.controller.ts:25`
- **상태**: OPEN (신규)
- **내용**: `@Body() dto: { version: number; displayName?: string; ... }`, `@Body() dto: { deviceId: string; events: MetricEventInput[] }` — 인라인 타입으로 class-validator 데코레이터가 없어 런타임 입력 검증이 불가능하다.
- **근거**: `IsInt()`, `IsString()`, `IsUUID()` 등이 없으면 잘못된 타입의 값이 서비스까지 전달된다. 특히 `version: number` 검증 없이 `undefined`가 들어오면 DB 업데이트 조건이 깨진다.
- **수정 방향**: `UpdateProfileDto`, `UpdateSettingDto`, `CollectEventsDto` 클래스를 `dto/` 디렉터리에 정의하고 class-validator 데코레이터 적용.

---

#### [CR-BE-01-7] [WARN] MetricsService — Redis 선마킹 후 DB 실패 시 이벤트 영구 누락

- **파일**: `backend/src/modules/metrics/metrics.service.ts:40-50`
- **상태**: OPEN (신규)
- **내용**: Redis에 `eventIdKey`를 먼저 set(`NX`)한 뒤 DB에 저장한다. DB 저장 실패 시 Redis에는 이미 "처리됨"으로 기록되어 있어, 동일 `eventId`로 재시도해도 중복으로 판단되어 영구 누락된다.
- **근거**: Redis TTL(24h) 내에는 해당 eventId가 재수신되어도 DB에 기록되지 않는다. 메트릭 이벤트 손실로 이어진다.
- **수정 방향**: DB 저장을 먼저 수행(Prisma `createMany` + `skipDuplicates` 또는 `upsert`로 멱등 보장), Redis는 성능 최적화용 캐시로만 활용. 또는 Redis TTL을 짧게 설정(예: 5분)해 실패 시 재시도 윈도우 확보.

---

#### [CR-BE-05-1] [WARN] FocusSessionController — @Post 엔드포인트에 @ApiOkResponse(200) 불일치

- **파일**: `backend/src/modules/focus-sessions/focus-session.controller.ts`
- **상태**: OPEN
- **내용**: `give-up`, `start-break`, `complete-break`, `skip-break`가 `@Post`인데 `@ApiOkResponse(200)`으로 문서화. NestJS 기본은 201이므로 실제 응답과 불일치.
- **수정 방향**: `@HttpCode(200)` 데코레이터 추가.

---

#### [CR-BE-03-1] [WARN] bootstrap — 루프 안 DB 조회 (N+1)

- **파일**: `backend/src/modules/sync/sync.service.ts:90-95`
- **상태**: OPEN
- **내용**: session 처리 루프 안에서 `tx.task.findUnique` 호출. 세션 수만큼 N+1.
- **수정 방향**: 루프 진입 전 `clientGeneratedId` 목록으로 일괄 조회 후 맵으로 사용.

---

#### [CR-BE-03-2] [WARN] pull — select 없이 전체 컬럼 조회

- **파일**: `backend/src/modules/sync/sync.service.ts:248-279`
- **상태**: OPEN
- **내용**: `task.findMany`, `focusSession.findMany` 모두 `select` 없이 전체 컬럼 반환.
- **수정 방향**: 클라이언트에 필요한 컬럼만 `select`로 명시.

---

#### [CR-BE-03-3] [WARN] RewardService.getLedger — hasMore 오판정

- **파일**: `backend/src/modules/rewards/reward.service.ts:138`
- **상태**: OPEN (신규)
- **내용**: `nextCursor = items.length === limit ? items[items.length - 1].id : undefined` — `take: limit` 조회 후 결과 수가 limit과 동일하면 nextCursor 설정. 정확히 limit개인 마지막 페이지에서 nextCursor가 설정되어 클라이언트가 빈 페이지를 한 번 더 요청한다.
- **수정 방향**: `take: limit + 1`로 조회 후 `items.length > limit` 판정, 반환 전 `slice(0, limit)`.

---

#### [CR-BE-01-8] [INFO] FocusSessionSweeper — givenUpAt에 session.pauseDeadlineAt 대신 now 사용

- **파일**: `backend/src/modules/focus-sessions/focus-session.sweeper.ts:43`
- **상태**: OPEN (신규)
- **내용**: 스위퍼가 `givenUpAt: now`(스윕 실행 시각)를 사용. `handlePauseTimeout`(서비스)은 `givenUpAt: session.pauseDeadlineAt`(실제 만료 시각)을 사용하므로 기록 시각이 불일치.
- **근거**: `pauseDeadlineAt`이 10:00이고 스윕이 10:01에 실행되면 DB에는 `givenUpAt = 10:01`이 기록되어 통계/감사 목적의 시각 정확성이 저하된다.
- **수정 방향**: `givenUpAt: session.pauseDeadlineAt ?? now`로 변경.

---

#### [CR-BE-08-1] [INFO] reward.service.ts — DEFAULT_TIMEZONE 하드코딩

- **파일**: `backend/src/modules/rewards/reward.service.ts:11`
- **상태**: OPEN
- **내용**: `DEFAULT_TIMEZONE = 'Asia/Seoul'` 코드 직접 기입.
- **수정 방향**: `ConfigService`를 통해 `APP_DEFAULT_TIMEZONE` 환경변수로 읽기.

---

#### [CR-BE-05-2] [INFO] SyncController, ProfileController — Swagger 메서드 레벨 미완

- **파일**: `backend/src/modules/sync/sync.controller.ts`, `backend/src/modules/profile/profile.controller.ts`
- **상태**: PARTIAL
- **내용**: SyncController 클래스 레벨 `@ApiTags`, `@ApiBearerAuth` 추가됐으나, 메서드별 `@ApiOperation`, `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiConflictResponse` 미작성. ProfileController도 동일.
- **수정 방향**: 각 엔드포인트에 메서드 레벨 Swagger 데코레이터 추가.

---

### 결과 요약

| 판정 | 건수 |
|------|------|
| CRITICAL | 1 |
| WARN | 13 |
| INFO | 3 |

**종합 판정**: FAIL

**진척 사항**:
- SyncController 구조 결함(Prefix, Guard 중복) 해소 ✓
- FocusSessionRepository, RewardRepository `prisma` getter 도입으로 bracket notation 제거 ✓
- CR-BE-01-2 오탐 확인: completeSession PAUSED 분기 에러 코드 로직 정상

**차기 우선 수정 목록**:
1. **CR-BE-01-1** (CRITICAL): resumeSession 트랜잭션 묶음
2. **CR-BE-06-2** (WARN): sync payload any → 화이트리스트 타입
3. **CR-BE-01-7** (WARN): Metrics Redis-first 순서 역전
4. **CR-BE-02-2** (WARN): ProfileController, RewardController JwtAuthGuard 중복 제거
5. **CR-BE-08-3** (WARN): Profile/Metrics DTO 클래스 정의 + class-validator
