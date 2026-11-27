import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContactSubmissionInput } from '@contracts/portfolio';
import { ContactForm } from '@/components/ContactForm';
import { portfolioApi } from '@/lib/api';
import { usePortfolioStore } from '@/store/usePortfolioStore';

describe('ContactForm (Zod RHF, IME Guard, Drag-Drop PDF & Error Preservation)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    usePortfolioStore.setState({ locale: 'en' });
  });
  it('validates required fields, trims whitespace, preserves inputs on API failure, and resets on success', async () => {
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
    sendSpy.mockResolvedValueOnce({
      ok: true,
      id: 'sub-1',
      submittedDate: '2026-11-27',
      jdType: 'none',
      receivedAt: '2026-11-27T00:00:00.000Z',
    });

    await user.clear(nameInput);
    await user.clear(messageInput);
    await user.type(nameInput, validPayload.name);
    await user.type(messageInput, validPayload.message);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/message sent\. thank you!/i);
    expect(status).toHaveTextContent(/2026-11-27/);

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

  it('guards Vietnamese IME Enter composition and maintains focus-visible rings', async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(portfolioApi, 'sendContact').mockResolvedValue({
      ok: true,
      receivedAt: '2026-11-27T00:00:00.000Z',
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

  it('supports None / JD Link / Upload PDF modes, accepts %PDF- even when file.type is empty, and rejects non-PDFs', async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(portfolioApi, 'sendContact').mockResolvedValue({
      ok: true,
      id: 'sub-123',
      submittedDate: '2026-11-27',
      jdType: 'link',
      receivedAt: '2026-11-27T00:00:00.000Z',
    });

    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'Sarah Jenkins');
    await user.type(screen.getByLabelText(/email/i), 'sarah@scaleup.io');
    await user.type(screen.getByLabelText(/message/i), 'Staff Full-Stack inquiry');

    const noneBtn = screen.getByRole('button', { name: /^none$/i });
    const jdLinkBtn = screen.getByRole('button', { name: /jd link/i });
    const pdfBtn = screen.getByRole('button', { name: /upload pdf/i });

    expect(noneBtn).toHaveAttribute('aria-pressed', 'true');
    expect(jdLinkBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(jdLinkBtn);
    expect(jdLinkBtn).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByLabelText(/jd url/i), 'https://boards.greenhouse.io/scaleup/123');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sarah Jenkins',
        jdUrl: 'https://boards.greenhouse.io/scaleup/123',
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/i),
      })
    );

    await user.click(pdfBtn);
    expect(pdfBtn).toHaveAttribute('aria-pressed', 'true');
    const fileInput = screen.getByLabelText(/upload jd pdf/i);

    const badFile = new File(['<html>not a pdf</html>'], 'evil.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, badFile);
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid pdf/i);

    const emptyMimeValidPdf = new File(['%PDF-1.4\n%%EOF\n'], 'staff-jd.pdf', { type: '' });
    await user.upload(fileInput, emptyMimeValidPdf);
    expect(screen.getByText(/staff-jd\.pdf/i)).toBeInTheDocument();

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

  it('translates visible Zod validation alerts and labels dynamically when switching EN <-> VI without clearing user input', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const nameInput = screen.getByLabelText(/your full name/i);
    const emailInput = screen.getByLabelText(/work email/i);

    await user.type(nameInput, '   ');
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Valid email is required')).toBeInTheDocument();
    expect(screen.getByText('Message is required')).toBeInTheDocument();

    act(() => {
      usePortfolioStore.getState().setLocale('vi');
    });

    expect(screen.getByLabelText('Họ và tên của bạn')).toBeInTheDocument();
    expect(screen.getByLabelText('Email công việc')).toHaveValue('invalid-email');
    expect(screen.getByText('Vui lòng nhập họ và tên')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập địa chỉ email hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập nội dung tin nhắn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gửi tin nhắn/i })).toBeInTheDocument();
  });
});
