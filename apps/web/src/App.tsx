import { useQuery } from '@tanstack/react-query';
import { AboutSection } from '@/components/AboutSection';
import { ContactForm } from '@/components/ContactForm';
import { ExperienceSection } from '@/components/ExperienceSection';
import { ProjectsSection } from '@/components/ProjectsSection';
import { TechStackSection } from '@/components/TechStackSection';
import { portfolioApi, type Experience, type Profile, type Project, type TechStack } from '@/lib/api';

const fallbackProfile: Profile = {
  id: 'fallback',
  full_name: 'Lazy Guy',
  headline: 'Full-Stack Software Engineer — React, TypeScript, Node.js & PostgreSQL',
  bio: 'Product-minded engineer focused on clean architecture, fast UX, and reliable automated testing.',
  location: 'Ho Chi Minh City, Vietnam',
  email: 'hello@lazyguy.dev',
  github_url: 'https://github.com/lazyguy',
  linkedin_url: 'https://linkedin.com/in/lazyguy',
  resume_url: null,
  avatar_url: null,
  achievements: [
    'Reduced API p95 latency by 45% via PostgreSQL indexing and query tuning',
    'Led migration to TypeScript monorepo with 90%+ E2E critical-path coverage',
  ],
};

export function App() {
  const { data: profile } = useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: portfolioApi.getProfile,
    retry: false,
  });

  const { data: experiences = [] } = useQuery<Experience[]>({
    queryKey: ['experiences'],
    queryFn: portfolioApi.getExperiences,
    retry: false,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: portfolioApi.getProjects,
    retry: false,
  });

  const { data: techStacks = [] } = useQuery<TechStack[]>({
    queryKey: ['tech-stacks'],
    queryFn: portfolioApi.getTechStacks,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-sm">
          <span className="font-semibold text-sky-400">lazy-guy</span>
          <div className="flex gap-5 text-slate-300">
            <a href="#about" className="hover:text-slate-50">About</a>
            <a href="#experience" className="hover:text-slate-50">Experience</a>
            <a href="#projects" className="hover:text-slate-50">Projects</a>
            <a href="#tech-stack" className="hover:text-slate-50">Tech Stack</a>
            <a href="#contact" className="hover:text-slate-50">Contact</a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">
        <AboutSection profile={profile ?? fallbackProfile} />
        <ExperienceSection experiences={experiences} />
        <ProjectsSection projects={projects} />
        <TechStackSection techStacks={techStacks} />
        <ContactForm />
      </main>
    </div>
  );
}

export default App;
