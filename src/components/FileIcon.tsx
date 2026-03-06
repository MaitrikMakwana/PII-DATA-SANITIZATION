import { FileText, FileSpreadsheet, FileCode, FileImage, Database, File, FileType } from 'lucide-react';
import { getFileIcon } from '../lib/utils';

const iconMap: Record<string, { icon: React.ElementType; bg: string; fg: string }> = {
  pdf:   { icon: FileText,        bg: 'bg-red-500/20',    fg: 'text-red-400' },
  docx:  { icon: FileType,        bg: 'bg-blue-500/20',   fg: 'text-blue-400' },
  csv:   { icon: FileSpreadsheet, bg: 'bg-green-500/20',  fg: 'text-green-400' },
  json:  { icon: FileCode,        bg: 'bg-amber-500/20',  fg: 'text-amber-400' },
  sql:   { icon: Database,        bg: 'bg-purple-500/20', fg: 'text-purple-400' },
  txt:   { icon: FileText,        bg: 'bg-slate-500/20',  fg: 'text-slate-400' },
  image: { icon: FileImage,       bg: 'bg-pink-500/20',   fg: 'text-pink-400' },
  file:  { icon: File,            bg: 'bg-slate-500/20',  fg: 'text-slate-400' },
};

export function FileIcon({ mimeType, size = 'md' }: { mimeType: string; size?: 'sm' | 'md' | 'lg' }) {
  const key = getFileIcon(mimeType);
  const { icon: Icon, bg, fg } = iconMap[key] ?? iconMap.file;

  const sizeClasses = {
    sm: 'h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4',
    md: 'h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5',
    lg: 'h-12 w-12 rounded-xl [&_svg]:h-6 [&_svg]:w-6',
  };

  return (
    <div className={`${sizeClasses[size]} ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={fg} />
    </div>
  );
}
