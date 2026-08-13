import { LEGAL } from '../../../lib/legal-links';
import { legalStyles as styles, LegalDoc, LegalSection } from '../legal/LegalDoc';

export const metadata = { title: 'Terms of Service — Mailmyra' };

/**
 * Task 7 brief: "service description · seat = published sender, $1/active
 * sender/year, annual only, 7-day trial, manual invoicing · acceptable use
 * · IP · termination & deletion effects · liability limits · governing
 * law: Türkiye." Taslak — hukukçu incelemesinden geçmedi (kutu aşağıda).
 */
export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of Service"
      versionLine={`Effective ${LEGAL.terms.version}`}
      draftNotice={
        <>
          <strong>Draft</strong> — this document has not yet been reviewed by counsel.
        </>
      }
    >
      <LegalSection title="1. Who this agreement is with">
        <p>
          These Terms govern your use of Mailmyra, an e-mail signature builder and hosting
          service operated by Voldi Creative{' '}
          <span className={styles.placeholder}>
            [legal entity name, registration number and registered address — to be confirmed]
          </span>
          , based in Konya, Türkiye (&ldquo;Mailmyra&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
          By creating an account or using the builder, you agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. The service">
        <p>
          Mailmyra lets you design e-mail signatures and provides a live preview and export
          (copy or download) so you can install them in your e-mail client. Any logo, avatar,
          or hand-signature image you upload is hosted on our own infrastructure at{' '}
          <code>cdn.mailmyra.com</code> so the images keep working once the signature is pasted
          into someone&apos;s e-mail client. We do not run an Outlook add-in, a server-side mail
          transport rule, or any signature analytics — signatures are static HTML you copy or
          download yourself.
        </p>
      </LegalSection>

      <LegalSection title="3. Seats and pricing">
        <p>
          Mailmyra has one plan: <strong>$1 per active sender per year</strong>, billed annually.
          A &ldquo;seat&rdquo; is a sender identity you have <em>published</em> (deployed) —
          signatures you have only drafted and never published do not count. Every new workspace
          gets a 7-day free trial with no card required. There is no self-serve checkout: while
          we are small, invoicing is handled manually — you will hear from us directly about
          adding seats or paying an invoice. There is no free plan; exporting a finished
          signature (copying it or downloading the .htm file) requires a paid or trial account.
        </p>
      </LegalSection>

      <LegalSection title="4. Your account and your content">
        <p>
          You are responsible for keeping your password confidential and for the accuracy of the
          information you enter — including the names, job titles, and e-mail addresses of the
          people whose signatures you create. You confirm you are authorised to enter that
          information on their behalf (see our{' '}
          <a href={LEGAL.privacy.path}>Privacy Policy</a> for how we handle it). You keep
          ownership of the content you upload (logos, photos, text). We do not claim any rights
          over it beyond what is needed to host and render it as part of your signatures.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to use Mailmyra to:</p>
        <ul>
          <li>Upload content you do not have the right to use (e.g. someone else&apos;s logo without permission, unlicensed images).</li>
          <li>Upload unlawful, infringing, or malicious content, or content impersonating a person or company you do not represent.</li>
          <li>Attempt to disrupt the service, bypass rate limits, or access another workspace&apos;s data.</li>
        </ul>
        <p>We may suspend an account that clearly violates this section.</p>
      </LegalSection>

      <LegalSection title="6. Our intellectual property">
        <p>
          The Mailmyra builder, signature templates, and rendering engine are our property (or
          licensed to us) and are not sold to you — you get the right to use them to produce
          your own signatures. You may not copy, resell, or reverse-engineer the underlying
          software.
        </p>
      </LegalSection>

      <LegalSection title="7. Cancelling and what happens to your data">
        <p>
          You can delete your account and workspace at any time from Account settings. This{' '}
          <strong>permanently removes everything</strong> — senders, signatures, and every
          uploaded image on <code>cdn.mailmyra.com</code>. Signatures already pasted into
          recipients&apos; e-mail clients will start showing broken images once this happens,
          because the image files they point to are gone. This cannot be undone, so we ask you
          to confirm twice before it happens. See the <a href={LEGAL.privacy.path}>Privacy
          Policy</a> for the full deletion mechanics.
        </p>
      </LegalSection>

      <LegalSection title="8. Service availability">
        <p>
          We run Mailmyra on our own servers and do our best to keep it available, but we do not
          promise a specific uptime figure and the service is provided &ldquo;as is&rdquo;. We
          will tell you about planned maintenance where we reasonably can.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation of liability">
        <p>
          To the extent permitted by law, Mailmyra is not liable for indirect or consequential
          losses (like lost business or lost data) arising from your use of the service. Nothing
          here limits liability that cannot legally be limited.
        </p>
      </LegalSection>

      <LegalSection title="10. Governing law">
        <p>
          These Terms are governed by the laws of the Republic of Türkiye. Any dispute will be
          resolved before the courts of{' '}
          <span className={styles.placeholder}>[city / court venue — to be confirmed]</span>.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these Terms">
        <p>
          If we change these Terms in a way that matters, we will update the version date above
          — the single source for that date is <code>lib/legal-links.ts</code> in our codebase,
          which is also what your acceptance record on the Account page points to. Continuing to
          use Mailmyra after a change means you accept the new version.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions about these Terms:{' '}
          <span className={styles.placeholder}>[contact e-mail address — to be confirmed]</span>.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
