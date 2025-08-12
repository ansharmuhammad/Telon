import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';

const Login = () => {
  const [newBoardName, setNewBoardName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreatePublicBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    setLoading(true);

    const { data: newBoard, error } = await supabase
      .from('boards')
      .insert({ name: newBoardName.trim() }) // No user_id for public boards
      .select('id')
      .single();

    if (error) {
      showError(`Failed to create board: ${error.message}`);
      setLoading(false);
    } else if (newBoard) {
      // Create default lists for the new board
      await supabase.from('lists').insert([
        { board_id: newBoard.id, title: 'To Do', position: 1 },
        { board_id: newBoard.id, title: 'In Progress', position: 2 },
        { board_id: newBoard.id, title: 'Done', position: 3 },
      ]);
      showSuccess('Public board created!');
      setNewBoardName('');
      navigate(`/board/${newBoard.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-background py-12">
      <div className="w-full max-w-md mx-4 space-y-8">
        <div className="flex justify-center">
          <img src="/telon_logo_64x64.png" alt="TELON Logo" className="h-16 w-16" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Welcome to TELON</CardTitle>
            <CardDescription className="text-center">Sign in or sign up to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={[]}
              theme="light"
            />
          </CardContent>
        </Card>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-2 text-sm text-muted-foreground">OR</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">Create a public board</CardTitle>
            <CardDescription className="text-center">No account needed. Anyone with the link can view and edit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePublicBoard} className="flex gap-2">
              <Input
                placeholder="Public board name..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={!newBoardName.trim() || loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;