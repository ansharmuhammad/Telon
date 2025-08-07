import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Home, MoreHorizontal, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ChangeBackgroundButton } from './ChangeBackgroundButton';
import { Board, BackgroundConfig } from '@/types/trello';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type HeaderProps = {
  board: Board | null;
  onBackgroundChange: (config: BackgroundConfig) => void;
  onCloseBoard: () => void;
};

export const Header = ({ board, onBackgroundChange, onCloseBoard }: HeaderProps) => {
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
        {board && (
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hover:bg-gray-700" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <X className="mr-2 h-4 w-4" /> Close Board
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to close this board?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You can find and reopen closed boards from your dashboard.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onCloseBoard}>Close</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="ghost" onClick={handleLogout} className="hover:bg-gray-700">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};