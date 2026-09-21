"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export default function MePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <PageContainer title="Meu perfil">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">E-mail: </span>
            {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Perfil: </span>
            {roleLabels[user.role]}
          </p>
          <p>
            <span className="text-muted-foreground">Usuário desde: </span>
            {formatDateTime(user.created_at)}
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
