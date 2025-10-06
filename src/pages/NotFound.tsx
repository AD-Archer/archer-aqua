import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Droplet, Home, ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/SEO';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO 
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Return to Archer Aqua to continue tracking your hydration."
      />
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <Droplet className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-6xl font-bold text-foreground mb-2">
            <span className="text-secondary">4</span>
            <span className="text-primary">0</span>
            <span className="text-secondary">4</span>
          </h1>
          
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            <span className="text-secondary">ARCHER</span>{' '}
            <span className="text-primary">AQUA</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Oops! The page you're looking for doesn't exist. Let's get you back to tracking your hydration.
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
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </>
  );
};

export default NotFound;
