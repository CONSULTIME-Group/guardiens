import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import MissionCard from "@/components/missions/connected/MissionCard";

const MOCK = [
  {
    id: "1",
    title: "Promener Filou 3 fois cette semaine",
    category: "animals",
    city: "Lyon 4e",
    duration_estimate: "1-2h",
    date_needed: "2026-07-08",
    mission_type: "besoin",
    exchange_offer: "Plateau de fromages maison et une bonne bouteille",
    status: "open",
    user_id: "u1",
    response_count: 0,
    already_proposed: false,
    photos: ["https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800"],
    profiles: { first_name: "Marion", avatar_url: "https://i.pravatar.cc/80?img=47", bio: "Maman de deux chiens adorables, je pars quelques jours et cherche quelqu'un de confiance dans le quartier." },
  },
  {
    id: "2",
    title: "Arroser le potager pendant 5 jours",
    category: "garden",
    city: "Villeurbanne",
    duration_estimate: "half_day",
    date_needed: "2026-07-15",
    mission_type: "besoin",
    exchange_offer: "Servez-vous dans les tomates et les courgettes !",
    status: "open",
    user_id: "u2",
    response_count: 2,
    already_proposed: false,
    photos: [],
    profiles: { first_name: "Julien", avatar_url: null, bio: "" },
  },
  {
    id: "3",
    title: "Véto à la retraite, questions sur votre chien",
    category: "skills",
    city: "Croix-Rousse",
    duration_estimate: "1-2h",
    date_needed: null,
    mission_type: "offre",
    exchange_offer: "Le plaisir de voir des animaux heureux",
    status: "open",
    user_id: "u3",
    response_count: 5,
    already_proposed: false,
    photos: ["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800"],
    profiles: { first_name: "Claire", avatar_url: "https://i.pravatar.cc/80?img=32", bio: "Vétérinaire retraitée, disponible pour répondre à vos questions." },
  },
];

const PreviewMissionCards = () => {
  if (!import.meta.env.DEV) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-background p-8">
      <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
      <h1 className="font-heading text-2xl mb-6">Preview MissionCard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
        {MOCK.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            currentUserId="viewer"
            isAuthenticated
            canApplyMissions
            mode="need"
            onNavigateDetail={() => {}}
            onPropose={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default PreviewMissionCards;
