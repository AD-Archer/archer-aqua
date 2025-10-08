import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteFooter } from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { CURRENT_POLICIES_VERSION, PRIVACY_ROUTE } from '@/lib/policies';

function formatPolicyDate(version: string) {
  const parsed = new Date(`${version}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return version;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Terms() {
  const lastUpdated = formatPolicyDate(CURRENT_POLICIES_VERSION);

  return (
    <>
      <SEO
        title="Terms of Service"
        description="Understand the terms and acceptable use policies for the Archer Aqua hydration platform."
        type="article"
      />
      <main className="min-h-screen bg-muted/20 py-12">
        <div className="container max-w-4xl space-y-10">
          <header className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Effective {lastUpdated}</p>
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your access to and use of the Archer Aqua application, services,
              and content. By creating an account or otherwise using Archer Aqua, you agree to these Terms.
            </p>
            <div className="flex justify-center pt-4">
              <Button asChild size="lg" className="px-8">
                <Link to="/auth">Create your account</Link>
              </Button>
            </div>
          </header>

          <article className="space-y-12 rounded-xl border bg-background p-8 shadow-sm">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Eligibility & Account Security</h2>
              <p className="text-muted-foreground">
                You must be at least 13 years old to use Archer Aqua. You are responsible for safeguarding your account
                credentials and for any activity occurring under your account. Notify us immediately if you suspect
                unauthorized use.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Acceptable Use</h2>
              <p className="text-muted-foreground">
                Archer Aqua is designed for personal wellness tracking. You agree not to misuse the service, including by
                attempting to gain unauthorized access, disrupting other users, reverse engineering proprietary
                functionality, or submitting harmful content. We reserve the right to suspend accounts violating these
                Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Subscriptions & Payments</h2>
              <p className="text-muted-foreground">
                Archer Aqua may offer optional premium plans. Pricing and billing cycles will be displayed before you
                subscribe. Unless otherwise stated, subscriptions renew automatically until canceled. You can cancel at
                any time to end future charges.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
              <p className="text-muted-foreground">
                Archer Aqua, including its design, software, and trademarks, is owned by Antonio Archer. You may not reuse
                or distribute content from the service without prior written consent. You retain ownership of data you
                submit to the platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Service Availability</h2>
              <p className="text-muted-foreground">
                We strive to keep Archer Aqua available, but downtime may occur for maintenance or factors beyond our
                control. Features and roadmap items may change without notice. We are not liable for any loss resulting
                from service interruptions.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Data Privacy</h2>
              <p className="text-muted-foreground">
                Our handling of personal data is described in the{' '}
                <Link to={PRIVACY_ROUTE} className="text-primary underline">
                  Privacy Policy
                </Link>
                . By using Archer Aqua, you consent to that policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Termination</h2>
              <p className="text-muted-foreground">
                You may delete your account at any time through the Settings page. We may suspend or terminate your
                account for violations of these Terms or to comply with legal obligations. Upon termination, your access
                to the service will cease and associated data will be deleted in accordance with our retention practices.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Disclaimer & Limitation of Liability</h2>
              <p className="text-muted-foreground">
                Archer Aqua provides hydration guidance for educational purposes only and is not a substitute for
                professional medical advice. To the maximum extent permitted by law, Archer Aqua and its contributors are
                not liable for indirect, incidental, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Changes to These Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms to reflect new features or legal requirements. Continued use after updates
                constitutes acceptance. Material changes will be communicated via in-app notifications or email.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">10. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, reach out to{' '}
                <a className="text-primary underline" href="mailto:antonioarcher.dev@gmail.com">
                  antonioarcher.dev@gmail.com
                </a>
                .
              </p>
              <p className="text-muted-foreground">
                Archer Aqua is open source! You can review our source code and contribute at{' '}
                <a className="text-primary underline" href="https://github.com/ad-archer/archer-aqua" target="_blank" rel="noopener noreferrer">
                  github.com/ad-archer/archer-aqua
                </a>
                .
              </p>
            </section>

            <footer className="rounded-lg bg-muted/40 p-6 text-sm text-muted-foreground">
              <p>
                By continuing to use Archer Aqua, you agree to these Terms of Service and acknowledge reading the{' '}
                <Link to={PRIVACY_ROUTE} className="text-primary underline">
                  Privacy Policy
                </Link>
                . If you do not agree, please discontinue use of the service.
              </p>
            </footer>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
