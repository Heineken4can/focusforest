# Focus Forest v1.1 - UI Data Contract (ui_data_contract)

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| v1.1 | 2026-03-12 | UI-Plan | 문서 템플릿 정규화, 상태 enum 및 참조 문서 정리 |
| v1.2 | 2026-03-12 | UI-Plan | BE/architecture 확정 계약(start/bootstrap/conflict/dedupe/timezone) 반영 |

## 참조 문서
- `docs/01. po/PRD_FocusForest.md`
- `docs/03. architecture/architecture.md`
- `docs/02. ui/ui_text_definition.md`
- `docs/02. ui/ui_design.md`
- `docs/04. be/be_api.md`
- `docs/04. be/be_design.md`
- `docs/05. db/db_design.md`

`ui_text_definition.md`와 `PRD_FocusForest.md`를 기준으로, 화면 설계에서 필요한 데이터 계약을 DB/API 설계 입력용으로 정리한 문서입니다.

---

## 1. 문서 목적

- 화면별로 어떤 데이터를 읽고, 어떤 데이터를 바꾸며, 무엇이 로컬 계산값인지 구분한다.
- UI 문서의 의미 단위 데이터를 BE API 계약과 DB 엔티티 설계로 넘길 수 있게 한다.
- 이 문서는 `DB 컬럼명`보다 한 단계 위의 `화면 의미 단위 데이터 계약`을 정의한다.
- `ui_text_definition.md`는 화면 구조와 플로우 정본으로 사용하고, 이 문서는 semantic field, 상태값, KPI 발화 조건을 API/DB 설계 입력 기준으로 정리한다.

---

## 2. 계약 원칙

### 2.1 데이터 구분
- **서버 저장 사실값**: 로그인 상태에서 서버 DB가 정본으로 관리해야 하는 값
- **로컬/런타임 상태**: UI 세션 중만 필요한 값 또는 오프라인/타이머 계산용 값
- **파생/집계 값**: 사실값으로부터 계산되는 값. 저장 여부는 BE/DB에서 최적화 판단

### 2.2 표기 원칙
- 필드명은 화면 의미를 드러내는 semantic naming을 사용한다.
- DB 테이블/컬럼명은 이 문서를 입력으로 BE/DB 문서에서 최종 확정한다.
- `TBD`는 현재 PRD/UI 문서만으로 확정되지 않은 항목이다.

### 2.3 데이터 출처 원칙
- 비로그인 상태: localStorage/IndexedDB 정본
- 로그인 상태: 서버 동기화 기준
- 타이머 잔여 시간, Pause 만료 시각, Break 남은 시간은 클라이언트 계산값

### 2.4 상태머신 및 동기화 원칙
- `FocusSession.status`는 V1에서 `RUNNING`, `PAUSED`, `COMPLETED`, `BREAK_RUNNING`, `BREAK_SKIPPED`, `BREAK_COMPLETED`, `GIVEN_UP`, `GIVEN_UP_TIMEOUT`를 사용한다.
- Break는 V1에서 별도 `BreakSession` 엔티티를 만들지 않고, `FocusSession`의 하위 상태와 `breakStartedAt`, `breakEndsAt` 의미 필드로 관리한다.
- 집중 세션은 시작 즉시 로컬 active session을 생성하고, 로그인 상태에서는 서버 생성 요청 또는 오프라인 sync queue 적재를 함께 수행한다.
- 타이머 잔여 시간과 Pause/Break 만료 시각은 항상 클라이언트 계산값이며, 서버는 시작/완료/포기/휴식 전이 같은 사실 이벤트를 저장한다.

---

## 3. 공통 엔티티 후보

| 엔티티 | 핵심 semantic fields |
| --- | --- |
| `Task` | `taskId`, `ownerScope(userId or deviceId)`, `title`, `status`, `isCore`, `updatedAt`, `deletedAt(optional)` |
| `FocusSession` | `focusSessionId`, `taskId`, `status`, `startedAt`, `plannedFocusSec`, `focusEndedAt(optional)`, `givenUpAt(optional)`, `pauseCount`, `pauseStartedAt(optional)`, `breakStartedAt(optional)`, `breakEndsAt(optional)`, `breakEndedAt(optional)`, `version` |
| `RewardGrant` | `rewardGrantId`, `focusSessionId`, `treeCount`, `spAmount`, `grantedAt` |
| `DailySummary` | `ownerScope`, `localDate`, `timezone`, `todayFocusMinutes`, `completedFocusSessionCount`, `todayTreeCount` |
| `UserProfile` | `userId`, `email`, `totalSp`, `currentLevel`, `connectionState` |
| `UserSetting` | `userId`, `themeMode`, `timezone`, `autoSyncEnabled` |
| `SyncState` | `ownerScope`, `bootstrapStatus`, `lastSyncAt`, `hasConflict`, `retryable`, `localDataPreserved` |
| `KpiEventQueue` | `eventId`, `ownerScope`, `eventName`, `occurredAt`, `uploadStatus`, `dedupeKey` |

---

## 4. 화면별 데이터 계약표

### SCR-01 대시보드 - Empty State

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `taskCount`, `isAuthenticated`, `localModeFlag` |
| 주요 액션/API 후보 | `createTask`, `openCreateTaskLayer(SCR-02-A)` |
| 입력/변경 필드 | `createTaskDraft.title`, `createTaskDraft.description(optional)` |
| 서버 저장 사실값 | 로그인 상태인 경우 `Task` 존재 여부 |
| 로컬/런타임 상태 | Empty 카드 노출 여부, `집중 시작` 비활성 이유, `createTaskLayerOpen`, `createTaskValidationError`, `createTaskSaving` |
| 파생/집계 값 | `isEmpty = taskCount === 0` |
| 주요 엔티티 후보 | `Task`, `UserProfile/AuthContext` |
| 추가 메모 | Empty 안내 문구와 비활성 사유 텍스트의 정확한 문구는 카피 문서 정본을 따른다. 이 계약서는 노출 필요 여부와 상태만 다룬다. |

### SCR-02 대시보드 - 기본

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `taskList[].taskId`, `taskList[].title`, `taskList[].status`, `taskList[].isCore`, `taskList[].isLocked`, `taskList[].updatedAt`, `selectedTaskId(optional)`, `dashboardSummary.todayFocusMinutes`, `dashboardSummary.completedFocusSessionCount`, `dashboardSummary.totalSp`, `dashboardSummary.currentLevel`, `dashboardSummary.todayTreeCount`, `rewardSnapshot.totalSp`, `rewardSnapshot.currentLevel`, `rewardSnapshot.todayTreeCount(optional)` |
| 주요 액션/API 후보 | `getDashboardSnapshot`, `createTask`, `updateTask`, `deleteTask`, `setCoreTask`, `getTaskList(filter)`, `openCreateTaskLayer(SCR-02-A)`, `openEditTaskLayer(SCR-02-B)`, `openDeleteConfirm(SCR-02-C)`, `queueKpiEvent(dashboard_task_set, createTask 성공 시)` |
| 입력/변경 필드 | `createTaskDraft.title`, `createTaskDraft.description(optional)`, `editTaskDraft.taskId`, `editTaskDraft.title`, `editTaskDraft.description(optional)`, `deleteTargetTaskId` |
| 서버 저장 사실값 | `Task`, `FocusSession` 사실값, `RewardGrant`, `DailySummary`, `UserProfile.totalSp` |
| 로컬/런타임 상태 | 현재 필터(`전체/진행중/완료`), 정렬 옵션, optimistic update 상태, `createTaskLayerOpen`, `editTaskLayerOpen`, `deleteConfirmOpen`, `createTaskValidationError`, `editTaskValidationError`, `taskMutationSaving`, `dayBoundaryResetNotice` |
| 파생/집계 값 | `currentLevel = Floor(totalSp / 1000) + 1`(미저장 가능), `todayFocusDisplay`, `isLocked`(활성 세션 연결 여부로 계산 가능) |
| 주요 엔티티 후보 | `Task`, `FocusSession`, `RewardGrant`, `DailySummary`, `UserProfile` |
| 추가 메모 | 리스트의 `보조 설명`은 optional presentation slot로 관리한다. 실제 노출 값 선택은 5.1 남은 미정 항목을 따른다. |

### SCR-03 과제 선택 뷰

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `selectedTask.taskId`, `selectedTask.title`, `selectedTask.status`, `selectedTask.isLocked`, `selectedTask.isCore` |
| 주요 액션/API 후보 | `setCoreTask`, `startFocusSession(taskId)`, `queueKpiEvent(dashboard_task_set, setCoreTask 성공 시)` |
| 서버 저장 사실값 | `Task.isCore`, 신규 `FocusSession` 생성 사실 |
| 로컬/런타임 상태 | 현재 선택 row 상태, 모바일 CTA 바 노출 상태 |
| 파생/집계 값 | `canStartFocus = status !== COMPLETED && isLocked === false` |
| 추가 메모 | `startFocusSession` 성공 응답은 집중 화면 즉시 진입에 필요한 `activeSession`, `currentTask`, `sidebarSummary`, `nextTaskCandidates(max 2)`, `policy`만 포함한다. reward/history/dashboard 전체 목록은 응답 범위에서 제외한다. |

### SCR-04 집중 모드 - 진행

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `activeSession.focusSessionId`, `activeSession.taskId`, `activeSession.status`, `activeSession.startedAt`, `activeSession.plannedFocusSec`, `activeSession.pauseCount`, `currentTask.title`, `nextTaskCandidates[].taskId`, `nextTaskCandidates[].title`, `nextTaskCandidates[].status`, `sidebarSummary.completedFocusSessionCount` |
| 주요 액션/API 후보 | `pauseFocusSession`, `openGiveUpConfirm`, `completeFocusSession(auto)`, `getFocusReadonlySidebar` |
| 서버 저장 사실값 | `FocusSession` 시작 사실, 세션 상태, 연결 `Task` |
| 로컬/런타임 상태 | `remainingTime`, `focusStartTimestamp`, `visibilityRecoveredAt`, 몰입 전환 상태 |
| 파생/집계 값 | `remainingTime = plannedFocusSec - elapsedSec`, `pauseDisabled = pauseCount >= 1` |
| 주요 엔티티 후보 | `FocusSession`, `Task`, `DailySummary` |
| 추가 메모 | 집중 세션은 시작 즉시 로컬 active session을 만들고, 로그인 상태에서는 서버 생성 요청 또는 오프라인 sync queue 적재를 함께 수행한다. 완료 직후 보상 저장과 KPI 발화는 SCR-08에서 처리한다. |

### SCR-05 집중 모드 - 일시정지

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `activeSession.focusSessionId`, `activeSession.pauseCount`, `activeSession.pauseStartedAt`, `currentTask.title` |
| 주요 액션/API 후보 | `resumeFocusSession`, `giveUpFocusSession`, `autoAbortOnPauseTimeout` |
| 서버 저장 사실값 | `FocusSession.pauseCount`, `pauseStartedAt`, 최종 `GIVEN_UP_TIMEOUT` 상태 |
| 로컬/런타임 상태 | `pauseRemainingSec`, 경고 토스트/배너 노출 상태 |
| 파생/집계 값 | `pauseDeadlineAt = pauseStartedAt + 300s`, `pauseExpired = now >= pauseDeadlineAt` |
| 주요 엔티티 후보 | `FocusSession` |
| 추가 메모 | V1은 Pause 이력 별도 로그를 두지 않고 `pauseCount`, `pauseStartedAt`, `pauseDeadlineAt` 누적 필드만 사용한다. |

### SCR-06 집중 모드 - 포기 경고 모달

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `activeSession.focusSessionId`, `currentTask.title`, `warningContext(PAUSE or RUNNING)` |
| 주요 액션/API 후보 | `confirmGiveUp`, `cancelGiveUp` |
| 서버 저장 사실값 | `FocusSession.status = GIVEN_UP`, `givenUpAt` |
| 로컬/런타임 상태 | 모달 open/close, 이전 화면 복귀 컨텍스트 |
| 파생/집계 값 | 보상 없음, 집중 시간 무효 처리 규칙 적용 |
| 주요 엔티티 후보 | `FocusSession`, `Task` |
| 추가 메모 | V1에서는 `giveUpReason`를 수집하지 않는다. 사유 수집이 필요해지면 후속 버전에서 enum과 저장 정책을 별도 정의한다. |

### SCR-07 집중 모드 - 휴식(Break)

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `breakState.focusSessionId`, `breakState.status`, `breakState.startedAt`, `breakState.endsAt`, `nextTaskCandidates[].taskId(optional)`, `nextTaskCandidates[].title(optional)` |
| 주요 액션/API 후보 | `skipBreak`, `completeBreak(auto)`, `resolveNextRoute` |
| 서버 저장 사실값 | `FocusSession.status = BREAK_RUNNING`, `BREAK_SKIPPED`, `BREAK_COMPLETED`, `breakStartedAt`, `breakEndsAt` |
| 로컬/런타임 상태 | `breakRemainingTime`, 휴식 유지/건너뛰기 버튼 상태 |
| 파생/집계 값 | `nextRoute = hasNextTask ? SCR-03 : SCR-02` |
| 주요 엔티티 후보 | `FocusSession`, `Task` |
| 추가 메모 | V1 Break는 별도 엔티티를 두지 않고 `FocusSession.status`와 `breakStartedAt`, `breakEndsAt` 의미 필드로 관리한다. `nextTaskCandidates`의 최대 노출 건수와 정렬 규칙은 BE 응답 정책에서 확정한다. |

### SCR-08 완료 및 보상 화면

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `rewardResult.focusSessionId`, `rewardResult.treeCount`, `rewardResult.spAmount`, `rewardResult.grantedAt`, `updatedStatsSnapshot.totalSp`, `updatedStatsSnapshot.currentLevel`, `updatedStatsSnapshot.todayTreeCount`, `updatedStatsSnapshot.completedFocusSessionCount`, `syncStatus`, `levelUpStatus` |
| 주요 액션/API 후보 | `grantRewardOnFocusComplete`, `acknowledgeReward`, `queueKpiEvent(focus_session_completed)`, `queueKpiEvent(reward_granted_first_time, 로그인 사용자 기준 auth_signup_success 이후 첫 보상 획득 시)` |
| 서버 저장 사실값 | `RewardGrant`, `FocusSession.status = COMPLETED`, 갱신된 `UserProfile.totalSp`, 갱신된 `DailySummary` |
| 로컬/런타임 상태 | 저장 중 로딩, CTA 비활성 상태 |
| 파생/집계 값 | `levelUp = afterLevel > beforeLevel`, `afterLevel = Floor(totalSp / 1000) + 1` |
| 주요 엔티티 후보 | `RewardGrant`, `FocusSession`, `UserProfile`, `DailySummary`, `KpiEventQueue` |
| 추가 메모 | 완료 응답은 delta-only가 아니라 `rewardResult`와 `updatedStatsSnapshot` 기준으로 해석한다. BE 응답의 `reward`, `dailyStat`, `progressSnapshot`을 이 UI semantic field에 매핑한다. |

### SCR-09 회원가입 및 로그인

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `authState`, `taskCount`, `activeSession(optional)`, `localModeFlag`, `bootstrapPendingStatus`, `localDataPreservedNotice(optional)` |
| 주요 액션/API 후보 | `signUp(email, password)`, `logIn(email, password)`, `enterLocalMode`, `bootstrapAfterLogin`, `migrateLocalDataToServer`, `queueKpiEvent(app_first_open, 최초 진입 또는 신규 설치 후 첫 앱 구동 시 1회)` |
| 서버 저장 사실값 | `User`, `AuthSession`, 로그인 후 `Task/FocusSession/RewardGrant/UserSetting` 마이그레이션 결과 |
| 로컬/런타임 상태 | 폼 입력값, 필드 에러, 비밀번호 표시/숨김, 로그인 로딩, 로컬 준비중 상태 |
| 파생/집계 값 | `nextScreen = activeSession ? resolveFromSessionStatus(activeSession.status) : (taskCount === 0 ? SCR-01 : SCR-02)` |
| 주요 엔티티 후보 | `User`, `AuthSession`, `Task`, `FocusSession`, `SyncState`, `KpiEventQueue` |
| 추가 메모 | 토큰 재발급은 `auth/refresh`와 CSRF double-submit 검증을 따르고, 로그인 직후 로컬 데이터 연결은 `deviceId` + `clientGeneratedId` 기준 bootstrap 병합으로 처리한다. `app_first_open`은 device/install scope dedupeKey로 1회만 적재한다. |

### SCR-10 프로필 및 환경설정

| 구분 | 계약 항목 |
| --- | --- |
| 필수 조회 필드 | `profile.userId(optional in UI)`, `profile.email`, `profile.totalSp`, `profile.currentLevel`, `profile.todayTreeCount`, `profile.connectionState`, `userSettings.themeMode`, `userSettings.timezone`, `userSettings.autoSyncEnabled`, `syncState.lastSyncAt`, `syncState.status`, `syncState.hasConflict`, `syncState.retryable`, `syncState.localDataPreserved`, `localModeFlag` |
| 주요 액션/API 후보 | `updateTheme`, `updateTimezone`, `toggleAutoSync`, `manualSync`, `logout` |
| 서버 저장 사실값 | `UserProfile`, `UserSetting`, `SyncState/Conflict` |
| 로컬/런타임 상태 | 설정 저장 중 로딩, 토글 optimistic 상태, 에러 안내 open/close |
| 파생/집계 값 | `currentLevel = Floor(totalSp / 1000) + 1`(미저장 가능), 연결 상태 라벨 |
| 추가 메모 | timezone 변경 시 과거 `DailySummary`를 소급 재집계하지 않는다. 변경 이후 완료 세션부터 새 timezone 기준을 적용한다. |

---

### 4.1 보조 레이어 매핑

- `SCR-02-A`: `createTaskDraft`, validation error, saving 상태를 가진 과제 생성 입력 레이어
- `SCR-02-B`: `editTaskDraft`, validation error, saving 상태를 가진 과제 수정 입력 레이어
- `SCR-02-C`: `deleteTargetTaskId`, deleting 상태를 가진 과제 삭제 확인 다이얼로그
- `SCR-09-A`: `bootstrapPendingStatus`, `syncConflictNotice`, `localDataPreservedNotice`, `networkRetry CTA`, `applyServerSnapshot CTA` 상태를 가진 bootstrap 동기화 레이어

---

## 5. BE/API 연동 확정 정책 및 남은 미정 항목

### 5.1 남은 미정 항목

- Empty 안내 문구와 비활성 사유 카피는 카피 문서 정본에서 최종 관리한다.
- 대시보드 리스트의 `보조 설명` 필드 정의: 카테고리, 일정, 최근 수정 시각 중 무엇을 노출할지 UI 정본에서 최종 확정한다.

### 5.2 이번 라운드에서 고정된 연동 정책

- `Task.status` 저장 enum은 V1에서 `PENDING / COMPLETED`만 사용한다. UI의 `진행중` 필터는 활성 `FocusSession` 연결 여부로 파생한다.
- 로그인 직후 `bootstrapAfterLogin` 응답은 render-ready snapshot만 포함한다. 범위는 `tasks`, `activeSession?`, `dashboardSummary`, `rewardSnapshot`, `profile`, `setting`, `syncState`, `cursor`이며 reward/history 전체는 제외한다.
- `409 Conflict` 공통 스키마는 `entityType`, `entityId`, `clientVersion?`, `serverVersion`, `serverSnapshot`, `conflictFields?`, `resolutionStrategy=REPLACE_LOCAL_WITH_SERVER`, `retryable=false`를 사용한다.
- KPI dedupe는 전송 멱등성용 `eventId` unique와 의미 중복 방지용 `eventName + dedupeKey`를 함께 사용한다. `APP_FIRST_OPEN`, `AUTH_SIGNUP_SUCCESS`, `FOCUS_SESSION_COMPLETED`, `REWARD_GRANTED_FIRST_TIME`는 고정 dedupeKey를 사용한다.
- timezone 변경 시 과거 `DailySummary` 재계산은 V1 범위 밖이며, 변경 이후 완료 세션부터만 새 timezone 기준을 적용한다.
---

## 6. 사용 권장 방식

1. `ui_text_definition.md`에서 먼저 화면 구조와 상태 흐름을 확정한다.
2. 이 계약표에서 semantic data, 상태 enum, KPI 발화 조건을 확정한다.
3. BE 문서는 이를 바탕으로 endpoint, request/response payload, 상태 코드, idempotency를 확정한다.
4. DB 문서는 최종 테이블, 컬럼, 인덱스, 제약조건, 머티리얼라이즈드 집계 여부를 확정한다.

이 문서는 `화면 -> 데이터 의미 -> API/DB 세분화`로 넘어가는 중간 다리 문서로 사용한다.
