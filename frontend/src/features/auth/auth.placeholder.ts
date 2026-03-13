export const authTabs = [
  { value: 'login', label: '로그인' },
  { value: 'signup', label: '회원가입' },
] as const;

export const authSubmissionStates = {
  loading: {
    title: '잠시만요',
    description: '입력한 정보를 확인하고 있어요.',
  },
  success: {
    loginTitle: '로그인이 완료됐어요',
    signupTitle: '회원가입이 완료됐어요',
    description: '이제 바로 Focus Forest를 시작할 수 있어요.',
    bootstrapDescription: '계정 준비가 끝나면 바로 Focus Forest를 시작할 수 있어요.',
  },
} as const;