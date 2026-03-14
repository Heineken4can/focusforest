import React, { useEffect, useState } from 'react';

type RewardAnimationProps = {
  awardedSp: number;
  awardedTrees: number;
  onComplete?: () => void;
};

export const RewardAnimation: React.FC<RewardAnimationProps> = ({
  awardedSp,
  awardedTrees,
  onComplete,
}) => {
  const [stage, setSetStage] = useState<'sp' | 'tree' | 'done'>('sp');

  useEffect(() => {
    const timer1 = setTimeout(() => setSetStage('tree'), 2000);
    const timer2 = setTimeout(() => {
      setSetStage('done');
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  if (stage === 'done') return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-toss-overlay/40 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="text-center space-y-8">
        {stage === 'sp' && (
          <div className="animate-in zoom-in slide-in-from-bottom-8 duration-700 ease-out-toss">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-toss-blue/20 text-toss-blue mb-4">
              <svg className="w-12 h-12 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-toss-textMain">+{awardedSp} SP</h2>
            <p className="text-xl text-toss-textSub mt-2">숙련도를 획득했습니다!</p>
          </div>
        )}

        {stage === 'tree' && (
          <div className="animate-in zoom-in slide-in-from-bottom-8 duration-700 ease-out-toss">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 text-green-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-toss-textMain">+{awardedTrees} Tree</h2>
            <p className="text-xl text-toss-textSub mt-2">숲에 새로운 나무를 심었습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
