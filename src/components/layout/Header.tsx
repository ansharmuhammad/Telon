import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Home, MoreHorizontal, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ChangeBackgroundButton } from './ChangeBackgroundButton';
import { Board, BackgroundConfig } from '@/types/trello';
import { GlobalSearch } from './GlobalSearch';
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
import { InviteUserPopover } from './InviteUserPopover';

type HeaderProps = {
  board: Board | null;
  onBackgroundChange: (config: BackgroundConfig) => void;
  onCloseBoard: () => void;
  onBoardNameChange: (name: string) => void;
};

export const Header = ({ board, onBackgroundChange, onCloseBoard, onBoardNameChange }: HeaderProps) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(board?.name || '');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleTitleSubmit = () => {
    if (title.trim() && title !== board?.name) {
      onBoardNameChange(title.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="flex items-center justify-between p-2 bg-gray-900/80 backdrop-blur-sm text-white">
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" className="hover:bg-gray-700">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        {board && (
          isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="text-xl font-bold bg-transparent border-white h-9"
              autoFocus
            />
          ) : (
            <h1 className="text-xl font-bold cursor-pointer p-1 rounded-md hover:bg-white/20" onClick={() => { setIsEditingTitle(true); setTitle(board.name); }}>
              {board.name}
            </h1>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        <GlobalSearch />
        {board && <InviteUserPopover boardId={board.id} />}
        {board && (
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hover:bg-gray-700" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                <ChangeBackgroundButton boardId={board.id} onBackgroundChange={onBackgroundChange} />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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