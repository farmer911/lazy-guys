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

  it('supports switching between JD Link URL and PDF upload while rejecting non-PDF files', async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(portfolioApi, 'sendContact').mockResolvedValue({
      ok: true,
      id: 'sub-123',
      submittedDate: '2026-11-26',
      jdType: 'link',
      receivedAt: '2026-11-26T00:00:00.000Z',
    });

    render(<ContactForm preferredSlot="Thursday · 02:00 PM ICT" />);

    await user.type(screen.getByLabelText(/name/i), 'Sarah Jenkins');
    await user.type(screen.getByLabelText(/email/i), 'sarah@scaleup.io');
    await user.type(screen.getByLabelText(/message/i), 'Staff Full-Stack inquiry');

    await user.click(screen.getByRole('button', { name: /jd link/i }));
    await user.type(screen.getByLabelText(/jd url/i), 'https://boards.greenhouse.io/scaleup/123');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sarah Jenkins',
        jdUrl: 'https://boards.greenhouse.io/scaleup/123',
        preferredSlot: 'Thursday · 02:00 PM ICT',
      })
    );

    await user.click(screen.getByRole('button', { name: /upload pdf/i }));
    const fileInput = screen.getByLabelText(/upload jd pdf/i);

    const badFile = new File(['<html>not a pdf</html>'], 'evil.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, badFile);
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid pdf/i);

    const validPdf = new File(['%PDF-1.4\n%%EOF\n'], 'staff-jd.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, validPdf);
    await user.type(screen.getByLabelText(/name/i), 'Sarah Jenkins');
    await user.type(screen.getByLabelText(/email/i), 'sarah@scaleup.io');
    await user.type(screen.getByLabelText(/message/i), 'Attached PDF JD');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(sendSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        jdPdf: expect.objectContaining({
          fileName: 'staff-jd.pdf',
          mimeType: 'application/pdf',
        }),
      })
    );

    sendSpy.mockRestore();
  });
});
