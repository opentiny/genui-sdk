import { renderHook } from '@testing-library/react';
import { usePageContext, type PageContextApi } from '../src/use-context';

export function createPageContext(): PageContextApi {
  const { result } = renderHook(() => usePageContext());
  return result.current;
}
