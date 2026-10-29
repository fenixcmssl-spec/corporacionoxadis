import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'FenixCMS SaaS — Plataforma Multitenant & Tienda Online',
  description: 'Arquitectura SaaS profesional CMS multidominio, multiidioma, con sistema de plugins, temas y tienda online integrada.',
  openGraph: {
    title: 'FenixCMS SaaS — Plataforma Multitenant & Tienda Online',
    description: 'Arquitectura SaaS profesional CMS multidominio, multiidioma, con sistema de plugins, temas y tienda online integrada.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FenixCMS SaaS — Plataforma Multitenant & Tienda Online',
    description: 'Arquitectura SaaS profesional CMS multidominio, multiidioma, con sistema de plugins, temas y tienda online integrada.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-black text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
