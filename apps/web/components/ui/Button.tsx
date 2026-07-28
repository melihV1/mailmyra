import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonSharedProps {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

type ButtonAsLinkProps = ButtonSharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    href: string;
  };

type ButtonAsButtonProps = ButtonSharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

export type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

/**
 * design-system.md §3.1 — primary / secondary / ghost. `href` varsa
 * `next/link` (dahili yönlendirme), yoksa gerçek `<button>` render eder —
 * ikisi de aynı sınıfları paylaşır ki durumlar (hover/focus/disabled) tek
 * yerde tanımlansın.
 */
export function Button(props: ButtonProps) {
  const { variant = 'primary', className, children, ...rest } = props;
  const classes = [styles.base, styles[variant], className].filter(Boolean).join(' ');

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorRest } = rest as Omit<ButtonAsLinkProps, keyof ButtonSharedProps>;
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonAsButtonProps, keyof ButtonSharedProps>;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
