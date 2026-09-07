import { useTranslation } from "react-i18next";

const SkipToContent = () => {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="fixed -top-14 left-2 z-[9999] inline-flex min-h-11 min-w-11 items-center px-4 py-2 rounded-md bg-primary text-primary-foreground outline-none ring-2 ring-ring focus:top-2"
    >
      {t("a11y.skip_to_content")}
    </a>
  );
};

export default SkipToContent;
