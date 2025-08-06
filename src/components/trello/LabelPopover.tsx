import { useState } from 'react';
import { Card as CardType, Label as LabelType } from '@/types/trello';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag as LabelIcon, Edit2, X, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0',
  '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563'
];

type LabelPopoverProps = {
  card: CardType;
  boardLabels: LabelType[];
  onToggleLabelOnCard: (cardId: string, labelId: string) => Promise<void>;
  onCreateLabel: (name: string, color: string) => Promise<void>;
  onUpdateLabel: (labelId: string, data: Partial<Pick<LabelType, 'name' | 'color'>>) => Promise<void>;
};

export const LabelPopover = ({ card, boardLabels, onToggleLabelOnCard, onCreateLabel, onUpdateLabel }: LabelPopoverProps) => {
  const [view, setView] = useState<'main' | 'create' | 'edit'>('main');
  const [editingLabel, setEditingLabel] = useState<LabelType | null>(null);
  const [labelName, setLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleCreateClick = () => {
    setLabelName('');
    setSelectedColor(PRESET_COLORS[0]);
    setView('create');
  };

  const handleEditClick = (label: LabelType) => {
    setEditingLabel(label);
    setLabelName(label.name || '');
    setSelectedColor(label.color);
    setView('edit');
  };

  const handleSave = async () => {
    if (view === 'create') {
      await onCreateLabel(labelName, selectedColor);
    } else if (view === 'edit' && editingLabel) {
      await onUpdateLabel(editingLabel.id, { name: labelName, color: selectedColor });
    }
    setView('main');
  };

  const cardLabelIds = new Set(card.labels.map(l => l.id));

  const renderMainView = () => (
    <div>
      <p className="text-sm font-medium text-center mb-2">Labels</p>
      <div className="space-y-2">
        {boardLabels.map(label => (
          <div key={label.id} className="flex items-center gap-2">
            <Checkbox
              id={`label-${label.id}`}
              checked={cardLabelIds.has(label.id)}
              onCheckedChange={() => onToggleLabelOnCard(card.id, label.id)}
            />
            <div
              className="flex-grow h-8 rounded-sm flex items-center px-2 text-white font-bold text-sm cursor-pointer"
              style={{ backgroundColor: label.color }}
              onClick={() => onToggleLabelOnCard(card.id, label.id)}
            >
              {label.name}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(label)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button className="w-full mt-4" variant="secondary" onClick={handleCreateClick}>
        Create a new label
      </Button>
    </div>
  );

  const renderCreateEditView = () => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" onClick={() => setView('main')}><X className="h-4 w-4" /></Button>
        <p className="text-sm font-medium">{view === 'create' ? 'Create label' : 'Edit label'}</p>
        <div className="w-8" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium">Name</label>
          <Input value={labelName} onChange={e => setLabelName(e.target.value)} placeholder="Label name..." />
        </div>
        <div>
          <label className="text-xs font-medium">Select a color</label>
          <div className="grid grid-cols-5 gap-2 mt-1">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className="h-8 w-full rounded-sm flex items-center justify-center"
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              >
                {selectedColor === color && <Check className="h-5 w-5 text-white" />}
              </button>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={handleSave}>
          {view === 'create' ? 'Create' : 'Save'}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" className="w-full justify-start">
          <LabelIcon className="mr-2 h-4 w-4" /> Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {view === 'main' ? renderMainView() : renderCreateEditView()}
      </PopoverContent>
    </Popover>
  );
};