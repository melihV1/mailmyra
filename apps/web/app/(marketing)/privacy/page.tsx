import { LEGAL } from '../../../lib/legal-links';
import { legalStyles as styles, LegalDoc, LegalSection } from '../legal/LegalDoc';

export const metadata = { title: 'Privacy Policy — Mailmyra' };

/**
 * Task 7 brief: "data collected (account e-mail/password hash; sender
 * names/titles/e-mails you enter — your team's data, you are the
 * controller, we process it; uploaded images on cdn.mailmyra.com; session
 * cookie only, no analytics/tracking) · purposes · retention (until
 * deletion) · deletion = full removal incl. CDN files · processors: hosting
 * provider (Türkiye) · contact." Taslak — hukukçu incelemesinden geçmedi.
 */
export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy Policy"
      versionLine={`Effective ${LEGAL.privacy.version}`}
      draftNotice={
        <>
          <strong>Draft</strong> — this document has not yet been reviewed by counsel.
        </>
      }
    >
      <LegalSection title="1. Two different roles">
        <p>
          There are two kinds of personal data in Mailmyra, and we handle them differently:
        </p>
        <ul>
          <li>
            <strong>Your account data</strong> (the e-mail address and password you sign up
            with) — here <strong>we are the data controller</strong>: we decide why and how it
            is processed.
          </li>
          <li>
            <strong>Sender data</strong> you enter into the builder (the names, job titles, and
            e-mail addresses of the people you are making signatures for) — this is{' '}
            <strong>your team&apos;s data, not ours</strong>. You are the data controller for
            it; Mailmyra only processes it on your behalf so it can be rendered into a signature
            and stored in your workspace. See our{' '}
            <a href={LEGAL.kvkk.path}>{LEGAL.kvkk.title}</a> for the Turkish-law disclosure.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <ul>
          <li>
            <strong>Account data:</strong> your e-mail address and a hashed password (we never
            store your password in plain text).
          </li>
          <li>
            <strong>Sender data:</strong> whatever you type into the signature builder — name,
            job title, department, company, phone numbers, e-mail, website, address, social
            links, custom fields, and any legal/disclaimer text you add.
          </li>
          <li>
            <strong>Uploaded images:</strong> logos, avatars, and hand-signature images you
            upload, converted and hosted at <code>cdn.mailmyra.com</code> (never on a third-party
            provider&apos;s own domain — see our internal architecture rules on why).
          </li>
          <li>
            <strong>Technical data:</strong> a single essential session cookie that keeps you
            signed in. We do not use analytics cookies, tracking pixels, advertising scripts, or
            any third-party tracking of any kind.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Why we collect it">
        <p>
          Account data is used to authenticate you, run your subscription (currently invoiced
          manually — see our <a href={LEGAL.terms.path}>Terms of Service</a>), and send
          transactional e-mail (e-mail verification, invitations, password resets). Sender data
          and uploaded images exist only to build and render the signatures you ask for; we do
          not use them for anything else, and we do not sell or share them with advertisers.
        </p>
      </LegalSection>

      <LegalSection title="4. Where your data is hosted">
        <p>
          Mailmyra runs on our own servers in Türkiye — we do not route your data through a
          third-party cloud CDN. Uploaded images are served from <code>cdn.mailmyra.com</code>,
          which is our own domain served from our own infrastructure, so the URLs baked into
          signatures already in the field keep working for as long as we keep running that
          domain.
        </p>
      </LegalSection>

      <LegalSection title="5. Who else sees it">
        <p>
          Nobody, beyond what is strictly needed to run the service: our hosting provider (in
          Türkiye) and, for transactional e-mail, an SMTP provider we use to deliver
          verification and notification messages. We do not use analytics vendors, advertising
          networks, or any third-party script on the signup or builder pages.
        </p>
      </LegalSection>

      <LegalSection title="6. How long we keep it">
        <p>
          We keep your data for as long as your account exists. There is no automatic expiry —
          retention ends when you (or we, at your request) delete the account.
        </p>
      </LegalSection>

      <LegalSection title="7. Deletion">
        <p>
          Deleting your account is permanent and complete: your senders, signatures, and{' '}
          <strong>every uploaded image on cdn.mailmyra.com</strong> are removed. We do not keep
          a backup copy for you to recover. One consequence worth knowing before you do this:
          signatures already pasted into recipients&apos; e-mail clients reference those image
          URLs directly, so once the files are gone those signatures will show a broken-image
          icon instead of your logo. This is by design — deletion means deletion, not a soft
          disable.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          We set exactly one cookie: an essential session cookie that keeps you signed in. It is
          not used for tracking or advertising, and it is required for the service to function
          (you cannot stay signed in without it). Because we set no non-essential cookies, we do
          not show a cookie consent banner.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>
          You can review and edit your account e-mail and your signatures at any time from the
          app. You can export your data (copy the signature HTML, or download the .htm file) at
          any time. You can delete your account outright, which deletes everything as described
          in Section 7. If you are the data subject for sender data entered by someone else&apos;s
          workspace (i.e. you are a customer&apos;s employee), please contact that customer
          directly — they control that data, not us.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          If we change this policy in a way that matters, we will update the version date above
          — the single source for that date is <code>lib/legal-links.ts</code> in our codebase.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about this policy, or a data request:{' '}
          <span className={styles.placeholder}>[contact e-mail address — to be confirmed]</span>.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
