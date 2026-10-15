
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";

export async function requireRole(
  rolesAutorises: readonly Role[]
) {
  // 1. Vérifier la session de l'utilisateur
  const session = await getSession();

  if (!session) {
    return {
      response: NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      ),
    };
  }

  // 2. Récupérer l'utilisateur dans la base de données
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 401 }
      ),
    };
  }

  // 3. Vérifier si le rôle est autorisé
  if (
    !rolesAutorises.includes(user.role as Role) ||
    !["ADMIN", "ENSEIGNANT", "ETUDIANT"].includes(user.role)
  ) {
    return {
      response: NextResponse.json(
        { error: "Accès interdit" },
        { status: 403 }
      ),
    };
  }

  // 4. Retourner l'utilisateur autorisé
  return {
    user: {
      id: user.id,
      role: user.role as Role,
    },
  };
}
