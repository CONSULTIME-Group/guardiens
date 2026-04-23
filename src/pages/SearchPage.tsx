import { Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const SearchSitter = lazyWithRetry(
  () => import("@/components/search/SearchSitter"),
  "SearchSitter",
);
const SearchOwner = lazyWithRetry(
  () => import("@/components/search/SearchOwner"),
  "SearchOwner",
);

const SearchPage = () => {
  const { activeRole } = useAuth();

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Suspense fallback={null}>
        {activeRole === "sitter" ? <SearchSitter /> : <SearchOwner />}
      </Suspense>
    </>
  );
};

export default SearchPage;
