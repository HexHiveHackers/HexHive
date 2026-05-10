import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import CreditLine from './credit-line.svelte';

// vitest globals aren't enabled in this project, so @testing-library/svelte's
// auto-cleanup never registers — manual cleanup keeps the four renders isolated.
afterEach(() => {
  cleanup();
});

describe('CreditLine', () => {
  it('links to /u/<username> when no homepage URL', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: null,
      isPlaceholder: false,
    });
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', '/u/alice');
    expect(link).not.toHaveAttribute('target');
    expect(screen.queryByText(/placeholder credit/i)).toBeNull();
  });

  it('links to the homepage URL when set, opens new tab', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: 'https://example.com/me',
      isPlaceholder: false,
    });
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', 'https://example.com/me');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders the placeholder badge when isPlaceholder is true', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: null,
      isPlaceholder: true,
    });
    expect(screen.getByText(/placeholder credit/i)).toBeTruthy();
  });

  it('renders both badge and external link when placeholder + homepage', () => {
    render(CreditLine, {
      displayName: 'Alice',
      username: 'alice',
      homepageUrl: 'https://example.com/me',
      isPlaceholder: true,
    });
    const link = screen.getByRole('link', { name: 'Alice' });
    expect(link).toHaveAttribute('href', 'https://example.com/me');
    expect(screen.getByText(/placeholder credit/i)).toBeTruthy();
  });
});
