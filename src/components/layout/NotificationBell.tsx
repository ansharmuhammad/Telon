import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

type Notification = {
  id: string;
  actor_id: string;
  type: string;
  data: {
    boardId: string;
    boardName: string;
    actorName: string;
  };
  is_read: boolean;
  created_at: string;
};

export const NotificationBell = () => {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const fetchNotifications = async () => {
      const { error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('is_read', false);
      
      if (error) {
        console.error("Error fetching unread count:", error);
      } else {
        setUnreadCount(count || 0);
      }
    };

    fetchNotifications();

    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const fetchAllNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error("Error fetching notifications:", error);
    } else {
      setNotifications(data as Notification[]);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session!.user.id)
      .eq('is_read', false);

    if (error) {
      console.error("Error marking notifications as read:", error);
    } else {
      setUnreadCount(0);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchAllNotifications();
      markAsRead();
    }
  };

  const renderNotification = (notification: Notification) => {
    switch (notification.type) {
      case 'BOARD_INVITE':
        return (
          <p>
            <strong>{notification.data.actorName}</strong> invited you to the board{' '}
            <Link to={`/board/${notification.data.boardId}`} className="font-bold hover:underline" onClick={() => setIsOpen(false)}>
              {notification.data.boardName}
            </Link>
          </p>
        );
      default:
        return <p>You have a new notification.</p>;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-gray-700">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 md:w-96 p-0">
        <div className="p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {notifications.length > 0 ? (
              notifications.map(n => (
                <div key={n.id} className="text-sm p-2 rounded-lg hover:bg-accent">
                  {renderNotification(n)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">You have no notifications yet.</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};