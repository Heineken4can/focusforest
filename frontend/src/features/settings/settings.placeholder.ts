import type { ThemeMode } from '@/lib/theme/theme';

export const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export const settingsSections = [
  {
    title: '타임존',
    description: '현재 위치와 생활 리듬에 맞는 시간 기준을 설정할 수 있습니다.',
  },
  {
    title: '자동 동기화',
    description: '기록이 여러 기기에서 자연스럽게 이어지도록 준비합니다.',
  },
  {
    title: '수동 동기화',
    description: '원할 때 직접 최신 상태를 확인하고 정리할 수 있습니다.',
  },
  {
    title: '로그아웃',
    description: '현재 계정 연결을 해제하고 로그인 화면으로 돌아갑니다.',
  },
] as const;