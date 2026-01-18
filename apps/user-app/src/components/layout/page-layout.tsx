import * as React from "react";
import Head from "next/head";
import { cn } from "~/lib/utils";

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  children,
  className,
}: PageLayoutProps) {
  return (
    <>
      <Head>
        <title>{title} - AI Telegram Channels</title>
        {description && <meta name="description" content={description} />}
      </Head>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <main className={cn("w-full", className)}>
          {children}
        </main>
      </div>
    </>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function PageSection({
  title,
  description,
  children,
  className,
  actions,
}: PageSectionProps) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || description || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
