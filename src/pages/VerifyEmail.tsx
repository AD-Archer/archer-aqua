import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { verifyEmail } from '@/lib/api';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmailToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setVerificationStatus('error');
        setErrorMessage('No verification token provided');
        setIsVerifying(false);
        return;
      }

      try {
        await verifyEmail({ token });
        setVerificationStatus('success');
        toast.success('Email verified successfully!');
      } catch (error) {
        console.error('Email verification failed:', error);
        setVerificationStatus('error');
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Verification failed. The token may be invalid or expired.');
        }
        toast.error('Email verification failed');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmailToken();
  }, [searchParams]);

  const handleContinue = () => {
    if (verificationStatus === 'success') {
      navigate('/auth');
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <SEO 
        title="Email Verification"
        description="Verify your email address to complete your Archer Aqua account setup."
        url="https://aqua.adarcher.app/verify-email"
      />
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {verificationStatus === 'loading' && (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Verifying Email
                </>
              )}
              {verificationStatus === 'success' && (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Email Verified!
                </>
              )}
              {verificationStatus === 'error' && (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  Verification Failed
                </>
              )}
            </CardTitle>
            <CardDescription>
              {verificationStatus === 'loading' && 'Please wait while we verify your email address...'}
              {verificationStatus === 'success' && 'Your email address has been successfully verified. You can now sign in to your account.'}
              {verificationStatus === 'error' && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isVerifying && (
              <Button 
                onClick={handleContinue} 
                className="w-full bg-gradient-water"
              >
                {verificationStatus === 'success' ? 'Continue to Sign In' : 'Return to Home'}
              </Button>
            )}
            
            {verificationStatus === 'error' && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Try Signing In Anyway
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}