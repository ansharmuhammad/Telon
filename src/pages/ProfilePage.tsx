import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { showError, showSuccess } from '@/utils/toast';
import { UserNav } from '@/components/layout/UserNav';
import { AvatarUploader } from '@/components/layout/AvatarUploader';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required.'),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type UserProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

const ProfilePage = () => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      email: session?.user?.email || '',
    },
  });

  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            showError('Could not fetch profile.');
            console.error(error);
          } else if (data) {
            setProfile(data);
            form.reset({
              full_name: data.full_name || '',
              email: session.user.email,
            });
          }
          setLoading(false);
        });
    }
  }, [session, form]);

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('users')
      .update({ full_name: values.full_name })
      .eq('id', session.user.id);

    if (error) {
      showError('Failed to update profile.');
    } else {
      showSuccess('Profile updated successfully!');
      setProfile(p => p ? { ...p, full_name: values.full_name } : null);
    }
  };

  const handleAvatarUpload = async (newAvatarUrl: string) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('users')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', session.user.id);

    if (error) {
      showError('Failed to update avatar.');
    } else {
      showSuccess('Avatar updated!');
      setProfile(p => p ? { ...p, avatar_url: newAvatarUrl } : null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src="/telon_logo_48x48.png" alt="TELON Logo" className="h-10 w-10" />
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            </Link>
            <UserNav />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your account's profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-6">
                  {session?.user && (
                    <AvatarUploader
                      userId={session.user.id}
                      avatarUrl={profile?.avatar_url || null}
                      onUpload={handleAvatarUpload}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Your email" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfilePage;