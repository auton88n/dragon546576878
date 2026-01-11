-- Clean up invalid marketing QR scan test data
DELETE FROM marketing_qr_scans 
WHERE campaign_id = '--'
   OR campaign_id = ''
   OR campaign_id LIKE '%\%3F%'
   OR campaign_id LIKE '%.js'
   OR campaign_id LIKE '%.css'
   OR campaign_id LIKE '%.webp'
   OR campaign_id LIKE '%.webmanifest'
   OR campaign_id = 'home'
   OR campaign_id = 'book';