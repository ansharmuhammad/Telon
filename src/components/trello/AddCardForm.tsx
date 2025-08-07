import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';

type AddCardFormProps = {
  listId: string;
  onAddCard: (listId: string, content: string) => Promise<void>;
  forceShow?: boolean;
  onCancel?: () => void;
};

export const AddCardForm = ({ listId, onAddCard, forceShow = false, onCancel }: AddCardFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setIsEditing(false);
    }
    setContent('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      await onAddCard(listId, content.trim());
      setContent('');
      if (onCancel) {
        onCancel();
      } else {
        setIsEditing(false);
      }
    }
  };

  if (forceShow || isEditing) {
    return (
      <form onSubmit={handleSubmit} className="p-1">
        <Textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter a title for this card..."
          className="mb-2 resize-none"
        />
        <div className="flex items-center gap-2">
          <Button type="submit">Add card</Button>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => setIsEditing(true)}
      className="w-full justify-start p-2 text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add a card
    </Button>
  );
};