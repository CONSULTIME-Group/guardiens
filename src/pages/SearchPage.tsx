import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import SearchSitter from "@/components/search/SearchSitter";
import SearchOwner from "@/components/search/SearchOwner";

const SearchPage = () => {
  const { activeRole } = useAuth();

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {activeRole === "sitter" ? <SearchSitter /> : <SearchOwner />}
    </>
  );
};

export default SearchPage;
