import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import { getPublicUrl } from '@/lib/utils';

type AvatarUploaderProps = {
  userId: string;
  avatarUrl: string | null;
  onUpload: (newAvatarUrl: string) => void;
};

export const AvatarUploader = ({ userId, avatarUrl, onUpload }: AvatarUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        throw new Error('Failed to upload avatar. Make sure the `avatars` storage bucket exists and is public.');
      }
      
      const publicUrl = getPublicUrl('avatars', filePath);
      
      onUpload(publicUrl);
      setCurrentAvatar(publicUrl);
    } catch (error) {
      if (error instanceof Error) {
        showError(error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    // A simple fallback for initials, can be improved
    return 'U';
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={currentAvatar || undefined} alt="User avatar" />
        <AvatarFallback className="text-3xl">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div>
        <label htmlFor="avatar-upload" className="cursor-pointer">
          <Button asChild variant="outline" disabled={uploading}>
            <span>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {uploading ? 'Uploading...' : 'Upload new picture'}
            </span>
          </Button>
        </label>
        <Input id="avatar-upload" type="file" className="hidden" onChange={handleUpload} accept="image/*" disabled={uploading} />
        <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF up to 10MB.</p>
      </div>
    </div>
  );
};