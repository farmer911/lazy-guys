import { useState, type KeyboardEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Send } from 'lucide-react';
import {
  ContactSubmissionSchema,
  type ContactSubmissionInput,
} from '@contracts/portfolio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { portfolioApi } from '@/lib/api';

const INPUT_CLASS_NAME =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40';

export const ContactForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactSubmissionInput>({
    resolver: zodResolver(ContactSubmissionSchema),
    defaultValues: { name: '', email: '', message: '' },
  });

  const handleCompositionEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  };

  const onSubmit = async (values: ContactSubmissionInput) => {
    setSubmitted(false);
    setSubmitError(null);
    try {
      await portfolioApi.sendContact(values);
      setSubmitted(true);
      reset();
    } catch {
      setSubmitError('Failed to send message. Please try again.');
    }
  };

  const onInvalid = () => {
    setSubmitted(false);
    setSubmitError(null);
  };

  return (
    <section id="contact">
      <Card>
        <CardHeader>
          <CardTitle>Recruiter Quick Contact</CardTitle>
          <CardDescription>Send a direct note about roles, interviews, or projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            onKeyDown={handleCompositionEnter}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="contact-name" className="block text-xs font-medium text-slate-300">
                  Name
                </label>
                <input
                  id="contact-name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  {...register('name')}
                  placeholder="Your name"
                  className={INPUT_CLASS_NAME}
                />
                {errors.name && (
                  <p id="contact-name-error" role="alert" className="text-xs text-rose-400">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="contact-email" className="block text-xs font-medium text-slate-300">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  {...register('email')}
                  placeholder="recruiter@company.com"
                  className={INPUT_CLASS_NAME}
                />
                {errors.email && (
                  <p id="contact-email-error" role="alert" className="text-xs text-rose-400">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-message" className="block text-xs font-medium text-slate-300">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={3}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                {...register('message')}
                placeholder="Role details or interview availability..."
                className={INPUT_CLASS_NAME}
              />
              {errors.message && (
                <p id="contact-message-error" role="alert" className="text-xs text-rose-400">
                  {errors.message.message}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
              {submitted && (
                <span role="status" className="text-sm text-emerald-400">
                  Message sent. Thank you!
                </span>
              )}
              {submitError && (
                <p role="alert" className="text-sm text-rose-400">
                  {submitError}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};
