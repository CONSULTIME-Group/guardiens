UPDATE public.faq_entries
SET answer = regexp_replace(answer, '13(\s|\u00a0)+juillet(\s|\u00a0)+2026', '14 juillet 2026', 'g')
WHERE id IN ('e1219f55-2e94-49ad-ba66-fce829a16583','e78d7af7-4876-4a57-a277-c462b2f90a95');