"use client";

import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.error || "Une erreur est survenue.");
        return;
      }

      setMessage("Inscription réussie !");
      setName("");
      setEmail("");
      setPassword("");
    } catch {
      setIsError(true);
      setMessage("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7ff, #e8ecff);
        }

        .card {
          width: 100%;
          max-width: 430px;
          box-sizing: border-box;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
        }

        .logo {
          width: 65px;
          height: 65px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 20px;
          border-radius: 18px;
          background: linear-gradient(135deg, #4f46e5, #818cf8);
          color: white;
          font-size: 32px;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
          transition: transform 0.2s ease;
        }

        .logo:hover {
          transform: translateY(-3px);
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .header h1 {
          margin: 0;
          font-size: 30px;
          color: #111827;
          font-weight: 700;
        }

        .header p {
          margin-top: 8px;
          color: #6b7280;
          font-size: 14px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .group input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 15px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #f9fafb;
          color: #111827;
          font-size: 15px;
          outline: none;
          transition: 0.2s;
        }

        .group input::placeholder {
          color: #9ca3af;
        }

        .group input:focus {
          background: white;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .button {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          text-align: center;
          margin: 0;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .success {
          background: #f0fdf4;
          color: #15803d;
        }

        .error {
          background: #fef2f2;
          color: #b91c1c;
        }

        .login {
          text-align: center;
          margin-top: 25px;
          color: #6b7280;
          font-size: 14px;
        }

        .login a {
          color: #4f46e5;
          font-weight: 600;
          text-decoration: none;
        }

        .login a:hover {
          text-decoration: underline;
        }

        .footer {
          margin-top: 24px;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }

        @media (max-width: 500px) {
          .card {
            padding: 30px 22px;
          }

          .header h1 {
            font-size: 26px;
          }
        }
      `}</style>

      <main className="page">
        <div className="card">
          {/* Logo */}
          <div className="logo" aria-label="Logo de la plateforme">
            🎓
          </div>

          {/* En-tête */}
          <div className="header">
            <h1>Créer un compte</h1>
            <p>Inscrivez-vous pour commencer</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="form">
            <div className="group">
              <label htmlFor="name">Nom complet</label>

              <input
                id="name"
                type="text"
                placeholder="Votre nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="group">
              <label htmlFor="email">Adresse e-mail</label>

              <input
                id="email"
                type="email"
                placeholder="exemple@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="group">
              <label htmlFor="password">Mot de passe</label>

              <input
                id="password"
                type="password"
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="button"
              disabled={loading}
            >
              {loading ? "Inscription en cours..." : "Créer mon compte"}
            </button>

            {message && (
              <p
                role="status"
                aria-live="polite"
                className={`message ${isError ? "error" : "success"}`}
              >
                {message}
              </p>
            )}
          </form>

          {/* Lien de connexion */}
          <div className="login">
            Vous avez déjà un compte ?{" "}
            <a href="/login">Se connecter</a>
          </div>
        </div>

      
      </main>
    </>
  );
}