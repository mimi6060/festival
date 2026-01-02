import '../globals.css';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <title>Connexion - Festival Admin</title>
        <meta name="description" content="Connectez-vous au dashboard d'administration Festival" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-gray-900">
        {children}
      </body>
    </html>
  );
}
