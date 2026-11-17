import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  GlassCard,
  IconButton,
  LoadingSkeleton,
  Modal,
  PrimaryButton,
  StatusIndicator,
  Toast,
} from './ui';

describe('design-system components', () => {
  it('renders semantic glass cards and status labels', () => {
    render(
      <>
        <GlassCard aria-label="Example card">Sample</GlassCard>
        <StatusIndicator status="warning">Not connected</StatusIndicator>
      </>,
    );
    expect(screen.getByRole('article', { name: 'Example card' })).toHaveClass('glass-panel');
    expect(screen.getByText('Not connected')).toBeVisible();
  });

  it('supports real disabled buttons and labelled icon actions', () => {
    const handler = vi.fn();
    render(
      <>
        <PrimaryButton disabled onClick={handler}>Disabled</PrimaryButton>
        <IconButton label="Open menu" icon={<span>+</span>} onClick={handler} />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(handler).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('exposes accessible loading and dismissible notification states', () => {
    const onDismiss = vi.fn();
    render(
      <>
        <LoadingSkeleton label="Loading preview" />
        <Toast message="Sample notification" onDismiss={onDismiss} />
      </>,
    );
    expect(screen.getByRole('status', { name: 'Loading preview' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('opens a labelled dialog, closes on Escape and restores focus', () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <PrimaryButton onClick={() => setOpen(true)}>Open dialog</PrimaryButton>
          <Modal open={open} title="Example dialog" onClose={() => setOpen(false)}>
            <p>Sample content</p>
          </Modal>
        </>
      );
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Example dialog' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
