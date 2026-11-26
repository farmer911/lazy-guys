---
id: "zod-rhf-schema-validation"
title: "Zod v4 Schema Validation & React Hook Form Integration"
description: "Wire shared Zod v4 contract schemas into useForm via zodResolver without duplicating RHF state in useState, guard IME Enter composition, and preserve inputs on submit error."
tags: ["zod", "zodResolver", "react-hook-form", "validation", "useForm", "isComposing", "ime", "aria-invalid"]
maturity: "stable"
---

# Zod v4 Schema Validation & React Hook Form Integration

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Validated forms backed by shared `specs/contracts/*` Zod v4 schemas

Consume the shared Zod v4 schema (`z.string().trim().min(1)` and `.pipe(z.email(...))`) directly from `specs/contracts/*` via `zodResolver`, keeping `react-hook-form` as the single source of truth for field values.

```tsx
import { useState, type KeyboardEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

// Canonical schema exported from specs/contracts/portfolio.ts:
export const QuickNoteSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Valid email is required')),
  message: z.string().trim().min(1, 'Message is required'),
});
export type QuickNoteInput = z.infer<typeof QuickNoteSchema>;

export const QuickNoteForm = ({
  onSubmitNote,
}: {
  readonly onSubmitNote: (payload: QuickNoteInput) => Promise<void>;
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickNoteInput>({
    resolver: zodResolver(QuickNoteSchema),
    defaultValues: { email: '', message: '' },
  });

  const handleCompositionEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  };

  const onValid = async (values: QuickNoteInput) => {
    setSubmitError(null);
    try {
      await onSubmitNote(values);
      reset();
    } catch {
      setSubmitError('Unable to send note. Your draft is preserved — please retry.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} onKeyDown={handleCompositionEnter} noValidate>
      <label htmlFor="note-email" className="block text-xs font-medium text-slate-300">Email</label>
      <input
        id="note-email"
        type="email"
        aria-invalid={Boolean(errors.email)}
        aria-describedby={errors.email ? 'note-email-error' : undefined}
        {...register('email')}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      />
      {errors.email && (
        <p id="note-email-error" role="alert" className="text-xs text-rose-400">
          {errors.email.message}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </Button>
      {submitError && <p role="alert" className="text-sm text-rose-400">{submitError}</p>}
    </form>
  );
};
```

- **DO** call `reset()` **only inside `try` after `await` succeeds**, wrapping `await onSubmitNote(values)` in `try/catch` to surface a `role="alert"` banner while preserving every character the user typed.
- **DO** use Zod v4 `z.string().trim().min(1).pipe(z.email('Valid email is required'))` from `specs/contracts/*` and set `noValidate` on `<form>` so consistent accessible errors render instead of browser-specific tooltips.
- **DON'T** mirror `register('message')` fields into parallel `const [draft, setDraft] = useState('')` via manual `onChange` — programmatic `reset()` or `setValue()` updates desynchronize the controlled value from RHF state.
- **DON'T** hand-roll inline email regexes inside `register('email', { pattern: /.../ })` when a shared Zod contract schema exists.

### Rule 2: Reading live field values for character counters or conditional sections

Subscribe with `useWatch({ control, name: 'message' })` inside the narrowest child component that needs the live preview instead of calling root `watch()` across the entire form.

- **DO** guard `Enter`-to-submit handlers on `<form>` or `<textarea>` with `event.nativeEvent.isComposing || event.keyCode === 229` so Vietnamese (Telex/VNI) and CJK syllable commits never trigger premature submission.
- **DON'T** call bare `watch()` at the top of a large form component, which re-renders every input on each keystroke.

## When NOT to replace legacy code

- **Keep existing pattern when:** A single standalone search/filter `<input>` performs instant client-side filtering with zero validation rules or async submission lifecycle — plain controlled state or URL search params is lighter than `useForm`.
