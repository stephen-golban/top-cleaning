# Top Cleaning — Source Site Inventory

Complete content + requirements inventory of the legacy site, extracted from the public repo
**https://github.com/VadimR7/topcleaning_next_app** (default branch `main`, single commit
`b8a4525` "Add invernal links on the cards to services. Add viber and whatsapp links.").

The whole repo is 79 files / ~6.5 MB. Everything of substance is reproduced below — a rebuild
should not need the original repo.

Canonical domain used by the old site: **https://topcleaning.md** (as of this writing the domain
does **not** resolve — `getaddrinfo ENOTFOUND topcleaning.md` — so the live site is down and the
repo is the only source of truth).

---

## 1. Stack

| Concern | What it used |
|---|---|
| Framework | Next.js **14.2.5**, App Router, `src/` dir, TypeScript 5, React 18 |
| Package name | `topcleaning-md-nextjs` v0.1.0, private |
| i18n | **next-intl ^3.17.2** — middleware-based locale routing with localized pathnames |
| Styling | Tailwind CSS ^3.3, `tailwindcss-animate`, `tailwind-merge`, `clsx`, `class-variance-authority` |
| UI kit | **shadcn/ui** (style `default`, baseColor `stone`, CSS variables, RSC on) — components.json present. Uses Radix `react-dialog`, `react-slot`, `vaul` (drawer) |
| Carousel | `embla-carousel-react` ^8.1.3 + `embla-carousel-autoplay` |
| Icons | `lucide-react` ^0.366, `react-icons` ^5.2.1 (Tb/Md/Fa/Gi/Lu/Wi/Tfi sets) |
| Misc libs | `ramda` ^0.30 (used only for `R.keys`, `R.pipe`, `R.split`, `R.filter`, `R.slice`, `R.join`), `react-scroll-to-top` ^3.0, `sharp` ^0.33 (image optimisation) |
| Font | Google Font **Onest** via `next/font/google`, `subsets: ['latin']`, CSS var `--font-sans` |
| CMS / data source | **None.** All content is hardcoded in two JSON message files (`messages/ro.json`, `messages/ru.json`). No DB, no API routes, no headless CMS. |
| Deploy | Self-hosted VPS. GitHub Actions builds on push to `main`, tars the whole build, `scp`s it to `/var/www/topcleaning.md`, then `npm install --production` + `pm2 reload ecosystem.config.js`. PM2 app name `topcleaning.md`, `script: npm`, `args: run start`. |
| CI secrets | `SERVER_IP`, `SERVER_USER`, `TOPCLEANING_VPS_SSH_PRIVATE_KEY`, `SSH_PORT` (GitHub Actions secrets only — no app-level env vars anywhere) |
| Tooling | ESLint (`next/core-web-vitals` + prettier + import/order), Prettier (no semis, single quotes, trailing commas, `prettier-plugin-tailwindcss`) |

`next.config.mjs` is empty except for the next-intl plugin wrapper. No image domains, no redirects, no headers.

### Design tokens (`src/app/styles/globals.css`, HSL)

Light theme (the only one actually used — dark mode is defined but never toggled):

```
--background: 210 20% 98%;      --foreground: 20 14.3% 4.1%;
--card: 0 0% 100%;              --card-foreground: 20 14.3% 4.1%;
--popover: 0 0% 100%;           --popover-foreground: 20 14.3% 4.1%;
--primary: 210.36 100% 49.22%;  --primary-foreground: 60 9.1% 97.8%;   /* bright blue ≈ #007BFB */
--secondary: 225.26 100% 11.18%;--secondary-foreground: 24 9.8% 10%;   /* very dark navy ≈ #000E39 */
--muted: 60 4.8% 95.9%;         --muted-foreground: 25 5.3% 44.7%;
--accent: 60 4.8% 95.9%;        --accent-foreground: 24 9.8% 10%;
--destructive: 0 84.2% 60.2%;   --destructive-foreground: 60 9.1% 97.8%;
--border: 20 5.9% 90%;  --input: 20 5.9% 90%;  --ring: 20 14.3% 4.1%;
--radius: 0.5rem;
```

Hardcoded hexes found in components: `#051135` (footer bg), `#000e39` (desktop logo colour),
`#3a4268` (mobile menu link), `#cddae6` (carousel arrow bg), `#082680` / `#082680db` (card hover
overlay), `#25D366` (WhatsApp green), `#7360f2` (Viber purple), `#030104` (scroll-arrow SVG fill).

Tailwind extras: container centred with padding 24/32/40px and screens `lg:1084px xl:1280px
2xl:1480px`; `bg-service-section` = `url('/images/bg-service-section.jpg')`; `bg-black-gradient` =
`linear-gradient(to right, rgba(0,0,0,.85), rgba(0,0,0,.55), rgba(0,0,0,.45), rgba(0,0,0,.25), rgba(0,0,0,0))`;
custom easing `transition-service-card` = `cubic-bezier(0.24, 0.74, 0.58, 1)`.

---

## 2. Languages

Two locales, defined in `src/i18n-config.ts`:

- **`ro` — Romanian — DEFAULT locale.** Served at the bare path (no `/ro` prefix).
- **`ru` — Russian.** Served under `/ru`.

`localePrefix: 'as-needed'`, `localeDetection: false` (no Accept-Language sniffing — everyone lands
on Romanian first). Locale switch is a plain `RO | RU` text toggle in the top bar; the active one is
bold. There is **no English**.

Middleware matcher: `'/'` and `'/((?!_next|_vercel|.*\\..*).*)'`.

---

## 3. Site map / routes

Every route is statically generated per locale (`generateStaticParams` over `locales`). Pathnames
are localized via next-intl's `pathnames` map, so the internal route and the public URL differ.

| Internal route | RO URL (default, no prefix) | RU URL | Purpose |
|---|---|---|---|
| `/` | `https://topcleaning.md/` | `/ru` | Homepage: hero carousel, Why Us, Services carousel, Steps |
| `/services` | `/servicii-de-curatenie` | `/ru/uslugi-po-uborke` | Services index — 4 services, image + title + long description + "see details" link |
| `/services/1` | `/servicii-de-curatenie/servicii-curatenie-generala` | `/ru/uslugi-po-uborke/uslugi-generalnaya-uborka` | General cleaning detail page |
| `/services/2` | `/servicii-de-curatenie/servicii-curatenie-de-intretinere` | `/ru/uslugi-po-uborke/uslugi-podderzhivayushchaya-uborka` | Maintenance cleaning detail page |
| `/services/3` | `/servicii-de-curatenie/servicii-curatenie-dupa-reparatie` | `/ru/uslugi-po-uborke/uslugi-uborka-posle-remonta` | Post-renovation cleaning detail page |
| `/services/4` | `/servicii-de-curatenie/servicii-curatarea-chimica-a-mobilierului-tapitat` | `/ru/uslugi-po-uborke/uslugi-himchistka-myagkoy-mebeli` | Upholstery dry cleaning detail page |
| `/about` | `/despre-noi` | `/ru/o-nas` | "About us" — 6 benefit blocks (only 4 render, see §9) |
| `/robots.txt` | generated | — | `User-agent: *`, `Allow: /`, sitemap link |
| `/sitemap.xml` | generated | — | 7 URLs with hreflang alternates |

**Page count: 7 content pages per locale = 14 rendered pages** (+ robots + sitemap).

There is **no contact page**, no blog, no pricing page, no 404 customisation, no gallery, no
testimonials page. A `Nav.contact` translation string exists in RO only and is unused (see §9).

### Global layout (`src/app/[locale]/layout.tsx`)

`<html lang={locale}>` → NextIntlClientProvider → `<body class="flex min-h-screen flex-col
bg-background font-sans antialiased">` containing `Header` → `<main class="flex-1">{children}</main>`
→ `Footer` → `ScrollToTopBox`.

**Header** (`min-h-[102px]`): `TopBar` (42px, dark navy `bg-secondary`, white text) → sticky nav bar
(white on mobile, `bg-primary` blue on desktop, becomes `fixed top-0` once `window.scrollY > 42`) →
`Breadcrumbs`. Logo sits in a white rounded-bottom card that overhangs the blue bar and slides down
on scroll. Mobile: hamburger (`TfiMenu`) opens a left-side Radix Sheet with the logo and the nav
list; the sheet auto-closes on resize ≥1024px.

**Nav list** (`src/components/main-layout/constants.ts`): `home → /`, `services → /services`,
`about → /about`. Active item shows a 13px blue dot below the link; hover animates the dot in.

**Breadcrumbs**: hidden on homepage. `Home / <segment>` and for service pages
`Home / Services / <service title>`. Last crumb is `font-semibold text-primary`, earlier ones
`text-gray-500`.

**ScrollToTop**: `react-scroll-to-top`, smooth, positioned `right-4` (`lg:right-6`), 42×42 box with
a hover grey bg, renders `/images/upscrollarrow.svg` at 86×86.

---

## 4. FULL VERBATIM COPY — translation files

### 4.1 `messages/ro.json` (Romanian, default) — verbatim

```json
{
  "About": {
    "title": "Despre noi",
    "items": {
      "1": {
        "title": "Economie de timp",
        "description": "Salvează timp prețios lăsându-ne pe noi să ne ocupăm de curățenie. În fiecare săptămână, îți oferim mai mult timp pentru activitățile care contează cu adevărat."
      },
      "2": {
        "title": "O singură adresă pentru toate soluțiile",
        "description": "Noi suntem partenerul tău de încredere pentru întreținerea casei sau biroului. Oferim o gamă variată de servicii, astfel încât să rezolvăm toate necesitățile tale într-un singur loc."
      },
      "3": {
        "title": "Echipă profesionistă",
        "description": "Specialiștii noștri sunt bine pregătiți și experimentați, asigurând servicii de curățenie la cele mai înalte standarde. Ne prezentăm mereu la timp și lucrăm cu respect și responsabilitate."
      },
      "4": {
        "title": "Abordare individuală",
        "description": "Adaptăm serviciile noastre la nevoile și preferințele tale specifice. Fiecare client beneficiază de o soluție personalizată, care se potrivește perfect bugetului și cerințelor sale."
      },
      "5": {
        "title": "Tehnologii performante",
        "description": "Utilizăm echipamente și produse de curățenie de ultimă generație, eficiente și sigure pentru tine și familia ta. Ne asigurăm că suprafețele tratate sunt curățate impecabil fără a fi deteriorate."
      },
      "6": {
        "title": "Servicii de calitate",
        "description": "Respectăm cele mai înalte standarde de calitate, oferind de fiecare dată servicii optime. Echipa noastră calificată, tehnologiile avansate și atitudinea profesionistă garantează satisfacția clienților noștri."
      }
    }
  },
  "Services": {
    "title": "Serviciile noastre",
    "subtitle": "Oferim cele mai bune servicii de curățenie pentru <span>ajutorul dumneavoastră</span>",
    "page-subtitle": "Oferim următoarele servicii de curățenie:",
    "description": "Oferim o gamă variată de servicii de curățenie, astfel încât să rezolvăm toate necesitățile tale într-un singur loc.",
    "service-title": "Serviciul include următoarele:",
    "items": {
      "1": {
        "title": "Curățenie generală",
        "description": "Curățenie generală completă pentru a reîmprospăta locuința ta. Tehnici și echipamente avansate pentru o curățenie profundă.",
        "page-description": "Când simți că ai nevoie de o reîmprospătare și vrei să îți revigorezi energia, începe cu o curățenie profundă a locurilor unde petreci cel mai mult timp: acasă și la birou. Spre deosebire de curățenia de întreținere, curățenia generală se efectuează la nevoie – periodic, cu prilejuri speciale sau ori de câte ori consideri necesar. Aceasta se concentrează pe detalii și revitalizează atmosfera fiecărei camere.",
        "list": {
          "1": "<li>Spălarea exterioară a frigiderului, cuptorului și cuptorului cu microunde</li>",
          "2": "<li>Curățarea suprafețelor de gătit</li>",
          "3": "<li>Îndepărtarea prafului de pe decorațiuni (tablouri, vaze etc.), electrocasnice, becuri, uși etc.</li>",
          "4": "<li>Spălarea podelelor</li>",
          "5": "<li>Curățarea oglinzilor și a altor suprafețe de sticlă (exceptând ferestrele)</li>",
          "6": "<li>Îndepărtarea calcarului și a depunerilor de piatră din baie și toaletă</li>",
          "7": "<li>Spălarea integrală a gresiei și faianței din baie și toaletă</li>",
          "8": "<li>Curățarea mobilierului (rafturi, dulapuri, noptiere etc.)</li>",
          "9": "<li>Curățarea și dezinfectarea obiectelor sanitare (robinete, lavoare, bideuri etc.)</li>",
          "10": "<li>Aspirarea podelelor, covoarelor, mobilierului tapițat, canapelelor și fotoliilor</li>",
          "11": "<li>Îndepărtarea prafului și grăsimii de pe hota de bucătărie</li>",
          "12": "<li>Spălarea aragazului și eliminarea urmelor de grăsime</li>",
          "13": "<li>Spălarea coșurilor de gunoi și a zonelor de depozitare a deșeurilor</li>"
        },
        "slug": "general"
      },
      "2": {
        "title": "Curățenie de întreținere",
        "description": "Locuință curată săptămânal cu serviciile noastre de curățenie. Bucură-te de o casă strălucitoare și confortabilă.",
        "page-description": "Menținerea curățeniei este crucială pentru a asigura un mediu curat și sănătos în locuința ta. Aceasta se efectuează constant și previne acumularea murdăriei și a prafului, garantând un spațiu mereu plăcut și igienic.",
        "list": {
          "1": "<li>Aspirarea podelelor și covoarelor pentru a îndepărta praful și murdăria</li>",
          "2": "<li>Spălarea podelelor pentru a elimina urmele de uzură zilnică</li>",
          "3": "<li>Ștergerea prafului de pe mobilă, rafturi, dulapuri și alte suprafețe</li>",
          "4": "<li>Curățarea oglinzilor și a suprafețelor de sticlă pentru a le menține strălucitoare</li>",
          "5": "<li>Ștergerea prafului de pe electrocasnice pentru a preveni acumularea acestuia</li>",
          "6": "<li>Schimbarea pungilor de gunoi și evacuarea deșeurilor</li>",
          "7": "<li>Spălarea și dezinfectarea chiuvetelor, robinetelor și obiectelor sanitare</li>",
          "8": "<li>Ștergerea ușilor și a tocurilor pentru a îndepărta amprentele și murdăria</li>",
          "9": "<li>Spălarea aragazului și a suprafețelor de gătit pentru a elimina urmele de grăsime</li>"
        },
        "slug": "daily"
      },
      "3": {
        "title": "Curățenie după reparație",
        "description": "Curățenia după renovare elimină praful și mizeria, lăsându-ți casa impecabilă și gata de utilizare imediată.",
        "page-description": "Fie că te muți într-o casă nouă sau ai renovat apartamentul, lucrările de construcție lasă în urmă murdărie greu de îndepărtat. Suprafețele devin acoperite cu vopsea, adezivi, fragmente de materiale și mult praf. Nu irosi timp și resurse căutând soluții. Echipa noastră este pregătită să rezolve aceste probleme folosind produse și echipamente speciale care protejează finisajele și zugrăvelile.",
        "list": {
          "1": "<li>Curățarea resturilor de vopsea de pe tocuri, ferestre, uși, calorifere etc.</li>",
          "2": "<li>Curățarea panourilor electrice, gurilor de ventilare și instalațiilor sanitare</li>",
          "3": "<li>Spălarea caloriferelor cu generator de abur</li>",
          "4": "<li>Ștergerea teracotei din baie, toaletă și bucătărie</li>",
          "5": "<li>Aspirarea și ștergerea mobilierului, dacă este cazul</li>",
          "6": "<li>Curățarea pervazurilor</li>",
          "7": "<li>Îndepărtarea etichetelor de pe geamuri și rame</li>",
          "8": "<li>Ștergerea pereților</li>",
          "9": "<li>Curățarea plintelor</li>",
          "10": "<li>Curățarea balustradelor</li>",
          "11": "<li>Curățarea podelelor și pardoselilor</li>",
          "12": "<li>Curățarea prizelor</li>",
          "13": "<li>Curățarea și dezinfectarea suprafețelor din inox, lemn, sticlă etc.</li>"
        },
        "slug": "after-repair"
      },
      "4": {
        "title": "Curățarea chimică a mobilierului tapițat",
        "description": "Redă strălucirea mobilierului cu curățarea noastră chimică. Eliminăm petele și murdăria pentru un aspect nou.",
        "page-description": "Chiar și cele mai bune tapițerii se murdăresc, acumulând praf și pete în timp. Cu ajutorul nostru, piesele tale de mobilier și covoarele pot redeveni ca noi. Materialele de tapițerie variază, iar noi oferim soluții de curățare personalizate și sigure pentru fiecare tip de material.",
        "list": {
          "1": "<li>Aspirarea profesională a canapelelor, fotoliilor și scaunelor</li>",
          "2": "<li>Îndepărtarea petelor cu soluții speciale</li>",
          "3": "<li>Curățarea prin injecție-extracție</li>"
        },
        "slug": "furniture-cleaning"
      }
    },
    "helpers": {
      "see-details": "Vezi detalii"
    }
  },
  "Index": {
    "hero": {
      "title": "Servicii Profesionale de Curățenie",
      "description": "Experiența și atenția noastră la detalii asigură un mediu curat și sănătos pentru tine și familia ta."
    },
    "about": {
      "title": "De ce noi",
      "question_1": "De ce să alegeți ",
      "question_2": "serviciile noastre de curățenie?",
      "answer": "Noi suntem specializați în oferirea de servicii profesionale de curățenie, având o echipă dedicată de experți care își fac treaba cu pasiune și depășesc așteptările clienților. Am reușit să câștigăm încrederea clienților prin servicii de curățenie de calitate și atenția noastră la detalii.",
      "details": {
        "1": "Angajăm doar personal calificat și dedicat, trecând printr-un proces riguros de selecție, pentru a vă asigura cele mai bune servicii de curățenie.",
        "2": "Vă economisim timpul prețios, preluând sarcina curățeniei și oferindu-vă mai mult timp liber pentru activitățile importante.",
        "3": "Oferim curățenie de calitate, servicii personalizate și atenție la detalii, fie pentru domiciliu, fie pentru birouri."
      }
    },
    "steps": {
      "title": "Cum funcționează serviciile noastre?",
      "description": "Câțiva pași simpli pentru a curăța locuința ta.",
      "items": {
        "1": {
          "title": "Cererea",
          "description": "Contactează-ne pentru a ne comunica nevoile tale de curățenie. Echipa noastră va răspunde rapid pentru a stabili detaliile inițiale."
        },
        "2": {
          "title": "Calcularea",
          "description": "Vom evalua cerințele specifice și vom oferi un calcul exact al costurilor, asigurând transparență și corectitudine."
        },
        "3": {
          "title": "Curățenia",
          "description": "Echipa noastră de profesioniști va efectua serviciile de curățenie conform programului stabilit, folosind echipamente și produse de calitate."
        },
        "4": {
          "title": "Plata",
          "description": "După finalizarea curățeniei, poți efectua plata prin metoda convenabilă pentru tine. Satisfacția ta este prioritatea noastră."
        }
      }
    }
  },
  "Nav": {
    "home": "Principala",
    "services": "Servicii",
    "about": "Despre noi",
    "contact": "Contact"
  },
  "Footer": {
    "contact": "Contacte",
    "services": "Serviciile noastre"
  },
  "SEO": {
    "homepage": {
      "title": "Servicii Profesionale de Curățenie în Chișinău | Top Cleaning",
      "description": "Oferim servicii de curățenie profesionale în Chișinău, adaptate nevoilor tale. Economisește timp și bucură-te de un mediu curat și sănătos."
    }
  }
}
```

### 4.2 `messages/ru.json` (Russian) — verbatim

```json
{
  "About": {
    "title": "О нас",
    "items": {
      "1": {
        "title": "Экономия времени",
        "description": "Сэкономьте драгоценное время, доверив уборку нам. Каждую неделю мы предоставляем вам больше времени для занятий, которые действительно важны."
      },
      "2": {
        "title": "Один адрес для всех решений",
        "description": "Мы — ваш надежный партнер по уходу за домом или офисом. Предлагаем широкий спектр услуг, чтобы удовлетворить все ваши потребности в одном месте."
      },
      "3": {
        "title": "Профессиональная команда",
        "description": "Наши специалисты хорошо подготовлены и опытны, обеспечивая услуги уборки на самом высоком уровне. Мы всегда вовремя и работаем с уважением и ответственностью."
      },
      "4": {
        "title": "Индивидуальный подход",
        "description": "Мы адаптируем наши услуги к вашим конкретным потребностям и предпочтениям. Каждый клиент получает персонализированное решение, идеально подходящее по бюджету и требованиям."
      },
      "5": {
        "title": "Современные технологии",
        "description": "Мы используем новейшее оборудование и чистящие средства, которые эффективны и безопасны для вас и вашей семьи. Мы гарантируем, что обрабатываемые поверхности будут очищены идеально без повреждений."
      },
      "6": {
        "title": "Качественные услуги",
        "description": "Мы придерживаемся самых высоких стандартов качества, каждый раз предоставляя оптимальные услуги. Наша квалифицированная команда, передовые технологии и профессиональный подход гарантируют удовлетворение наших клиентов."
      }
    }
  },
  "Services": {
    "title": "Наши услуги",
    "subtitle": "Мы предлагаем лучшие услуги по уборке для <span>вашей помощи</span>",
    "page-subtitle": "Мы предлагаем следующие услуги по уборке:",
    "description": "Мы предлагаем широкий спектр услуг по уборке, чтобы удовлетворить все ваши потребности в одном месте.",
    "service-title": "Услуга включает в себя:",
    "items": {
      "1": {
        "title": "Генеральная уборка",
        "description": "Полная генеральная уборка для освежения вашего жилья. Продвинутые техники и оборудование для глубокой чистки.",
        "page-description": "Когда чувствуешь потребность в обновлении и хочешь зарядиться новой энергией, начни с генеральной уборки в местах, где проводишь больше всего времени: дома и на работе. В отличие от поддерживающей уборки, генеральная уборка проводится по мере необходимости — сезонно, по особым случаям или когда считаешь нужным. Она сосредоточена на деталях и освежает атмосферу в каждой комнате.",
        "slug": "daily",
        "service-title": "Генеральная уборка включает в себя следующие услуги:",
        "list": {
          "1": "<li>Мойка внешней поверхности холодильника, духовки и микроволновой печи</li>",
          "2": "<li>Очистка кухонных поверхностей</li>",
          "3": "<li>Удаление пыли с декораций (картины, вазы и т.д.), бытовой техники, ламп, дверей и т.д.</li>",
          "4": "<li>Мытье полов</li>",
          "5": "<li>Очистка зеркал и других стеклянных поверхностей (кроме окон)</li>",
          "6": "<li>Удаление известкового налета и отложений в ванной и туалете</li>",
          "7": "<li>Полная мойка плитки и керамической плитки в ванной и туалете</li>",
          "8": "<li>Очистка мебели (полки, шкафы, тумбочки и т.д.)</li>",
          "9": "<li>Очистка и дезинфекция сантехники (краны, раковины, биде и т.д.)</li>",
          "10": "<li>Пылесоска полов, ковров, мягкой мебели, диванов и кресел</li>",
          "11": "<li>Удаление пыли и жира с кухонной вытяжки</li>",
          "12": "<li>Мытье плиты и удаление следов жира</li>",
          "13": "<li>Мытье мусорных ведер и зон для хранения отходов</li>"
        }
      },
      "2": {
        "title": "Поддерживающая уборка",
        "description": "Еженедельная чистка вашего жилья с нашими услугами уборки. Наслаждайтесь блестящим и уютным домом.",
        "page-description": "Поддерживающая уборка важна для поддержания чистоты и здоровья в вашем доме. Она проводится регулярно и помогает предотвратить накопление грязи и пыли, обеспечивая всегда уютное и гигиеничное пространство.",
        "list": {
          "1": "<li>Чистка полов и ковров для удаления пыли и грязи</li>",
          "2": "<li>Мытье полов для удаления следов повседневного использования</li>",
          "3": "<li>Протирание пыли с мебели, полок, шкафов и других поверхностей</li>",
          "4": "<li>Чистка зеркал и стеклянных поверхностей для поддержания их блеска</li>",
          "5": "<li>Протирание пыли с бытовой техники для предотвращения ее накопления</li>",
          "6": "<li>Замена мусорных пакетов и вынос мусора</li>",
          "7": "<li>Мытье и дезинфекция раковин, кранов и сантехнических приборов</li>",
          "8": "<li>Протирание дверей и дверных косяков для удаления отпечатков и грязи</li>",
          "9": "<li>Мытье плиты и кухонных поверхностей для удаления следов жира</li>"
        },
        "slug": "general"
      },
      "3": {
        "title": "Уборка после ремонта",
        "description": "Уборка после ремонта удаляет пыль и грязь, оставляя ваш дом безупречным и готовым к немедленному использованию.",
        "page-description": "Будь то переезд в новый дом или ремонт квартиры, строительные работы оставляют за собой трудновыводимые загрязнения. Поверхности покрываются краской, клеем, фрагментами материалов и большим количеством пыли. Не тратьте время и ресурсы на поиск решений. Наша команда готова справиться с этими проблемами, используя специальные средства и оборудование, которые защищают отделку и покраску.",
        "list": {
          "1": "<li>Очистка остатков краски с рам, окон, дверей, радиаторов и т.д.</li>",
          "2": "<li>Очистка электрических панелей, вентиляционных отверстий и сантехнических установок</li>",
          "3": "<li>Мытье радиаторов с парогенератором</li>",
          "4": "<li>Протирка кафеля в ванной, туалете и кухне</li>",
          "5": "<li>Пылесоска и протирка мебели, если необходимо</li>",
          "6": "<li>Очистка подоконников</li>",
          "7": "<li>Удаление наклеек с окон и рам</li>",
          "8": "<li>Протирка стен</li>",
          "9": "<li>Очистка плинтусов</li>",
          "10": "<li>Очистка перил</li>",
          "11": "<li>Очистка полов и покрытий</li>",
          "12": "<li>Очистка розеток</li>",
          "13": "<li>Очистка и дезинфекция поверхностей из нержавеющей стали, дерева, стекла и т.д.</li>"
        },
        "slug": "after-repair"
      },
      "4": {
        "title": "Химчистка мягкой мебели",
        "description": "Верните блеск вашей мебели с нашей химчисткой. Мы удаляем пятна и грязь, придавая ей новый вид.",
        "page-description": "Даже самые качественные обивки со временем загрязняются, накапливая пыль и пятна. С нашей помощью ваша мебель и ковры снова будут выглядеть как новые. Материалы для обивки разнообразны, и мы предлагаем индивидуальные и безопасные решения для очистки каждого типа материала.",
        "list": {
          "1": "<li>Профессиональная пылесоска диванов, кресел и стульев</li>",
          "2": "<li>Удаление пятен с помощью специальных средств</li>",
          "3": "<li>Очистка методом инъекции-экстракции</li>"
        },
        "slug": "furniture-cleaning"
      }
    },
    "helpers": {
      "see-details": "Подробнее"
    }
  },
  "Index": {
    "hero": {
      "title": "Профессиональные Услуги Уборки",
      "description": "Наш опыт и внимание к деталям обеспечивают чистую и здоровую среду для вас и вашей семьи."
    },
    "about": {
      "title": "Почему мы",
      "question_1": "Почему стоит выбрать ",
      "question_2": "наши услуги уборки?",
      "answer": "Мы специализируемся на предоставлении профессиональных услуг уборки, с командой преданных своему делу экспертов, которые выполняют свою работу с энтузиазмом и превосходят ожидания клиентов. Мы завоевали доверие клиентов благодаря качественным услугам уборки и нашему вниманию к деталям.",
      "details": {
        "1": "Мы нанимаем только квалифицированный и преданный персонал, проходящий строгий процесс отбора, чтобы предоставить для вас лучшие услуги для уборки.",
        "2": "Мы экономим ваше драгоценное время, принимая на себя задачу уборки и предоставляя вам больше свободного времени для важных дел.",
        "3": "Мы предлагаем качественную уборку, персонализированные услуги и внимание к деталям, как для дома, так и для офисов."
      }
    },
    "steps": {
      "title": "Как работают наши услуги?",
      "description": "Несколько простых шагов для уборки вашего дома.",
      "items": {
        "1": {
          "title": "Заявка",
          "description": "Свяжитесь с нами, чтобы сообщить о ваших потребностях в уборке. Наша команда быстро ответит для уточнения начальных деталей."
        },
        "2": {
          "title": "Расчет",
          "description": "Мы оценим ваши конкретные требования и предложим точный расчет стоимости, обеспечивая прозрачность и справедливость."
        },
        "3": {
          "title": "Уборка",
          "description": "Наша команда профессионалов выполнит уборочные услуги в соответствии с установленным графиком, используя качественное оборудование и средства."
        },
        "4": {
          "title": "Оплата",
          "description": "После завершения уборки вы можете произвести оплату удобным для вас способом. Ваше удовлетворение — наш приоритет."
        }
      }
    }
  },
  "Nav": {
    "home": "Главная",
    "services": "Услуги",
    "about": "О нас"
  },
  "Footer": {
    "contact": "Контакты",
    "services": "Наши услуги"
  },
  "SEO": {
    "homepage": {
      "title": "Профессиональные Услуги Уборки в Кишиневе | Top Cleaning",
      "description": "Мы предлагаем профессиональные услуги уборки в Кишиневе, адаптированные к вашим потребностям. Сэкономьте время и наслаждайтесь чистой и здоровой средой."
    }
  }
}
```

### 4.3 Hardcoded (non-translated) copy in components

These strings are **not** in the message files — they are literal in JSX and identical in both locales:

| Where | Text |
|---|---|
| `TopBar.tsx`, `Footer.tsx` | `079 022 023` (visible phone label) |
| `Footer.tsx` | `info@topcleaning.md` |
| `Footer.tsx` copyright line | `All content copyright ©{current year} Top Cleaning™. All rights reserved.` |
| `LanguageSwitcher.tsx` | `RO` / `RU` (rendered `uppercase` from the locale codes) |
| `ServicesPage` "see details" arrow | `→` (blue, appended after the translated `see-details` label) |
| Logo SVG | wordmark `TOP CLEANING`, tagline `comfort and cleanliness` |
| `alt` attributes | `"alt"` (hero slides), `"Services"` (service icons), `"icon"` (service cards), `"Cleaning Service"` (WhyUs cover), `"scroll-to-top-icon"` |

---

## 5. Copy as rendered, page by page

### Homepage `/`

**Hero** — full-bleed autoplay carousel, 3 slides, 4 s delay, loop, `stopOnInteraction: true`,
400 px tall on mobile / 800 px on desktop. Images `cleaning-service_1..3.webp`, `object-cover`,
`quality={100}`, with a left-to-right black gradient overlay. Text overlay pinned in the container,
constrained to `lg:max-w-[45%]`, white.

- H1 (RO) **Servicii Profesionale de Curățenie** — (RU) **Профессиональные Услуги Уборки**
- Paragraph (RO) *Experiența și atenția noastră la detalii asigură un mediu curat și sănătos pentru tine și familia ta.*
  (RU) *Наш опыт и внимание к деталям обеспечивают чистую и здоровую среду для вас и вашей семьи.*
  (rendered with `t.rich` supporting a `<br>` tag — unused in current copy)
- **No CTA button in the hero.**

**Why Us** (`Index.about`) — two columns, min-height 750 px; left = `cover.webp` in a rounded card
(`lg:flex-[0_0_45%]`), right = text. Column order reverses on mobile (`flex-col-reverse`).

- Eyebrow with `Stars` icon: (RO) **De ce noi** / (RU) **Почему мы**
- H2 line 1: (RO) `De ce să alegeți ` / (RU) `Почему стоит выбрать ` — then `<br>` — line 2 in
  smaller normal weight: (RO) `serviciile noastre de curățenie?` / (RU) `наши услуги уборки?`
- Body: RO *Noi suntem specializați în oferirea de servicii profesionale de curățenie, având o echipă dedicată de experți care își fac treaba cu pasiune și depășesc așteptările clienților. Am reușit să câștigăm încrederea clienților prin servicii de curățenie de calitate și atenția noastră la detalii.*
  RU *Мы специализируемся на предоставлении профессиональных услуг уборки, с командой преданных своему делу экспертов, которые выполняют свою работу с энтузиазмом и превосходят ожидания клиентов. Мы завоевали доверие клиентов благодаря качественным услугам уборки и нашему вниманию к деталям.*
- Divider, then 3 check-marked bullets (`GiCheckMark`, blue) = `Index.about.details.1..3` (full text
  in §4).

**Services** (homepage section) — background `bg-service-section` (`bg-service-section.jpg`, cover,
no-repeat), 40/80 px vertical padding, centred header.

- Eyebrow with `Stars`: (RO) **Serviciile noastre** / (RU) **Наши услуги**
- Big line, `<span>` part renders on a new line, smaller and normal-weight:
  RO **Oferim cele mai bune servicii de curățenie pentru** ⏎ *ajutorul dumneavoastră*
  RU **Мы предлагаем лучшие услуги по уборке для** ⏎ *вашей помощи*
- Sub-paragraph (max 40 % width): RO *Oferim o gamă variată de servicii de curățenie, astfel încât să rezolvăm toate necesitățile tale într-un singur loc.* / RU *Мы предлагаем широкий спектр услуг по уборке, чтобы удовлетворить все ваши потребности в одном месте.*
- Carousel of 4 service cards: 1 per view on mobile, 2 on md, 3 on lg; loop; autoplay 3 s;
  `stopOnInteraction` + `stopOnMouseEnter`. Prev/Next round 60 px buttons below the track, bg
  `#cddae6`, hover `#082680` + white.
- Card (340 px wide, white, rounded, links to `/services/{index+1}`): dashed-border 92 px circle
  containing `/images/icon/service-icon-{n}.png` at 48×48; on hover the circle fills solid blue, the
  card grows (`hover:-my-[10%] hover:py-[15%]`), the photo `/images/service-card-{n}.webp` fades in
  behind a `#082680db` overlay and the text goes white. Card content = `Services.items.N.title` +
  a 38×3 px blue rule + `Services.items.N.description`:
  1. **Curățenie generală** / **Генеральная уборка** — *Curățenie generală completă pentru a reîmprospăta locuința ta. Tehnici și echipamente avansate pentru o curățenie profundă.* / *Полная генеральная уборка для освежения вашего жилья. Продвинутые техники и оборудование для глубокой чистки.*
  2. **Curățenie de întreținere** / **Поддерживающая уборка** — *Locuință curată săptămânal cu serviciile noastre de curățenie. Bucură-te de o casă strălucitoare și confortabilă.* / *Еженедельная чистка вашего жилья с нашими услугами уборки. Наслаждайтесь блестящим и уютным домом.*
  3. **Curățenie după reparație** / **Уборка после ремонта** — *Curățenia după renovare elimină praful și mizeria, lăsându-ți casa impecabilă și gata de utilizare imediată.* / *Уборка после ремонта удаляет пыль и грязь, оставляя ваш дом безупречным и готовым к немедленному использованию.*
  4. **Curățarea chimică a mobilierului tapițat** / **Химчистка мягкой мебели** — *Redă strălucirea mobilierului cu curățarea noastră chimică. Eliminăm petele și murdăria pentru un aspect nou.* / *Верните блеск вашей мебели с нашей химчисткой. Мы удаляем пятна и грязь, придавая ей новый вид.*

**Steps** (`Index.steps`) — centred header + 4 evenly-spaced columns (100 % / 40 % / 22 %).

- Eyebrow with `Stars`: (RO) **Cum funcționează serviciile noastre?** / (RU) **Как работают наши услуги?**
- Sub-heading, large: (RO) *Câțiva pași simpli pentru a curăța locuința ta.* / (RU) *Несколько простых шагов для уборки вашего дома.*
- Each step: 88 px (116 px on lg) grey circle with a blue react-icon that turns blue-filled/white on
  hover, a blue "shadow" disc offset 12 px below, then title (2xl bold, navy), a 35×4 px blue rule,
  and the description.

| # | Icon | RO title / description | RU title / description |
|---|---|---|---|
| 1 | `LuMessagesSquare` | **Cererea** — *Contactează-ne pentru a ne comunica nevoile tale de curățenie. Echipa noastră va răspunde rapid pentru a stabili detaliile inițiale.* | **Заявка** — *Свяжитесь с нами, чтобы сообщить о ваших потребностях в уборке. Наша команда быстро ответит для уточнения начальных деталей.* |
| 2 | `FaCalculator` | **Calcularea** — *Vom evalua cerințele specifice și vom oferi un calcul exact al costurilor, asigurând transparență și corectitudine.* | **Расчет** — *Мы оценим ваши конкретные требования и предложим точный расчет стоимости, обеспечивая прозрачность и справедливость.* |
| 3 | `WiStars` | **Curățenia** — *Echipa noastră de profesioniști va efectua serviciile de curățenie conform programului stabilit, folosind echipamente și produse de calitate.* | **Уборка** — *Наша команда профессионалов выполнит уборочные услуги в соответствии с установленным графиком, используя качественное оборудование и средства.* |
| 4 | `MdOutlinePayments` | **Plata** — *După finalizarea curățeniei, poți efectua plata prin metoda convenabilă pentru tine. Satisfacția ta este prioritatea noastră.* | **Оплата** — *После завершения уборки вы можете произвести оплату удобным для вас способом. Ваше удовлетворение — наш приоритет.* |

Section spacing on the homepage: hero, then `mt-12 lg:mt-20` before Why Us, Services, and Steps
(Steps also `mb-12 md:mb-16 lg:mb-20`).

### Services index `/services`

- H1 = `Services.page-subtitle`: (RO) **Oferim următoarele servicii de curățenie:** / (RU) **Мы предлагаем следующие услуги по уборке:**
- Then a vertical list of the 4 services (max 90 % width). Each row: a square thumbnail
  (`/images/services/icons/{n}.webp`) — 40 px on mobile, 125 px on desktop, rounded-xl, linked — next
  to the title (h2, semibold, linked), the **`page-description`** long text (full text in §4), and a
  right-aligned "see details" link: (RO) **Vezi detalii →** / (RU) **Подробнее →** (arrow in blue).

### Service detail `/services/{1..4}`

- Header row: 30 px (70 px lg) rounded thumbnail `/images/services/icons/{id}.webp` + H1 =
  `Services.items.{id}.title`.
- H2 = `Services.items.{id}.page-description` (the long paragraph).
- Lead-in paragraph = `Services.service-title`: (RO) **Serviciul include următoarele:** / (RU) **Услуга включает в себя:**
- Then a disc bullet list rendered from the `<li>` strings via `t.rich`. Full lists per service below.

### About `/about`

- H1 = `About.title`: (RO) **Despre noi** / (RU) **О нас**
- Then benefit blocks: a large blue react-icon + H2 title, then the description paragraph (max 90 %
  width), stacked with 32/48 px gaps.
- Icon map: 1 `TbClockShield`, 2 `MdOutlineHomeRepairService`, 3 `FaUserTie`, 4 `GiThreeFriends`,
  5 `MdOutlineBuild`, 6 `GiLaurelsTrophy`.
- **Only items 1–4 actually render** (see §9 bug list). Items 5 and 6 are written but dead:
  - 5. (RO) **Tehnologii performante** — *Utilizăm echipamente și produse de curățenie de ultimă generație, eficiente și sigure pentru tine și familia ta. Ne asigurăm că suprafețele tratate sunt curățate impecabil fără a fi deteriorate.* / (RU) **Современные технологии** — *Мы используем новейшее оборудование и чистящие средства, которые эффективны и безопасны для вас и вашей семьи. Мы гарантируем, что обрабатываемые поверхности будут очищены идеально без повреждений.*
  - 6. (RO) **Servicii de calitate** — *Respectăm cele mai înalte standarde de calitate, oferind de fiecare dată servicii optime. Echipa noastră calificată, tehnologiile avansate și atitudinea profesionistă garantează satisfacția clienților noștri.* / (RU) **Качественные услуги** — *Мы придерживаемся самых высоких стандартов качества, каждый раз предоставляя оптимальные услуги. Наша квалифицированная команда, передовые технологии и профессиональный подход гарантируют удовлетворение наших клиентов.*

### Footer (all pages)

Background `#051135`, white text, 3 columns (stacked on mobile):

1. Logo (max 240 px), links home.
2. Heading `Footer.services`: (RO) **Serviciile noastre** / (RU) **Наши услуги** — then the 4 service
   titles as links to `/services/1..4`.
3. Heading `Footer.contact`: (RO) **Contacte** / (RU) **Контакты** — WhatsApp icon link, Viber icon
   link, phone icon + **079 022 023** (`tel:+37379022023`), then `info@topcleaning.md` as a mailto.
4. Bottom bar, small grey text: `All content copyright ©<year> Top Cleaning™. All rights reserved.`

---

## 6. Services offered — canonical list

Four services. **No pricing anywhere on the site** — no prices, no ranges, no "from X MDL", no
calculator. Step 2 ("Calcularea"/"Расчет") promises a quote after contact, which is the whole
pricing model.

### Service 1 — General cleaning
- RO: **Curățenie generală** · RU: **Генеральная уборка**
- Route `/services/1` → RO `/servicii-de-curatenie/servicii-curatenie-generala`, RU `/ru/uslugi-po-uborke/uslugi-generalnaya-uborka`
- Short (card) description, long (page) description: see §4.
- Included (13 items):

| RO | RU |
|---|---|
| Spălarea exterioară a frigiderului, cuptorului și cuptorului cu microunde | Мойка внешней поверхности холодильника, духовки и микроволновой печи |
| Curățarea suprafețelor de gătit | Очистка кухонных поверхностей |
| Îndepărtarea prafului de pe decorațiuni (tablouri, vaze etc.), electrocasnice, becuri, uși etc. | Удаление пыли с декораций (картины, вазы и т.д.), бытовой техники, ламп, дверей и т.д. |
| Spălarea podelelor | Мытье полов |
| Curățarea oglinzilor și a altor suprafețe de sticlă (exceptând ferestrele) | Очистка зеркал и других стеклянных поверхностей (кроме окон) |
| Îndepărtarea calcarului și a depunerilor de piatră din baie și toaletă | Удаление известкового налета и отложений в ванной и туалете |
| Spălarea integrală a gresiei și faianței din baie și toaletă | Полная мойка плитки и керамической плитки в ванной и туалете |
| Curățarea mobilierului (rafturi, dulapuri, noptiere etc.) | Очистка мебели (полки, шкафы, тумбочки и т.д.) |
| Curățarea și dezinfectarea obiectelor sanitare (robinete, lavoare, bideuri etc.) | Очистка и дезинфекция сантехники (краны, раковины, биде и т.д.) |
| Aspirarea podelelor, covoarelor, mobilierului tapițat, canapelelor și fotoliilor | Пылесоска полов, ковров, мягкой мебели, диванов и кресел |
| Îndepărtarea prafului și grăsimii de pe hota de bucătărie | Удаление пыли и жира с кухонной вытяжки |
| Spălarea aragazului și eliminarea urmelor de grăsime | Мытье плиты и удаление следов жира |
| Spălarea coșurilor de gunoi și a zonelor de depozitare a deșeurilor | Мытье мусорных ведер и зон для хранения отходов |

### Service 2 — Maintenance / regular cleaning
- RO: **Curățenie de întreținere** · RU: **Поддерживающая уборка**
- Route `/services/2` → RO `/servicii-de-curatenie/servicii-curatenie-de-intretinere`, RU `/ru/uslugi-po-uborke/uslugi-podderzhivayushchaya-uborka`
- Included (9 items):

| RO | RU |
|---|---|
| Aspirarea podelelor și covoarelor pentru a îndepărta praful și murdăria | Чистка полов и ковров для удаления пыли и грязи |
| Spălarea podelelor pentru a elimina urmele de uzură zilnică | Мытье полов для удаления следов повседневного использования |
| Ștergerea prafului de pe mobilă, rafturi, dulapuri și alte suprafețe | Протирание пыли с мебели, полок, шкафов и других поверхностей |
| Curățarea oglinzilor și a suprafețelor de sticlă pentru a le menține strălucitoare | Чистка зеркал и стеклянных поверхностей для поддержания их блеска |
| Ștergerea prafului de pe electrocasnice pentru a preveni acumularea acestuia | Протирание пыли с бытовой техники для предотвращения ее накопления |
| Schimbarea pungilor de gunoi și evacuarea deșeurilor | Замена мусорных пакетов и вынос мусора |
| Spălarea și dezinfectarea chiuvetelor, robinetelor și obiectelor sanitare | Мытье и дезинфекция раковин, кранов и сантехнических приборов |
| Ștergerea ușilor și a tocurilor pentru a îndepărta amprentele și murdăria | Протирание дверей и дверных косяков для удаления отпечатков и грязи |
| Spălarea aragazului și a suprafețelor de gătit pentru a elimina urmele de grăsime | Мытье плиты и кухонных поверхностей для удаления следов жира |

### Service 3 — Post-renovation cleaning
- RO: **Curățenie după reparație** · RU: **Уборка после ремонта**
- Route `/services/3` → RO `/servicii-de-curatenie/servicii-curatenie-dupa-reparatie`, RU `/ru/uslugi-po-uborke/uslugi-uborka-posle-remonta`
- Included (13 items):

| RO | RU |
|---|---|
| Curățarea resturilor de vopsea de pe tocuri, ferestre, uși, calorifere etc. | Очистка остатков краски с рам, окон, дверей, радиаторов и т.д. |
| Curățarea panourilor electrice, gurilor de ventilare și instalațiilor sanitare | Очистка электрических панелей, вентиляционных отверстий и сантехнических установок |
| Spălarea caloriferelor cu generator de abur | Мытье радиаторов с парогенератором |
| Ștergerea teracotei din baie, toaletă și bucătărie | Протирка кафеля в ванной, туалете и кухне |
| Aspirarea și ștergerea mobilierului, dacă este cazul | Пылесоска и протирка мебели, если необходимо |
| Curățarea pervazurilor | Очистка подоконников |
| Îndepărtarea etichetelor de pe geamuri și rame | Удаление наклеек с окон и рам |
| Ștergerea pereților | Протирка стен |
| Curățarea plintelor | Очистка плинтусов |
| Curățarea balustradelor | Очистка перил |
| Curățarea podelelor și pardoselilor | Очистка полов и покрытий |
| Curățarea prizelor | Очистка розеток |
| Curățarea și dezinfectarea suprafețelor din inox, lemn, sticlă etc. | Очистка и дезинфекция поверхностей из нержавеющей стали, дерева, стекла и т.д. |

### Service 4 — Upholstery dry cleaning
- RO: **Curățarea chimică a mobilierului tapițat** · RU: **Химчистка мягкой мебели**
- Route `/services/4` → RO `/servicii-de-curatenie/servicii-curatarea-chimica-a-mobilierului-tapitat`, RU `/ru/uslugi-po-uborke/uslugi-himchistka-myagkoy-mebeli`
- Included (3 items):

| RO | RU |
|---|---|
| Aspirarea profesională a canapelelor, fotoliilor și scaunelor | Профессиональная пылесоска диванов, кресел и стульев |
| Îndepărtarea petelor cu soluții speciale | Удаление пятен с помощью специальных средств |
| Curățarea prin injecție-extracție | Очистка методом инъекции-экстракции |

**Unused `slug` field:** each service also carries a `slug` key (`general`, `daily`, `after-repair`,
`furniture-cleaning`) that **no code reads** — URLs come from `i18n-config.ts` instead. The RO and RU
slugs for services 1 and 2 are swapped relative to each other (RO 1 = `general`, RU 1 = `daily`).
Ignore these entirely on the rewrite, or fix them to `general` / `maintenance` / `after-repair` /
`upholstery`.

---

## 7. Contact details

Everything the old site knew, in full:

| Field | Value |
|---|---|
| Phone (raw / dial) | `+37379022023` (`tel:+37379022023`) |
| Phone (displayed) | `079 022 023` |
| WhatsApp | `https://wa.me/37379022023` (opened in a new tab, `rel="noreferrer noopener nofollow"`) |
| Viber | `viber://chat?number=37379022023` |
| Telegram | **none** |
| Email | `info@topcleaning.md` (mailto in the footer only) |
| Physical address | **none anywhere in the repo** |
| Business hours | **none anywhere in the repo** |
| Social links (FB/IG/etc.) | **none** |
| Legal / company name | Only the brand `Top Cleaning™` in the copyright line; no SRL name |
| Registration / VAT number | **none** |
| Service area implied by SEO copy | **Chișinău, Moldova** (`în Chișinău` / `в Кишиневе` in the meta titles) |
| Domain | `topcleaning.md` (used in sitemap, robots, email, PM2 app name, deploy path) |

The phone number literal `const phoneNumber = '37379022023'` is duplicated in `TopBar.tsx` and
`Footer.tsx`. The display string `079 022 023` is also duplicated. Centralise this in the rewrite.

---

## 8. Forms

**There are none.** Grepping the whole `src/` tree for `<form`, `<input`, `process.env`,
`NEXT_PUBLIC`, `gtag`, `dataLayer`, `telegram`, `t.me` returns zero hits. There is:

- no contact form, no quote/booking form, no newsletter signup, no callback request;
- no API route (`app/api/**` does not exist), no server action;
- no email service (Resend/Nodemailer/EmailJS/Formspree), no Telegram bot, no CRM;
- **no application-level environment variables at all.** The only secrets are the four GitHub
  Actions deploy secrets listed in §1.

Conversion depends entirely on the phone / WhatsApp / Viber links in the top bar and footer. This is
the largest functional gap in the old site and the obvious thing to fix in the rewrite (a real
request form, ideally posting to an API route + email/Telegram, plus a `/contact` page).

---

## 9. Assets inventory

All assets live under `public/` plus one `.ico` in `src/app/`. **No video anywhere.**

### Brand logo — the important one

`src/components/icon/top-cleaning-logo.tsx` — an inline React SVG component (`TopCleaningLogo`),
~57 KB of path data, **36 `<path>` elements, every one `fill="currentColor"`**, so the logo takes its
colour from the parent (`text-[#000e39]` navy on desktop, inherited white in the footer).

- `width={715} height={182}` `viewBox="0 0 715 182"` (≈3.93 : 1)
- Content: a four-point **sparkle/star cluster** glyph on the left (one large 4-point star, one
  medium, one tiny), then the wordmark **`TOP CLEANING`** set in a high-contrast serif (Didone-ish)
  in all caps, and beneath it, right-aligned under the wordmark, the tagline
  **`comfort and cleanliness`** in the same serif, lowercase, smaller.
- The artwork occupies roughly the top half of the 715×182 viewBox; there is meaningful empty space
  below the tagline in the viewBox.
- Rendered at `max-w-[240px]` desktop / `max-w-[150px]` mobile header / `max-w-[180px]` in the mobile
  sheet / `max-w-[240px]` in the footer, always `h-auto`.
- There is **no raster logo file** — the SVG component is the only copy of the mark.

### Photos and backgrounds (`public/images/`)

| File | Dimensions | Bytes | Used by | Depicts |
|---|---|---|---|---|
| `cleaning-service_1.webp` | 1024×1024 | 277 KB | Hero slide 1 | AI-generated bright cyan living room; two cleaners in blue uniforms + caps, one mopping by a large window, one wiping the floor; yellow canister vacuum, mop, colourful spray bottles, sponges, yellow gloves in the foreground |
| `cleaning-service_2.webp` | 1024×1024 | 273 KB | Hero slide 2 | AI-generated blue living room; a man in a blue cap and apron mopping beside a navy sofa; teal/black vacuum on the right, cleaning caddy with yellow gloves and brushes bottom-left, sea view through the window |
| `cleaning-service_3.webp` | 1024×1024 | 310 KB | Hero slide 3 | AI-generated pale-blue living room; a woman in cap and overalls vacuuming a rug beside a white sectional; yellow canister vacuum, buckets, spray bottles, sponge |
| `cover.webp` | 1024×1024 | 267 KB | Why Us section | AI-generated modern living room, wood floor, dark shelving wall with plants, grey sofa, garden through big windows; mop, bucket and spray bottle in the foreground. Calmer/more premium than the hero shots |
| `bg-service-section.jpg` | 1823×764 | 94 KB | Tailwind `bg-service-section` (homepage Services band) | Essentially a **near-white subtle plaster/paper texture** — visually almost blank |
| `bg-service-section.webp` | 1823×764 | 38 KB | **unused** (Tailwind points at the .jpg) | same image, WebP encode |
| `service-card-1.webp` | 1024×1792 | 327 KB | Service card 1 hover photo | Portrait: smiling young woman with long hair, white shirt + grey apron + blue nitrile gloves, holding a white spray bottle, in a glass-walled office |
| `service-card-2.webp` | 1920×1280 | 87 KB | Service card 2 hover photo | Close-up of a bare hand with a white cloth wiping white venetian blinds, city visible outside |
| `service-card-3.webp` | 1920×1280 | 518 KB | Service card 3 hover photo | Top-down shot of a teal flat mop on dark walnut laminate flooring |
| `service-card-4.webp` | 1920×1280 | 518 KB | Service card 4 hover photo | **Byte-identical duplicate of `service-card-3.webp`** (same MD5). Service 4 has no artwork of its own |
| `upscrollarrow.svg` | 86×86 viewBox | 566 B | ScrollToTop button | Thin chevron pointing up, `fill:#030104`. Legacy Illustrator/`Capa_1` export with an `iso-8859-1` XML declaration |

Hero and cover images are square (1024×1024) but rendered into wide, tall containers with
`object-cover` — heavy cropping on desktop. Worth replacing with properly-shot landscape assets.

### Service thumbnails (`public/images/services/icons/`)

Flat vector-style illustrations rendered as 1024×1024 WebP, each on its own solid pastel background
(so they do not sit on a shared surface cleanly):

| File | Size | Depicts |
|---|---|---|
| `1.webp` | 1024×1024, 89 KB | Pale blue-grey background; navy-outlined house with a light-blue broom leaning across it, sparkles |
| `2.webp` | 1024×1024, 115 KB | Sage green background; white rounded-square badge containing a white/navy broom head with sparkles |
| `3.webp` | 1024×1024, 107 KB | Off-white background; navy line-art worker in a hard hat, a bucket, and a large broom, dotted-circle motif |
| `4.webp` | 1024×1024, 178 KB | Warm taupe/brown background; dark-brown armchair next to a canister vacuum with wand, sparkles |

Used on the services index (40 px mobile / 125 px desktop) and service detail pages (30 px / 70 px) —
i.e. 1024 px images displayed at 30–125 px. Very wasteful; the rewrite should ship small SVGs.

### Small icons (`public/images/icon/`)

| File | Size | Depicts | Used |
|---|---|---|---|
| `service-icon-1.png` | 100×100, 6.6 KB | Light-blue house with navy outline and two 4-point sparkles | Service card 1 (48×48) |
| `service-icon-2.png` | 100×100, 4.4 KB | Light-blue/navy broom, head-on | Service card 2 (48×48) |
| `service-icon-3.png` | 87×100, 4.8 KB | Light-blue bucket with white foam spilling over | Service card 3 (48×48) |
| `service-icon-4.png` | 100×100, 6.2 KB | Hand holding a light-blue cloth, with a sparkle | Service card 4 (48×48) |
| `whatsapp-icon.png` | 50×51, 1.9 KB | WhatsApp glyph | **unused** — `react-icons` `FaWhatsapp` is used instead |
| `viber-icon.png` | 50×51, 1.9 KB | Viber glyph | **unused** — `react-icons` `FaViber` is used instead |

### Favicon

`src/app/favicon.ico` — Windows ICO, **9 sizes**, 32 bpp, up to 256×256. (Auto-served by Next's App
Router.) No `apple-touch-icon`, no `manifest.json`, no OG image file.

### Inline SVG components

- `src/components/icon/stars.tsx` → `Stars`, `75×110` viewBox, 4 four-point sparkles of decreasing
  size, `fill="currentColor"`. Used as the blue eyebrow ornament on Why Us, Services and Steps.
  (Note: it accepts only `className`, and `width`/`height` are baked in — the callers override with
  `h-auto w-[24px]`.)
- `src/components/icon/phone.tsx` → `Phone`, 24×24 handset glyph. **Defined but never used**
  (`GiRotaryPhone` from react-icons is used in the top bar and footer instead).

---

## 10. SEO artifacts

### Metadata

Generated in **two places, with the same content**:

`src/app/[locale]/layout.tsx`:
```ts
export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'SEO' })
  return {
    title: t('homepage.title'),
    description: t('homepage.description'),
    robots: 'index,follow',
  }
}
```
`src/app/[locale]/page.tsx` repeats `title` + `description` (without `robots`).

Resulting tags:

| Locale | `<title>` | `<meta name="description">` |
|---|---|---|
| ro | `Servicii Profesionale de Curățenie în Chișinău \| Top Cleaning` | `Oferim servicii de curățenie profesionale în Chișinău, adaptate nevoilor tale. Economisește timp și bucură-te de un mediu curat și sănătos.` |
| ru | `Профессиональные Услуги Уборки в Кишиневе \| Top Cleaning` | `Мы предлагаем профессиональные услуги уборки в Кишиневе, адаптированные к вашим потребностям. Сэкономьте время и наслаждайтесь чистой и здоровой средой.` |

`<html lang>` is set correctly per locale. `robots: 'index,follow'`.

**Missing entirely:** per-page titles/descriptions (about, services index and all 4 service pages all
inherit the homepage title), Open Graph tags, Twitter cards, `keywords`, `metadataBase`, canonical
`<link rel="canonical">`, `alternates.languages` in metadata (hreflang exists only in the sitemap),
any JSON-LD structured data (no `LocalBusiness`, no `Service`, no `BreadcrumbList` — even though
visual breadcrumbs are rendered).

### robots (`src/app/robots.ts`)

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://topcleaning.md/sitemap.xml',
  }
}
```

### sitemap (`src/app/sitemap.ts`)

Hardcoded array of 7 entries, `siteUrl = 'https://topcleaning.md'`, `lastModified: new Date()` (so it
always claims "today"), each with `alternates.languages` for `ro` and `ru`:

1. `/` (ru: `/ru`)
2. `/servicii-de-curatenie` (ru: `/ru/uslugi-po-uborke`)
3. `/servicii-de-curatenie/servicii-curatenie-generala` (ru: `/ru/uslugi-po-uborke/uslugi-generalnaya-uborka`)
4. `/servicii-de-curatenie/servicii-curatenie-de-intretinere` (ru: `/ru/uslugi-po-uborke/uslugi-podderzhivayushchaya-uborka`)
5. `/servicii-de-curatenie/servicii-curatenie-dupa-reparatie` (ru: `/ru/uslugi-po-uborke/uslugi-uborka-posle-remonta`)
6. `/servicii-de-curatenie/servicii-curatarea-chimica-a-mobilierului-tapitat` (ru: `/ru/uslugi-po-uborke/uslugi-himchistka-myagkoy-mebeli`)
7. `/despre-noi` (ru: `/ru/o-nas`)

The RO URLs above are the SEO-valuable ones — **keep these paths in the rewrite** (with 301s if any
change) since they are what any existing indexing / backlinks point at.

---

## 11. Anything else notable

### No third-party anything
No Google Analytics, no GTM, no Meta Pixel, no Yandex.Metrica, no Hotjar, no cookie banner, no chat
widget, no map embed, no reCAPTCHA. No tracking IDs of any kind exist in the repo. (Nothing to
migrate — but also means there is zero historical traffic data in-repo.)

### Bugs and gaps — do NOT reproduce these

1. **About page silently drops two benefits.** `about/page.tsx` iterates
   `R.keys(messages.Services.items)` (4 keys) to render `About.items.{key}` (6 written). Items 5 and
   6 — "Tehnologii performante" / "Servicii de calitate" — never appear, and `IconMap` entries 5 and
   6 are dead. Copy for them exists in both languages (reproduced in §5) and is worth using.
2. **Steps section is keyed off the wrong collection too.** `Steps.tsx` also loops
   `R.keys(messages.Services.items)` to render `Index.steps.items[key]`. It only works because both
   happen to have 4 keys. Adding a 5th service would crash/blank the Steps section.
3. **Cyrillic font is not loaded.** `Onest` is loaded with `subsets: ['latin']` only, so the entire
   Russian site falls back to the system sans stack. Add `'cyrillic'` (and `'latin-ext'` for Romanian
   diacritics — Onest's `latin` subset does not include `ș`, `ț`, `ă`, `î`).
4. **RU `slug` values for services 1 and 2 are swapped** vs RO (`daily` / `general` instead of
   `general` / `daily`). Harmless today only because nothing reads `slug`.
5. **Orphan key** `Services.items.1["service-title"]` exists in `ru.json`
   ("Генеральная уборка включает в себя следующие услуги:") and is never rendered — the pages use the
   namespace-level `Services.service-title`. `ro.json` has no equivalent, so the two files are not
   structurally identical, which defeats the `IntlMessages` type derived from `ro.json` in
   `global.d.ts` / `src/types.ts`.
6. **`Nav.contact` = "Contact" exists in RO, is absent in RU, and is used by nothing.** There is no
   contact page and no contact nav item. If you translate-check with a strict tool this is a
   RO-only key.
7. **Every page shares the homepage `<title>` and description.** Six of seven routes have no unique
   metadata. Big, cheap SEO win in the rewrite.
8. **`service-card-4.webp` is a byte-for-byte copy of `service-card-3.webp`.** The upholstery card
   shows a floor-mop photo on hover.
9. **`bg-service-section.jpg` is nearly blank white** and is 94 KB for what could be a CSS colour;
   the WebP twin is shipped but unused.
10. **Huge images served tiny.** 1024×1024 service illustrations render at 30–125 px; hero art is
    square and gets brutally cropped to 400/800 px-tall full-width bands.
11. **`alt` texts are placeholders** — `alt="alt"`, `alt="icon"`, `alt="Services"`. Accessibility and
    image-SEO gap.
12. **Six `@ts-ignore` / `@ts-expect-error` suppressions** in `DesktopMenu`, `MobileMenu`,
    `Breadcrumbs` (×2), `Services` (ServiceCard link) and `LanguageSwitcher` — all around next-intl's
    typed `Link href`. A rewrite should type the route union properly.
13. **Header layout is fragile.** The sticky behaviour is a `useState` + raw `scroll` listener
    (unthrottled) flipping the bar to `position: fixed` at `scrollY > 42`, with negative margins
    (`-mt-[70px]` → `-mt-[25px]`) positioning the overhanging logo card. Reimplement with
    `position: sticky` / IntersectionObserver.
14. **Unused code shipped:** `ui/drawer.tsx` (+ the `vaul` dependency), `ui/button.tsx`,
    `Icon.Phone`, `public/images/icon/whatsapp-icon.png`, `public/images/icon/viber-icon.png`,
    `bg-service-section.webp`.
15. **`prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` are in `dependencies`, not
    `devDependencies`** — they get installed by `npm install --production` on the server.
16. **Deploy ships the whole working tree.** The CI tars everything (source + `.next`), scps it, then
    re-runs `npm install --production` on the box and `pm2 reload`s. No health check, no rollback, no
    build cache, no lockfile-based `npm ci`.
17. **README is the untouched `create-next-app` boilerplate** — no project docs at all.
18. **Dark mode CSS variables exist but nothing sets `.dark`.** Dead theme.
19. **No 404 / error / loading UI**, no `not-found.tsx`, no `error.tsx`, no loading skeletons.
20. **No accessibility affordances** beyond defaults: the hamburger `SheetTrigger` has no accessible
    label, the language switcher buttons are bare `RO`/`RU` with no `aria-label` or `lang`, and the
    carousels have no pause control despite autoplaying.

### Content gaps worth filling in the rewrite

- No pricing or even indicative rates.
- No contact page, address, opening hours, or map.
- No request/booking form (see §8).
- No testimonials, reviews, ratings, or case studies / before-after gallery.
- No team, company history, licences, or insurance statements.
- No FAQ.
- No commercial/office-cleaning landing page even though the copy repeatedly mentions offices
  ("casei sau biroului", "fie pentru domiciliu, fie pentru birouri").
- No blog / no local-SEO content for Chișinău.
- No legal pages (privacy policy, terms, GDPR/cookie notice).
- Services list is thin at 4 — no window cleaning, carpet cleaning, disinfection, or move-in/move-out,
  all of which the imagery hints at.

### Reference copy of the source

The clone used for this inventory is at
`/private/tmp/claude-501/-Users-stephen-Development-top-cleaning/d8840fea-adc6-4f6c-bc9e-9900e6120c6b/scratchpad/source-repo`
(shallow clone, `--depth 1`). It is in a session scratchpad and will not persist.
