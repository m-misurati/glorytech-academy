-- Lesson videos for CCNA 1 and CCNA 4, plus the slide deck attached to each lesson.
-- Google Drive files must stay shared as "anyone with the link".
-- Idempotent: re-running refreshes the file ids.

insert into private.lesson_media (lesson_id, provider, drive_file_id, mime_type)
values
  ('00000000-0000-4000-8000-000000001101', 'google_drive', '1cKLJoLyQqKQjoWm9NMGEZhi9JEJpyCD5', 'video/mp4'), -- CCNA1 Introduction to Networks
  ('00000000-0000-4000-8000-000000001102', 'google_drive', '1GM0GvtAH_vl_uicpYQQUMkrza6vCZLIE', 'video/mp4'), -- Module-1 Networking Today
  ('00000000-0000-4000-8000-000000001103', 'google_drive', '1KT8wil45XNLgjiCv2BipL_QFtcLTBwG_', 'video/mp4'), -- Module-2 Basic Switch and End Device Configuration
  ('00000000-0000-4000-8000-000000001104', 'google_drive', '1dYRU1nZ1ug4I9pYs497cXKRAe9CqBHSX', 'video/mp4'), -- Module-3 Protocols and Models
  ('00000000-0000-4000-8000-000000001105', 'google_drive', '1pfAV1v1tOhyBZhHnQwARxpM0UfuqE8Za', 'video/mp4'), -- Module-4 Physical Layer
  ('00000000-0000-4000-8000-000000001106', 'google_drive', '15wCdLVu1YIzU-X2QJY2Q777b-H7hjjpQ', 'video/mp4'), -- Module-5 Numbering Systems
  ('00000000-0000-4000-8000-000000001107', 'google_drive', '1QLEjXwDbJi5C6M9rPtX0Rom0mtvuA6NC', 'video/mp4'), -- Module-6  Data Link Layer
  ('00000000-0000-4000-8000-000000001108', 'google_drive', '1ucfDIKpvZG_N9FOG6Xv9ot6JAW4Ucuqs', 'video/mp4'), -- Module-7 Ethernet Switching
  ('00000000-0000-4000-8000-000000001109', 'google_drive', '1NR_iVdfQyFJsW5rIFkzt8Ui3o_P2Ehei', 'video/mp4'), -- Module-8 Network Layer
  ('00000000-0000-4000-8000-000000001110', 'google_drive', '1G-VT0-CZomD25i2QWg_NQzYZSh4uLFOQ', 'video/mp4'), -- Module-9 Address Resolution
  ('00000000-0000-4000-8000-000000001111', 'google_drive', '1ySFDMuuykPBJ3glpt6WB8taNVQk1FQQi', 'video/mp4'), -- Module-10 Basic Router Configuration
  ('00000000-0000-4000-8000-000000001112', 'google_drive', '1I8w6WfUAU8V4ZGzgqHxsfoLyWfj90lZY', 'video/mp4'), -- Module-11 IPv4 Addressing
  ('00000000-0000-4000-8000-000000001113', 'google_drive', '1dPEn7bf_-glYJWr5ekzVxXGQRjkGT_yI', 'video/mp4'), -- Module-12 IPv6 Addressing
  ('00000000-0000-4000-8000-000000001114', 'google_drive', '1j2IwfYtCUVRHXXpg5PUI5j5SIQDeErJb', 'video/mp4'), -- Module-13  ICMP
  ('00000000-0000-4000-8000-000000001115', 'google_drive', '1rK_j83v_fh2VwGeIzf1QgP4c3X8Wa3hS', 'video/mp4'), -- Module-14 Transport Layer
  ('00000000-0000-4000-8000-000000001116', 'google_drive', '1q704IxYyterB3GcPyMSWhQaw411nVdW2', 'video/mp4'), -- Module-15 Application Layer
  ('00000000-0000-4000-8000-000000001117', 'google_drive', '1kWBgie0yu9Gs57ZGo0nbRULxKK0AnhqD', 'video/mp4'), -- Module-16 Network Security Fundamentals
  ('00000000-0000-4000-8000-000000001118', 'google_drive', '13PZdEzOskVwRcsTz2f3sUbHuy0MwyzFr', 'video/mp4'), -- Module-17 Build a Small Network
  ('00000000-0000-4000-8000-000000001201', 'google_drive', '1ExLB_CFiit4oH0d_J7EdS0GWZTw22eqt', 'video/mp4'), -- Module-1 WAN Concepts
  ('00000000-0000-4000-8000-000000001202', 'google_drive', '1AhkoOiRi10ftpJ5yQ6E8zunjfXCCzrFP', 'video/mp4'), -- Module-2 VPN and IPsec Concepts
  ('00000000-0000-4000-8000-000000001203', 'google_drive', '17uNa4UIQC74lT5-dUVkLjsmrMBVq7M0u', 'video/mp4'), -- Module-3 Branch Connections
  ('00000000-0000-4000-8000-000000001204', 'google_drive', '1ncCRTTaz0Gd8Thc08csatfuiNmJeEk_j', 'video/mp4'), -- Module-4 Extended ACLs
  ('00000000-0000-4000-8000-000000001205', 'google_drive', '143GSZOiyRqhNXV0dgVLIUZN_4pO4q8LV', 'video/mp4'), -- Module-5 QoS Concepts
  ('00000000-0000-4000-8000-000000001206', 'google_drive', '1gWaEJUKnjVrsJSDSZ7bsVpFLcZwq75Ip', 'video/mp4'), -- Module-6 Network Management
  ('00000000-0000-4000-8000-000000001207', 'google_drive', '1VO9H9pacbtgVQZeSyjapJRQSUpAtewjU', 'video/mp4'), -- Module-7 Network Design
  ('00000000-0000-4000-8000-000000001208', 'google_drive', '1McOGD6ZuRY6nl7rf7WmgT0gFAssHTvhY', 'video/mp4'), -- Module-8 Network Troubleshooting
  ('00000000-0000-4000-8000-000000001209', 'google_drive', '1lY14dgCCeUKwGthhkgu1BYOud6Nx5PFR', 'video/mp4'), -- Module-9 Network Vertualization
  ('00000000-0000-4000-8000-000000001210', 'google_drive', '1QUPC_GPa89EPJ5QonzTUl26SCON2WdfA', 'video/mp4') -- Module-10 Network Automation
on conflict (lesson_id) do update set
  provider = excluded.provider,
  drive_file_id = excluded.drive_file_id,
  mime_type = excluded.mime_type,
  updated_at = now();

insert into public.lesson_resources (id, lesson_id, title, title_en, url, kind, position)
values
  ('00000000-0000-4000-8000-000000003101', '00000000-0000-4000-8000-000000001102', 'شرائح المحاضرة — Module 1', 'Lecture slides — Module 1', 'https://drive.google.com/file/d/1DH1yaX9P93hO8Wm25THU-t5qGGT5r2JP/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003102', '00000000-0000-4000-8000-000000001103', 'شرائح المحاضرة — Module 2', 'Lecture slides — Module 2', 'https://drive.google.com/file/d/14Kqlw0DnTe24_zQSKY4Q1GeeAmojaUYj/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003103', '00000000-0000-4000-8000-000000001104', 'شرائح المحاضرة — Module 3', 'Lecture slides — Module 3', 'https://drive.google.com/file/d/1PTk4qHQw4PXfQe6pmKUMAWPE-WIKSO5I/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003104', '00000000-0000-4000-8000-000000001105', 'شرائح المحاضرة — Module 4', 'Lecture slides — Module 4', 'https://drive.google.com/file/d/1_BrbhCywWYH4cKIdEn9neP_owYKukjwa/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003105', '00000000-0000-4000-8000-000000001106', 'شرائح المحاضرة — Module 5', 'Lecture slides — Module 5', 'https://drive.google.com/file/d/1l7P3GLrc2CA1YT-_3BS9rXyiC6uqfNN-/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003106', '00000000-0000-4000-8000-000000001107', 'شرائح المحاضرة — Module 6', 'Lecture slides — Module 6', 'https://drive.google.com/file/d/1gguT8FfpOvgdE--qlQTIg3p8hAdW5bau/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003107', '00000000-0000-4000-8000-000000001108', 'شرائح المحاضرة — Module 7', 'Lecture slides — Module 7', 'https://drive.google.com/file/d/1ZBduSKxwoc8cPqrobtzpKgWBX44KDFHj/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003108', '00000000-0000-4000-8000-000000001109', 'شرائح المحاضرة — Module 8', 'Lecture slides — Module 8', 'https://drive.google.com/file/d/1n9VppLz7SD8s5Ydq1VMyDj_GSbkPCPdj/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003109', '00000000-0000-4000-8000-000000001110', 'شرائح المحاضرة — Module 9', 'Lecture slides — Module 9', 'https://drive.google.com/file/d/19GJqSF-8j4ReSG6Mbc3mhON5PhfoyLtT/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003110', '00000000-0000-4000-8000-000000001111', 'شرائح المحاضرة — Module 10', 'Lecture slides — Module 10', 'https://drive.google.com/file/d/19xCL4bdCUHf4LH7PiTXs2B_wTZ3CQ6dk/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003111', '00000000-0000-4000-8000-000000001112', 'شرائح المحاضرة — Module 11', 'Lecture slides — Module 11', 'https://drive.google.com/file/d/18urVTxRwV6okmYnQ7N0fmKoZP9e5Xzo6/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003112', '00000000-0000-4000-8000-000000001113', 'شرائح المحاضرة — Module 12', 'Lecture slides — Module 12', 'https://drive.google.com/file/d/1lNVXFbsFO32J5WU6P9Z34i3mJ8pk5kj8/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003113', '00000000-0000-4000-8000-000000001114', 'شرائح المحاضرة — Module 13', 'Lecture slides — Module 13', 'https://drive.google.com/file/d/1eft6vaIAengRrLtbX69FrbzPi2ncB4ck/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003114', '00000000-0000-4000-8000-000000001115', 'شرائح المحاضرة — Module 14', 'Lecture slides — Module 14', 'https://drive.google.com/file/d/1gFyU6AvRJpi9hQxSgeClZHYqU34_z52w/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003115', '00000000-0000-4000-8000-000000001116', 'شرائح المحاضرة — Module 15', 'Lecture slides — Module 15', 'https://drive.google.com/file/d/1rPhbZm9gQ8uSmkSZWNSdGg1rJDP4XAjA/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003116', '00000000-0000-4000-8000-000000001117', 'شرائح المحاضرة — Module 16', 'Lecture slides — Module 16', 'https://drive.google.com/file/d/1_22N0UpL1MJh2fPq6Zb4Ch0H2W5nZofF/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003117', '00000000-0000-4000-8000-000000001118', 'شرائح المحاضرة — Module 17', 'Lecture slides — Module 17', 'https://drive.google.com/file/d/1G5ctvtlO0HbsC6AqGBm7Q7abaBQDP9oq/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003201', '00000000-0000-4000-8000-000000001201', 'شرائح المحاضرة — Module 1', 'Lecture slides — Module 1', 'https://drive.google.com/file/d/1nAXFVvflhrnLhSkzu9yZCD-LkXTKjhJP/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003202', '00000000-0000-4000-8000-000000001202', 'شرائح المحاضرة — Module 2', 'Lecture slides — Module 2', 'https://drive.google.com/file/d/1wnUHosrx_8DkxjisN6LIqA8pFun4dHJ_/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003203', '00000000-0000-4000-8000-000000001203', 'شرائح المحاضرة — Module 3', 'Lecture slides — Module 3', 'https://drive.google.com/file/d/1KAspwgR1P7kIlRb7jEgSISqIlu2uQtlS/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003204', '00000000-0000-4000-8000-000000001204', 'شرائح المحاضرة — Module 4', 'Lecture slides — Module 4', 'https://drive.google.com/file/d/1pGqlvTdcCGxkBkcfw4feNpfpCGHgA-MB/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003205', '00000000-0000-4000-8000-000000001205', 'شرائح المحاضرة — Module 5', 'Lecture slides — Module 5', 'https://drive.google.com/file/d/1BtUi8DxJIpevsxrh7uOnJYOcWaFrSA2L/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003206', '00000000-0000-4000-8000-000000001206', 'شرائح المحاضرة — Module 6', 'Lecture slides — Module 6', 'https://drive.google.com/file/d/1x9_jLQLIAg6ACPoFf06lcYqAZVsQJ7fN/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003207', '00000000-0000-4000-8000-000000001207', 'شرائح المحاضرة — Module 7', 'Lecture slides — Module 7', 'https://drive.google.com/file/d/1V23SVvd0vh_D3SfK6uXdR59cgncM4h8E/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003208', '00000000-0000-4000-8000-000000001208', 'شرائح المحاضرة — Module 8', 'Lecture slides — Module 8', 'https://drive.google.com/file/d/13y8OLTyELTXQOOT-oVgj_feHO1mlqqhk/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003209', '00000000-0000-4000-8000-000000001209', 'شرائح المحاضرة — Module 9', 'Lecture slides — Module 9', 'https://drive.google.com/file/d/1q1imDibZR03hwcb2gsDDP7fGqv5vCANM/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003210', '00000000-0000-4000-8000-000000001210', 'شرائح المحاضرة — Module 10', 'Lecture slides — Module 10', 'https://drive.google.com/file/d/1WRWHimwvmj7SWUHeVYqShecbDHT9hM1t/view', 'slides', 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  title = excluded.title,
  title_en = excluded.title_en,
  url = excluded.url,
  kind = excluded.kind,
  position = excluded.position;

-- CCNA 4 now has all of its videos, so it leaves the "coming soon" state.
update public.courses
set availability_status = 'available'
where slug = 'ccna4-connecting-networks';
