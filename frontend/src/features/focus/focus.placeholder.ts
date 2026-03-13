export const focusControls = [
  { label: '잠시 멈추기', variant: 'secondary' },
  { label: '이번 세션 종료', variant: 'primary' },
] as const;

export const focusStatuses = [
  {
    code: 'RUNNING',
    tone: '집중 중',
    description: '방해를 줄이고 한 가지 일에만 몰입해 보세요.',
  },
  {
    code: 'PAUSED',
    tone: '잠시 멈춤',
    description: '짧게 숨을 고르고 다시 이어갈 수 있습니다.',
  },
  {
    code: 'BREAK_RUNNING',
    tone: '휴식 중',
    description: '호흡을 가다듬고 다음 세션을 준비하는 시간입니다.',
  },
  {
    code: 'COMPLETED',
    tone: '완료',
    description: '한 세션을 끝냈습니다. 다음 흐름으로 자연스럽게 이어집니다.',
  },
] as const;

export const readOnlySidebarCards = [
  {
    title: '다음에 할 일',
    description: '지금 세션이 끝나면 바로 이어서 할 작업을 확인할 수 있어요.',
  },
  {
    title: '오늘 완료한 세션',
    description: '오늘 얼마나 꾸준히 집중했는지 한눈에 볼 수 있습니다.',
  },
  {
    title: '현재 핵심 과제',
    description: '지금 가장 중요한 한 가지를 계속 놓치지 않도록 도와줍니다.',
  },
] as const;