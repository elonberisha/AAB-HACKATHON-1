-- =============================================================================
-- euguide-ks content seed
-- Run this in Supabase SQL editor after back/supabase.sql.
-- It fills public pages with verified, non-placeholder content.
-- Sources: Kosovo Report 2025, EU accession process, Kosovo Official Gazette.
-- =============================================================================

alter table faq_items add column if not exists category text default 'be';

-- Charts used by Home / BE / Corruption / Rule of Law pages.
insert into chart_series (key, title, type, data, published) values
('region', 'Western Balkans EU accession progress', 'bar', '[
  {"code":"ME","name_sq":"Mali i Zi","name_en":"Montenegro","name_sr":"Crna Gora","status":"negotiating","chapters":33,"progress":78},
  {"code":"RS","name_sq":"Serbia","name_en":"Serbia","name_sr":"Srbija","status":"negotiating","chapters":22,"progress":44},
  {"code":"AL","name_sq":"Shqipëria","name_en":"Albania","name_sr":"Albanija","status":"negotiating","chapters":14,"progress":38},
  {"code":"MK","name_sq":"Maqedonia V.","name_en":"N. Macedonia","name_sr":"S. Makedonija","status":"negotiating","chapters":6,"progress":22},
  {"code":"BA","name_sq":"BiH","name_en":"BiH","name_sr":"BiH","status":"candidate","chapters":0,"progress":12},
  {"code":"XK","name_sq":"Kosova","name_en":"Kosovo","name_sr":"Kosovo","status":"pending","chapters":0,"progress":8}
]'::jsonb, true),
('cpi', 'Kosovo CPI timeline', 'line', '[
  {"year":2015,"score":33},{"year":2016,"score":36},{"year":2017,"score":39},{"year":2018,"score":37},
  {"year":2019,"score":36},{"year":2020,"score":36},{"year":2021,"score":39},{"year":2022,"score":41},
  {"year":2023,"score":41},{"year":2024,"score":40},{"year":2025,"score":41}
]'::jsonb, true),
('clusters', 'EU negotiation clusters', 'donut', '[
  {"code":1,"name_sq":"Themelet","name_en":"Fundamentals","name_sr":"Osnove","color":"var(--ink)","chapters":7,"weight":22},
  {"code":2,"name_sq":"Tregu i brendshëm","name_en":"Internal market","name_sr":"Unutrašnje tržište","color":"var(--blue)","chapters":6,"weight":20},
  {"code":3,"name_sq":"Konkurrueshmëria & rritja","name_en":"Competitiveness & growth","name_sr":"Konkurentnost i rast","color":"var(--gold)","chapters":8,"weight":18},
  {"code":4,"name_sq":"Agjenda e gjelbër","name_en":"Green agenda","name_sr":"Zelena agenda","color":"var(--sage)","chapters":5,"weight":14},
  {"code":5,"name_sq":"Burimet & bujqësia","name_en":"Resources & agriculture","name_sr":"Resursi i poljoprivreda","color":"var(--rust)","chapters":5,"weight":14},
  {"code":6,"name_sq":"Marrëdhënie të jashtme","name_en":"External relations","name_sr":"Spoljni odnosi","color":"#7A6D5A","chapters":2,"weight":12}
]'::jsonb, true),
('reform', 'Acquis alignment progress', 'bar', '[
  {"key":"admin","label_sq":"Administratë","label_en":"Administration","label_sr":"Uprava","value":47},
  {"key":"judiciary","label_sq":"Drejtësi","label_en":"Judiciary","label_sr":"Pravosuđe","value":31},
  {"key":"anti_corr","label_sq":"Antikorrupsion","label_en":"Anti-corruption","label_sr":"Antikorupcija","value":26},
  {"key":"economy","label_sq":"Ekonomi","label_en":"Economy","label_sr":"Ekonomija","value":54},
  {"key":"rights","label_sq":"Të drejta themelore","label_en":"Fundamental rights","label_sr":"Osnovna prava","value":49},
  {"key":"media","label_sq":"Liria e medias","label_en":"Media freedom","label_sr":"Sloboda medija","value":58}
]'::jsonb, true)
on conflict (key) do update set
  title = excluded.title,
  type = excluded.type,
  data = excluded.data,
  published = true,
  updated_at = now();

-- Structured CMS page blocks.
delete from page_blocks
where type = 'collection'
and content->>'key' in (
  'topics','home_stats','topic_content','topic_deep_content','be_actions',
  'rule_of_law_materials_copy','rule_of_law_actions','legal_materials',
  'objective_context','faq_guide','infographics_method'
);

insert into page_blocks (page_slug, type, title, content, sort_order, published) values
('home', 'collection', 'Topic cards', '{
  "key":"topics",
  "items":[
    {"key":"reforma","num":"01","title_sq":"Reforma\nadministrative","title_en":"Public\nadministration","title_sr":"Reforma\nuprave","blurb_sq":"Shërbime publike më të shpejta, dixhitale dhe të parashikueshme - nga dokumentet te taksat.","blurb_en":"Faster, digital and predictable public services - from documents to taxes.","blurb_sr":"Brže, digitalne i predvidljive javne usluge.","accent":"var(--blue)","accent_soft":"var(--blue-soft)","metric":"47%","metric_label_sq":"përafrim në administratë","metric_label_en":"administration alignment","metric_label_sr":"usaglašavanje uprave"},
    {"key":"sundimi","num":"02","title_sq":"Sundimi\ni ligjit","title_en":"Rule of\nlaw","title_sr":"Vladavina\nprava","blurb_sq":"Gjykata, prokuroria, të drejtat themelore dhe ligjet bazë që qytetari duhet t’i kuptojë.","blurb_en":"Courts, prosecution, fundamental rights and core laws citizens should understand.","blurb_sr":"Sudovi, tužilaštvo, osnovna prava i ključni zakoni.","accent":"var(--rust)","accent_soft":"var(--rust-soft)","metric":"31%","metric_label_sq":"vlerësim për drejtësi","metric_label_en":"judiciary assessment","metric_label_sr":"ocena pravosuđa"},
    {"key":"korrupsioni","num":"03","title_sq":"Lufta kundër\nkorrupsionit","title_en":"Fight against\ncorruption","title_sr":"Borba protiv\nkorupcije","blurb_sq":"Si dallohet korrupsioni, kush e heton, si raportohet dhe cilat mekanizma kërkon BE.","blurb_en":"How corruption is recognised, investigated, reported, and what mechanisms the EU expects.","blurb_sr":"Kako se prepoznaje, istražuje i prijavljuje korupcija.","accent":"var(--gold)","accent_soft":"var(--gold-soft)","metric":"41/100","metric_label_sq":"CPI 2025","metric_label_en":"CPI 2025","metric_label_sr":"CPI 2025"},
    {"key":"be","num":"04","title_sq":"Integrimi\nnë BE","title_en":"EU\nintegration","title_sr":"EU\nintegracije","blurb_sq":"MSA, statusi kandidat, 6 klasterët, objektivat dhe kushtet që Kosova duhet të plotësojë.","blurb_en":"SAA, candidate status, 6 clusters, objectives and conditions Kosovo must deliver.","blurb_sr":"SSP, status kandidata, 6 klastera, ciljevi i uslovi.","accent":"var(--ink)","accent_soft":"#E1DBC9","metric":"2022","metric_label_sq":"aplikim për anëtarësim","metric_label_en":"membership application","metric_label_sr":"aplikacija za članstvo"}
  ]
}'::jsonb, 10, true),
('home', 'collection', 'Home stats strip', '{
  "key":"home_stats",
  "items":[
    {"top":"2022","suffix":"","label_sq":"aplikimi zyrtar për anëtarësim në BE","label_en":"formal EU membership application","label_sr":"formalna aplikacija za EU","accent":"var(--ink)"},
    {"top":"2024","suffix":"","label_sq":"hyrja në fuqi e liberalizimit të vizave","label_en":"visa liberalisation entered into force","label_sr":"vizna liberalizacija stupila na snagu","accent":"var(--blue)"},
    {"top":"6","suffix":"","label_sq":"klasterë të procesit të negociatave","label_en":"negotiation process clusters","label_sr":"klastera pregovaračkog procesa","accent":"var(--gold)"},
    {"top":"41","suffix":"/100","label_sq":"CPI 2025 për perceptimin e korrupsionit","label_en":"2025 CPI corruption perception score","label_sr":"CPI 2025 ocena percepcije korupcije","accent":"var(--rust)"}
  ]
}'::jsonb, 30, true),
('reforma', 'collection', 'Topic detail sections', '{"key":"topic_content","value":{"reforma":{"sq":[{"h":"Çfarë kërkon BE","p":"Administratë profesionale, e depolitizuar, me rekrutime meritore dhe shërbime publike të matshme.","list":["Rekrutime meritore dhe vlerësim performance","Ulje e pozitave vakante dhe ushtruese detyre","Racionalizim i agjencive të pavarura","Më shumë shërbime elektronike"]},{"h":"Çka e prek qytetarin","p":"Më pak pritje në sportele, më pak dokumente të përsëritura dhe afate më të qarta për vendime administrative."},{"h":"Burimi kryesor","p":"Kosovo Report 2025 kërkon forcim të kapaciteteve të shërbimit civil, racionalizim të agjencive dhe miratim të legjislacionit për menaxhim financiar publik."}]}}}'::jsonb, 10, true),
('sundimi', 'collection', 'Topic detail sections', '{"key":"topic_content","value":{"sundimi":{"sq":[{"h":"Çfarë përfshin sundimi i ligjit","p":"Pavarësi e gjyqësorit, llogaridhënie e prokurorisë, të drejta themelore dhe zbatim i barabartë i ligjit.","list":["Kushtetuta dhe të drejtat themelore","Kodi Penal dhe procedura penale","Procedura administrative dhe kontestimore","Mbrojtja e komuniteteve dhe liria e medias"]},{"h":"Kërkesat e raportit 2025","p":"Rritje e përgjegjësisë së KGJK/KPK, disiplinë procedurale, menaxhim më i fortë i rasteve dhe trajtim më efikas i korrupsionit të lartë."},{"h":"Pse ka rëndësi","p":"Pa gjykata të pavarura dhe vendime të parashikueshme, qytetari nuk e realizon të drejtën dhe biznesi nuk ka siguri juridike."}]}}}'::jsonb, 10, true),
('korrupsioni', 'collection', 'Topic detail sections', '{"key":"topic_content","value":{"korrupsioni":{"sq":[{"h":"Çfarë kërkohet","p":"Zbatim i ligjeve ekzistuese, strategji kombëtare 2025-2028 dhe hetime më cilësore për korrupsion të nivelit të lartë.","list":["Kapacitete më të forta për Agjencinë për Parandalimin e Korrupsionit","Bashkëpunim mes Policisë dhe Prokurorisë Speciale","Më shumë rezultate në raste të profilit të lartë","Mbrojtje e sinjalizuesve"]},{"h":"Si raportohet","p":"Korrupsioni mund të raportohet te Agjencia për Parandalimin e Korrupsionit, Prokuroria Speciale ose Avokati i Popullit, varësisht nga rasti."},{"h":"Indikatori publik","p":"CPI i Transparency International dhe numri i aktgjykimeve përfundimtare janë sinjale publike për progresin real."}]}}}'::jsonb, 10, true),
('be', 'collection', 'Topic detail sections', '{"key":"topic_content","value":{"be":{"sq":[{"h":"Ku ndodhet Kosova","p":"Kosova ka MSA në fuqi që nga 2016, ka aplikuar për anëtarësim në 2022 dhe pret opinion të Komisionit për hapin e radhës."},{"h":"Kushtet kryesore","p":"Kriteret e Kopenhagës, përafrimi me acquis, funksionimi i institucioneve demokratike, ekonomia e tregut dhe normalizimi me Serbinë.","list":["Opinion i Komisionit Evropian","Status kandidat nga Këshilli","Screening dhe hapje klasterësh","Mbyllje kapitujsh dhe traktat aderimi"]},{"h":"Çka e bën specifik Kosovën","p":"Procesi ndikohet nga mosnjohja prej 5 shteteve anëtare të BE-së dhe nga kërkesa për zbatimin e marrëveshjeve të dialogut Kosovë-Serbi."}]}}}'::jsonb, 10, true),
('be', 'collection', 'EU objectives CTA', '{"key":"be_actions","items":[{"eyebrow_sq":"Kushtet për integrimin në BE","title_sq":"Shiko listën e objektivave, kapitujve dhe burimeve zyrtare.","body_sq":"Të gjitha kushtet dhe objektivat e integrimit janë mbledhur në një pamje të veçantë.","cta_sq":"Objektivat e integrimit","href":"#/objektivat","variant":"dark"}]}'::jsonb, 30, true),
('sundimi', 'collection', 'Rule of law material copy', '{"key":"rule_of_law_materials_copy","value":{"eyebrow_sq":"Materiale ligjore","title_sq":"Kushtetuta dhe ligjet themelore për sundimin e ligjit.","sub_sq":"Këtu janë aktet bazë që qytetarët duhet t’i kenë afër kur lexojnë për gjykata, procedura, administratë, dogana dhe trafik.","constitution_title_sq":"Kushtetuta e Republikës së Kosovës","fundamental_title_sq":"Ligjet themelore","catalog_title_sq":"Ligjet tjera"}}'::jsonb, 30, true),
('sundimi', 'collection', 'Rule of law action buttons', '{"key":"rule_of_law_actions","items":[{"label_sq":"Kushtetuta e Republikës së Kosovës","href":"#/kushtetuta","variant":"dark"},{"label_sq":"Ligjet themelore","href":"#/ligjet-themelore","variant":"light"},{"label_sq":"Ligjet tjera","href":"#/katalogu-materialeve","variant":"light"}]}'::jsonb, 31, true),
('sundimi', 'collection', 'Verified fundamental legal materials', '{"key":"legal_materials","items":[
  {"group":"constitution","law_number":"K-09042008","status":"Në fuqi; me amendamente 2012, 2013, 2015, 2016, 2020","title_sq":"Kushtetuta e Republikës së Kosovës","summary_sq":"Akti themelor i shtetit: të drejtat dhe liritë themelore, organizimi institucional, ndarja e pushteteve dhe amendamentet kushtetuese.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=3702"},
  {"group":"fundamental","law_number":"06/L-074","status":"Në fuqi si akt i konsoliduar","title_sq":"Kodi Penal i Republikës së Kosovës","summary_sq":"Përcakton veprat penale, përgjegjësinë penale, sanksionet, korrupsionin, krimin e organizuar dhe veprat kundër detyrës zyrtare.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=116031"},
  {"group":"fundamental","law_number":"08/L-032","status":"Në fuqi; ndryshuar/plotësuar nga 08/L-187","title_sq":"Kodi i Procedurës Penale","summary_sq":"Rregullon hetimin, ndjekjen penale, të drejtat e palëve, provat, masat procedurale, gjykimin dhe mjetet juridike.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=61759"},
  {"group":"fundamental","law_number":"Projektkod","status":"Projekt; të mos paraqitet si ligj në fuqi pa verifikim në Gazetën Zyrtare","title_sq":"Kodi Civil i Republikës së Kosovës","summary_sq":"Projektkod për kodifikimin e së drejtës civile: pjesa e përgjithshme, detyrimet, prona, familja dhe trashëgimia.","source_url":"https://md.rks-gov.net/wp-content/uploads/2024/06/A1CCB78F-9020-41D5-826E-14D67A90F369.pdf"},
  {"group":"fundamental","law_number":"03/L-006","status":"Në fuqi si Ligji për Procedurën Kontestimore","title_sq":"Procedura civile / Ligji për Procedurën Kontestimore","summary_sq":"Rregullon paditë, palët, afatet, seancat, provat, vendimet, ankesat dhe gjykimin civil kontestimor.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=2583"},
  {"group":"fundamental","law_number":"05/L-031","status":"Në fuqi","title_sq":"Ligji për Procedurën e Përgjithshme Administrative","summary_sq":"Rregullon procedurat administrative, afatet, njoftimin, vendimin dhe ankesën ndaj administratës publike.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=12559&langid=1"},
  {"group":"fundamental","law_number":"08/L-247","status":"Në fuqi; shfuqizon Kodin 03/L-109","title_sq":"Kodi Doganor dhe i Akcizave","summary_sq":"Rregullon procedurat doganore, akcizat, obligimet e importit/eksportit, kontrollet dhe kundërvajtjet.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=89203"},
  {"group":"fundamental","law_number":"08/L-186","status":"Në fuqi; shfuqizon 05/L-088 dhe 06/L-069","title_sq":"Ligji për Rregullat e Trafikut Rrugor / Kodi Rrugor","summary_sq":"Rregullon qarkullimin rrugor, sigurinë, shenjat, pajisjet, përgjegjësitë dhe kundërvajtjet në trafik.","source_url":"https://gzk.rks-gov.net/ActDetail.aspx?ActID=87975"}
]}'::jsonb, 32, true),
('objektivat', 'collection', 'Objective context cards', '{"key":"objective_context","items":[{"title_sq":"Kriteret e Kopenhagës","body_sq":"Institucione stabile demokratike, sundim ligji, të drejta të njeriut, ekonomi tregu dhe kapacitet për obligimet e anëtarësimit.","source_url":"https://enlargement.ec.europa.eu/eu-accession-process-step-step-0_en"},{"title_sq":"6 klasterët e negociatave","body_sq":"Themelet hapen të parat dhe mbyllen të fundit; aty hyjnë sundimi i ligjit, të drejtat themelore dhe administrata publike.","source_url":"https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga"},{"title_sq":"Dialogu Kosovë-Serbi","body_sq":"Zbatimi i marrëveshjeve të dialogut dhe normalizimi mbeten kusht esencial për rrugën evropiane të Kosovës.","source_url":"https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga"}]}'::jsonb, 20, true),
('faq', 'collection', 'FAQ guide section', '{"key":"faq_guide","value":{"sq":{"eyebrow":"Si t’i lexosh FAQ-të","title":"Pyetjet janë ndarë sipas temave që qytetari i prek më shpesh.","body":"Përgjigjet janë të shkurtra dhe lidhen me burime zyrtare ose me ligjet themelore."}}}'::jsonb, 20, true),
('infografika', 'collection', 'Infographics method cards', '{"key":"infographics_method","items":[{"title_sq":"Diagram procesi","body_sq":"Përdoret për rrugën e aderimit në BE, procesin legjislativ dhe procedurat administrative."},{"title_sq":"Kartela ligjore","body_sq":"Përdoret për ligje: titulli zyrtar, numri, statusi, burimi dhe shpjegimi qytetar."},{"title_sq":"Statistika krahasuese","body_sq":"Përdoret për CPI, progres rajonal, ngarkesë gjykatash dhe tregues ekonomikë."}]}'::jsonb, 20, true);

-- Objective data from Kosovo Report 2025 + core accession milestones.
insert into eu_objectives (slug, name_sq, name_en, description_sq, conditions_sq, cluster, completed, progress_percent, source_url, sort_order, published) values
('visa-liberalization','Liberalizimi i vizave për qytetarët e Kosovës','Visa liberalization','Qytetarët e Kosovës udhëtojnë pa vizë në zonën Shengen për qëndrime të shkurtra.','I plotësuar më 1 janar 2024.', 'visa', true, 100, 'https://home-affairs.ec.europa.eu/policies/schengen/visa-policy_en', 1, true),
('saa-in-force','Marrëveshja e Stabilizim-Asociimit','Stabilisation and Association Agreement','Baza kontraktuale e marrëdhënieve Kosovë-BE.','Në fuqi nga 1 prill 2016.', 'saa', true, 100, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 2, true),
('membership-application','Aplikimi për anëtarësim në BE','EU membership application','Kosova ka aplikuar për anëtarësim në BE.','Aplikimi është dorëzuar në dhjetor 2022; pritet hapi politik pas opinionit të Komisionit.', 'saa', true, 100, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 3, true),
('candidate-status','Marrja e statusit të vendit kandidat','Candidate status','Hapi formal pas aplikimit dhe opinionit të Komisionit.','Kërkon vendim unanim të Këshillit të BE-së.', 'saa', false, 35, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 4, true),
('admin-capacity','Rritja e kapaciteteve të shërbimit civil','Civil service capacity','Administratë publike profesionale dhe meritore.','Rekrutime meritore, vlerësim performance, barazi gjinore dhe ulje e pozitave vakante.', 'admin_reform', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 5, true),
('agency-rationalisation','Racionalizimi i agjencive dhe e-shërbimet','Agency rationalisation and e-services','Ulja e barrës administrative për qytetarët dhe bizneset.','Përshpejtim i racionalizimit të agjencive të pavarura dhe rritje e shërbimeve elektronike.', 'admin_reform', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 6, true),
('judiciary-integrity','Integritet dhe llogaridhënie në gjyqësor','Judicial integrity and accountability','Përdorim i mekanizmave të integritetit dhe përgjegjësisë në KGJK/KPK.','Legjislacion në linjë me rekomandimet e Komisionit të Venecias.', 'rule_of_law', false, 35, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 7, true),
('high-profile-cases','Efikasitet në rastet e profilit të lartë','High-profile cases','Trajtim më i mirë i korrupsionit të lartë, krimit të organizuar dhe dhunës me bazë gjinore.','Disiplinë procedurale dhe menaxhim më i fortë i rasteve.', 'rule_of_law', false, 30, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 8, true),
('anti-corruption-strategy','Strategjia kundër korrupsionit 2025-2028','Anti-corruption strategy','Kornizë kombëtare për parandalim dhe luftim të korrupsionit.','Miratim dhe zbatim në përputhje me praktikat evropiane.', 'rule_of_law', false, 30, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 9, true),
('apc-capacity','Forcimi i Agjencisë për Parandalimin e Korrupsionit','Anti-Corruption Agency capacity','Agjenci me kapacitete reale hetimi/parandalimi.','Më shumë staf, ekspertizë dhe zbatim i mandatit.', 'rule_of_law', false, 30, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 10, true),
('fundamental-rights','Të drejtat themelore dhe komunitetet jo-shumicë','Fundamental rights','Mbrojtja e personave me aftësi të kufizuara, barazia gjinore, komunitetet jo-shumicë dhe liria fetare.','Zbatim më i fortë i mekanizmave ekzistues dhe legjislacionit përkatës.', 'democracy', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 11, true),
('media-freedom','Liria e medias dhe mbrojtja e gazetarëve','Media freedom','Siguri për gazetarët, transparencë e pronësisë mediatike dhe pavarësi e rregullatorëve.','Ligj i ri për KPM dhe financim i qëndrueshëm i RTK-së.', 'democracy', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 12, true),
('organised-crime','Strategjia kundër krimit të organizuar','Organised crime strategy','Hetim dhe ndjekje më e mirë e grupeve kriminale.','Strategji dhe plan veprimi në linjë me standardet e BE-së.', 'rule_of_law', false, 35, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 13, true),
('confiscation','Regjimi i konfiskimit penal','Criminal confiscation','Forcim i konfiskimit të pasurisë së fituar me vepër penale.','Fond konfiskimi dhe përdorim më i madh i mjeteve nga prokuroria/policia.', 'rule_of_law', false, 30, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 14, true),
('migration-visa-policy','Migrimi dhe përafrimi i politikës së vizave','Migration and visa policy alignment','Strategji migrimi dhe përafrim me listën e vizave të BE-së.','Ndryshim i Ligjit për të Huajt dhe adresim i kërkesave të pabazuara për azil.', 'visa', false, 40, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 15, true),
('public-procurement','Ligji i ri për prokurim publik dhe PPP','Public procurement and PPP','Përafrim i prokurimit dhe koncesioneve me acquis.','Ligje të reja, akte nënligjore dhe platformë e-procurement më efikase.', 'economy', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 16, true),
('tax-base','Zgjerimi i bazës tatimore','Tax-base broadening','Ulja e zbrazëtirave dhe përjashtimeve tatimore.','Rishikim i politikave tatimore dhe forcim i Administratës Tatimore.', 'economy', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 17, true),
('education-labour-market','Përafrimi i arsimit me tregun e punës','Education and labour market','Arsim profesional dhe i të rriturve që u përgjigjet nevojave të tregut.','Rishikim i kornizës së VET dhe zbatim i strategjisë së arsimit.', 'economy', false, 45, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 18, true),
('energy-climate','NECP dhe paketa e energjisë','Energy and climate package','Përafrim me Clean Energy Package dhe Electricity Integration Package.','Miratim i NECP, ankande të ripërtëritshme dhe investime në efiçiencë.', 'economy', false, 40, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 19, true),
('environment-waste-climate','Mjedisi, mbeturinat dhe klima','Environment, waste and climate','Menaxhim i zonave të mbrojtura, mbeturinave dhe zbatim i ligjit për klimën.','Amendim i Ligjit për Mbeturina dhe zbatim i MRVA acquis.', 'democracy', false, 35, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 20, true),
('customs-code','Kodi i ri Doganor dhe i Akcizave','Customs and Excise Code','Akte nënligjore, kapacitete të Doganës dhe sisteme digjitale.','Finalizim i legjislacionit zbatues dhe luftë kundër kontrabandës.', 'economy', false, 55, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 21, true),
('normalisation-dialogue','Normalizimi Kosovë-Serbi','Kosovo-Serbia normalisation','Zbatim i marrëveshjeve të dialogut dhe normalizim i marrëdhënieve.','Zbatim i Marrëveshjes për Rrugën drejt Normalizimit, aneksit dhe marrëveshjeve të mëparshme.', 'other', false, 30, 'https://enlargement.ec.europa.eu/kosovo-report-2025_en?prefLang=ga', 22, true)
on conflict (slug) do update set
  name_sq = excluded.name_sq,
  name_en = excluded.name_en,
  description_sq = excluded.description_sq,
  conditions_sq = excluded.conditions_sq,
  cluster = excluded.cluster,
  completed = excluded.completed,
  progress_percent = excluded.progress_percent,
  source_url = excluded.source_url,
  sort_order = excluded.sort_order,
  published = true,
  updated_at = now();

-- FAQ content.
delete from faq_items where question_sq in (
  'Çfarë është MSA?', 'Pse Kosova ende nuk ka status kandidat?', 'Çka janë klasterët e negociatave?',
  'A mjafton liberalizimi i vizave për anëtarësim?', 'Çka kërkon reforma administrative?', 'Si më ndihmon eKosova?',
  'Çka është procedura administrative?', 'Çka do të thotë sundim i ligjit?', 'Cilat ligje janë bazë për qytetarët?',
  'A është Kodi Civil në fuqi?', 'Ku raportohet korrupsioni?', 'Çka është konflikti i interesit?',
  'A mbrohen sinjalizuesit?', 'Kur hyri në fuqi Kushtetuta?', 'Kur aplikoi Kosova për BE?', 'Kur nisi udhëtimi pa viza?'
);
insert into faq_items (category, question_sq, answer_sq, sort_order, published) values
('be','Çfarë është MSA?','MSA është Marrëveshja e Stabilizim-Asociimit, baza kontraktuale e marrëdhënieve Kosovë-BE, në fuqi nga 1 prill 2016.',1,true),
('be','Pse Kosova ende nuk ka status kandidat?','Statusi kandidat kërkon opinion të Komisionit dhe vendim unanim të Këshillit të BE-së; procesi ndikohet edhe nga mosnjohja prej pesë shteteve anëtare.',2,true),
('be','Çka janë klasterët e negociatave?','Janë grupe kapitujsh të acquis. Klasteri Themelet hapet i pari dhe mbyllet i fundit.',3,true),
('be','A mjafton liberalizimi i vizave për anëtarësim?','Jo. Liberalizimi i vizave është arritje e veçantë; anëtarësimi kërkon negociata, përafrim ligjor dhe vendim unanim të BE-së.',4,true),
('reforma','Çka kërkon reforma administrative?','Shërbim civil meritokratik, administratë digjitale, racionalizim të agjencive dhe vendimmarrje të matshme.',5,true),
('reforma','Si më ndihmon eKosova?','Ul nevojën për sportele, dokumente të përsëritura dhe pritje fizike për shërbime administrative.',6,true),
('reforma','Çka është procedura administrative?','Është mënyra ligjore se si institucionet marrin vendime për kërkesat e qytetarëve dhe si mund të ankimohet vendimi.',7,true),
('sundimi','Çka do të thotë sundim i ligjit?','Që ligji zbatohet njësoj për qytetarët, bizneset dhe institucionet, me gjykata të pavarura dhe të drejta efektive ankese.',8,true),
('sundimi','Cilat ligje janë bazë për qytetarët?','Kushtetuta, Kodi Penal, Kodi i Procedurës Penale, Ligji për Procedurën Administrative dhe ligjet civile/administrative themelore.',9,true),
('sundimi','A është Kodi Civil në fuqi?','Në materialet e mbledhura del si projektkod nga Ministria e Drejtësisë; nuk duhet paraqitur si ligj aktiv pa verifikim në Gazetën Zyrtare.',10,true),
('korrupsioni','Ku raportohet korrupsioni?','Te Agjencia për Parandalimin e Korrupsionit, Prokuroria Speciale ose Avokati i Popullit, varësisht nga rasti.',11,true),
('korrupsioni','Çka është konflikti i interesit?','Kur zyrtari merr vendim ose ndikon në vendim ku ka interes personal, familjar ose financiar.',12,true),
('korrupsioni','A mbrohen sinjalizuesit?','Po. Ligji për mbrojtjen e sinjalizuesve garanton mbrojtje për raportim të mirëbesimit.',13,true),
('kosova','Kur hyri në fuqi Kushtetuta?','Kushtetuta e Republikës së Kosovës hyri në fuqi më 15 qershor 2008.',14,true),
('kosova','Kur aplikoi Kosova për BE?','Kosova dorëzoi aplikimin për anëtarësim në BE në dhjetor 2022.',15,true),
('kosova','Kur nisi udhëtimi pa viza?','Liberalizimi i vizave për qytetarët e Kosovës hyri në fuqi më 1 janar 2024.',16,true);

-- Infographics.
delete from infographics where title_sq in (
  'Procesi i aderimit në BE','6 klasterët e negociatave','Objektivat e Kosovës sipas raportit 2025',
  'Kushtetuta dhe ligjet themelore','Si raportohet korrupsioni','Procedura administrative bazë',
  'CPI i Kosovës 2015-2025','Kosova në rajon','Timeline 2008-2024'
);
insert into infographics (title_sq, description_sq, image_url, category, shape, sort_order, published) values
('Procesi i aderimit në BE','Nga aplikimi te opinioni, statusi kandidat, screening, negociatat, traktati dhe ratifikimi.','','BE','flow',1,true),
('6 klasterët e negociatave','Themelet, tregu i brendshëm, konkurrueshmëria, agenda e gjelbër, burimet dhe marrëdhëniet e jashtme.','','BE','cluster',2,true),
('Objektivat e Kosovës sipas raportit 2025','Lista e prioriteteve që dalin nga raporti më i fundit i Komisionit Evropian.','','Objektivat','grid',3,true),
('Kushtetuta dhe ligjet themelore','Harta e akteve bazë: kushtetutë, kode, procedura, dogana dhe trafik.','','Sundimi','grid',4,true),
('Si raportohet korrupsioni','Kanali i duhur sipas rastit: APK, Prokuroria Speciale, Avokati i Popullit.','','Korrupsioni','steps',5,true),
('Procedura administrative bazë','Nga kërkesa te vendimi, ankesa dhe kontrolli gjyqësor.','','Reforma','flow',6,true),
('CPI i Kosovës 2015-2025','Lëvizja e indeksit të perceptimit të korrupsionit në dekadën e fundit.','','Korrupsioni','line',7,true),
('Kosova në rajon','Pozicioni krahasues në procesin e integrimit të Ballkanit Perëndimor.','','BE','bar',8,true),
('Timeline 2008-2024','Pavarësia, Kushtetuta, MSA, aplikimi për BE dhe liberalizimi i vizave.','','Kosova','timeline',9,true);

