'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ButtonHTMLAttributes, SelectHTMLAttributes } from 'react';

/** A <select> that submits its form as soon as the value changes. */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

/** A submit button that asks for confirmation first. */
export function ConfirmButton({ message, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Admin">
      {links.map((l) => {
        const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
