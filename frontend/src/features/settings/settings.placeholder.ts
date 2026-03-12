import type { ThemeMode } from '@/lib/theme/theme';

export const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export const settingsSections = [
  {
    title: '타임존 설정',
    description: '변경 이후 완료 세션부터 새 timezone 기준을 적용하는 영역',
  },
  {
    title: '자동 동기화',
    description: '로컬-서버 동기화 정책과 retry 표시를 둘 설정 그룹',
  },
  {
    title: '수동 동기화',
    description: 'SyncState.lastSyncAt, retryable, hasConflict 연결 영역',
  },
  {
    title: '로그아웃',
    description: 'auth/logout + CSRF double-submit 흐름의 진입 버튼 영역',
  },
] as const;
