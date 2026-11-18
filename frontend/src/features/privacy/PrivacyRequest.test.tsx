import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrivacyRequest } from './PrivacyRequest';

beforeEach(() => window.localStorage.clear());

describe('privacy request preview', () => {
  it('requires an explicit valid ID, keeps it out of local storage and never sends automatically', () => {
    render(<PrivacyRequest />);
    expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare email request' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid account ID');
    fireEvent.change(screen.getByLabelText('Visitor account ID'), {
      target: { value: 'visitor_123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare email request' }));
    const href = screen.getByRole('link', { name: 'Open email draft' }).getAttribute('href');
    expect(new URL(href!).searchParams.get('body')).toContain('Visitor Firebase UID: visitor_123');
    expect(JSON.stringify(window.localStorage)).not.toContain('visitor_123');
    fireEvent.change(screen.getByLabelText('Visitor account ID'), {
      target: { value: 'changed_456' },
    });
    expect(screen.queryByRole('link', { name: 'Open email draft' })).not.toBeInTheDocument();
  });
});
