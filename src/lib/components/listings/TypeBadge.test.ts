// @vitest-environment jsdom
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import TypeBadge from './TypeBadge.svelte';

describe('TypeBadge', () => {
  it('renders the type', () => {
    render(TypeBadge, { type: 'romhack' });
    expect(screen.getByText('romhack')).toBeInTheDocument();
  });
});
