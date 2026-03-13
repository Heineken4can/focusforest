export const dashboardFilters = ['전체', '진행중', '완료'] as const;

export const dashboardSummaryCards = [
  {
    label: '오늘 집중 시간',
    value: '0분',
    description: '오늘 누적한 집중 시간을 보여줍니다.',
  },
  {
    label: '완료 세션 수',
    value: '0',
    description: '오늘 끝낸 집중 세션 수입니다.',
  },
  {
    label: '누적 SP',
    value: '0',
    description: '지금까지 모은 보상 포인트입니다.',
  },
  {
    label: '현재 레벨',
    value: 'LV.1',
    description: '집중과 보상을 쌓아 레벨을 올릴 수 있어요.',
  },
] as const;