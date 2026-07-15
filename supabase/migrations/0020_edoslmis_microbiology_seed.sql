-- EDOS LMIS Phase 3 — seed organism and antibiotic catalogs

insert into edoslmis_micro_organisms (tenant_id, name, gram_stain)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', v.name, v.gram::edoslmis_gram_stain
from (values
  ('Escherichia coli', 'negative'),
  ('Klebsiella pneumoniae', 'negative'),
  ('Pseudomonas aeruginosa', 'negative'),
  ('Proteus mirabilis', 'negative'),
  ('Staphylococcus aureus', 'positive'),
  ('Coagulase-negative Staphylococcus', 'positive'),
  ('Streptococcus pyogenes', 'positive'),
  ('Enterococcus faecalis', 'positive'),
  ('Candida albicans', 'not_applicable'),
  ('No growth after 48 hours', 'not_applicable')
) as v(name, gram)
on conflict (tenant_id, name) do nothing;

insert into edoslmis_micro_antibiotics (tenant_id, name, antibiotic_class)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', v.name, v.class
from (values
  ('Ampicillin', 'Penicillin'),
  ('Amoxicillin-Clavulanate', 'Penicillin/BLI'),
  ('Ceftriaxone', 'Cephalosporin'),
  ('Ceftazidime', 'Cephalosporin'),
  ('Ciprofloxacin', 'Fluoroquinolone'),
  ('Gentamicin', 'Aminoglycoside'),
  ('Meropenem', 'Carbapenem'),
  ('Nitrofurantoin', 'Nitrofuran'),
  ('Trimethoprim-Sulfamethoxazole', 'Sulfonamide'),
  ('Vancomycin', 'Glycopeptide')
) as v(name, class)
on conflict (tenant_id, name) do nothing;
