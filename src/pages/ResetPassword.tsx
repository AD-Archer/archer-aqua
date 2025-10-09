import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resetPassword } from '@/lib/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [requiresBackupCode, setRequiresBackupCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/auth');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (requiresBackupCode && !backupCode.trim()) {
      toast.error('Please enter a backup code');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: { token: string; newPassword: string; backupCode?: string } = { token: token!, newPassword };
      if (requiresBackupCode) {
        payload.backupCode = backupCode.trim();
      }

      await resetPassword(payload);
      toast.success('Password reset successfully! You can now sign in with your new password.');
      navigate('/auth');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      
      // Check if 2FA is required
      if (message.includes('two-factor authentication required')) {
        setRequiresBackupCode(true);
        toast.error('Two-factor authentication is enabled. Please enter a backup code to continue.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Droplet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            <span className="text-secondary">ARCHER</span>{' '}
            <span className="text-primary">AQUA</span>
          </CardTitle>
          <CardDescription>
            Reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {requiresBackupCode && (
              <div className="space-y-2">
                <Label htmlFor="backupCode">Backup Code</Label>
                <Input
                  id="backupCode"
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter one of your backup codes to verify your identity.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-water" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset Password
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-primary hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}