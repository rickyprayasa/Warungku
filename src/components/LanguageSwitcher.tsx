import { useTranslation } from '@/lib/i18n';
import { Button } from './ui/button';
import { Languages } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="font-mono uppercase font-bold text-sm px-3 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm"
        >
          <Languages className="w-4 h-4 mr-2" />
          {language.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-2 border-brand-black bg-brand-white">
        <DropdownMenuItem onClick={() => setLanguage('id')} className="cursor-pointer font-mono">
          Bahasa Indonesia (ID)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer font-mono">
          English (EN)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}