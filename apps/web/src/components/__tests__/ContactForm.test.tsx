import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

    sendSpy.mockResolvedValueOnce({ ok: true, receivedAt: '2026-11-22T00:00:00.000Z' });
    await user.clear(nameInput);
    await user.clear(messageInput);
    await user.type(nameInput, 'Jane');
    await user.type(messageInput, 'Open Senior Engineer role');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/message sent\. thank you!/i)).toBeInTheDocument();

    sendSpy.mockRejectedValueOnce(new Error('Network failure'));
    await user.type(nameInput, 'Jane');
    await user.type(emailInput, 'recruiter@acme.com');
    await user.type(messageInput, 'Follow-up note');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to send/i);
    expect(screen.queryByText(/message sent\. thank you!/i)).not.toBeInTheDocument();

    sendSpy.mockRestore();
  });
});
