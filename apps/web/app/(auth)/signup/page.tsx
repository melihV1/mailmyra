import { AuthCard } from '../AuthCard';
import { SignupForm } from './SignupForm';

export const metadata = { title: 'Create account — Mailmyra' };

export default function SignupPage() {
  return (
    <AuthCard>
      <SignupForm />
    </AuthCard>
  );
}
