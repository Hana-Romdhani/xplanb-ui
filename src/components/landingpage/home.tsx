import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  FileText,
  Folder,
  Calendar,
  MessageSquare,
  Brain,
  Users,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";
import Logo from "../../../assets/xplanb_logo-removebg-preview.png";
import LogoDark from "../../../assets/xplanb-logo-dark.png";
import { useTheme } from "@/lib/contexts/ThemeContext";

const Home = () => {
    const { theme, toggleTheme } = useTheme();
  
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)",
        paddingTop: "0",
      }}
    >
      {/* Header */}
      <header
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "24px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
           <img
                    src={theme === "dark" ? LogoDark : Logo}
                    alt="XPlanB logo"
                    className="w-10 h-auto"
                  />
          <h1
            style={{ fontSize: "24px", fontWeight: "bold", color: "#111827" }}
          >
            XPlanB
          </h1>
        </div>
        <nav
          style={{
            display: "none",
            gap: "24px",
            "@media (min-width: 768px)": { display: "flex" },
          }}
          className="hidden md:flex"
        >
          <a
            href="#features"
            style={{ color: "#4b5563", textDecoration: "none" }}
          >
            Fonctionnalités
          </a>
          <a href="#about" style={{ color: "#4b5563", textDecoration: "none" }}>
            À Propos
          </a>
          <a
            href="#contact"
            style={{ color: "#4b5563", textDecoration: "none" }}
          >
            Contact
          </a>
        </nav>
        <div style={{ display: "flex", gap: "16px" }}>
          <Link to="/login">
            <Button variant="outline">Connexion</Button>
          </Link>
          <Link to="/signup">
            <Button>Commencer</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "80px 16px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "24px",
            lineHeight: "1.2",
          }}
        >
          Révolutionnez l'analyse de documents avec{" "}
          <span style={{ color: "#4f46e5" }}>XPlanB</span>
        </h2>
        <p
          style={{
            fontSize: "20px",
            color: "#4b5563",
            marginBottom: "32px",
            maxWidth: "672px",
            margin: "0 auto 32px",
            lineHeight: "1.6",
          }}
        >
          Analysez, organisez et collaborez sur les documents sans effort. De
          l'analyse alimentée par l'IA à l'édition en temps réel, XPlanB est
          votre espace de travail ultime pour la productivité et l'innovation.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "48px",
            flexWrap: "wrap",
          }}
        >
          <Link to="/signup">
            <Button
              size="lg"
              style={{ padding: "12px 32px", fontSize: "16px" }}
            >
              Démarrer l'essai gratuit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            style={{ padding: "12px 32px", fontSize: "16px" }}
          >
            Voir la démo
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "80px 16px",
        }}
      >
        <h3
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            textAlign: "center",
            color: "#111827",
            marginBottom: "48px",
          }}
        >
          Fonctionnalités Puissantes pour les Équipes Modernes
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "32px",
          }}
        >
          <Card>
            <CardHeader>
              <FileText
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Analyse Avancée de Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Extrayez les données des PDF, images et plus encore avec une
                précision alimentée par l'IA. Prend en charge plusieurs formats
                et langues.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Folder
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Dossiers Organisés</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Gardez vos documents structurés avec des dossiers hiérarchiques.
                Partagez et collaborez facilement entre les équipes.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Brain
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Assistant IA</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Obtenez des informations intelligentes, des résumés et des
                suggestions pour améliorer votre flux de travail documentaire.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Users
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Collaboration en Temps Réel</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Modifiez les documents ensemble avec des curseurs en direct, des
                commentaires et un historique des versions.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Calendar
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Calendrier Intégré</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Planifiez des réunions, définissez des délais et gérez votre
                flux de travail avec des fonctionnalités de calendrier
                intégrées.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BarChart3
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Analyses et Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Suivez la productivité, analysez l'utilisation des documents et
                gagnez des informations commerciales avec des analyses
                complètes.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <MessageSquare
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Chat d'Équipe</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Communiquez instantanément avec le chat intégré. Discutez des
                documents et des projets en temps réel.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Shield
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Sécurisé et Privé</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Sécurité de niveau entreprise avec chiffrement de bout en bout
                et conformité aux normes de protection des données.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Zap
                style={{
                  height: "48px",
                  width: "48px",
                  color: "#4f46e5",
                  marginBottom: "16px",
                }}
              />
              <CardTitle>Rapide et Fiable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Construit avec des technologies modernes pour des performances
                ultra-rapides et une disponibilité de 99,9%.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        style={{ backgroundColor: "#ffffff", padding: "80px 16px" }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center" }}
        >
          <h3
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "24px",
            }}
          >
            Pourquoi Choisir XPlanB?
          </h3>
          <p
            style={{
              fontSize: "18px",
              color: "#4b5563",
              marginBottom: "32px",
              maxWidth: "896px",
              margin: "0 auto 32px",
              lineHeight: "1.6",
            }}
          >
            XPlanB est conçu pour les équipes qui ont besoin de puissantes
            capacités d'analyse de documents combinées à des outils
            collaboratifs. Que vous travailliez dans la finance, le droit, la
            santé ou tout autre secteur traitant de documents complexes, XPlanB
            rationalise votre flux de travail.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "64px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#4f46e5",
                  marginBottom: "8px",
                }}
              >
                10M+
              </div>
              <div style={{ color: "#4b5563" }}>Documents Analysés</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#4f46e5",
                  marginBottom: "8px",
                }}
              >
                50K+
              </div>
              <div style={{ color: "#4b5563" }}>Utilisateurs Actifs</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  color: "#4f46e5",
                  marginBottom: "8px",
                }}
              >
                99.9%
              </div>
              <div style={{ color: "#4b5563" }}>Disponibilité</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "80px 16px",
          textAlign: "center",
        }}
      >
        <h3
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "24px",
          }}
        >
          Prêt à Transformer Votre Flux de Travail Documentaire?
        </h3>
        <p
          style={{
            fontSize: "20px",
            color: "#4b5563",
            marginBottom: "32px",
            lineHeight: "1.6",
          }}
        >
          Rejoignez des milliers d'équipes utilisant déjà XPlanB pour augmenter
          la productivité et la collaboration.
        </p>
        <Link to="/signup">
          <Button size="lg" style={{ padding: "12px 32px", fontSize: "16px" }}>
            Commencer Aujourd'hui
          </Button>
        </Link>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "80px 16px",
        }}
      >
        <div
          style={{
            backgroundColor: "#f3f4f6",
            borderRadius: "12px",
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "16px",
            }}
          >
            Nous Contacter
          </h3>
          <p
            style={{
              fontSize: "18px",
              color: "#4b5563",
              marginBottom: "48px",
              lineHeight: "1.6",
            }}
          >
            XPlanB - La meilleure décision dans les moments difficiles
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "40px",
            }}
          >
            {/* Email */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "8px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Email
              </div>
              <a
                href="mailto:s.xplanb@gmail.com"
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#4f46e5",
                  textDecoration: "none",
                }}
              >
                s.xplanb@gmail.com
              </a>
            </div>

            {/* Phone */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "8px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Téléphone
              </div>
              <a
                href="tel:+21692340405"
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#4f46e5",
                  textDecoration: "none",
                }}
              >
                +216 92 340 405
              </a>
            </div>

            {/* Company */}
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "8px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Entreprise
              </div>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: "0",
                }}
              >
                XPlanB
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        style={{
          backgroundColor: "#111827",
          color: "white",
          padding: "48px 16px",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "32px",
              marginBottom: "32px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <Zap
                  style={{ height: "24px", width: "24px", color: "#818cf8" }}
                />
                <span style={{ fontSize: "20px", fontWeight: "bold" }}>
                  XPlanB
                </span>
              </div>
              <p style={{ color: "#9ca3af", lineHeight: "1.6" }}>
                Révolutionner l'analyse de documents et la collaboration pour
                les équipes modernes.
              </p>
            </div>
            <div>
              <h4
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Produit
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "8px" }}>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Fonctionnalités
                  </a>
                </li>
                <li style={{ marginBottom: "8px" }}>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Tarification
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Entreprise
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "8px" }}>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    À Propos
                  </a>
                </li>
                <li style={{ marginBottom: "8px" }}>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Carrières
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Support
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "8px" }}>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Centre d'Aide
                  </a>
                </li>
                <li style={{ marginBottom: "8px" }}>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Nous Contacter
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    style={{ color: "#9ca3af", textDecoration: "none" }}
                  >
                    Politique de Confidentialité
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #374151",
              paddingTop: "32px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#9ca3af" }}>
              © 2024 XPlanB. Tous les droits sont réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
