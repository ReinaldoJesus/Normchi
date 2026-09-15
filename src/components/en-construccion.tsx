import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EnConstruccion({ nota }: { nota?: string }) {
  return (
    <Card className="border-dashed bg-transparent shadow-none">
      <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
        <Construction className="h-5 w-5 text-muted-foreground" />
        <p className="max-w-sm text-sm text-muted-foreground">
          {nota ?? "Esta sección todavía no está implementada."}
        </p>
      </CardContent>
    </Card>
  );
}
