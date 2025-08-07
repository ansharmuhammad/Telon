import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BackgroundConfig } from '@/types/trello';
import { getBackgroundThumbnailStyle } from '@/lib/utils';
import { Replace } from 'lucide-react';

type BoardSummary = {
  id: string;
  name: string;
  background_config: BackgroundConfig;
};

export const SwitchBoardButton = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && session?.user) {
      setLoading(true);
      supabase
        .from('boards')
        .select('id, name, background_config')
        .eq('user_id', session.user.id)
        .eq('is_closed', false)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to fetch boards', error);
          } else {
            setBoards(data as BoardSummary[]);
          }
          setLoading(false);
        });
    }
  }, [isOpen, session]);

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBoardSelect = (boardId: string) => {
    setIsOpen(false);
    navigate(`/board/${boardId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="fixed bottom-6 right-6 rounded-full shadow-lg h-12 px-4"
        >
          <Replace className="mr-2 h-5 w-5" />
          Switch Boards
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Switch to another board</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Search your boards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
            {loading ? (
              <p>Loading...</p>
            ) : (
              filteredBoards.map(board => {
                const boardStyle = getBackgroundThumbnailStyle(board.background_config);
                return (
                  <button
                    key={board.id}
                    onClick={() => handleBoardSelect(board.id)}
                    className="h-24 w-full rounded-md p-2 text-white font-bold bg-gray-700 bg-cover bg-center hover:opacity-90 transition-opacity relative flex items-end"
                    style={boardStyle}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors rounded-md" />
                    <span className="relative z-10 text-sm break-words text-left">{board.name}</span>
                  </button>
                );
              })
            )}
            { !loading && filteredBoards.length === 0 && <p className="col-span-full text-center text-muted-foreground">No boards found.</p> }
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};