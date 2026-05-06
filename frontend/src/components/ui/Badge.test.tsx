import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge, severityVariant } from './Badge';

describe('Badge', () => {
  it('renders its text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('applies the success variant class', () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-green-100');
  });

  it('applies the danger variant class', () => {
    const { container } = render(<Badge variant="danger">Critical</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-red-100');
  });

  it('applies the neutral variant class by default for unknown variants', () => {
    const { container } = render(<Badge variant="neutral">Unknown</Badge>);
    expect(container.firstElementChild?.className).toContain('bg-gray-100');
  });
});

describe('severityVariant', () => {
  it('maps low → info', () => expect(severityVariant('low')).toBe('info'));
  it('maps high → danger', () => expect(severityVariant('high')).toBe('danger'));
  it('maps critical → danger', () => expect(severityVariant('critical')).toBe('danger'));
});
