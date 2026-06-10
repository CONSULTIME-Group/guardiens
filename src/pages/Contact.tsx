import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Contact = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const contactSchema = z.object({
    name: z.string().trim().min(1, t("contact.errors.name_required")).max(100, t("contact.errors.name_max")),
    email: z.string().trim().email(t("contact.errors.email_invalid")).max(255, t("contact.errors.email_max")),
    subject: z.string().trim().min(1, t("contact.errors.subject_required")).max(200, t("contact.errors.subject_max")),
    message: z.string().trim().min(10, t("contact.errors.message_min")).max(2000, t("contact.errors.message_max")),
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(i => { fieldErrors[i.path[0] as string] = i.message; });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: result.data.name,
      email: result.data.email,
      subject: result.data.subject,
      message: result.data.message,
    });
    setSending(false);

    if (error) {
      toast.error(t("contact.error_send"));
      return;
    }

    setSent(true);
    toast.success(t("contact.success"));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title={t("contact.meta_title")}
        description={t("contact.meta_description")}
        path="/contact"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">{t("contact.title")}</h1>

        <div className="space-y-8 text-muted-foreground">
          <p className="text-lg">
            {t("contact.intro")}
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6">
              <Mail className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-heading font-semibold text-foreground mb-2">{t("contact.email")}</h3>
              <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">
                contact@guardiens.fr
              </a>
            </div>
            <div className="bg-card rounded-xl p-6">
              <MapPin className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-heading font-semibold text-foreground mb-2">{t("contact.location")}</h3>
              <p>{t("contact.location_value")}</p>
            </div>
          </div>

          {/* Contact Form */}
          {sent ? (
            <div className="bg-card rounded-xl p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h3 className="font-heading text-xl font-semibold text-foreground">{t("contact.sent_title")}</h3>
              <p>{t("contact.sent_body")}</p>
              <Button variant="outline" onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                {t("contact.send_another")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 space-y-5">
              <h3 className="font-heading text-lg font-semibold text-foreground">{t("contact.form_title")}</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("contact.name")}</Label>
                  <Input id="name" placeholder={t("contact.name_placeholder")} value={form.name} onChange={e => handleChange("name", e.target.value)} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("contact.email_label")}</Label>
                  <Input id="email" type="email" placeholder={t("contact.email_placeholder")} value={form.email} onChange={e => handleChange("email", e.target.value)} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">{t("contact.subject")}</Label>
                <Input id="subject" placeholder={t("contact.subject_placeholder")} value={form.subject} onChange={e => handleChange("subject", e.target.value)} />
                {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">{t("contact.message")}</Label>
                <Textarea id="message" placeholder={t("contact.message_placeholder")} rows={5} value={form.message} onChange={e => handleChange("message", e.target.value)} />
                {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
              </div>

              <Button type="submit" disabled={sending} className="gap-2">
                <Send className="h-4 w-4" />
                {sending ? t("contact.sending") : t("contact.send")}
              </Button>
            </form>
          )}

          <div className="bg-card rounded-xl p-6">
            <h3 className="font-heading font-semibold text-foreground mb-2">{t("contact.socials")}</h3>
            <ul className="space-y-2">
              <li>Instagram : <span className="text-primary">@guardiens.fr</span></li>
              <li>LinkedIn : <span className="text-primary">Guardiens</span></li>
            </ul>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Contact;
