import { Award, Code2, Globe, Mail, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Profile } from '@/lib/api';

interface AboutSectionProps {
  profile: Profile;
}

export function AboutSection({ profile }: AboutSectionProps) {
  return (
    <section id="about" className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Badge>Open to Opportunities</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            {profile.full_name}
          </h1>
          <p className="text-lg text-sky-400">{profile.headline}</p>
          <p className="max-w-2xl text-slate-300">{profile.bio}</p>
          {profile.location && (
            <p className="flex items-center gap-1.5 text-sm text-slate-400">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.github_url && (
            <a href={profile.github_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Code2 className="h-4 w-4" /> GitHub
              </Button>
            </a>
          )}
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4" /> LinkedIn
              </Button>
            </a>
          )}
          <a href={`mailto:${profile.email}`}>
            <Button size="sm">
              <Mail className="h-4 w-4" /> Contact
            </Button>
          </a>
        </div>
      </div>

      {profile.achievements.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <Award className="h-4 w-4 text-sky-400" /> Key Achievements
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {profile.achievements.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
