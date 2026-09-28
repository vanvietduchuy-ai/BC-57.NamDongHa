import { useSyncExternalStore } from 'react';

// Màn hình rộng (mặc định ≥ 1280px): bố cục danh sách + khung chi tiết
export function useManRong(mq = '(min-width: 1280px)') {
  return useSyncExternalStore(
    (f) => { const m = window.matchMedia(mq); m.addEventListener('change', f); return () => m.removeEventListener('change', f); },
    () => window.matchMedia(mq).matches,
    () => false,
  );
}
