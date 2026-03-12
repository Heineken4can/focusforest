export const dashboardFilters = ['전체', '진행중', '완료'] as const;

export const dashboardSummaryCards = [
  {
    label: '오늘 집중 시간',
    value: '0m',
    description: 'DailySummary.todayFocusMinutes placeholder',
  },
  {
    label: '완료 세션 수',
    value: '0',
    description: 'completedFocusSessionCount placeholder',
  },
  {
    label: '누적 SP',
    value: '0',
    description: 'UserProfile.totalSp placeholder',
  },
  {
    label: '현재 레벨',
    value: 'LV.1',
    description: 'Floor(totalSp / 1000) + 1',
  },
] as const;
