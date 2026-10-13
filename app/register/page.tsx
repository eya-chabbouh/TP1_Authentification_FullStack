"use client";

import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
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
        setMessage(data.error || "Une erreur est survenue.");
        return;
      }

      setMessage("Inscription réussie !");
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
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
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
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
          font-size: 15px;
          outline: none;
          transition: 0.2s;
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

        .button:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          text-align: center;
          margin-top: 5px;
          padding: 10px;
          border-radius: 8px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 14px;
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

        @media (max-width: 500px) {
          .card {
            padding: 30px 20px;
          }

          .header h1 {
            font-size: 26px;
          }
        }
      `}</style>

      <main className="page">
        <div className="card">

          <div className="header">
            <h1>Créer un compte</h1>
            <p>Inscrivez-vous pour commencer</p>
          </div>

          <form onSubmit={handleSubmit} className="form">

            <div className="group">
              <label htmlFor="name">Nom</label>

              <input
                id="name"
                type="text"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="group">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                placeholder="exemple@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="group">
              <label htmlFor="password">Mot de passe</label>

              <input
                id="password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="button"
              disabled={loading}
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </button>

            {message && (
              <p className="message">
                {message}
              </p>
            )}

          </form>

          <div className="login">
            Vous avez déjà un compte ?{" "}
            <a href="/login">Se connecter</a>
          </div>

        </div>
      </main>
    </>
  );
}
