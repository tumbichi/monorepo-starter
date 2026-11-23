import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card';

export default function HomePage() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          monorepo-starter
        </Badge>
        <CardTitle>Todo listo</CardTitle>
        <CardDescription>
          Next.js + <code>@repo/ui</code> funcionando. Editá <code>apps/web/src/app/page.tsx</code> para empezar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button>Primario</Button>
        <Button variant="outline">Secundario</Button>
      </CardContent>
    </Card>
  );
}
