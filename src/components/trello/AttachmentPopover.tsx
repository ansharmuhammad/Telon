import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type AttachmentPopoverProps = {
  children: React.ReactNode;
  onAddAttachment: (file: File) => Promise<void>;
};

export const AttachmentPopover = ({ children, onAddAttachment }: AttachmentPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    await onAddAttachment(file);
    setUploading(false);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <p className="text-sm font-medium text-center">Attach a file</p>
          <div className="space-y-2">
            <Label htmlFor="attachment-upload">Attach a file from your computer</Label>
            <Input id="attachment-upload" type="file" onChange={handleFileChange} disabled={uploading} />
            {uploading && <div className="flex items-center justify-center pt-2"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};