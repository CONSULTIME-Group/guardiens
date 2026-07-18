import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { RevealSection } from "@/components/ui/RevealSection";
import RealMembersStrip from "@/components/landing/RealMembersStrip";
import { testimonials } from "@/data/homeTestimonials";

// Initiales pour avatar (ex: "Sarah & Karim" → "S&K", "Nadia" → "N")
const getInitials = (name: string) =>
  name
    .split(/\s*&\s*|\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);

const TestimonialsSection = () => {
  const { t } = useTranslation();

  const testimonialPages = Array.from(
    { length: Math.ceil(testimonials.length / 3) },
    (_, index) => testimonials.slice(index * 3, index * 3 + 3)
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isTestimonialsPaused, setIsTestimonialsPaused] = useState(false);

  const goToTestimonialPage = (index: number) => {
    const totalPages = testimonialPages.length;
    if (totalPages <= 1) return;
    setSelectedIndex((index + totalPages) % totalPages);
  };

  useEffect(() => {
    if (testimonialPages.length <= 1 || isTestimonialsPaused) return;

    const intervalId = window.setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % testimonialPages.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [isTestimonialsPaused, testimonialPages.length]);

  return (
    <section id="temoignages" className="py-10 md:py-20 bg-background scroll-mt-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <RevealSection className="text-center mb-16">
          <h2 id="ils-ont-ose" className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-snug scroll-mt-24">
            {t("landing.testimonials.title")}
          </h2>
          <p className="mt-4 font-body text-sm text-foreground/55 max-w-xl mx-auto">
            {t("landing.testimonials.source")}
          </p>
        </RevealSection>

        <RealMembersStrip />

        <div
          className="relative"
          onMouseEnter={() => setIsTestimonialsPaused(true)}
          onMouseLeave={() => setIsTestimonialsPaused(false)}
          onFocus={() => setIsTestimonialsPaused(true)}
          onBlur={() => setIsTestimonialsPaused(false)}
        >
          <button
            onClick={() => goToTestimonialPage(selectedIndex - 1)}
            className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label={t("landing.testimonials.prev_aria")}
            disabled={testimonialPages.length <= 1}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goToTestimonialPage(selectedIndex + 1)}
            className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label={t("landing.testimonials.next_aria")}
            disabled={testimonialPages.length <= 1}
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="overflow-hidden px-3" aria-live="polite">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(testimonialPages[selectedIndex] ?? []).map((quote) => (
                <figure key={quote.name} className="min-w-0">
                  <blockquote className="rounded-2xl p-10 h-full bg-card border border-border shadow-sm flex flex-col">
                    <span aria-hidden className="block font-heading text-7xl leading-none mb-3 select-none text-primary/40">
                      "
                    </span>
                    <p className="font-body text-base md:text-lg text-foreground/70 leading-relaxed italic mb-6 flex-1">
                      {quote.text}
                    </p>
                    <figcaption className="flex items-center gap-3 pt-4 border-t border-border/60">
                      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-heading text-sm font-semibold">
                        {getInitials(quote.name)}
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="font-body text-sm font-semibold text-foreground">
                          {quote.name}
                        </span>
                        <span className="font-body text-xs text-foreground/55">
                          {quote.detail}
                        </span>
                      </span>

                    </figcaption>
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-10">
            {testimonialPages.map((_, i) => (
              <button
                key={i}
                onClick={() => goToTestimonialPage(i)}
                className="inline-flex items-center justify-center min-w-11 min-h-11 group"
                aria-label={t("landing.testimonials.page_aria", { n: i + 1 })}
              >
                <span
                  className={`block w-2.5 h-2.5 rounded-full transition-colors ${
                    i === selectedIndex ? "bg-primary" : "bg-foreground/20 group-hover:bg-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
