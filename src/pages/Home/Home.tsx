import Button from '@components/base/Button';
import { Badge } from '@components/module/Badge/Badge.view';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@components/module/Card/Card.view';
import { ThemeToggle } from '@components/ThemeToggle/ThemeToggle';
import {
  Code,
  Database,
  Download,
  ExternalLink,
  Globe,
  Mail,
  Palette,
} from 'lucide-react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import ProjectCard from './ProjectCard';
// import TailwindTest from '@components/TailwindTest';

// Mock data - in a real app, this would come from an API or CMS
const personalInfo = {
  name: 'John Doe',
  title: 'Full Stack Developer',
  location: 'San Francisco, CA',
  email: 'john.doe@example.com',
  bio: 'Passionate developer with 5+ years of experience creating beautiful, functional web applications. I love combining vintage aesthetics with modern technology to create unique user experiences.',
  linkedIn: 'https://linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
};

const skills = [
  {
    category: 'Frontend',
    icon: Code,
    techs: [
      'React',
      'TypeScript',
      'Tailwind CSS',
      'Redux',
      'React-Native',
      'SASS',
      'React-Query',
    ],
  },
  {
    category: 'Backend',
    icon: Database,
    techs: ['Node.js', 'Python', 'Express', 'MongoDB', 'PostgreSQL'],
  },
  {
    category: 'Design',
    icon: Palette,
    techs: [
      'Figma',
      'Adobe XD',
      'Photoshop',
      'UI/UX Design',
      'Responsive Design',
    ],
  },
  {
    category: 'Tools & Others',
    icon: Globe,
    techs: ['Git', 'Docker', 'AWS', 'CI/CD', 'REST APIs', 'GraphQL'],
  },
];

const projects = [
  {
    id: '1',
    title: 'Vintage Portfolio Website',
    image:
      'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop',
    description:
      'A nostalgic journey through web design with modern functionality',
    tech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'React Router'],
  },
  {
    id: '2',
    title: 'E-Commerce Dashboard',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    description: 'Modern admin dashboard with comprehensive analytics',
    tech: ['Vue.js', 'Node.js', 'MongoDB', 'Chart.js', 'Express'],
  },
  {
    id: '3',
    title: 'Mobile Weather App',
    image:
      'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&h=600&fit=crop',
    description: 'Beautiful weather application with location-based forecasts',
    tech: ['React Native', 'Redux', 'Weather API', 'SQLite', 'Expo'],
  },
];

const Home = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* <TailwindTest /> */}
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        {/* Vintage texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-vintage-sepia/20 via-transparent to-vintage-cream/30 pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            {/* Profile Image */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
                alt={personalInfo.name}
                className="w-full h-full rounded-full object-cover shadow-lg border-4 border-vintage-sepia"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-vintage-sepia/20 to-transparent" />
            </div>

            <h1 className="text-5xl font-bold text-foreground mb-4 font-serif">
              {personalInfo.name}
            </h1>
            <p className="text-2xl text-accent mb-2 font-medium">
              {personalInfo.title}
            </p>
            <p className="text-muted-foreground mb-6">
              📍 {personalInfo.location}
            </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
              {personalInfo.bio}
            </p>

            {/* Contact Links */}
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant="outline"
                asChild
                className="hover:bg-vintage-sepia"
              >
                <a href={`mailto:${personalInfo.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                className="hover:bg-vintage-sepia"
              >
                <a
                  href={personalInfo.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  LinkedIn
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                className="hover:bg-vintage-sepia"
              >
                <a
                  href={personalInfo.github}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <Button
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="mr-2 h-4 w-4" />
                Download CV
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        {/* Skills Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-serif">
            Technical Skills
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map(skillGroup => {
              const IconComponent = skillGroup.icon;
              return (
                <Card
                  key={skillGroup.category}
                  className="hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-serif">
                      <IconComponent className="h-5 w-5 text-accent" />
                      {skillGroup.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {skillGroup.techs.map(tech => (
                        <Badge
                          key={tech}
                          variant="secondary"
                          className="bg-vintage-sepia text-vintage-brown hover:bg-vintage-sepia/80"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Projects Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center font-serif">
            Featured Projects
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/project/${project.id}`)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
