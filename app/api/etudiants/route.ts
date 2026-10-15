import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ========================================
// VALIDATION DES DONNEES AVEC ZOD
// ========================================

const createStudentSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
    email: z.string().trim().email("Email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(100),
  })
  .strict();

// ========================================
// GET : consulter les étudiants
// ADMIN et ENSEIGNANT : tous les étudiants
// ETUDIANT : uniquement son propre compte
// ========================================

export async function GET() {
  const result = await requireRole([
    "ADMIN",
    "ENSEIGNANT",
    "ETUDIANT",
  ]);

  if ("response" in result) {
    return result.response;
  }

  // Un étudiant consulte uniquement ses propres informations
  if (result.user.role === "ETUDIANT") {
    const student = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true, // Important : récupérer la date
      },
      
    });

    return NextResponse.json(student ? [student] : []);
  }

  // ADMIN et ENSEIGNANT consultent tous les étudiants
  const students = await prisma.user.findMany({
    where: { role: "ETUDIANT" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,

    },
  });

  return NextResponse.json(students);
}

// ========================================
// POST : créer un étudiant
// ADMIN uniquement
// ========================================

export async function POST(request: Request) {
  const result = await requireRole(["ADMIN"]);

  if ("response" in result) {
    return result.response;
  }

  // Lire le JSON envoyé
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Le corps de la requête doit être un JSON valide" },
      { status: 400 }
    );
  }

  // Valider les données avec Zod
  const validation = createStudentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Données invalides",
        details: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { name, email, password } = validation.data;

  // Vérifier si l'email existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Cet email existe déjà" },
      { status: 409 }
    );
  }

  // Hasher le mot de passe avant de l'enregistrer
  const hashedPassword = await bcrypt.hash(password, 10);

  // Créer le compte étudiant
  const student = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "ETUDIANT",
    },
    // Ne jamais retourner le mot de passe
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return NextResponse.json(student, { status: 201 });
}
