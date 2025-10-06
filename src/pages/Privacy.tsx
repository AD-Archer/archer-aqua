import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteFooter } from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { CURRENT_POLICIES_VERSION, TERMS_ROUTE } from '@/lib/policies';

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

export default function Privacy() {
  const lastUpdated = formatPolicyDate(CURRENT_POLICIES_VERSION);

  return (
    <>
      <SEO
        title="Privacy Policy"
        description="Learn how Archer Aqua collects, uses, and protects your hydration data and personal information."
        type="article"
      />
      <main className="min-h-screen bg-muted/20 py-12">
        <div className="container max-w-4xl space-y-10">
          <header className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Archer Aqua is committed to respecting your privacy, safeguarding your hydration data, and providing
              transparency into how information is collected, stored, and used.
            </p>
            <div className="flex justify-center pt-4">
              <Button asChild size="lg" className="px-8">
                <Link to="/auth">Join Archer Aqua</Link>
              </Button>
            </div>
          </header>

          <article className="space-y-12 rounded-xl border bg-background p-8 shadow-sm">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly (such as your name, email address, weight, age, activity
                level, location preferences, and hydration goals) along with hydration logs you create within the app.
                When enabled, we also store security settings like two-factor authentication status.
              </p>
              <p className="text-muted-foreground">
                If you connect Archer Aqua to the cloud backend, we collect metadata required to authenticate your
                account, including hashed passwords, OAuth identifiers, and session tokens. Weather integrations may store
                approximate location data to tailor hydration recommendations.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                Your information powers core features of Archer Aqua, including personalized hydration goals, drink
                recommendations, achievement tracking, and weather-based adjustments. We never sell your personal
                information. Aggregated and anonymized insights may be used to improve the product roadmap.
              </p>
              <p className="text-muted-foreground">
                Email addresses may be used to deliver account notifications, password resets, or optional wellness tips.
                You can opt out of non-essential messages anytime by updating your preferences.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Data Retention & Control</h2>
              <p className="text-muted-foreground">
                Hydration logs, goals, and profile data remain available until you delete them or request account removal.
                You can export your data as a JSON file and delete your cloud account at any time from the Settings page.
                Local-only usage keeps information on your device; uninstalling the app removes local storage.
              </p>
              <p className="text-muted-foreground">
                If you delete your account, associated cloud data is permanently removed within 30 days, except where
                limited backups are required for disaster recovery. Backups are routinely purged and never used for
                marketing purposes.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Protecting Your Information</h2>
              <p className="text-muted-foreground">
                We apply industry-standard security practices such as encrypted connections (HTTPS), salted password
                hashing, scoped API tokens, and access controls. Two-factor authentication adds an extra layer of
                protection to your account.
              </p>
              <p className="text-muted-foreground">
                Despite our efforts, no system is entirely immune to risk. We encourage strong passwords, 2FA, and
                promptly reporting any suspicious activity to security@adarcher.app.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Third-Party Services</h2>
              <p className="text-muted-foreground">
                Archer Aqua may integrate with third-party providers for authentication (Google OAuth), email delivery,
                or weather data. These services only receive the information necessary to provide their functionality and
                are bound by contractual privacy obligations.
              </p>
              <p className="text-muted-foreground">
                Links to external websites are provided for convenience. We are not responsible for their privacy
                practices and encourage you to review their policies.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground">
                Archer Aqua is not intended for children under 13. We do not knowingly collect personal data from children.
                If you believe a child has provided us information, please contact us and we will promptly delete it.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Contact Us</h2>
              <p className="text-muted-foreground">
                Questions about this Privacy Policy or data requests can be sent to{' '}
                <a className="text-primary underline" href="mailto:antonioarcher.dev@gmail.com">
                  antonioarcher.dev@gmail.com
                </a>
                . We respond to verified requests within 30 days.
              </p>
            </section>

            <footer className="rounded-lg bg-muted/40 p-6 text-sm text-muted-foreground">
              <p>
                This Privacy Policy forms part of the Archer Aqua Terms of Service. Please review the latest{' '}
                <Link to={TERMS_ROUTE} className="text-primary underline">
                  Terms of Service
                </Link>{' '}
                to understand your responsibilities when using the app.
              </p>
            </footer>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
