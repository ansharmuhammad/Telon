import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Login = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background py-12">
      <div className="w-full max-w-md mx-4">
        <div className="flex justify-center mb-8">
          <img src="/telon_logo_64x64.png" alt="TELON Logo" className="h-16 w-16" />
        </div>
        <Card className="relative overflow-hidden">
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
      </div>
    </div>
  );
};

export default Login;