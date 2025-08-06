import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
      <h1 className="text-xl font-bold">Trello Clone</h1>
      <Button variant="ghost" onClick={handleLogout} className="hover:bg-primary/90">
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </header>
  );
};