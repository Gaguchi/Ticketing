import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock antd's Grid.useBreakpoint
const mockUseBreakpoint = vi.fn();

vi.mock('antd', () => ({
  Grid: {
    useBreakpoint: () => mockUseBreakpoint(),
  },
}));

import { useIsMobile } from '../useIsMobile';

describe('useIsMobile', () => {
  it('should return true when viewport is below md breakpoint', () => {
    mockUseBreakpoint.mockReturnValue({ xs: true, sm: true, md: false });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should return false when viewport is at or above md breakpoint', () => {
    mockUseBreakpoint.mockReturnValue({ xs: true, sm: true, md: true, lg: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should return true when all breakpoints are false (very small screen)', () => {
    mockUseBreakpoint.mockReturnValue({ xs: false, sm: false, md: false });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should return false when md is true and larger breakpoints are also true', () => {
    mockUseBreakpoint.mockReturnValue({
      xs: true,
      sm: true,
      md: true,
      lg: true,
      xl: true,
      xxl: true,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should return true when breakpoints object is empty', () => {
    mockUseBreakpoint.mockReturnValue({});

    const { result } = renderHook(() => useIsMobile());

    // !undefined === true
    expect(result.current).toBe(true);
  });
});
