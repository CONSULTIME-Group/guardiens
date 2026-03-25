import { useAuth } from "@/contexts/AuthContext";
import SearchSitter from "@/components/search/SearchSitter";
import SearchOwner from "@/components/search/SearchOwner";

const SearchPage = () => {
  const { activeRole } = useAuth();

  return activeRole === "sitter" ? <SearchSitter /> : <SearchOwner />;
};

export default SearchPage;
