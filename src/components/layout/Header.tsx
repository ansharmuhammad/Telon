import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Home } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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
    <header className="flex items-center justify-between p-2 bg-gray-900 text-white">
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" className="hover:bg-gray-700">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">{board?.name || 'Trello Clone'}</h1>
      </div>
      <div className="flex items-center gap-2">
        {board && <ChangeBackgroundButton boardId={board.id} onBackgroundChange={onBackgroundChange} />}
        <Button variant="ghost" onClick={handleLogout} className="hover:bg-gray-700">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};