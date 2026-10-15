
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ADMIN" | "ENSEIGNANT" | "ETUDIANT";

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt?: string | null;
};

type ModalMode = "view" | "edit" | "add" | null;

function formatDate(date?: string | null) {
  if (!date) return "Date indisponible";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date indisponible";
  }

  return parsedDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function roleLabel(role: Role) {
  switch (role) {
    case "ADMIN":
      return "Administrateur";
    case "ENSEIGNANT":
      return "Enseignant";
    default:
      return "Étudiant";
  }
}

function roleStyle(role: Role) {
  switch (role) {
    case "ADMIN":
      return "bg-violet-100 text-violet-800";
    case "ENSEIGNANT":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-sky-100 text-sky-800";
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const isAdmin = currentUser?.role === "ADMIN";
  const isTeacher = currentUser?.role === "ENSEIGNANT";
  const isStudent = currentUser?.role === "ETUDIANT";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const meResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (meResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!meResponse.ok) {
        throw new Error("Impossible de récupérer le compte connecté.");
      }

      const meData = await meResponse.json();
      const me: User = meData.user ?? meData;

      if (!me.id || !me.role) {
        throw new Error(
          "Les informations du compte sont incomplètes. Vérifie /api/auth/me."
        );
      }

      setCurrentUser(me);

      if (me.role === "ETUDIANT") {
        setStudents([]);
        return;
      }

      const studentsResponse = await fetch("/api/etudiants", {
        cache: "no-store",
      });

      if (!studentsResponse.ok) {
        if (studentsResponse.status === 401) {
          router.replace("/login");
          return;
        }

        if (studentsResponse.status === 403) {
          throw new Error(
            "Tu n'as pas l'autorisation de consulter la liste des étudiants."
          );
        }

        throw new Error("Impossible de charger la liste des étudiants.");
      }

      const studentsData = await studentsResponse.json();

      const list: User[] = Array.isArray(studentsData)
        ? studentsData
        : Array.isArray(studentsData.students)
          ? studentsData.students
          : [];

      setStudents(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function openModal(mode: ModalMode, user: User | null = null) {
    setError("");
    setSuccess("");
    setSelectedUser(user);
    setFormName(user?.name ?? "");
    setFormEmail(user?.email ?? "");
    setFormPassword("");
    setModalMode(mode);
  }

  function closeModal() {
    if (saving) return;

    setModalMode(null);
    setSelectedUser(null);
    setFormPassword("");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser || !modalMode) return;

    setError("");
    setSuccess("");

    const name = formName.trim();
    const email = formEmail.trim();

    if (!name) {
      setError("Le nom est obligatoire.");
      return;
    }

    if (modalMode === "add") {
      if (!email || !formPassword) {
        setError("L'e-mail et le mot de passe sont obligatoires.");
        return;
      }

      if (formPassword.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
    }

    setSaving(true);

    try {
      let response: Response;

      if (modalMode === "add") {
        response = await fetch("/api/etudiants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password: formPassword,
          }),
        });
      } else if (modalMode === "edit" && selectedUser) {
        const body =
          currentUser.role === "ADMIN"
            ? { name, email }
            : { name };

        response = await fetch(`/api/etudiants/${selectedUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        throw new Error(
          data.error ??
            data.message ??
            "L'opération a échoué. Vérifie les autorisations de l'API."
        );
      }

      setModalMode(null);
      setSelectedUser(null);
      setFormPassword("");

      setSuccess(
        modalMode === "add"
          ? "Étudiant ajouté avec succès."
          : "Informations modifiées avec succès."
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer les modifications."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le compte de ${user.name} ?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/etudiants/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ?? data.message ?? "La suppression a échoué."
        );
      }

      setSuccess("Étudiant supprimé avec succès.");
      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de supprimer le compte."
      );
    }
  }

  async function handleLogout() {
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("La déconnexion a échoué.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de se déconnecter."
      );
    }
  }

  const filteredStudents = students.filter((student) => {
    const query = search.toLowerCase();

    return (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo ajouté à gauche du titre */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-400 text-3xl shadow-lg shadow-indigo-200">
              🎓
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
                Espace de gestion
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Tableau de bord
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser && (
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  {currentUser.name}
                </p>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${roleStyle(currentUser.role)}`}
                >
                  {roleLabel(currentUser.role)}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{error}</p>
            <button
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Fermer le message"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <p>{success}</p>
            <button
              onClick={() => setSuccess("")}
              className="font-bold"
              aria-label="Fermer le message"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="font-medium text-slate-600">
              Chargement des informations...
            </p>
          </div>
        ) : currentUser ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Compte connecté
                </p>
                <p className="mt-2 break-words text-lg font-bold text-slate-900">
                  {currentUser.name}
                </p>
                <p className="mt-1 break-words text-sm text-slate-500">
                  {currentUser.email}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Type de compte
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {roleLabel(currentUser.role)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Accès selon votre rôle
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Membre depuis
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatDate(currentUser.createdAt)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Date de création du compte
                </p>
              </div>
            </section>

            {isStudent ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-900">
                    Mes informations
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Voici les informations de votre compte.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-sm">
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <th className="w-1/3 px-4 py-4 font-semibold text-slate-600">
                          Identifiant
                        </th>
                        <td className="px-4 py-4">{currentUser.id}</td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-4 py-4 font-semibold text-slate-600">
                          Nom complet
                        </th>
                        <td className="px-4 py-4">{currentUser.name}</td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-4 py-4 font-semibold text-slate-600">
                          E-mail
                        </th>
                        <td className="break-all px-4 py-4">
                          {currentUser.email}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-4 py-4 font-semibold text-slate-600">
                          Rôle
                        </th>
                        <td className="px-4 py-4">
                          {roleLabel(currentUser.role)}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-100">
                        <th className="px-4 py-4 font-semibold text-slate-600">
                          Membre depuis
                        </th>
                        <td className="px-4 py-4">
                          {formatDate(currentUser.createdAt)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Gestion des étudiants
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {isAdmin
                        ? "Consultez et gérez les comptes étudiants."
                        : "Consultez les comptes étudiants et modifiez leur nom."}
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => openModal("add")}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      + Ajouter un étudiant
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    Total :{" "}
                    <span className="font-bold text-slate-900">
                      {students.length}
                    </span>{" "}
                    étudiant(s)
                  </p>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher par nom ou e-mail..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:max-w-sm"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-5 py-4">ID</th>
                        <th className="px-5 py-4">Nom complet</th>
                        <th className="px-5 py-4">E-mail</th>
                        <th className="px-5 py-4">Rôle</th>
                        <th className="px-5 py-4">Membre depuis</th>
                        <th className="px-5 py-4">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 font-medium text-slate-500">
                            #{student.id}
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {student.name}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {student.email}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${roleStyle(student.role)}`}
                            >
                              {roleLabel(student.role)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatDate(student.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openModal("view", student)}
                                className="rounded-md bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-200"
                              >
                                Afficher
                              </button>

                              {(isAdmin || isTeacher) && (
                                <button
                                  onClick={() => openModal("edit", student)}
                                  className="rounded-md bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
                                >
                                  Modifier
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(student)}
                                  className="rounded-md bg-red-100 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-200"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredStudents.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-slate-500"
                          >
                            {students.length === 0
                              ? "Aucun étudiant à afficher."
                              : "Aucun résultat pour cette recherche."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
                  Les actions disponibles dépendent de votre rôle.
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>

      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2
                  id="modal-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {modalMode === "add"
                    ? "Ajouter un étudiant"
                    : modalMode === "edit"
                      ? "Modifier les informations"
                      : "Détails du compte"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {modalMode === "view"
                    ? "Informations du compte sélectionné"
                    : "Remplissez les champs ci-dessous"}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                aria-label="Fermer la fenêtre"
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {modalMode === "view" && selectedUser ? (
              <div className="space-y-4 p-6">
                <div>
                  <p className="text-sm text-slate-500">Identifiant</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    #{selectedUser.id}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Nom complet</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {selectedUser.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">E-mail</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">
                    {selectedUser.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Rôle</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {roleLabel(selectedUser.role)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Membre depuis</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    onClick={closeModal}
                    className="rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-700"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5 p-6">
                <div>
                  <label
                    htmlFor="student-name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nom complet
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    required
                    disabled={saving}
                    placeholder="Saisir le nom complet"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                  />
                </div>

                {(modalMode === "add" || isAdmin) && (
                  <div>
                    <label
                      htmlFor="student-email"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Adresse e-mail
                    </label>
                    <input
                      id="student-email"
                      type="email"
                      value={formEmail}
                      onChange={(event) => setFormEmail(event.target.value)}
                      required
                      disabled={saving}
                      placeholder="exemple@email.com"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>
                )}

                {modalMode === "add" && (
                  <div>
                    <label
                      htmlFor="student-password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Mot de passe initial
                    </label>
                    <input
                      id="student-password"
                      type="password"
                      value={formPassword}
                      onChange={(event) => setFormPassword(event.target.value)}
                      minLength={8}
                      required
                      disabled={saving}
                      autoComplete="new-password"
                      placeholder="Au moins 8 caractères"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    />
                  </div>
                )}

                {modalMode === "edit" && isTeacher && (
                  <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                    En tant qu’enseignant, tu peux modifier le nom uniquement.
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Enregistrement..."
                      : modalMode === "add"
                        ? "Ajouter"
                        : "Enregistrer"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
