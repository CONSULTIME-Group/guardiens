import { useTranslation } from "react-i18next";

const SkipToContent = () => {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("a11y.skip_to_content")}
    </a>
  );
};

export default SkipToContent;
