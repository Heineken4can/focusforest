## Code Review Report

리뷰 시각: 2026-03-14
리뷰 타겟: BE, FE
리뷰 범위:

**Feature — Task CRUD**
- `backend/src/modules/tasks/task.controller.ts`
- `backend/src/modules/tasks/task.service.ts`
- `backend/src/modules/tasks/task.repository.ts`
- `frontend/src/features/dashboard/useTaskDashboard.ts`

**Feature — 집중 세션 루프**
- `backend/src/modules/focus-sessions/focus-session.controller.ts`
- `backend/src/modules/focus-sessions/focus-session.service.ts`
- `backend/src/modules/focus-sessions/focus-session.repository.ts`
- `backend/src/modules/focus-sessions/session-idempotency.service.ts`
- `backend/src/modules/rewards/reward.service.ts`
- `frontend/src/pages/focus/FocusPage.tsx`

**Feature — 동기화**
- `backend/src/modules/sync/sync.service.ts`
- `backend/src/modules/sync/sync.controller.ts`
- `backend/src/modules/sync/dto/push.dto.ts`
- `frontend/src/features/sync/sync-service.ts`
- `frontend/src/features/sync/sync-outbox.ts`

---

### 공통 체크포인트 결과

| 항목 | 결과 |
|------|------|
| 죽은 코드 (미사용 변수/import/함수) | PASS |
| 마법 숫자/문자열 | PASS |
| TODO/FIXME/HACK 잔존 | PASS (sync-service.ts 주석은 설명적 의도) |
| console.log 잔존 | WARN — `sync-service.ts` 4곳 (console.error/warn) |
| 하드코딩 설정값 | PASS |
| 함수 길이 50줄 초과 | INFO — `useTaskDashboard.ts` 766줄 (단일 훅에 책임 집중) |

---

### 상세 이슈

---

#### [CR-BE-01] CRITICAL — Task·FocusSession 컨트롤러 인증 가드 누락

- **파일**: `backend/src/modules/tasks/task.controller.ts`, `backend/src/modules/focus-sessions/focus-session.controller.ts`
- **내용**: 두 컨트롤러 모두 `@UseGuards(JwtAuthGuard)` 가 없음. `AppModule` 에도 전역 APP_GUARD 미등록.
- **근거**: `SyncController` 는 `@UseGuards(JwtAuthGuard, SyncRateLimitGuard)` 를 명시하여 인증을 강제한다. `@ApiBearerAuth()` 는 Swagger 문서 전용 데코레이터로 런타임 인증을 강제하지 않음. 미인증 요청이 들어오면 `request.auth!.userId` 에서 `TypeError: Cannot read properties of undefined` 가 발생 → 401이 아닌 500 반환. 보안 경계가 실질적으로 없는 상태.
- **수정 방향**: 두 컨트롤러 클래스에 `@UseGuards(JwtAuthGuard)` 추가. 또는 `AppModule` 에 `APP_GUARD` 전역 등록으로 통일.

---

#### [CR-BE-02] CRITICAL — Sync push payload 임의 필드 주입 가능

- **파일**: `backend/src/modules/sync/sync.service.ts:408-414`, `sync.service.ts:439-444`
- **내용**: `updateTask()` · `updateSession()` 에서 클라이언트 `payload: any` 를 `prisma.*.update({ data: { ...payload } })` 에 그대로 spread.
- **근거**: `SyncEventInput.payload` 는 `@IsObject()` 만 검증하고 내부 필드는 무제한. 클라이언트가 `{ status: 'COMPLETED', deletedAt: null, isCore: true }` 를 보내면 보상 정산 없이 세션 완료 강제, soft-delete 복구, 비즈니스 로직 우회 가능. Task CRUD 의 `completedTaskCoreGuard`, `active_lock` 등 모든 도메인 검증을 우회한다.
- **수정 방향**: 엔티티별 허용 필드 allowlist 정의 후 명시적 매핑만 허용.

```ts
// 예시 — updateTask
await this.prisma.task.update({
  where: { id: task.id },
  data: {
    title:       payload.title,
    description: payload.description,
    status:      payload.status,
    isCore:      payload.isCore,
    version: { increment: 1 },
  },
});
```

---

#### [CR-BE-03] WARN — Bootstrap 트랜잭션 재시도 시 accepted 배열 중복 누적

- **파일**: `backend/src/modules/sync/sync.service.ts:48-50, 82-84, 164-165`
- **내용**: `acceptedTasks`, `acceptedSessions` 배열이 트랜잭션 콜백 **외부**에 선언되고 콜백 내부에서 `push()` 됨.
- **근거**: Prisma Serializable 인터랙티브 트랜잭션은 직렬화 충돌 시 콜백을 재실행한다. 재실행 시 동일 `clientGeneratedId` 가 배열에 중복 누적되어 응답에 중복 항목 반환.
- **수정 방향**: 배열 선언을 트랜잭션 콜백 **내부**로 이동 후 반환값으로 수령, 또는 `Set` 사용.

---

#### [CR-BE-04] WARN — `pull()` hasMore 판정 로직 오류

- **파일**: `backend/src/modules/sync/sync.service.ts:281`
- **내용**: `hasMore = tasks.length === limit || sessions.length === limit`
- **근거**: tasks 와 sessions 가 각각 독립적으로 `take: limit` 조회됨. tasks=50, sessions=0 이면 `hasMore=true` 반환하나 sessions 는 이미 소진. 클라이언트가 불필요한 pull 을 반복하거나 커서 진행이 잘못 처리될 수 있음.
- **수정 방향**: 각 컬렉션을 `limit+1` 로 조회 후 초과분 여부로 판정하거나, 합산 결과 기반 hasMore 판정.

---

#### [CR-BE-05] WARN — `RewardService` 가 `RewardRepository` private 필드에 bracket notation으로 직접 접근

- **파일**: `backend/src/modules/rewards/reward.service.ts:108`
- **내용**: `this.rewardRepository['prismaService']` — TypeScript `private` 접근 제한을 브라켓 표기로 우회.
- **근거**: 필드명 변경 시 컴파일 에러 없이 런타임 실패. 캡슐화 파괴. NestJS DI 원칙 위반.
- **수정 방향**: `RewardRepository` 에 non-transactional `findTimezoneByUserId(userId)` public 메서드 추가, 또는 `getStats()` 에서 `PrismaService` 를 직접 주입.

---

#### [CR-BE-06] WARN — `pull()` 응답이 `createSuccessResponse` 미사용

- **파일**: `backend/src/modules/sync/sync.service.ts:297-311`
- **내용**: 다른 엔드포인트와 달리 raw 객체를 반환하며 `status: 'success'` 하드코딩.
- **근거**: API 응답 포맷 불일치. 공통 인터셉터, 프론트엔드 `ApiResponse` 타입 가정과 맞지 않음.
- **수정 방향**: `createSuccessResponse()` 사용 후 `meta` 는 타입 캐스팅으로 추가 (기존 엔드포인트와 동일 패턴).

---

#### [CR-FE-01] FIXED — `SyncService.initAutoSync()` cleanup 추가

- **파일**: `frontend/src/features/sync/sync-service.ts`
- **조치**: `intervalId`, `onlineHandler` 인스턴스 변수 추가 및 `destroy()` 메서드 구현. `App.tsx` 언마운트 시 호출되도록 수정.

---

#### [CR-FE-02] FIXED — `SyncService.pull()` 오류 처리 보강

- **파일**: `frontend/src/features/sync/sync-service.ts`
- **조치**: `catch` 블록에서 `appStore.setSnapshot({ syncError: ... })`를 통해 에러 상태 전파.

---

#### [CR-FE-03] FIXED — `pull()` IndexedDB 쓰기 루프 `onerror` 핸들러 추가

- **파일**: `frontend/src/features/sync/sync-service.ts`
- **조치**: `req.onerror = () => reject(req.error)` 핸들러를 모든 IndexedDB Promise 래퍼에 추가.

---

#### [CR-FE-04] FIXED — console.error/warn 정리

- **파일**: `frontend/src/features/sync/sync-service.ts`
- **조치**: 불필요한 로그 삭제 및 UI 에러 상태(syncError)로 대체.

---

#### [CR-BE-07] INFO — `SessionIdempotencyService` memoryCache 만료 항목 자동 정리 없음

- **파일**: `backend/src/modules/focus-sessions/session-idempotency.service.ts`
- **내용**: `memoryCache` Map 은 읽을 때만 만료 항목을 삭제. TTL=7일이므로 장기 운영 시 누적.
- **수정 방향**: 주기적 cleanup(`setInterval`) 또는 Map 크기 상한 + LRU 교체 전략 적용.

---

#### [CR-BE-08] INFO — `bootstrap()` 에서 snapshot 객체 직접 변이

- **파일**: `backend/src/modules/sync/sync.service.ts:176`
- **내용**: `snapshot.syncState.lastCursor = cursor` — repository 반환 객체를 DB 저장 없이 직접 변이 후 응답.
- **수정 방향**: spread 로 새 객체 생성 후 반환.

```ts
// 수정 예시
const responseSnapshot = {
  ...snapshot,
  syncState: { ...snapshot.syncState, lastCursor: cursor },
};
```

---

### 결과 요약

| 판정 | 건수 |
|------|------|
| CRITICAL | 2 |
| WARN | 4 (BE 4, FE FIXED) |
| INFO | 3 |
| PASS | Task CRUD 서비스 로직, version OCC, 멱등성 서비스 설계, FocusPage 타이머 cleanup, FE 동기화 리소스 관리 |

**종합 판정**: WARN (FE 수정 완료, BE 보완 필요)

핵심 판정 사유:

1. **CR-FE-01~04 (FIXED)** — Sync 클라이언트의 리소스 누수, 오류 무시, IndexedDB 예외 처리가 FE-Act에 의해 모두 수정됨.
2. **CR-BE-01 (CRITICAL)** — Task·FocusSession 컨트롤러의 인증 가드 누락 (BE 보완 필요).
3. **CR-BE-02 (CRITICAL)** — Sync push 의 `payload: any` spread 취약점 (BE 보완 필요).
4. **CR-BE-03~06 (WARN)** — 트랜잭션 재시도 중복 등 BE 로직 보완 필요.
