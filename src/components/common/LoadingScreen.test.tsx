import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('should render loading spinner', () => {
    render(<LoadingScreen />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeDefined();
  });

  it('should display loading text', () => {
    render(<LoadingScreen />);
    const loadingText = screen.getByText(/cargando/i);
    expect(loadingText).toBeDefined();
    expect(loadingText.textContent).toMatch(/cargando/i);
  });

  it('should have correct aria-label', () => {
    render(<LoadingScreen />);
    const spinner = screen.getByRole('status');
    expect(spinner.getAttribute('aria-label')).toBe('Cargando');
  });

  it('should render with animated spinner icon', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstChild).toBeDefined();
    const animatedElement = container.querySelector('.animate-spin');
    expect(animatedElement).toBeDefined();
  });

  it('should have proper CSS classes for centering', () => {
    const { container } = render(<LoadingScreen />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('flex');
    expect(mainContainer.className).toContain('justify-center');
    expect(mainContainer.className).toContain('items-center');
  });
});