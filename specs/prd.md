# Product Requirements Document — Lazy Guy Recruiter Portfolio

## 1. Problem & Target Persona

Engineering managers and technical recruiters evaluate dozens of candidate portfolios in under two minutes per profile. They need a single, fast-loading, mobile-and-desktop scannable portfolio that proves real engineering impact, chronological career progression, shipped projects, technical depth by category, and a frictionless way to reach out—without broken links, layout shifts, or ambiguous dates.

## 2. Sitemap & User Flows

1. **Sticky Section Navigation (`Top Bar`):** Jump directly to `About`, `Experience`, `Projects`, `Tech Stack`, or `Contact` on desktop (`1280x800`) and mobile (`375x812`).
2. **Hero & Candidate Summary (`#about`):** Read candidate name, availability status, headline, short bio, location, quantified key achievements, and external profile actions (`GitHub`, `LinkedIn`, direct email, and optional CV download in `feat-005`).
3. **Career Timeline (`#experience`):** Scan chronological roles with company, title, location, UTC-accurate date range (`Present` for current role), role summary, and measurable highlights.
4. **Featured Work (`#projects`):** Inspect shipped projects with role, summary, bullet highlights, technology tags, source repository link, and live demo link (extensible to a project detail view in `feat-005`).
5. **Filterable Capabilities (`#tech-stack`):** Filter skills by `All` or domain category (`Frontend`, `Backend`, `Database`, `Testing`, `DevOps`) and compare years of experience and proficiency percentage.
6. **Recruiter Quick Contact (`#contact`):** Submit recruiter name, work email, and message with immediate validation and confirmation feedback.

## 3. Data Capabilities Visible to User

- **Candidate Profile:** Full name, availability badge, headline, short biography, city/country location, contact email, external profile links, optional resume link, and list of quantified career achievements.
- **Work Experience Entry:** Company name, job title, work location, start month/year, end month/year or current-role indicator, concise responsibility summary, and impact highlights.
- **Project Entry:** Project title, unique slug, contributor role, concise problem/outcome summary, key engineering highlights, technology tags, optional repository URL, and optional live demo URL.
- **Technology Capability:** Skill name, domain category, proficiency percentage (`1–100%`), and years of hands-on experience.
- **Recruiter Inquiry Submission:** Sender name, sender email address, inquiry message body, and delivery confirmation or actionable error notice.

## 4. Mandatory UI States

- **`loading`:** Navigation shell and dark surface layout remain stable with zero horizontal or vertical layout jump while portfolio sections populate.
- **`empty`:** Empty experience, project, or filtered category lists render clean section framing without broken cards or crashes; optional links (`live demo`, `resume`) omit cleanly when absent.
- **`validation-error`:** Submitting blank/whitespace fields or an invalid email address blocks submission and displays field-level guidance (`Name is required`, `Valid email is required`, `Message is required`).
- **`network-error`:** Failed contact delivery keeps user input intact, re-enables the submit button, and announces an accessible alert (`Failed to send message. Please try again.`).
- **`375px` mobile viewport:** All navigation links, action buttons, cards, filter chips, and form controls wrap cleanly within `375x812` with zero horizontal scrollbar (`scrollWidth <= innerWidth`).

## 5. Measurable Acceptance Criteria

1. **Given** a recruiter opens the portfolio on desktop (`1280x800`) or mobile (`375x812`), **When** the page finishes loading, **Then** Candidate Summary, Experience Timeline, Projects, Tech Stack, and Quick Contact render live data with zero console errors and zero horizontal overflow.
2. **Given** an experience entry starts on `Jan 2024` and is marked current, **When** viewed from any browser timezone (including US/Western offsets), **Then** the timeline displays `Jan 2024 — Present` without shifting back a day or month.
3. **Given** the Tech Stack section displays `All` skills by default, **When** the recruiter selects a specific category chip (e.g., `Backend`), **Then** only skills in that category remain visible and selecting `All` restores the full list.
4. **Given** the recruiter submits Quick Contact with whitespace-only name/message or malformed email, **When** clicking `Send Message`, **Then** no network submission succeeds and explicit validation messages appear next to the invalid fields.
5. **Given** the recruiter enters valid name, email, and message, **When** clicking `Send Message`, **Then** the button disables while sending, resets the form on completion, and confirms `Message sent. Thank you!`.
