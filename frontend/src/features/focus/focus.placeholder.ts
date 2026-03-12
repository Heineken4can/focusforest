export const focusControls = [
  { label: 'Pause', variant: 'secondary' },
  { label: '포기하기', variant: 'primary' },
] as const;

export const focusStatuses = [
  {
    code: 'RUNNING',
    tone: 'toss-blue',
    description: '집중 진행 중, Pause / Give Up만 허용',
  },
  {
    code: 'PAUSED',
    tone: 'toss-yellow',
    description: '5분 유예 시간 내 Resume 또는 Give Up 결정',
  },
  {
    code: 'BREAK_RUNNING',
    tone: 'toss-green',
    description: '휴식 타이머 진행, Skip 허용',
  },
  {
    code: 'COMPLETED',
    tone: 'reward',
    description: '보상 확인 후 Break 단계로 이동',
  },
] as const;

export const readOnlySidebarCards = [
  {
    title: '다음 작업 후보',
    description: 'BE render-ready snapshot의 nextTaskCandidates(max 2) 영역',
  },
  {
    title: '오늘 완료 세션',
    description: 'DailySummary.completedFocusSessionCount read only 영역',
  },
  {
    title: '현재 핵심 과제',
    description: 'Focus session과 연결된 Task 요약 카드',
  },
] as const;
