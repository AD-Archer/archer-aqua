import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { SiteFooter } from '@/components/SiteFooter';
import { Droplet, Target, Trophy, TrendingUp, Activity, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-image.webp';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-gradient-sky">
      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Smart Hydration Tracking</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-secondary">ARCHER</span>{' '}
              <span className="text-primary">AQUA</span>
              <br />
              <span className="text-foreground text-4xl lg:text-5xl">Hydration Made Simple</span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Track your water intake, set personalized goals, and build healthy hydration habits. 
              Your journey to better health starts with a single drop.
            </p>
            
            <div className="flex gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-water text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl"></div>
            <img 
              src={heroImage} 
              alt="Hydration tracking visualization" 
              className="relative rounded-2xl shadow-elegant w-full"
              loading="eager"
              decoding="async"
              width="600"
              height="400"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Archer Aqua?</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Personalized Goals</h3>
            <p className="text-muted-foreground">
              Get customized hydration targets based on your weight, activity level, and lifestyle.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
              <Droplet className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Tracking</h3>
            <p className="text-muted-foreground">
              Different drinks affect hydration differently. We calculate the real impact of coffee, tea, alcohol, and more.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Achievements</h3>
            <p className="text-muted-foreground">
              Unlock badges and milestones as you build consistent hydration habits.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-muted-foreground">
              Monitor your daily streaks, total consumption, and hydration trends over time.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Hydration Status</h3>
            <p className="text-muted-foreground">
              Visual feedback on your current hydration level throughout the day.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Quick & Easy</h3>
            <p className="text-muted-foreground">
              Log drinks in seconds with quick-add buttons and smart defaults.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container max-w-4xl mx-auto px-4 py-16">
        <Card className="p-12 text-center bg-gradient-water text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Hydration Journey?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of users who are achieving their health goals with Archer Aqua.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8"
            onClick={() => navigate('/auth')}
          >
            Get Started for Free
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
    </>
  );
}
