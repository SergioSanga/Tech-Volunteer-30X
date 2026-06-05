import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "30X — Agente de Onboarding",
  description: "Tu primer punto de contacto al unirte al equipo de 30X",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
