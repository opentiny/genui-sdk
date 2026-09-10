import { renderHook } from '@testing-library/react';
import { useContext, type PageContextApi } from '../src/use-context';

export function createContextApi(): PageContextApi {
  const { result } = renderHook(() => useContext());
  return result.current;
}
