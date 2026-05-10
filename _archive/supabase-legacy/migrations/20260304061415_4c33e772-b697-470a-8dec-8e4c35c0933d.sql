
CREATE OR REPLACE FUNCTION public.calculate_booking_profit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- For family bookings, total_amount is set from members sum, don't overwrite
  IF COALESCE(NEW.booking_type, 'individual') = 'individual' THEN
    NEW.total_amount := COALESCE(NEW.selling_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  END IF;
  
  NEW.total_cost := COALESCE(NEW.cost_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.total_commission := COALESCE(NEW.commission_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.commission_due := GREATEST(0, COALESCE(NEW.total_commission, 0) - COALESCE(NEW.commission_paid, 0));
  NEW.profit_amount := NEW.total_amount - COALESCE(NEW.total_cost, 0) - COALESCE(NEW.total_commission, 0) - COALESCE(NEW.extra_expense, 0);
  NEW.due_amount := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_amount, 0));
  NEW.supplier_due := GREATEST(0, COALESCE(NEW.total_cost, 0) - COALESCE(NEW.paid_to_supplier, 0));
  IF NEW.moallem_id IS NOT NULL THEN
    NEW.moallem_due := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_by_moallem, 0));
  ELSE
    NEW.moallem_due := 0;
    NEW.commission_per_person := 0;
    NEW.total_commission := 0;
    NEW.commission_paid := 0;
    NEW.commission_due := 0;
  END IF;
  RETURN NEW;
END;
$function$;
