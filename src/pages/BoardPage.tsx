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

/**
 * Renders the main board page, fetching all data for a specific board
 * and handling user interactions like updating the board, background, etc.
 */
const BoardPage = () => {
  const { boardId } = useParams<{ boardId: string }>();
  useAuth(); // Ensures user is authenticated before accessing the page
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

    // This is the main data query for the board page. It uses Supabase's nested selects
    // to fetch the entire board structure in a single request.
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

    // Map the raw data from Supabase to our structured TypeScript types.
    // This includes sorting items by position and combining related card data.
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

  // Set up Supabase real-time subscription to listen for any changes in the database.
  // When a change occurs, it re-fetches the board data to keep the UI in sync.
  useEffect(() => {
    if (!boardId) return;

    const handleDbChange = (payload: any) => {
      console.log('Change received!', payload);
      getBoardData();
    };

    const channel = supabase.channel(`board-changes:${boardId}`);
    
    // We listen to changes on all tables that can affect the board's appearance.
    // For tables with a direct board_id, we can filter. For nested tables (like cards),
    // we listen to all changes and let the getBoardData refetch handle showing the correct data.
    // This is a balance between performance and implementation simplicity.
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels', filter: `board_id=eq.${boardId}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_labels' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_attachments' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_comments' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_relations' }, handleDbChange)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscribed for board ${boardId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error:', err);
          showError('Realtime connection failed. Please refresh.');
        }
      });

    // Unsubscribe from the channel when the component unmounts.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, getBoardData]);

  // Sync the modal's open state with the `cardId` URL search parameter.
  useEffect(() => {
    setModalCardId(searchParams.get('cardId'));
  }, [searchParams]);

  /**
   * Updates the URL search params to open or close the card details modal.
   * @param {boolean} isOpen - Whether the modal should be open.
   * @param {string} [cardId] - The ID of the card to show in the modal.
   */
  const handleModalOpenChange = (isOpen: boolean, cardId?: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (isOpen && cardId) {
      newSearchParams.set('cardId', cardId);
    } else {
      newSearchParams.delete('cardId');
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  /**
   * Handles updating the board's background configuration.
   * @param {BackgroundConfig} newConfig - The new background configuration.
   */
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

  /**
   * Handles closing the current board.
   */
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

  /**
   * Handles re-opening a closed board.
   */
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

  /**
   * Handles permanently deleting a board.
   */
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

  /**
   * Handles changing the board's name.
   * @param {string} name - The new name for the board.
   */
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
    return <div className="flex items-center justify-center h-screen">Loading your board...</div>;
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

  // Render a special view for closed boards, allowing users to re-open or delete them.
  if (board.is_closed) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full">
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
      className="h-screen flex flex-col bg-gray-50 bg-cover bg-center"
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