UPDATE site_content SET content = jsonb_set(
  jsonb_set(content, '{location}', '"দৈলরবাগ পল্লী বিদ্যুৎ সংলগ্ন, সোনারগাঁও থানা রোড, নারায়ণগঞ্জ-ঢাকা"'::jsonb),
  '{email}', '"rahekaba.info@gmail.com"'::jsonb
) WHERE section_key = 'contact';