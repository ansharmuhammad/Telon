import { useState } from 'react';
import { Checklist as ChecklistType, ChecklistItem as ChecklistItemType } from '@/types/trello';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AnimatedProgress } from '@/components/ui/animated-progress';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, X } from 'lucide-react';

type ChecklistProps = {
  checklist: ChecklistType;
  onUpdateChecklist: (checklistId: string, title: string) => Promise<void>;
  onDeleteChecklist: (checklistId: string) => Promise<void>;
  onAddChecklistItem: (checklistId: string, content: string) => Promise<void>;
  onUpdateChecklistItem: (itemId: string, data: Partial<Pick<ChecklistItemType, 'content' | 'is_completed'>>) => Promise<void>;
  onDeleteChecklistItem: (itemId: string) => Promise<void>;
};

type ChecklistItemProps = {
  item: ChecklistItemType;
  onUpdate: (itemId: string, data: Partial<Pick<ChecklistItemType, 'content' | 'is_completed'>>) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
};

const ChecklistItem = ({ item, onUpdate, onDelete }: ChecklistItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content);

  const handleUpdateContent = () => {
    if (content.trim() && content !== item.content) {
      onUpdate(item.id, { content: content.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center group hover:bg-muted/50 p-1 rounded-md">
      <Checkbox
        checked={item.is_completed}
        onCheckedChange={(checked) => onUpdate(item.id, { is_completed: !!checked })}
        className="mr-3"
      />
      {isEditing ? (
        <div className="flex-grow">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            onBlur={handleUpdateContent}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateContent(); } }}
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleUpdateContent}>Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p
          className={`flex-grow cursor-pointer text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}
          onClick={() => setIsEditing(true)}
        >
          {item.content}
        </p>
      )}
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => onDelete(item.id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const Checklist = ({
  checklist,
  onUpdateChecklist,
  onDeleteChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
}: ChecklistProps) => {
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(checklist.title);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');

  const completedItems = checklist.items.filter(item => item.is_completed).length;
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleTitleSubmit = () => {
    if (title.trim() && title !== checklist.title) {
      onUpdateChecklist(checklist.id, title.trim());
    }
    setIsEditingTitle(false);
  };

  const handleAddItem = async () => {
    if (newItemContent.trim()) {
      await onAddChecklistItem(checklist.id, newItemContent.trim());
      setNewItemContent('');
      // Keep the form open to add more items
    }
  };

  const visibleItems = hideCompleted ? checklist.items.filter(item => !item.is_completed) : checklist.items;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <CheckSquare className="h-5 w-5 text-muted-foreground" />
        <div className="flex-grow">
          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
            />
          ) : (
            <h3 className="font-semibold cursor-pointer" onClick={() => setIsEditingTitle(true)}>{checklist.title}</h3>
          )}
        </div>
        {totalItems > 0 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setHideCompleted(!hideCompleted)}>
            {hideCompleted ? `Show (${completedItems})` : 'Hide'} checked
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={() => onDeleteChecklist(checklist.id)}>Delete</Button>
      </div>
      {totalItems > 0 && (
        <div className="flex items-center gap-2 pl-9">
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          <AnimatedProgress value={progress} className="w-full" />
        </div>
      )}
      <div className="space-y-1 pl-9">
        {visibleItems.map(item => (
          <ChecklistItem
            key={item.id}
            item={item}
            onUpdate={onUpdateChecklistItem}
            onDelete={onDeleteChecklistItem}
          />
        ))}
      </div>
      <div className="pl-9">
        {isAddingItem ? (
          <div>
            <Textarea
              placeholder="Add an item"
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              autoFocus
              className="mb-2"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddItem(); } }}
            />
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleAddItem}>Add</Button>
              <Button type="button" variant="ghost" onClick={() => setIsAddingItem(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setIsAddingItem(true)}>Add an item</Button>
        )}
      </div>
    </div>
  );
};