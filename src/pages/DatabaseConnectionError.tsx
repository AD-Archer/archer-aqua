import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Droplet, Home, RefreshCw, Database, WifiOff } from 'lucide-react';
import { SEO } from '@/components/SEO';

const DatabaseConnectionError = () => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <SEO
        title="Connection Error"
        description="Unable to connect to Archer Aqua's servers. Please check your internet connection and try again."
      />
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
            <div className="relative">
              <Database className="h-8 w-8 text-destructive" />
              <WifiOff className="h-4 w-4 text-destructive absolute -top-1 -right-1" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">
            <span className="text-secondary">ARCHER</span>{' '}
            <span className="text-primary">AQUA</span>
          </h1>

          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Connection Error
          </h2>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            We're unable to connect to our servers right now. This might be due to a temporary network issue or server maintenance.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-foreground mb-2">What you can try:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• Check your internet connection</li>
              <li>• Wait a few minutes and try again</li>
              <li>• Clear your browser cache</li>
              <li>• Try a different browser or device</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleRefresh}
              className="bg-gradient-water"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Landing
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            If the problem continues, our servers might be undergoing maintenance.
            Please check back later or contact support.
          </p>
        </div>
      </div>
    </>
  );
};

export default DatabaseConnectionError;