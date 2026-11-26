import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type {
  Experience,
  Profile,
  Project,
  TechStack,
} from '../../../../specs/contracts/portfolio.js';

export interface ResumePdfInput {
  readonly profile: Profile;
  readonly experiences: readonly Experience[];
  readonly projects: readonly Project[];
  readonly techStacks: readonly TechStack[];
}

const toWinAnsiSafe = (input: string): string =>
  input
    .replace(/[—–]/g, '-')
    .replace(/[•·]/g, '*')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '');

const formatMonthYear = (value: string | null): string => {
  if (!value) return 'Present';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const wrapText = (
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] => {
  const words = toWinAnsiSafe(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
};

export async function generateResumePdf(data: ResumePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${toWinAnsiSafe(data.profile.full_name)} - Curriculum Vitae`);
  doc.setAuthor(toWinAnsiSafe(data.profile.full_name));

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 48;
  const maxWidth = pageWidth - marginX * 2;
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.55);
  const cobalt = rgb(0.15, 0.39, 0.92);
  const hairline = rgb(0.89, 0.91, 0.94);

  let page: PDFPage = doc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - 48;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 48) {
      page = doc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - 48;
    }
  };

  const drawTextLines = (
    text: string,
    opts: { font: PDFFont; size: number; color: ReturnType<typeof rgb>; indent?: number; gap?: number }
  ) => {
    const indent = opts.indent ?? 0;
    const lines = wrapText(text, opts.font, opts.size, maxWidth - indent);
    const lineHeight = opts.size + 4;
    for (const line of lines) {
      ensureSpace(lineHeight + 4);
      page.drawText(line, {
        x: marginX + indent,
        y: cursorY,
        size: opts.size,
        font: opts.font,
        color: opts.color,
      });
      cursorY -= lineHeight;
    }
    cursorY -= opts.gap ?? 2;
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(32);
    cursorY -= 8;
    page.drawText(toWinAnsiSafe(title.toUpperCase()), {
      x: marginX,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: cobalt,
    });
    cursorY -= 6;
    page.drawLine({
      start: { x: marginX, y: cursorY },
      end: { x: pageWidth - marginX, y: cursorY },
      thickness: 0.75,
      color: hairline,
    });
    cursorY -= 14;
  };

  // Header
  drawTextLines(data.profile.full_name, { font: fontBold, size: 20, color: ink, gap: 2 });
  drawTextLines(data.profile.headline, { font: fontBold, size: 11, color: cobalt, gap: 4 });
  const contactLine = [
    data.profile.location,
    data.profile.email,
    data.profile.github_url,
    data.profile.linkedin_url,
  ]
    .filter(Boolean)
    .join('  |  ');
  drawTextLines(contactLine, { font: fontRegular, size: 8.5, color: muted, gap: 6 });
  drawTextLines(data.profile.bio, { font: fontRegular, size: 10, color: ink, gap: 4 });

  // Achievements
  if (data.profile.achievements.length > 0) {
    drawSectionHeading('Key Achievements');
    for (const item of data.profile.achievements) {
      drawTextLines(`* ${item}`, { font: fontRegular, size: 9.5, color: ink, indent: 8, gap: 2 });
    }
  }

  // Experience
  if (data.experiences.length > 0) {
    drawSectionHeading('Experience');
    for (const exp of data.experiences) {
      const range = `${formatMonthYear(exp.start_date)} - ${
        exp.is_current ? 'Present' : formatMonthYear(exp.end_date)
      }`;
      drawTextLines(`${exp.role} | ${exp.company}${exp.location ? ` (${exp.location})` : ''}`, {
        font: fontBold,
        size: 10.5,
        color: ink,
        gap: 1,
      });
      drawTextLines(range, { font: fontRegular, size: 8.5, color: cobalt, gap: 3 });
      drawTextLines(exp.summary, { font: fontRegular, size: 9.5, color: ink, gap: 2 });
      for (const h of exp.highlights) {
        drawTextLines(`* ${h}`, { font: fontRegular, size: 9, color: muted, indent: 8, gap: 1 });
      }
      cursorY -= 4;
    }
  }

  // Projects
  if (data.projects.length > 0) {
    drawSectionHeading('Featured Engineering Projects');
    for (const proj of data.projects) {
      drawTextLines(`${proj.title}${proj.role ? ` (${proj.role})` : ''}`, {
        font: fontBold,
        size: 10,
        color: ink,
        gap: 1,
      });
      drawTextLines(proj.summary, { font: fontRegular, size: 9, color: ink, gap: 2 });
      if (proj.tech_tags.length > 0) {
        drawTextLines(`Stack: ${proj.tech_tags.join(', ')}`, {
          font: fontRegular,
          size: 8.5,
          color: muted,
          gap: 4,
        });
      }
    }
  }

  // Tech Stacks
  if (data.techStacks.length > 0) {
    drawSectionHeading('Technical Skills');
    const summaryLine = data.techStacks
      .map((s) => `${s.name} (${s.years_exp}y, ${s.proficiency}%)`)
      .join('  |  ');
    drawTextLines(summaryLine, { font: fontRegular, size: 9, color: ink, gap: 2 });
  }

  return doc.save();
}
