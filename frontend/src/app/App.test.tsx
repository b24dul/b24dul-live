import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('isolated frontend foundation', () => {
  it('identifies the page as a preview and links to the live site', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Isolated development preview')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /visit current site/i })).toHaveAttribute(
      'href',
      'https://b24dul.github.io/b24dul-live/',
    );
  });
});
