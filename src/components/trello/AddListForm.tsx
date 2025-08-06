import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type AddListFormProps = {
  onAddList: (title: string) => Promise<void>;
};

export const AddListForm = ({ onAddList }: AddListFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      await onAddList(title.trim());
      setTitle('');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Card className="w-72 flex-shrink-0 bg-gray-100">
        <CardContent className="p-2">
          <form onSubmit={handleSubmit}>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter list title..."
              className="mb-2"
            />
            <div className="flex items-center gap-2">
              <Button type="submit">Add list</Button>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={() => setIsEditing(true)}
      className="w-72 flex-shrink-0 justify-start p-3 bg-white/50 hover:bg-white/80 text-foreground"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add another list
    </Button>
  );
};