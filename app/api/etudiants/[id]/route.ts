
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { z } from "zod";

// ========================================
// VALIDATION AVEC ZOD
// ========================================

const idSchema = z.coerce.number().int().positive();

const nameSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
  })
  .strict();

const adminUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.email !== undefined,
    { message: "Au moins un champ est requis" }
  );

// ========================================
// PATCH : modifier un étudiant
// ADMIN : nom et email
// ENSEIGNANT : nom uniquement
// ETUDIANT : interdit
// ========================================

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Vérifier le rôle de la personne connectée
  const auth = await requireRole(["ADMIN", "ENSEIGNANT"]);

  if ("response" in auth) {
    return auth.response;
  }

  // Vérifier l'identifiant reçu dans l'URL
  const params = await context.params;
  const parsedId = idSchema.safeParse(params.id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identifiant invalide" },
      { status: 400 }
    );
  }

  const id = parsedId.data;

  // Vérifier que l'utilisateur existe et est un étudiant
  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
    },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Étudiant introuvable" },
      { status: 404 }
    );
  }

  if (student.role !== "ETUDIANT") {
    return NextResponse.json(
      { error: "Cette ressource n'est pas un compte étudiant" },
      { status: 403 }
    );
  }

  // Lire le JSON
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON invalide" },
      { status: 400 }
    );
  }

  // L'enseignant peut modifier uniquement le nom
  let data: { name?: string; email?: string };

  if (auth.user.role === "ENSEIGNANT") {
    const validation = nameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "L'enseignant peut modifier uniquement le nom",
        },
        { status: 403 }
      );
    }

    data = validation.data;
  } else {
    // L'ADMIN peut modifier le nom et l'email
    const validation = adminUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    data = validation.data;
  }

  // Vérifier que le nouvel email n'appartient pas à un autre compte
  if (data.email !== undefined) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser && existingUser.id !== id) {
      return NextResponse.json(
        { error: "Cet email existe déjà" },
        { status: 409 }
      );
    }
  }

  // Modifier l'étudiant sans exposer son mot de passe
  const updatedStudent = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return NextResponse.json(updatedStudent, { status: 200 });
}

// ========================================
// DELETE : supprimer un étudiant
// ADMIN uniquement
// ========================================

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Seul ADMIN est autorisé
  const auth = await requireRole(["ADMIN"]);

  if ("response" in auth) {
    return auth.response;
  }

  // Vérifier l'identifiant
  const params = await context.params;
  const parsedId = idSchema.safeParse(params.id);

  if (!parsedId.success) {
    return NextResponse.json(
      { error: "Identifiant invalide" },
      { status: 400 }
    );
  }

  const id = parsedId.data;

  // Vérifier que le compte existe
  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
    },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Étudiant introuvable" },
      { status: 404 }
    );
  }

  // Empêcher la suppression d'un ADMIN ou d'un ENSEIGNANT
  if (student.role !== "ETUDIANT") {
    return NextResponse.json(
      { error: "Seuls les comptes étudiants peuvent être supprimés" },
      { status: 403 }
    );
  }

  await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json(
    { message: "Étudiant supprimé avec succès" },
    { status: 200 }
  );
}
