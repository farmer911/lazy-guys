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

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>();

  const onSubmit = async (values: ContactFormValues) => {
    await portfolioApi.sendContact(values);
    setSubmitted(true);
    reset();
  };

  return (
    <section id="contact">
      <Card>
        <CardHeader>
          <CardTitle>Recruiter Quick Contact</CardTitle>
          <CardDescription>Send a direct note about roles, interviews, or projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Your name"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
                {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  placeholder="recruiter@company.com"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <textarea
                rows={3}
                {...register('message', { required: 'Message is required' })}
                placeholder="Role details or interview availability..."
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              {errors.message && <p className="text-xs text-rose-400">{errors.message.message}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
              {submitted && (
                <span className="text-sm text-emerald-400">Message sent. Thank you!</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
