import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { describe, expect, it, vi } from 'vitest';
import { ErrorFallback } from '../ErrorFallback';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Boom');
  }
  return <p>Recovered content</p>;
}

describe('ErrorFallback with ErrorBoundary', () => {
  it('renders fallback on error and resets on retry click', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    let shouldThrow = true;

    const { rerender } = render(
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          shouldThrow = false;
        }}
      >
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();

    shouldThrow = false;
    rerender(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    spy.mockRestore();
  });
});
