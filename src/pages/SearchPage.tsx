import { useAuth } from "@/contexts/AuthContext";

const SearchPage = () => {
  const { activeRole } = useAuth();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-3">
        {activeRole === "owner" ? "Trouver un gardien" : "Trouver une garde"}
      </h1>
      <p className="text-muted-foreground">
        {activeRole === "owner"
          ? "Recherchez le gardien idéal pour votre maison et vos animaux."
          : "Parcourez les annonces de garde disponibles près de chez vous."}
      </p>
    </div>
  );
};

export default SearchPage;
