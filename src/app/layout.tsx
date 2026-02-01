import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PaintVoice AI',
  description: 'Intelligente Angebotserstellung für Malerarbeiten',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
