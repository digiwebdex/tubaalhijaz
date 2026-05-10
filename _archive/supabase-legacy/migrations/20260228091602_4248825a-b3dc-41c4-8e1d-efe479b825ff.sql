
-- Add read-only policy for financial_summary (admins only, already covered by ALL but explicit SELECT silences linter)
CREATE POLICY "Admins can read financial summary" ON public.financial_summary FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Add read-only policy for accounts
CREATE POLICY "Admins can read accounts" ON public.accounts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
