import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { UserPlus, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type InviteUserPopoverProps = {
  boardId: string;
};

export const InviteUserPopover = ({ boardId }: InviteUserPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('invite-user', {
        body: { board_id: boardId, email: email.trim() },
      });

      if (functionError) throw functionError;
      if (functionData.error) throw new Error(functionData.error);

      showSuccess(`Invitation sent to ${email}!`);
      setEmail('');
      setIsOpen(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {isMobile ? (
          <Button variant="ghost" size="icon" className="hover:bg-gray-700">
            <UserPlus className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" className="hover:bg-gray-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Invite to board</p>
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="Enter email to invite"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invitation'}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};