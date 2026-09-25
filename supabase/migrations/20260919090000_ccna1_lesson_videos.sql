-- CCNA 1 lesson videos (Google Drive, shared as "anyone with the link").
-- Idempotent: re-running refreshes the file ids.

insert into private.lesson_media (lesson_id, provider, drive_file_id, mime_type)
values
  ('00000000-0000-4000-8000-000000001101', 'google_drive', '1PX_g8bqM6YrUwPl5A5JKciTJuXJHB_iJ', 'video/mp4'), -- CCNA1 Introduction to Networks
  ('00000000-0000-4000-8000-000000001102', 'google_drive', '1hCUp22cHibXpr3a3B2MMEMylKBJVnf7V', 'video/mp4'), -- Module-1 Networking Today
  ('00000000-0000-4000-8000-000000001103', 'google_drive', '1KjZNTLkO4wh1y7S24xXAPGp6lZNt5XZY', 'video/mp4'), -- Module-2 Basic Switch and End Device Configuration
  ('00000000-0000-4000-8000-000000001104', 'google_drive', '1dL_J6nSg0yGzKOWMvo0Phcqp79-LDqML', 'video/mp4'), -- Module-3 Protocols and Models
  ('00000000-0000-4000-8000-000000001105', 'google_drive', '1niEQubLXUC_ms_7isab1w7lcpc_h8Gtp', 'video/mp4'), -- Module-4 Physical Layer
  ('00000000-0000-4000-8000-000000001106', 'google_drive', '1O2VZ-Mj8Sjvcloq00CKmHRA4CzpQK7En', 'video/mp4'), -- Module-5 Numbering Systems
  ('00000000-0000-4000-8000-000000001107', 'google_drive', '1cMGBkmaIwHqdrBnWm57luF8hWghCv_1i', 'video/mp4'), -- Module-6  Data Link Layer
  ('00000000-0000-4000-8000-000000001108', 'google_drive', '1VCT1XZUzE5a3_ODgNZTC4NVAssTINRWb', 'video/mp4'), -- Module-7 Ethernet Switching
  ('00000000-0000-4000-8000-000000001109', 'google_drive', '1Xku3Gm2FFIKKowqvtOKgcAug1lRh3obL', 'video/mp4'), -- Module-8 Network Layer
  ('00000000-0000-4000-8000-000000001110', 'google_drive', '17epVy3yFwc-E7QIUHulmuZSy16J9Yegm', 'video/mp4'), -- Module-9 Address Resolution
  ('00000000-0000-4000-8000-000000001111', 'google_drive', '1S2xWUUQMtmMlTrLoM0euwUKqsy8Cvz7-', 'video/mp4'), -- Module-10 Basic Router Configuration
  ('00000000-0000-4000-8000-000000001112', 'google_drive', '1uGOSQspqILYe0MB2-sxB8Or4M1Xlkdxl', 'video/mp4'), -- Module-11 IPv4 Addressing
  ('00000000-0000-4000-8000-000000001113', 'google_drive', '1EjBd7dnWsLx390Q1HrhNYQI-8dncdpCe', 'video/mp4'), -- Module-12 IPv6 Addressing
  ('00000000-0000-4000-8000-000000001114', 'google_drive', '1xlhz9jwwdPodJOYAcXsD1koLNa89s4mr', 'video/mp4'), -- Module-13  ICMP
  ('00000000-0000-4000-8000-000000001115', 'google_drive', '1sY9s6GYpzjeYZ-DFYDb_7R0Fp1WFztXn', 'video/mp4'), -- Module-14 Transport Layer
  ('00000000-0000-4000-8000-000000001116', 'google_drive', '1Z5TUX_ZVAMb4vY1FYC7RxSCt5cBV9_Vd', 'video/mp4'), -- Module-15 Application Layer
  ('00000000-0000-4000-8000-000000001117', 'google_drive', '1xVEDpU3w1-8PNZGutdvicyNHKDZtY39-', 'video/mp4'), -- Module-16 Network Security Fundamentals
  ('00000000-0000-4000-8000-000000001118', 'google_drive', '1tgV5b47z6j-oGsMoOnKOwNZN3lDStXAR', 'video/mp4') -- Module-17 Build a Small Network
on conflict (lesson_id) do update set
  provider = excluded.provider,
  drive_file_id = excluded.drive_file_id,
  mime_type = excluded.mime_type,
  updated_at = now();
