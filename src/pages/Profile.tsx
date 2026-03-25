import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-3">Mon profil</h1>
      <p className="text-muted-foreground mb-8">
        Complétez votre profil pour augmenter vos chances.
      </p>

      {/* Completion bar */}
      <div className="bg-card rounded-lg border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium">Taux de complétion</span>
          <span className="text-2xl font-bold text-primary font-heading">
            {user?.profileCompletion ?? 0}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${user?.profileCompletion ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
