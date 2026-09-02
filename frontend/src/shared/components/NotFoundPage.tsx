import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, EmptyState } from "@/design-system";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <EmptyState
        icon={<Compass size={26} />}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={
          <Link to="/">
            <Button size="lg">Voltar ao início</Button>
          </Link>
        }
      />
    </div>
  );
}
