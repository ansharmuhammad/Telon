import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChangeBackgroundButton } from './ChangeBackgroundButton';
import { Board, BackgroundConfig } from '@/types/trello';

type HeaderProps = {
  board: Board | null;
  onBackgroundChange: (config: BackgroundConfig) => void;
};

export const Header = ({ board, onBackgroundChange }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between p-2 bg-black/20 text-white backdrop-blur-sm">
      <h1 className="text-xl font-bold">{board?.name || 'Trello Clone'}</h1>
      <div className="flex items-center gap-2">
        <ChangeBackgroundButton onBackgroundChange={onBackgroundChange} />
        <Button variant="ghost" onClick={handleLogout} className="hover:bg-primary/90">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};