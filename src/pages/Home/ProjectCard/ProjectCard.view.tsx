import { Card } from '@components/module/Card/Card.view';
import { useState } from 'react';

interface Project {
  id: string;
  title: string;
  image: string;
  description: string;
  tech: string[];
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 bg-card border-border shadow-lg hover:shadow-xl"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={project.image}
          alt={project.title}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isHovered ? 'blur-sm scale-110' : 'blur-0 scale-100'
          }`}
        />

        {/* Vintage film overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-sepia/10 via-transparent to-vintage-sepia/20 pointer-events-none" />

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-vintage-brown/80 backdrop-blur-sm transition-all duration-300 flex items-center justify-center ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-center p-6">
            <p className="text-vintage-cream text-lg font-medium mb-2">
              {project.description}
            </p>
            <p className="text-vintage-gold text-sm uppercase tracking-wider font-semibold">
              Show More Details
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-card">
        <h3 className="text-xl font-bold text-card-foreground mb-2 font-serif">
          {project.title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {project.tech.slice(0, 3).map(tech => (
            <span
              key={tech}
              className="px-2 py-1 bg-vintage-sepia text-vintage-brown text-xs rounded-sm font-medium"
            >
              {tech}
            </span>
          ))}
          {project.tech.length > 3 && (
            <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-sm">
              +{project.tech.length - 3} more
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
