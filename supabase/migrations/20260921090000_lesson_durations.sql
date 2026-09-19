-- Real lesson durations read from the uploaded video files, plus course totals.

update public.lessons as l
set duration_seconds = d.seconds
from (values
  ('00000000-0000-4000-8000-000000001101'::uuid, 611), -- CCNA1 Introduction to Networks
  ('00000000-0000-4000-8000-000000001102'::uuid, 4915), -- Module-1 Networking Today
  ('00000000-0000-4000-8000-000000001103'::uuid, 2485), -- Module-2 Basic Switch and End Device Configuration
  ('00000000-0000-4000-8000-000000001104'::uuid, 7755), -- Module-3 Protocols and Models
  ('00000000-0000-4000-8000-000000001105'::uuid, 7202), -- Module-4 Physical Layer
  ('00000000-0000-4000-8000-000000001106'::uuid, 992), -- Module-5 Numbering Systems
  ('00000000-0000-4000-8000-000000001107'::uuid, 1718), -- Module-6  Data Link Layer
  ('00000000-0000-4000-8000-000000001108'::uuid, 3782), -- Module-7 Ethernet Switching
  ('00000000-0000-4000-8000-000000001109'::uuid, 5392), -- Module-8 Network Layer
  ('00000000-0000-4000-8000-000000001110'::uuid, 1781), -- Module-9 Address Resolution
  ('00000000-0000-4000-8000-000000001111'::uuid, 1830), -- Module-10 Basic Router Configuration
  ('00000000-0000-4000-8000-000000001112'::uuid, 6016), -- Module-11 IPv4 Addressing
  ('00000000-0000-4000-8000-000000001113'::uuid, 4711), -- Module-12 IPv6 Addressing
  ('00000000-0000-4000-8000-000000001114'::uuid, 2152), -- Module-13  ICMP
  ('00000000-0000-4000-8000-000000001115'::uuid, 4870), -- Module-14 Transport Layer
  ('00000000-0000-4000-8000-000000001116'::uuid, 4682), -- Module-15 Application Layer
  ('00000000-0000-4000-8000-000000001117'::uuid, 4508), -- Module-16 Network Security Fundamentals
  ('00000000-0000-4000-8000-000000001118'::uuid, 3574), -- Module-17 Build a Small Network
  ('00000000-0000-4000-8000-000000001201'::uuid, 6723), -- Module-1 WAN Concepts
  ('00000000-0000-4000-8000-000000001202'::uuid, 5092), -- Module-2 VPN and IPsec Concepts
  ('00000000-0000-4000-8000-000000001203'::uuid, 2202), -- Module-3 Branch Connections
  ('00000000-0000-4000-8000-000000001204'::uuid, 4059), -- Module-4 Extended ACLs
  ('00000000-0000-4000-8000-000000001205'::uuid, 5639), -- Module-5 QoS Concepts
  ('00000000-0000-4000-8000-000000001206'::uuid, 4799), -- Module-6 Network Management
  ('00000000-0000-4000-8000-000000001207'::uuid, 3489), -- Module-7 Network Design
  ('00000000-0000-4000-8000-000000001208'::uuid, 4158), -- Module-8 Network Troubleshooting
  ('00000000-0000-4000-8000-000000001209'::uuid, 4475), -- Module-9 Network Vertualization
  ('00000000-0000-4000-8000-000000001210'::uuid, 5067) -- Module-10 Network Automation
) as d(id, seconds)
where l.id = d.id;

update public.courses set duration_minutes = 1150 where slug = 'ccna1-introduction-to-networks';
update public.courses set duration_minutes = 762 where slug = 'ccna4-connecting-networks';
