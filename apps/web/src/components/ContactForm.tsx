import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { portfolioApi } from '@/lib/api';

interface ContactFormValues {
  name: string;
  email: string;
  message: string;
}

export const ContactForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: { name: '', email: '', message: '' },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitted(false);
    setSubmitError(null);
    try {
      await portfolioApi.sendContact({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
      });
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
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="contact-name" className="block text-xs font-medium text-slate-300">
                  Name
                </label>
                <input
                  id="contact-name"
                  {...register('name', {
                    required: 'Name is required',
                    validate: (v) => v.trim().length > 0 || 'Name is required',
                  })}
                  placeholder="Your name"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
                {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <label htmlFor="contact-email" className="block text-xs font-medium text-slate-300">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Valid email is required',
                    },
                  })}
                  placeholder="recruiter@company.com"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-message" className="block text-xs font-medium text-slate-300">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={3}
                {...register('message', {
                  required: 'Message is required',
                  validate: (v) => v.trim().length > 0 || 'Message is required',
                })}
                placeholder="Role details or interview availability..."
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              {errors.message && <p className="text-xs text-rose-400">{errors.message.message}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
              {submitted && (
                <span className="text-sm text-emerald-400">Message sent. Thank you!</span>
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
}
