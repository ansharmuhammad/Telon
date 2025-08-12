import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Board as BoardType, BackgroundConfig, Checklist as ChecklistType, ChecklistItem, Comment } from '@/types/trello';
import { useAuth } from '@/contexts/AuthContext';
import TrelloBoard from '@/components/trello/TrelloBoard';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { showError, showSuccess } from '@/utils/toast';
import { getBackgroundStyle } from '@/lib/utils';
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
import { SwitchBoardButton } from '@/components/layout/SwitchBoardButton';
import { BoardSkeleton } from '@/components/layout/BoardSkeleton';

/**
 * Renders the main board page, fetching all data for a specific board
 * and handling user interactions like updating the board, background, etc.
 */
const BoardPage = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalCardId, setModalCardId] = useState<string | null>(null);

  /**
   * Fetches all data for the current board from Supabase.
   * This includes lists, cards, labels, members, and all nested relations.
   */
  const getBoardData = useCallback(async () => {
    if (!boardId) return;

    const { data: fullBoardData, error } = await supabase
      .from('boards')
      .select(`
        id, 
        name, 
        background_config,
        is_closed,
        user_id,
        labels (*),
        members:board_members(*, user:users(id, full_name, avatar_url, email)),
        lists (
          id, title, position, board_id,
          cards (
            *,
            cover_config,
            card_labels ( labels (*) ),
            relations_as_card1:card_relations!card1_id(card2_id, card2:cards!card2_id(id, content, list:lists(title))),
            relations_as_card2:card_relations!card2_id(card1_id, card1:cards!card1_id(id, content, list:lists(title))),
            checklists (
              *,
              items:checklist_items(*)
            ),
            attachments:card_attachments(*),
            comments:card_comments(*, user:users(id, full_name, avatar_url, email))
          )
        )
      `)
      .eq('id', boardId)
      .single();

    if (error || !fullBoardData) {
      showError('Could not load board or you do not have access.');
      navigate('/dashboard');
      setLoading(false);
      return;
    }

    const boardWithMappedData: BoardType = {
      ...fullBoardData,
      is_closed: fullBoardData.is_closed,
      members: fullBoardData.members || [],
      lists: fullBoardData.lists.map(list => ({
        ...list,
        cards: list.cards.map((card: any) => {
          const related_as_1 = card.relations_as_card1.map((r: any) => ({ id: r.card2.id, content: r.card2.content, list_title: r.card2.list.title }));
          const related_as_2 = card.relations_as_card2.map((r: any) => ({ id: r.card1.id, content: r.card1.content, list_title: r.card1.list.title }));
          
          const checklists = card.checklists.map((checklist: ChecklistType) => ({
            ...checklist,
            items: (checklist.items || []).sort((a: ChecklistItem, b: ChecklistItem) => a.position - b.position)
          })).sort((a: ChecklistType, b: ChecklistType) => a.position - b.position);

          const comments = (card.comments || []).sort((a: Comment, b: Comment) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          return { 
            ...card, 
            labels: card.card_labels.map((cl: any) => cl.labels).filter(Boolean), 
            related_cards: [...related_as_1, ...related_as_2],
            checklists: checklists,
            attachments: card.attachments || [],
            comments: comments
          }
        }).sort((a, b) => a.position - b.position)
      })).sort((a, b) => a.position - b.position)
    };
    setBoard(boardWithMappedData);
    setLoading(false);
  }, [boardId, navigate]);

  useEffect(() => {
    getBoardData();
  }, [boardId, getBoardData]);

  // Set up Supabase real-time subscription to listen for broadcast events.
  useEffect(() => {
    if (!boardId) return;

    const handleBroadcast = (payload: { payload: { sender?: string } }) => {
      // Refetch data if the broadcast came from another user
      if (payload.payload?.sender !== session?.user.id) {
        console.log('Broadcast received from another user, refetching board data...');
        getBoardData();
      }
    };

    const channel = supabase.channel(`board-channel:${boardId}`);
    
    channel
      .on('broadcast', { event: 'board-update' }, handleBroadcast)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime broadcast subscribed for board ${boardId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error:', err);
          showError('Realtime connection failed. Please refresh.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, getBoardData, session?.user?.id]);

  useEffect(() => {
    setModalCardId(searchParams.get('cardId'));
  }, [searchParams]);

  const handleModalOpenChange = (isOpen: boolean, cardId?: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (isOpen && cardId) {
      newSearchParams.set('cardId', cardId);
    } else {
      newSearchParams.delete('cardId');
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  const handleBackgroundChange = async (newConfig: BackgroundConfig) => {
    if (!board) return;
    const oldConfig = board.background_config;
    setBoard(b => b ? { ...b, background_config: newConfig } : null);

    const { error } = await supabase
      .from('boards')
      .update({ background_config: newConfig })
      .eq('id', board.id);

    if (error) {
      showError('Failed to update background.');
      setBoard(b => b ? { ...b, background_config: oldConfig } : null);
    } else {
      showSuccess('Background updated!');
    }
  };

  const handleCloseBoard = async () => {
    if (!board) return;
    const { error } = await supabase
      .from('boards')
      .update({ is_closed: true })
      .eq('id', board.id);

    if (error) {
      showError('Failed to close board.');
    } else {
      showSuccess('Board closed.');
      navigate('/dashboard');
    }
  };

  const handleReopenBoard = async () => {
    if (!board) return;
    const { error } = await supabase
      .from('boards')
      .update({ is_closed: false })
      .eq('id', board.id);

    if (error) {
      showError('Failed to re-open board.');
    } else {
      showSuccess('Board re-opened!');
      window.location.reload();
    }
  };

  const handleDeleteBoard = async () => {
    if (!board) return;
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', board.id);

    if (error) {
      showError('Failed to delete board.');
    } else {
      showSuccess('Board permanently deleted.');
      navigate('/dashboard');
    }
  };

  const handleBoardNameChange = async (name: string) => {
    if (!board) return;
    const oldName = board.name;
    setBoard(b => b ? { ...b, name } : null);

    const { error } = await supabase
      .from('boards')
      .update({ name })
      .eq('id', board.id);

    if (error) {
      showError('Failed to update board name.');
      setBoard(b => b ? { ...b, name: oldName } : null);
    } else {
      showSuccess('Board name updated!');
    }
  };

  const backgroundStyle = board ? getBackgroundStyle(board.background_config) : {};

  if (loading) {
    return <BoardSkeleton />;
  }

  if (!board) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">We couldn't load your board. Please try again.</p>
        <Link to="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (board.is_closed) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center p-8 bg-card rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-2">Board is closed</h1>
          <p className="text-muted-foreground mb-6">
            To view this board, you'll need to re-open it.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={handleReopenBoard}>Re-open Board</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Permanently</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the board and all of its data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteBoard} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex flex-col bg-background bg-cover bg-center"
      style={backgroundStyle}
    >
      <Header board={board} onBackgroundChange={handleBackgroundChange} onCloseBoard={handleCloseBoard} onBoardNameChange={handleBoardNameChange} />
      <main className="flex-grow p-4 md:p-6 overflow-hidden">
        <TrelloBoard 
          initialBoard={board} 
          modalCardId={modalCardId}
          onModalOpenChange={handleModalOpenChange}
        />
      </main>
      <SwitchBoardButton />
    </div>
  );
};

export default BoardPage;