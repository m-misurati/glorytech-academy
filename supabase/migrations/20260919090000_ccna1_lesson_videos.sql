-- CCNA 1 lesson videos (Google Drive, shared as "anyone with the link").
-- Idempotent: re-running refreshes the file ids.

insert into private.lesson_media (lesson_id, provider, drive_file_id, mime_type)
values
  ('00000000-0000-4000-8000-000000001101', 'google_drive', '1q74TWc_r9qBdoDYGUu7X4zS5rlwAem6P', 'video/mp4'), -- CCNA1 Introduction to Networks
  ('00000000-0000-4000-8000-000000001102', 'google_drive', '1QA9EFLiNTVeT8hzwheN-s1-kb-f6njP8', 'video/mp4'), -- Module-1 Networking Today
  ('00000000-0000-4000-8000-000000001103', 'google_drive', '1TAf3b7mJ1mj48RJQThuu98NghnD_hJ3Q', 'video/mp4'), -- Module-2 Basic Switch and End Device Configuration
  ('00000000-0000-4000-8000-000000001104', 'google_drive', '1ZCepugEFSR2PZtsge-IZtNU0H08tivVf', 'video/mp4'), -- Module-3 Protocols and Models
  ('00000000-0000-4000-8000-000000001105', 'google_drive', '1F0pECAsyZ8qvb0sI0nXShuP0gI13uAdY', 'video/mp4'), -- Module-4 Physical Layer
  ('00000000-0000-4000-8000-000000001106', 'google_drive', '1vTLg7JK641PxB33XxL4WF_6fNiXPFTLV', 'video/mp4'), -- Module-5 Numbering Systems
  ('00000000-0000-4000-8000-000000001107', 'google_drive', '1VgFFAIjX1ysI8iRctU4dWjNqez49gmHY', 'video/mp4'), -- Module-6  Data Link Layer
  ('00000000-0000-4000-8000-000000001108', 'google_drive', '10vHIiq6c_VwB_Qr1QnVEpStrAIRyTRAJ', 'video/mp4'), -- Module-7 Ethernet Switching
  ('00000000-0000-4000-8000-000000001109', 'google_drive', '1VO7TYroDaWNR-rUjK7y3uldJ_uAb6yb8', 'video/mp4'), -- Module-8 Network Layer
  ('00000000-0000-4000-8000-000000001110', 'google_drive', '1cw8HnkkrbE-7dU8M6cMUi7k7XHDzMIeF', 'video/mp4'), -- Module-9 Address Resolution
  ('00000000-0000-4000-8000-000000001111', 'google_drive', '1l6Hq6KsEalPdm446-I5gNoffe0apcWuy', 'video/mp4'), -- Module-10 Basic Router Configuration
  ('00000000-0000-4000-8000-000000001112', 'google_drive', '1Y2h0NPCbUb5qHkXXn-7uZoGM1FJFA3_M', 'video/mp4'), -- Module-11 IPv4 Addressing
  ('00000000-0000-4000-8000-000000001113', 'google_drive', '1cCRimxAULbsAsVY7tt7ocH60nk5Wsxyg', 'video/mp4'), -- Module-12 IPv6 Addressing
  ('00000000-0000-4000-8000-000000001114', 'google_drive', '1uBEQogHpTM0vvcUqub48DfiNa5g_pbqU', 'video/mp4'), -- Module-13  ICMP
  ('00000000-0000-4000-8000-000000001115', 'google_drive', '19caoi9AO_O9W3bBJv5_paaNrX--Jo6WD', 'video/mp4'), -- Module-14 Transport Layer
  ('00000000-0000-4000-8000-000000001116', 'google_drive', '12XJjQgr_PgNlLEHCCmEgfMAZm43PnGty', 'video/mp4'), -- Module-15 Application Layer
  ('00000000-0000-4000-8000-000000001117', 'google_drive', '1Yp9nrLwM0nESglul23uw7kcwPWqisA6m', 'video/mp4'), -- Module-16 Network Security Fundamentals
  ('00000000-0000-4000-8000-000000001118', 'google_drive', '1Q_Dn8sPzjLF-XkdlUCgNaWbCyyxk4wc3', 'video/mp4') -- Module-17 Build a Small Network
on conflict (lesson_id) do update set
  provider = excluded.provider,
  drive_file_id = excluded.drive_file_id,
  mime_type = excluded.mime_type,
  updated_at = now();
