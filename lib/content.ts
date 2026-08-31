/**
 * Top Cleaning bilingual content model.
 *
 * Primary source: https://github.com/VadimR7/topcleaning_next_app
 * Audited commit: b8a4525d8982bee9500bdebec08c788ab0d8603e
 *
 * Notes:
 * - Business facts and body copy below are limited to material present in the source repo.
 * - Russian short slugs for general and maintenance cleaning are corrected here; they
 *   were swapped in messages/ru.json. Public route slugs already had the correct mapping.
 * - The source does not provide prices, hours, a street address, legal-entity details,
 *   testimonials, certifications, social profiles, or a contact form. None are asserted here.
 */

export const locales = ['ro', 'ru'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ro'

export const business = {
  name: 'Top Cleaning',
  domain: 'topcleaning.md',
  siteUrl: 'https://topcleaning.md',
  phone: {
    e164: '+37379022023',
    display: '079 022 023',
    href: 'tel:+37379022023',
  },
  email: {
    address: 'info@topcleaning.md',
    href: 'mailto:info@topcleaning.md',
  },
  whatsapp: 'https://wa.me/37379022023',
  viber: 'viber://chat?number=37379022023',
  serviceCity: 'Chișinău',
} as const

export const serviceIds = [
  'general-cleaning',
  'maintenance-cleaning',
  'post-renovation-cleaning',
  'upholstery-cleaning',
] as const

export type ServiceId = (typeof serviceIds)[number]

/** Localized public paths, including the `ru` locale prefix where applicable. */
export const routes = {
  home: {
    ro: '/',
    ru: '/ru',
  },
  services: {
    ro: '/servicii-de-curatenie',
    ru: '/ru/uslugi-po-uborke',
  },
  'general-cleaning': {
    ro: '/servicii-de-curatenie/servicii-curatenie-generala',
    ru: '/ru/uslugi-po-uborke/uslugi-generalnaya-uborka',
  },
  'maintenance-cleaning': {
    ro: '/servicii-de-curatenie/servicii-curatenie-de-intretinere',
    ru: '/ru/uslugi-po-uborke/uslugi-podderzhivayushchaya-uborka',
  },
  'post-renovation-cleaning': {
    ro: '/servicii-de-curatenie/servicii-curatenie-dupa-reparatie',
    ru: '/ru/uslugi-po-uborke/uslugi-uborka-posle-remonta',
  },
  'upholstery-cleaning': {
    ro: '/servicii-de-curatenie/servicii-curatarea-chimica-a-mobilierului-tapitat',
    ru: '/ru/uslugi-po-uborke/uslugi-himchistka-myagkoy-mebeli',
  },
  about: {
    ro: '/despre-noi',
    ru: '/ru/o-nas',
  },
  contact: {
    ro: '/contact',
    ru: '/ru/kontakty',
  },
} as const satisfies Record<string, Record<Locale, string>>

export type RouteId = keyof typeof routes

export const navigationRouteIds = ['services', 'about', 'contact'] as const satisfies readonly RouteId[]

export const content = {
  ro: {
    navigation: {
      home: 'Principala',
      services: 'Servicii',
      about: 'Despre noi',
      contact: 'Contact',
    },
    footer: {
      contact: 'Contacte',
      services: 'Serviciile noastre',
      copyrightTemplate: '© {year} Top Cleaning™. Toate drepturile rezervate.',
    },
    home: {
      hero: {
        title: 'Servicii Profesionale de Curățenie',
        description:
          'Experiența și atenția noastră la detalii asigură un mediu curat și sănătos pentru tine și familia ta.',
      },
      whyUs: {
        eyebrow: 'De ce noi',
        question: 'De ce să alegeți serviciile noastre de curățenie?',
        answer:
          'Noi suntem specializați în oferirea de servicii profesionale de curățenie, având o echipă dedicată de experți care își fac treaba cu pasiune și depășesc așteptările clienților. Am reușit să câștigăm încrederea clienților prin servicii de curățenie de calitate și atenția noastră la detalii.',
        reasons: [
          'Angajăm doar personal calificat și dedicat, trecând printr-un proces riguros de selecție, pentru a vă asigura cele mai bune servicii de curățenie.',
          'Vă economisim timpul prețios, preluând sarcina curățeniei și oferindu-vă mai mult timp liber pentru activitățile importante.',
          'Oferim curățenie de calitate, servicii personalizate și atenție la detalii, fie pentru domiciliu, fie pentru birouri.',
        ],
      },
      workflow: {
        title: 'Cum funcționează serviciile noastre?',
        description: 'Câțiva pași simpli pentru a curăța locuința ta.',
        steps: [
          {
            id: 'request',
            title: 'Cererea',
            description:
              'Contactează-ne pentru a ne comunica nevoile tale de curățenie. Echipa noastră va răspunde rapid pentru a stabili detaliile inițiale.',
          },
          {
            id: 'quote',
            title: 'Calcularea',
            description:
              'Vom evalua cerințele specifice și vom oferi un calcul exact al costurilor, asigurând transparență și corectitudine.',
          },
          {
            id: 'cleaning',
            title: 'Curățenia',
            description:
              'Echipa noastră de profesioniști va efectua serviciile de curățenie conform programului stabilit, folosind echipamente și produse de calitate.',
          },
          {
            id: 'payment',
            title: 'Plata',
            description:
              'După finalizarea curățeniei, poți efectua plata prin metoda convenabilă pentru tine. Satisfacția ta este prioritatea noastră.',
          },
        ],
      },
    },
    services: {
      title: 'Serviciile noastre',
      subtitle: 'Oferim cele mai bune servicii de curățenie pentru ajutorul dumneavoastră',
      pageSubtitle: 'Oferim următoarele servicii de curățenie:',
      description:
        'Oferim o gamă variată de servicii de curățenie, astfel încât să rezolvăm toate necesitățile tale într-un singur loc.',
      includesTitle: 'Serviciul include următoarele:',
      seeDetails: 'Vezi detalii',
      items: {
        'general-cleaning': {
          sourceId: '1',
          shortSlug: 'general',
          route: routes['general-cleaning'].ro,
          name: 'Curățenie generală',
          description:
            'Curățenie generală completă pentru a reîmprospăta locuința ta. Tehnici și echipamente avansate pentru o curățenie profundă.',
          body:
            'Când simți că ai nevoie de o reîmprospătare și vrei să îți revigorezi energia, începe cu o curățenie profundă a locurilor unde petreci cel mai mult timp: acasă și la birou. Spre deosebire de curățenia de întreținere, curățenia generală se efectuează la nevoie – periodic, cu prilejuri speciale sau ori de câte ori consideri necesar. Aceasta se concentrează pe detalii și revitalizează atmosfera fiecărei camere.',
          includes: [
            'Spălarea exterioară a frigiderului, cuptorului și cuptorului cu microunde',
            'Curățarea suprafețelor de gătit',
            'Îndepărtarea prafului de pe decorațiuni (tablouri, vaze etc.), electrocasnice, becuri, uși etc.',
            'Spălarea podelelor',
            'Curățarea oglinzilor și a altor suprafețe de sticlă (exceptând ferestrele)',
            'Îndepărtarea calcarului și a depunerilor de piatră din baie și toaletă',
            'Spălarea integrală a gresiei și faianței din baie și toaletă',
            'Curățarea mobilierului (rafturi, dulapuri, noptiere etc.)',
            'Curățarea și dezinfectarea obiectelor sanitare (robinete, lavoare, bideuri etc.)',
            'Aspirarea podelelor, covoarelor, mobilierului tapițat, canapelelor și fotoliilor',
            'Îndepărtarea prafului și grăsimii de pe hota de bucătărie',
            'Spălarea aragazului și eliminarea urmelor de grăsime',
            'Spălarea coșurilor de gunoi și a zonelor de depozitare a deșeurilor',
          ],
        },
        'maintenance-cleaning': {
          sourceId: '2',
          shortSlug: 'daily',
          route: routes['maintenance-cleaning'].ro,
          name: 'Curățenie de întreținere',
          description:
            'Locuință curată săptămânal cu serviciile noastre de curățenie. Bucură-te de o casă strălucitoare și confortabilă.',
          body:
            'Menținerea curățeniei este crucială pentru a asigura un mediu curat și sănătos în locuința ta. Aceasta se efectuează constant și previne acumularea murdăriei și a prafului, garantând un spațiu mereu plăcut și igienic.',
          includes: [
            'Aspirarea podelelor și covoarelor pentru a îndepărta praful și murdăria',
            'Spălarea podelelor pentru a elimina urmele de uzură zilnică',
            'Ștergerea prafului de pe mobilă, rafturi, dulapuri și alte suprafețe',
            'Curățarea oglinzilor și a suprafețelor de sticlă pentru a le menține strălucitoare',
            'Ștergerea prafului de pe electrocasnice pentru a preveni acumularea acestuia',
            'Schimbarea pungilor de gunoi și evacuarea deșeurilor',
            'Spălarea și dezinfectarea chiuvetelor, robinetelor și obiectelor sanitare',
            'Ștergerea ușilor și a tocurilor pentru a îndepărta amprentele și murdăria',
            'Spălarea aragazului și a suprafețelor de gătit pentru a elimina urmele de grăsime',
          ],
        },
        'post-renovation-cleaning': {
          sourceId: '3',
          shortSlug: 'after-repair',
          route: routes['post-renovation-cleaning'].ro,
          name: 'Curățenie după reparație',
          description:
            'Curățenia după renovare elimină praful și mizeria, lăsându-ți casa impecabilă și gata de utilizare imediată.',
          body:
            'Fie că te muți într-o casă nouă sau ai renovat apartamentul, lucrările de construcție lasă în urmă murdărie greu de îndepărtat. Suprafețele devin acoperite cu vopsea, adezivi, fragmente de materiale și mult praf. Nu irosi timp și resurse căutând soluții. Echipa noastră este pregătită să rezolve aceste probleme folosind produse și echipamente speciale care protejează finisajele și zugrăvelile.',
          includes: [
            'Curățarea resturilor de vopsea de pe tocuri, ferestre, uși, calorifere etc.',
            'Curățarea panourilor electrice, gurilor de ventilare și instalațiilor sanitare',
            'Spălarea caloriferelor cu generator de abur',
            'Ștergerea teracotei din baie, toaletă și bucătărie',
            'Aspirarea și ștergerea mobilierului, dacă este cazul',
            'Curățarea pervazurilor',
            'Îndepărtarea etichetelor de pe geamuri și rame',
            'Ștergerea pereților',
            'Curățarea plintelor',
            'Curățarea balustradelor',
            'Curățarea podelelor și pardoselilor',
            'Curățarea prizelor',
            'Curățarea și dezinfectarea suprafețelor din inox, lemn, sticlă etc.',
          ],
        },
        'upholstery-cleaning': {
          sourceId: '4',
          shortSlug: 'furniture-cleaning',
          route: routes['upholstery-cleaning'].ro,
          name: 'Curățarea chimică a mobilierului tapițat',
          description:
            'Redă strălucirea mobilierului cu curățarea noastră chimică. Eliminăm petele și murdăria pentru un aspect nou.',
          body:
            'Chiar și cele mai bune tapițerii se murdăresc, acumulând praf și pete în timp. Cu ajutorul nostru, piesele tale de mobilier și covoarele pot redeveni ca noi. Materialele de tapițerie variază, iar noi oferim soluții de curățare personalizate și sigure pentru fiecare tip de material.',
          includes: [
            'Aspirarea profesională a canapelelor, fotoliilor și scaunelor',
            'Îndepărtarea petelor cu soluții speciale',
            'Curățarea prin injecție-extracție',
          ],
        },
      },
    },
    about: {
      title: 'Despre noi',
      reasons: [
        {
          id: 'time',
          title: 'Economie de timp',
          description:
            'Salvează timp prețios lăsându-ne pe noi să ne ocupăm de curățenie. În fiecare săptămână, îți oferim mai mult timp pentru activitățile care contează cu adevărat.',
        },
        {
          id: 'one-stop',
          title: 'O singură adresă pentru toate soluțiile',
          description:
            'Noi suntem partenerul tău de încredere pentru întreținerea casei sau biroului. Oferim o gamă variată de servicii, astfel încât să rezolvăm toate necesitățile tale într-un singur loc.',
        },
        {
          id: 'team',
          title: 'Echipă profesionistă',
          description:
            'Specialiștii noștri sunt bine pregătiți și experimentați, asigurând servicii de curățenie la cele mai înalte standarde. Ne prezentăm mereu la timp și lucrăm cu respect și responsabilitate.',
        },
        {
          id: 'tailored',
          title: 'Abordare individuală',
          description:
            'Adaptăm serviciile noastre la nevoile și preferințele tale specifice. Fiecare client beneficiază de o soluție personalizată, care se potrivește perfect bugetului și cerințelor sale.',
        },
        {
          id: 'technology',
          title: 'Tehnologii performante',
          description:
            'Utilizăm echipamente și produse de curățenie de ultimă generație, eficiente și sigure pentru tine și familia ta. Ne asigurăm că suprafețele tratate sunt curățate impecabil fără a fi deteriorate.',
        },
        {
          id: 'quality',
          title: 'Servicii de calitate',
          description:
            'Respectăm cele mai înalte standarde de calitate, oferind de fiecare dată servicii optime. Echipa noastră calificată, tehnologiile avansate și atitudinea profesionistă garantează satisfacția clienților noștri.',
        },
      ],
    },
    seo: {
      home: {
        title: 'Servicii Profesionale de Curățenie în Chișinău | Top Cleaning',
        description:
          'Oferim servicii de curățenie profesionale în Chișinău, adaptate nevoilor tale. Economisește timp și bucură-te de un mediu curat și sănătos.',
      },
      services: {
        title: 'Servicii de Curățenie în Chișinău | Top Cleaning',
        description:
          'Oferim o gamă variată de servicii de curățenie, astfel încât să rezolvăm toate necesitățile tale într-un singur loc.',
      },
      about: {
        title: 'Despre Noi | Top Cleaning Chișinău',
        description:
          'Noi suntem specializați în oferirea de servicii profesionale de curățenie, având o echipă dedicată de experți care își fac treaba cu pasiune și depășesc așteptările clienților.',
      },
      contact: {
        title: 'Contacte | Top Cleaning Chișinău',
        description: 'Contactează Top Cleaning prin telefon, WhatsApp, Viber sau email.',
      },
    },
  },
  ru: {
    navigation: {
      home: 'Главная',
      services: 'Услуги',
      about: 'О нас',
      contact: 'Контакты',
    },
    footer: {
      contact: 'Контакты',
      services: 'Наши услуги',
      copyrightTemplate: '© {year} Top Cleaning™. Все права защищены.',
    },
    home: {
      hero: {
        title: 'Профессиональные Услуги Уборки',
        description:
          'Наш опыт и внимание к деталям обеспечивают чистую и здоровую среду для вас и вашей семьи.',
      },
      whyUs: {
        eyebrow: 'Почему мы',
        question: 'Почему стоит выбрать наши услуги уборки?',
        answer:
          'Мы специализируемся на предоставлении профессиональных услуг уборки, с командой преданных своему делу экспертов, которые выполняют свою работу с энтузиазмом и превосходят ожидания клиентов. Мы завоевали доверие клиентов благодаря качественным услугам уборки и нашему вниманию к деталям.',
        reasons: [
          'Мы нанимаем только квалифицированный и преданный персонал, проходящий строгий процесс отбора, чтобы предоставить для вас лучшие услуги для уборки.',
          'Мы экономим ваше драгоценное время, принимая на себя задачу уборки и предоставляя вам больше свободного времени для важных дел.',
          'Мы предлагаем качественную уборку, персонализированные услуги и внимание к деталям, как для дома, так и для офисов.',
        ],
      },
      workflow: {
        title: 'Как работают наши услуги?',
        description: 'Несколько простых шагов для уборки вашего дома.',
        steps: [
          {
            id: 'request',
            title: 'Заявка',
            description:
              'Свяжитесь с нами, чтобы сообщить о ваших потребностях в уборке. Наша команда быстро ответит для уточнения начальных деталей.',
          },
          {
            id: 'quote',
            title: 'Расчет',
            description:
              'Мы оценим ваши конкретные требования и предложим точный расчет стоимости, обеспечивая прозрачность и справедливость.',
          },
          {
            id: 'cleaning',
            title: 'Уборка',
            description:
              'Наша команда профессионалов выполнит уборочные услуги в соответствии с установленным графиком, используя качественное оборудование и средства.',
          },
          {
            id: 'payment',
            title: 'Оплата',
            description:
              'После завершения уборки вы можете произвести оплату удобным для вас способом. Ваше удовлетворение — наш приоритет.',
          },
        ],
      },
    },
    services: {
      title: 'Наши услуги',
      subtitle: 'Мы предлагаем лучшие услуги по уборке для вашей помощи',
      pageSubtitle: 'Мы предлагаем следующие услуги по уборке:',
      description:
        'Мы предлагаем широкий спектр услуг по уборке, чтобы удовлетворить все ваши потребности в одном месте.',
      includesTitle: 'Услуга включает в себя:',
      seeDetails: 'Подробнее',
      items: {
        'general-cleaning': {
          sourceId: '1',
          shortSlug: 'general',
          route: routes['general-cleaning'].ru,
          name: 'Генеральная уборка',
          description:
            'Полная генеральная уборка для освежения вашего жилья. Продвинутые техники и оборудование для глубокой чистки.',
          body:
            'Когда чувствуешь потребность в обновлении и хочешь зарядиться новой энергией, начни с генеральной уборки в местах, где проводишь больше всего времени: дома и на работе. В отличие от поддерживающей уборки, генеральная уборка проводится по мере необходимости — сезонно, по особым случаям или когда считаешь нужным. Она сосредоточена на деталях и освежает атмосферу в каждой комнате.',
          includes: [
            'Мойка внешней поверхности холодильника, духовки и микроволновой печи',
            'Очистка кухонных поверхностей',
            'Удаление пыли с декораций (картины, вазы и т.д.), бытовой техники, ламп, дверей и т.д.',
            'Мытье полов',
            'Очистка зеркал и других стеклянных поверхностей (кроме окон)',
            'Удаление известкового налета и отложений в ванной и туалете',
            'Полная мойка плитки и керамической плитки в ванной и туалете',
            'Очистка мебели (полки, шкафы, тумбочки и т.д.)',
            'Очистка и дезинфекция сантехники (краны, раковины, биде и т.д.)',
            'Пылесоска полов, ковров, мягкой мебели, диванов и кресел',
            'Удаление пыли и жира с кухонной вытяжки',
            'Мытье плиты и удаление следов жира',
            'Мытье мусорных ведер и зон для хранения отходов',
          ],
        },
        'maintenance-cleaning': {
          sourceId: '2',
          shortSlug: 'daily',
          route: routes['maintenance-cleaning'].ru,
          name: 'Поддерживающая уборка',
          description:
            'Еженедельная чистка вашего жилья с нашими услугами уборки. Наслаждайтесь блестящим и уютным домом.',
          body:
            'Поддерживающая уборка важна для поддержания чистоты и здоровья в вашем доме. Она проводится регулярно и помогает предотвратить накопление грязи и пыли, обеспечивая всегда уютное и гигиеничное пространство.',
          includes: [
            'Чистка полов и ковров для удаления пыли и грязи',
            'Мытье полов для удаления следов повседневного использования',
            'Протирание пыли с мебели, полок, шкафов и других поверхностей',
            'Чистка зеркал и стеклянных поверхностей для поддержания их блеска',
            'Протирание пыли с бытовой техники для предотвращения ее накопления',
            'Замена мусорных пакетов и вынос мусора',
            'Мытье и дезинфекция раковин, кранов и сантехнических приборов',
            'Протирание дверей и дверных косяков для удаления отпечатков и грязи',
            'Мытье плиты и кухонных поверхностей для удаления следов жира',
          ],
        },
        'post-renovation-cleaning': {
          sourceId: '3',
          shortSlug: 'after-repair',
          route: routes['post-renovation-cleaning'].ru,
          name: 'Уборка после ремонта',
          description:
            'Уборка после ремонта удаляет пыль и грязь, оставляя ваш дом безупречным и готовым к немедленному использованию.',
          body:
            'Будь то переезд в новый дом или ремонт квартиры, строительные работы оставляют за собой трудновыводимые загрязнения. Поверхности покрываются краской, клеем, фрагментами материалов и большим количеством пыли. Не тратьте время и ресурсы на поиск решений. Наша команда готова справиться с этими проблемами, используя специальные средства и оборудование, которые защищают отделку и покраску.',
          includes: [
            'Очистка остатков краски с рам, окон, дверей, радиаторов и т.д.',
            'Очистка электрических панелей, вентиляционных отверстий и сантехнических установок',
            'Мытье радиаторов с парогенератором',
            'Протирка кафеля в ванной, туалете и кухне',
            'Пылесоска и протирка мебели, если необходимо',
            'Очистка подоконников',
            'Удаление наклеек с окон и рам',
            'Протирка стен',
            'Очистка плинтусов',
            'Очистка перил',
            'Очистка полов и покрытий',
            'Очистка розеток',
            'Очистка и дезинфекция поверхностей из нержавеющей стали, дерева, стекла и т.д.',
          ],
        },
        'upholstery-cleaning': {
          sourceId: '4',
          shortSlug: 'furniture-cleaning',
          route: routes['upholstery-cleaning'].ru,
          name: 'Химчистка мягкой мебели',
          description:
            'Верните блеск вашей мебели с нашей химчисткой. Мы удаляем пятна и грязь, придавая ей новый вид.',
          body:
            'Даже самые качественные обивки со временем загрязняются, накапливая пыль и пятна. С нашей помощью ваша мебель и ковры снова будут выглядеть как новые. Материалы для обивки разнообразны, и мы предлагаем индивидуальные и безопасные решения для очистки каждого типа материала.',
          includes: [
            'Профессиональная пылесоска диванов, кресел и стульев',
            'Удаление пятен с помощью специальных средств',
            'Очистка методом инъекции-экстракции',
          ],
        },
      },
    },
    about: {
      title: 'О нас',
      reasons: [
        {
          id: 'time',
          title: 'Экономия времени',
          description:
            'Сэкономьте драгоценное время, доверив уборку нам. Каждую неделю мы предоставляем вам больше времени для занятий, которые действительно важны.',
        },
        {
          id: 'one-stop',
          title: 'Один адрес для всех решений',
          description:
            'Мы — ваш надежный партнер по уходу за домом или офисом. Предлагаем широкий спектр услуг, чтобы удовлетворить все ваши потребности в одном месте.',
        },
        {
          id: 'team',
          title: 'Профессиональная команда',
          description:
            'Наши специалисты хорошо подготовлены и опытны, обеспечивая услуги уборки на самом высоком уровне. Мы всегда вовремя и работаем с уважением и ответственностью.',
        },
        {
          id: 'tailored',
          title: 'Индивидуальный подход',
          description:
            'Мы адаптируем наши услуги к вашим конкретным потребностям и предпочтениям. Каждый клиент получает персонализированное решение, идеально подходящее по бюджету и требованиям.',
        },
        {
          id: 'technology',
          title: 'Современные технологии',
          description:
            'Мы используем новейшее оборудование и чистящие средства, которые эффективны и безопасны для вас и вашей семьи. Мы гарантируем, что обрабатываемые поверхности будут очищены идеально без повреждений.',
        },
        {
          id: 'quality',
          title: 'Качественные услуги',
          description:
            'Мы придерживаемся самых высоких стандартов качества, каждый раз предоставляя оптимальные услуги. Наша квалифицированная команда, передовые технологии и профессиональный подход гарантируют удовлетворение наших клиентов.',
        },
      ],
    },
    seo: {
      home: {
        title: 'Профессиональные Услуги Уборки в Кишиневе | Top Cleaning',
        description:
          'Мы предлагаем профессиональные услуги уборки в Кишиневе, адаптированные к вашим потребностям. Сэкономьте время и наслаждайтесь чистой и здоровой средой.',
      },
      services: {
        title: 'Услуги по Уборке в Кишиневе | Top Cleaning',
        description:
          'Мы предлагаем широкий спектр услуг по уборке, чтобы удовлетворить все ваши потребности в одном месте.',
      },
      about: {
        title: 'О Нас | Top Cleaning Кишинев',
        description:
          'Мы специализируемся на предоставлении профессиональных услуг уборки, с командой преданных своему делу экспертов, которые выполняют свою работу с энтузиазмом и превосходят ожидания клиентов.',
      },
      contact: {
        title: 'Контакты | Top Cleaning Кишинев',
        description: 'Свяжитесь с Top Cleaning по телефону, WhatsApp, Viber или электронной почте.',
      },
    },
  },
} as const

export const getLocaleContent = (locale: Locale) => content[locale]

export const getService = (locale: Locale, serviceId: ServiceId) =>
  content[locale].services.items[serviceId]

export const getLocalizedRoute = (routeId: RouteId, locale: Locale) => routes[routeId][locale]
