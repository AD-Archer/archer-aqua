import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Droplet, Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { SEO } from '@/components/SEO';

interface ErrorPageProps {
  title?: string;
  message?: string;
  showRefresh?: boolean;
}

const ErrorPage = ({ 
  title = "Something went wrong", 
  message = "We're experiencing some technical difficulties. Please try again later.",
  showRefresh = true 
}: ErrorPageProps) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <SEO 
        title={title}
        description="An error occurred while using Archer Aqua. Please try refreshing the page or contact support if the problem persists."
      />
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-2">
            <span className="text-secondary">ARCHER</span>{' '}
            <span className="text-primary">AQUA</span>
          </h1>
          
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            {title}
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate('/app')}
              className="bg-gradient-water"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            {showRefresh && (
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            If the problem persists, please contact support.
          </p>
        </div>
      </div>
    </>
  );
};

export default ErrorPage;