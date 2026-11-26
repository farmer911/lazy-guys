import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ContactSubmissionInput } from '@contracts/portfolio';
import { ContactForm } from '@/components/ContactForm';
import { portfolioApi } from '@/lib/api';

describe('ContactForm', () => {
  it('exposes accessible labels, trims whitespace, and handles API errors cleanly', async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(portfolioApi, 'sendContact');

    render(<ContactForm />);

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);

    await user.type(nameInput, '   ');
    await user.type(emailInput, 'recruiter@acme.com');
    await user.type(messageInput, '   ');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(sendSpy).not.toHaveBeenCalled();
    expect(nameInput).toHaveAttribute('aria-describedby', 'contact-name-error');
    expect(messageInput).toHaveAttribute('aria-describedby', 'contact-message-error');
    expect(screen.getAllByRole('alert').length).toBe(2);

    const validPayload: ContactSubmissionInput = {
      name: 'Jane',
      email: 'recruiter@acme.com',
      message: 'Open Senior Engineer role',
    };
    sendSpy.mockResolvedValueOnce({ ok: true, receivedAt: '2026-11-22T00:00:00.000Z' });
    await user.clear(nameInput);
    await user.clear(messageInput);
    await user.type(nameInput, validPayload.name);
    await user.type(messageInput, validPayload.message);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/message sent\. thank you!/i);

    sendSpy.mockRejectedValueOnce(new Error('Network failure'));
    await user.type(nameInput, 'Jane');
    await user.type(emailInput, 'recruiter@acme.com');
    await user.type(messageInput, 'Follow-up note');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to send/i);
    expect(screen.queryByText(/message sent\. thank you!/i)).not.toBeInTheDocument();
    expect(nameInput).toHaveValue('Jane');
    expect(emailInput).toHaveValue('recruiter@acme.com');
    expect(messageInput).toHaveValue('Follow-up note');

    sendSpy.mockRestore();
  });

  it('suppresses premature Enter submit during Vietnamese IME composition and preserves focus-visible rings', async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(portfolioApi, 'sendContact').mockResolvedValue({
      ok: true,
      receivedAt: '2026-11-26T00:00:00.000Z',
    });

    render(<ContactForm />);

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);

    expect(nameInput.className).toMatch(/focus-visible:ring/);
    expect(emailInput.className).toMatch(/focus-visible:ring/);
    expect(messageInput.className).toMatch(/focus-visible:ring/);

    await user.type(nameInput, 'Nguyễn Phúc');
    await user.type(emailInput, 'phuc@acme.vn');
    await user.type(messageInput, 'Trao đổi vị trí Senior');

    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    const allowed = nameInput.dispatchEvent(composingEnter);
    expect(allowed).toBe(false);
    expect(sendSpy).not.toHaveBeenCalled();

    sendSpy.mockRestore();
  });
});
