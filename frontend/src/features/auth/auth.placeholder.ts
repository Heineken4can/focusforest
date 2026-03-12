export const authTabs = [
  { value: 'login', label: '로그인' },
  { value: 'signup', label: '회원가입' },
] as const;

export const authBootstrapStates = {
  loading: {
    title: 'bootstrap 동기화 준비',
    description: '로그인 성공 직후 render-ready snapshot을 가져오는 차단형 overlay 영역입니다.',
  },
  conflict: {
    title: 'bootstrap 충돌 안내',
    description: 'serverSnapshot 기준으로 최신 상태 반영 CTA를 배치할 자리를 미리 확보합니다.',
  },
} as const;
