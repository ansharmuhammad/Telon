import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, MoreHorizontal, X, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ChangeBackgroundContent } from './ChangeBackgroundContent';
import { Board, BackgroundConfig } from '@/types/trello';
import { GlobalSearch } from './GlobalSearch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
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
import { NotificationBell } from './NotificationBell';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'background'>('main');

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

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    if (!open) {
      setTimeout(() => setMenuView('main'), 150);
    }
  };

  return (
    <header className="flex items-center justify-between p-2 bg-gray-900/80 backdrop-blur-sm text-white">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 hover:bg-gray-700 rounded-md p-1">
          <img src="/telon_logo_32x32.png" alt="TELON Logo" className="h-8 w-8" />
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
           <Popover open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="hover:bg-gray-700" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              {menuView === 'main' && (
                <div className="space-y-1">
                  <p className="text-center text-sm font-medium text-muted-foreground pb-1">Menu</p>
                  <Separator />
                  <Button variant="ghost" className="w-full justify-start" onClick={() => setMenuView('background')}>
                    <ImageIcon className="mr-2 h-4 w-4" /> Change Background
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 focus:bg-red-50">
                        <X className="mr-2 h-4 w-4" /> Close Board
                      </Button>
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
                </div>
              )}
              {menuView === 'background' && (
                <div>
                  <div className="flex items-center relative pb-2">
                    <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => setMenuView('main')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-center text-sm font-medium text-muted-foreground flex-grow">Change Background</p>
                  </div>
                  <Separator />
                  <div className="pt-2">
                    <ChangeBackgroundContent 
                      boardId={board.id} 
                      onBackgroundChange={onBackgroundChange}
                      onClose={() => setIsMenuOpen(false)}
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
        <NotificationBell />
        <Button variant="ghost" onClick={handleLogout} className="hover:bg-gray-700">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
};