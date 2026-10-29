-- Ecommerce Web rows 6-8 from the Wood Origins WhatsApp hashcode sheet.
-- The first ad is H1 (digit one), not HI (letter I).
UPDATE whatsapp_templates
SET ad_name = '14 Oct 2026 | Static | MOFU Price Transparency | V3 | H1 | Vinyl With No Middleman',
    updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE campaign_name = '1 September 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web'
  AND ad_set_name = '1 Sept 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web | Adv+'
  AND message = 'BB3C';

INSERT INTO whatsapp_templates (campaign_name, ad_set_name, ad_name, message, status, notes, created_at, updated_at)
SELECT campaign_name, ad_set_name, ad_name, message, 'active', 'Ecommerce Web hashcode sheet',
       to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
FROM (VALUES
  ('1 September 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web',
   '1 Sept 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web | Adv+',
   '14 Oct 2026 | Static | MOFU Price Transparency | V3 | H1 | Vinyl With No Middleman', 'BB3C'),
  ('1 September 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web',
   '1 Sept 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web | Adv+',
   '1 Sept 2026 | Vinyl | Video | KOL Karl | 30+ designs, one of the largest vinyl selections in Singapore | Hook 1 | I spent 3 weeks picking a vinyl design', 'AD0B'),
  ('1 September 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web',
   '1 Sept 2026 | B2C | Vinyl | Prospecting | CBO | Leads | Website | Ecommerce Web | Adv+',
   '1 Sept 2026 | Vinyl | Video | Beat the Backlog - Fast Installation | We only have 6 slots left', 'A2DD')
) AS source(campaign_name, ad_set_name, ad_name, message)
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_templates AS existing
  WHERE lower(existing.campaign_name) = lower(source.campaign_name)
    AND lower(existing.ad_set_name) = lower(source.ad_set_name)
    AND lower(existing.ad_name) = lower(source.ad_name)
    AND existing.message = source.message
);
