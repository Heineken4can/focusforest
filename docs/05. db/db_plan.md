# Focus Forest V1 — 데이터베이스 구현 계획 (db_plan)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.0 | 2026-03-10 | DB-Plan | architecture.md v1.3 기반 DB 계획 분리 |
| v1.1 | 2026-03-10 | DB-Plan | 상위 아키텍처 문서 경로를 docs/03. architecture/architecture.md로 정리 |
| v1.2 | 2026-03-12 | DB-Plan | architecture v2.0 및 BE/FE 최신 계약 반영: Task soft delete, metrics 이벤트, break 컬럼, profile 정합화 |
| v1.3 | 2026-03-12 | DB-Plan | architecture v2.2 / be_api v1.3 정렬: enum drift, bootstrap merge, metrics dedupe, timezone/day-boundary, partial unique 검증 기준 확정 |
| v1.4 | 2026-03-12 | DB-Plan | db-rv WARN 반영: metrics alias, bootstrap endedAt 정규화, delete semantics 명시 |

## 참조 문서

- DB 설계: `docs/05. db/db_design.md`
- 상위 아키텍처: `docs/03. architecture/architecture.md`
- 백엔드 설계: `docs/04. be/be_design.md`
- API 명세: `docs/04. be/be_api.md`
- UI 데이터 계약: `docs/02. ui/ui_data_contract.md`

---

## 1. Contract Propagation 요약

이번 라운드에서 DB 문서가 따라야 하는 BE 계약 변경은 아래 6개다.

| 항목 | DB 반영 정책 |
|------|--------------|
| `TaskStatus` enum drift | `PENDING`, `COMPLETED`만 저장. `IN_PROGRESS` 저장 금지 |
| `FocusSession` 상태 enum | break/give-up 상태를 포함한 8개 enum으로 고정 |
| `clientGeneratedId / bootstrap` | nullable unique + 서버 existing row 채택 + soft-deleted Task도 dedupe 대상 |
| metrics dedupe | `eventId` PK + `(eventName, dedupeKey)` partial unique |
| `DailyFocusStat` day-boundary | 세션 완료 시점의 `UserSetting.timezone` 기준 `statDate` 계산, 과거 backfill 없음 |
| active session / soft delete / version | `Task.deletedAt`, `uq_focus_session_user_active`, `User/UserSetting/Task/FocusSession.version` 적용 |

---

## 2. 마이그레이션 구현 순서

마이그레이션은 의존성과 검증 포인트를 기준으로 3단계로 나눈다.

### Phase 1. 계정 / 설정 기반

| 순서 | 엔터티 | 구현 포인트 |
|------|--------|-------------|
| 1-1 | ENUM 타입 | `TaskStatus`, `SessionStatus`, `ThemeMode`, `MetricEventName` 생성 |
| 1-2 | User | `displayName`, `avatarUrl`, `version` 포함. 별도 Profile 테이블 생성하지 않음 |
| 1-3 | UserSetting | `timezone`, `theme`, `syncEnabled`, `version` |
| 1-4 | RefreshToken | refresh token rotation/revocation 저장소 |

**완료 기준:** 회원가입/로그인/프로필/설정 API가 최신 DTO 기준으로 DB에 매핑 가능하다.

### Phase 2. 핵심 도메인

| 순서 | 엔터티 | 구현 포인트 |
|------|--------|-------------|
| 2-1 | Task | `deletedAt` soft delete, `clientGeneratedId`, `isCore`, `version` |
| 2-2 | FocusSession | `plannedFocusSec`, pause/break/give-up 시간 컬럼, active session partial unique |
| 2-3 | RewardLedger | `sourceSessionId UNIQUE`, `treeCount`, append-only |

**완료 기준:** Task CRUD, 세션 시작/pause/resume/complete/give-up/start-break/complete-break/skip-break가 DB 제약과 함께 성립한다.

### Phase 3. 집계 / 동기화 / KPI

| 순서 | 엔터티 | 구현 포인트 |
|------|--------|-------------|
| 3-1 | UserProgressSnapshot | `currentStreak` 없이 `totalSp`, `currentLevel`, `totalCompletedSessions`만 유지 |
| 3-2 | DailyFocusStat | `focusedSeconds`, `completedSessions`, `plantedTrees`, `userId + statDate UNIQUE` |
| 3-3 | ProductMetricEvent | append-only KPI 원장, `eventId` PK, `eventName + dedupeKey` partial unique |
| 3-4 | SyncCursor | `lastCursor` 문자열, `userId + deviceId UNIQUE` |
| 3-5 | 인덱스 | visible task, active session, metrics 집계 인덱스 생성 |

**완료 기준:** rewards/stats, sync bootstrap/push/pull, metrics/events API가 최신 계약과 동일한 데이터 모델을 사용한다.

---

## 3. Prisma / DDL 작성 가이드

### 3.1 Enum 고정값

```prisma
enum TaskStatus {
  PENDING
  COMPLETED
}

enum SessionStatus {
  RUNNING
  PAUSED
  COMPLETED
  BREAK_RUNNING
  BREAK_COMPLETED
  BREAK_SKIPPED
  GIVEN_UP
  GIVEN_UP_TIMEOUT
}
```

- `TaskStatus.IN_PROGRESS`는 만들지 않는다.
- `currentStreak` 컬럼과 관련 집계는 추가하지 않는다.

### 3.2 컬럼 매핑 주의사항

- `User`는 인증 정보와 프로필 정보를 함께 가진다.
- `Task.deletedAt`은 `DELETE /tasks/:taskId`의 실제 저장 필드이며, 성공 응답의 `deletedAt`과 동일한 의미를 가진다. V1에서는 hard delete를 사용하지 않는다.
- `FocusSession`은 `startedAt`, `pauseStartedAt`, `pauseDeadlineAt`, `focusEndedAt`, `givenUpAt`, `breakStartedAt`, `breakEndsAt`, `breakEndedAt`을 분리해 저장한다.
- `DailyFocusStat`는 `focusedSeconds`, `plantedTrees` 필드명을 사용한다.
- `SyncCursor.lastCursor`는 TIMESTAMPTZ가 아니라 문자열 커서다.
- `ProductMetricEvent.userId`, `focusSessionId`, `rewardLedgerId`는 nullable 허용이 필요하다. 이때 API DTO의 `rewardGrantId`는 DB 영속화 시 `rewardLedgerId`로 매핑한다.

### 3.3 DDL 우선 반영 대상

```sql
CREATE UNIQUE INDEX "uq_focus_session_user_active"
ON "FocusSession" ("userId")
WHERE "status" IN ('RUNNING', 'PAUSED', 'BREAK_RUNNING');

CREATE UNIQUE INDEX "uq_metric_event_name_dedupe_key"
ON "ProductMetricEvent" ("eventName", "dedupeKey")
WHERE "dedupeKey" IS NOT NULL;

CREATE UNIQUE INDEX "uq_task_user_core_active"
ON "Task" ("userId")
WHERE "isCore" = true AND "deletedAt" IS NULL;
```

---

## 4. 검증 체크리스트

### 4.1 이번 요청의 6개 확정 항목

| 검증 항목 | 확인 기준 |
|-----------|-----------|
| TaskStatus enum drift 해소 | `TaskStatus`가 `PENDING`, `COMPLETED`만 생성되는지 확인 |
| FocusSession 상태 enum 정합화 | 8개 상태가 모두 생성되고 break/give-up API와 대응되는지 확인 |
| clientGeneratedId/bootstrap 병합 제약 | nullable unique 동작, soft-deleted Task 중복 삽입 방지 확인 |
| metrics dedupe unique/index 기준 | `eventId` 중복 차단 + `eventName + dedupeKey` partial unique 동작 확인 |
| DailyFocusStat timezone/day-boundary | `UserSetting.timezone` 기준 `statDate` 저장, 변경 이후 세션부터 새 기준 적용 확인 |
| active session partial unique, soft delete, version 정책 | 사용자당 활성 세션 1개, Task soft delete, `version` 충돌 검출 확인 |

### 4.2 제약 검증 항목

| 제약 | 검증 방법 |
|------|-----------|
| `Task.clientGeneratedId UNIQUE` | 동일 값 두 번 INSERT 시 unique violation |
| `FocusSession.clientGeneratedId UNIQUE` | 동일 값 두 번 INSERT 시 unique violation |
| `uq_task_user_core_active` | 같은 사용자의 active core task 2개 생성 차단 |
| `uq_focus_session_user_active` | 같은 사용자의 `RUNNING/PAUSED/BREAK_RUNNING` 동시 2개 생성 차단 |
| `RewardLedger.sourceSessionId UNIQUE` | 동일 세션의 중복 보상 차단 |
| `DailyFocusStat(userId, statDate) UNIQUE` | 동일 local date row 중복 차단 |
| `ProductMetricEvent.eventId PK` | 동일 eventId 재전송 차단 |
| `uq_metric_event_name_dedupe_key` | 동일 의미 KPI 재적재 차단 |
| `SyncCursor(userId, deviceId) UNIQUE` | 동일 device cursor row 중복 차단 |
| `pauseCount BETWEEN 0 AND 1` | pause 2회 이상 저장 차단 |

---

## 5. 트랜잭션 구현 기준

### 5.1 세션 완료 트랜잭션

| 순서 | 테이블 | 작업 | 실패 시 |
|------|--------|------|---------|
| 1 | `FocusSession` | `status='COMPLETED'`, `focusEndedAt` 기록, `version+1` | 전체 롤백 |
| 2 | `RewardLedger` | 보상 row INSERT | 전체 롤백 |
| 3 | `DailyFocusStat` | 해당 `statDate` UPSERT | 전체 롤백 |
| 4 | `UserProgressSnapshot` | 누적 SP/레벨/완료 세션 수 갱신 | 전체 롤백 |

- break 전이는 `FocusSession` 단일 row 갱신으로 처리한다.
- metrics 적재는 보상 트랜잭션과 별개지만, dedupe 제약은 항상 활성화되어 있어야 한다.

### 5.2 bootstrap / sync 메모

- bootstrap은 `clientGeneratedId` 기준 dedupe가 선행되어야 한다.
- transport 레벨의 `SessionFactInput.endedAt`은 영속화 시 `status`에 따라 `focusEndedAt`, `givenUpAt`, `breakEndedAt`으로 정규화한다.
- soft-deleted Task는 중복 삽입 대신 기존 row remap 대상으로 본다.
- push/pull 충돌 검출은 `updatedAt`이 아니라 `version`을 기준으로 한다.
- `deviceSequence`는 DB 컬럼보다 sync 이벤트 순서 보장 규칙으로 관리한다.

---

## 6. 시드 / 테스트 기준

### 6.1 권장 시드 데이터

| 엔터티 | 데이터 예시 |
|--------|-------------|
| User | 테스트 유저 2명, `displayName`, `avatarUrl`, `version=1` |
| UserSetting | `theme=SYSTEM`, `timezone=Asia/Seoul`, `syncEnabled=true` |
| Task | `PENDING` 5개, `COMPLETED` 2개, soft-deleted 1개 |
| FocusSession | `COMPLETED` 2개, `BREAK_COMPLETED` 1개, `RUNNING` 1개, `GIVEN_UP` 1개 |
| RewardLedger | 완료 세션과 1:1 대응 |
| DailyFocusStat | 최근 7일 통계 |
| ProductMetricEvent | 익명/로그인 이벤트 혼합 샘플 |
| SyncCursor | 디바이스별 커서 1~2개 |

### 6.2 필수 테스트 시나리오

- soft-deleted Task가 기본 목록 조회에서 제외된다.
- 사용자당 활성 세션 1개 제한이 DB 차원에서 보장된다.
- 동일 `eventId` 재전송은 차단된다.
- 동일 `eventName + dedupeKey` 재전송은 차단된다.
- timezone 변경 전/후 완료 세션이 서로 다른 `statDate` 기준을 올바르게 사용한다.

---

## 7. Done Criteria / Handoff

### 7.1 Done Criteria

- Phase 1 -> 2 -> 3 순서로 적용해도 동일 스키마가 생성된다.
- `TaskStatus`, `SessionStatus`, `ThemeMode`, `MetricEventName` enum이 최신 계약과 일치한다.
- `Task.deletedAt`, `FocusSession` 시간 컬럼, `ProductMetricEvent`, `SyncCursor.lastCursor`가 모두 반영된다.
- `currentStreak` 없이 rewards/stats와 progress snapshot이 동작한다.

### 7.2 DB-Act 핸드오프

| 항목 | 산출물 |
|------|--------|
| Prisma 스키마 | `prisma/schema.prisma` |
| 마이그레이션 파일 | `prisma/migrations/` |
| 시드 스크립트 | `prisma/seed.ts` |
| 제약 검증 기록 | unique/partial unique/check 검증 로그 |
| 성능 확인 | visible task, active session, metrics 조회 인덱스 사용 확인 |

**핸드오프 체크리스트**

- [ ] `TaskStatus=PENDING/COMPLETED`만 생성되었다.
- [ ] `uq_focus_session_user_active`가 생성되었다.
- [ ] `Task.deletedAt` 기반 soft delete가 반영되었다.
- [ ] `ProductMetricEvent`의 `eventId` PK와 `eventName + dedupeKey` partial unique가 반영되었다.
- [ ] `DailyFocusStat` day-boundary 정책이 문서와 구현에서 동일하다.
- [ ] `version` 기반 충돌 검출 대상(User/UserSetting/Task/FocusSession)이 정리되었다.