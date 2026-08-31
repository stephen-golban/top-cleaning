import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import {
  business,
  content,
  navigationRouteIds,
  routes,
  serviceIds,
  type Locale,
  type ServiceId,
} from '@/lib/content';
import type { PublicPage } from '@/lib/pages';

const serviceImages: Record<ServiceId, string> = {
  'general-cleaning': '/media/service-general.webp',
  'maintenance-cleaning': '/media/service-maintenance.webp',
  'post-renovation-cleaning': '/media/service-renovation.webp',
  'upholstery-cleaning': '/media/service-upholstery.webp',
};

const ui = {
  ro: {
    banner: 'Curățenie profesională pentru locuințe și birouri în Chișinău',
    quote: 'Solicită o estimare',
    call: 'Sună acum',
    message: 'Scrie pe WhatsApp',
    viewServices: 'Vezi serviciile',
    why: 'De ce Top Cleaning',
    process: 'De la cerere la un spațiu curat',
    allServices: 'Toate serviciile',
    includes: 'Ce include serviciul',
    related: 'Alte servicii',
    approach: 'Cum lucrăm',
    contactTitle: 'Spune-ne de ce curățenie ai nevoie.',
    contactBody: 'Sună-ne sau scrie-ne. Stabilim împreună detaliile serviciului potrivit.',
    phone: 'Telefon',
    email: 'Email',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    homeAlt: 'Specialist Top Cleaning curățând atent un apartament din Chișinău',
    menu: 'Meniu',
  },
  ru: {
    banner: 'Профессиональная уборка домов и офисов в Кишинёве',
    quote: 'Запросить расчёт',
    call: 'Позвонить',
    message: 'Написать в WhatsApp',
    viewServices: 'Смотреть услуги',
    why: 'Почему Top Cleaning',
    process: 'От заявки до чистого пространства',
    allServices: 'Все услуги',
    includes: 'Что входит в услугу',
    related: 'Другие услуги',
    approach: 'Как мы работаем',
    contactTitle: 'Расскажите, какая уборка вам нужна.',
    contactBody: 'Позвоните или напишите нам. Вместе уточним детали подходящей услуги.',
    phone: 'Телефон',
    email: 'Email',
    whatsapp: 'WhatsApp',
    viber: 'Viber',
    homeAlt: 'Специалист Top Cleaning аккуратно убирает квартиру в Кишинёве',
    menu: 'Меню',
  },
} as const;

function Brand({ reversed = false }: { reversed?: boolean }) {
  return (
    <span className="brand" aria-label="Top Cleaning">
      <Image src={reversed ? '/logo-reversed.svg' : '/logo.svg'} alt="" width="360" height="64" />
    </span>
  );
}

function LanguageLink({ page }: { page: PublicPage }) {
  const otherLocale: Locale = page.locale === 'ro' ? 'ru' : 'ro';
  return (
    <a className="locale-link" href={routes[page.routeId][otherLocale]} lang={otherLocale}>
      {otherLocale.toUpperCase()}
    </a>
  );
}

function Header({ page }: { page: PublicPage }) {
  const t = ui[page.locale];
  const localized = content[page.locale];
  return (
    <>
      <div className="contact-banner">
        <p>{t.banner}</p>
        <a href={business.phone.href}>{business.phone.display}</a>
      </div>
      <header className="site-header">
        <a href={routes.home[page.locale]} className="brand-link">
          <Brand />
        </a>
        <nav className="desktop-nav" aria-label={t.menu}>
          {navigationRouteIds.map((routeId) => (
            <a key={routeId} href={routes[routeId][page.locale]} aria-current={page.routeId === routeId ? 'page' : undefined}>
              {localized.navigation[routeId]}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageLink page={page} />
          <a className="button button--primary" href={business.whatsapp} target="_blank" rel="noreferrer">
            {t.quote}
          </a>
          <details className="mobile-menu">
            <summary>{t.menu}</summary>
            <nav aria-label={t.menu}>
              {navigationRouteIds.map((routeId) => (
                <a key={routeId} href={routes[routeId][page.locale]}>
                  {localized.navigation[routeId]}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

function ContactActions({ locale, inverse = false }: { locale: Locale; inverse?: boolean }) {
  const t = ui[locale];
  return (
    <div className="button-row">
      <a className={inverse ? 'button button--light' : 'button button--primary'} href={business.whatsapp} target="_blank" rel="noreferrer">
        <MessageCircle aria-hidden="true" size={18} /> {t.message}
      </a>
      <a className={inverse ? 'button button--ghost-light' : 'button button--outline'} href={business.phone.href}>
        <Phone aria-hidden="true" size={18} /> {t.call}
      </a>
    </div>
  );
}

function HomePage({ locale }: { locale: Locale }) {
  const localized = content[locale];
  const t = ui[locale];
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="place-line">Top Cleaning · Chișinău</p>
          <h1>{localized.home.hero.title}</h1>
          <p className="hero-lede">{localized.home.hero.description}</p>
          <ContactActions locale={locale} />
        </div>
        <figure className="hero-media">
          <Image src="/media/hero-cleaning.webp" alt={t.homeAlt} width="1536" height="1024" priority sizes="(min-width: 60rem) 50vw, 100vw" />
          <figcaption>{locale === 'ro' ? 'Atenție la detalii, în fiecare spațiu.' : 'Внимание к деталям в каждом помещении.'}</figcaption>
        </figure>
      </section>

      <section className="section shell" aria-labelledby="services-title">
        <div className="section-heading">
          <h2 id="services-title">{localized.services.title}</h2>
          <p>{localized.services.description}</p>
        </div>
        <div className="service-grid">
          {serviceIds.map((serviceId, index) => {
            const service = localized.services.items[serviceId];
            return (
              <article className={`service-card service-card--${index + 1}`} key={serviceId}>
                <a href={service.route} className="service-image-link" aria-label={`${localized.services.seeDetails}: ${service.name}`}>
                  <Image src={serviceImages[serviceId]} alt={service.name} width="1200" height="900" sizes="(min-width: 60rem) 40vw, 100vw" />
                </a>
                <div className="service-card-copy">
                  <h3><a href={service.route}>{service.name}</a></h3>
                  <p>{service.description}</p>
                  <a className="text-link" href={service.route}>{localized.services.seeDetails} <ArrowUpRight aria-hidden="true" size={17} /></a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section section--ink" aria-labelledby="why-title">
        <div className="shell split-section">
          <div>
            <Sparkles aria-hidden="true" className="section-mark" />
            <h2 id="why-title">{t.why}</h2>
            <p className="large-copy">{localized.home.whyUs.answer}</p>
          </div>
          <ol className="reason-list">
            {localized.home.whyUs.reasons.map((reason, index) => (
              <li key={reason}><span>{String(index + 1).padStart(2, '0')}</span><p>{reason}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section shell" aria-labelledby="process-title">
        <div className="section-heading">
          <h2 id="process-title">{t.process}</h2>
          <p>{localized.home.workflow.description}</p>
        </div>
        <ol className="process-list">
          {localized.home.workflow.steps.map((step, index) => (
            <li key={step.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function ServicesPage({ locale }: { locale: Locale }) {
  const localized = content[locale];
  return (
    <>
      <section className="page-hero shell">
        <p className="place-line">Top Cleaning · Chișinău</p>
        <h1>{localized.services.title}</h1>
        <p>{localized.services.description}</p>
      </section>
      <section className="section shell service-index">
        {serviceIds.map((serviceId, index) => {
          const service = localized.services.items[serviceId];
          return (
            <article className="service-row" key={serviceId}>
              <div className="service-row-copy">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h2><a href={service.route}>{service.name}</a></h2>
                <p>{service.description}</p>
                <a className="text-link" href={service.route}>{localized.services.seeDetails} <ArrowRight aria-hidden="true" size={17} /></a>
              </div>
              <a className="service-row-image" href={service.route} aria-label={service.name}>
                <Image src={serviceImages[serviceId]} alt={service.name} width="1200" height="900" priority={index === 0} sizes="(min-width: 60rem) 45vw, 100vw" />
              </a>
            </article>
          );
        })}
      </section>
    </>
  );
}

function ServicePage({ locale, serviceId }: { locale: Locale; serviceId: ServiceId }) {
  const localized = content[locale];
  const service = localized.services.items[serviceId];
  const t = ui[locale];
  return (
    <>
      <section className="detail-hero shell">
        <div>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <a href={routes.services[locale]}>{localized.services.title}</a><ChevronRight aria-hidden="true" size={15} /><span>{service.name}</span>
          </nav>
          <h1>{service.name}</h1>
          <p>{service.body}</p>
          <ContactActions locale={locale} />
        </div>
        <Image src={serviceImages[serviceId]} alt={service.name} width="1200" height="900" priority sizes="(min-width: 60rem) 48vw, 100vw" />
      </section>
      <section className="section shell inclusions" aria-labelledby="includes-title">
        <div className="section-heading">
          <h2 id="includes-title">{t.includes}</h2>
          <p>{service.description}</p>
        </div>
        <ul>
          {service.includes.map((item) => <li key={item}><Check aria-hidden="true" size={18} /><span>{item}</span></li>)}
        </ul>
      </section>
      <section className="related section--soft">
        <div className="shell">
          <h2>{t.related}</h2>
          <div className="related-links">
            {serviceIds.filter((id) => id !== serviceId).map((id) => (
              <a key={id} href={localized.services.items[id].route}>{localized.services.items[id].name}<ArrowUpRight aria-hidden="true" size={17} /></a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AboutPage({ locale }: { locale: Locale }) {
  const localized = content[locale];
  const t = ui[locale];
  return (
    <>
      <section className="page-hero shell">
        <p className="place-line">{t.approach}</p>
        <h1>{localized.about.title}</h1>
        <p>{localized.home.whyUs.answer}</p>
      </section>
      <section className="section shell about-list">
        {localized.about.reasons.map((reason, index) => (
          <article key={reason.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><h2>{reason.title}</h2><p>{reason.description}</p></div>
          </article>
        ))}
      </section>
    </>
  );
}

function ContactPage({ locale }: { locale: Locale }) {
  const t = ui[locale];
  const contacts = [
    { label: t.phone, value: business.phone.display, href: business.phone.href, icon: Phone },
    { label: t.whatsapp, value: business.phone.display, href: business.whatsapp, icon: MessageCircle },
    { label: t.viber, value: business.phone.display, href: business.viber, icon: MessageCircle },
    { label: t.email, value: business.email.address, href: business.email.href, icon: Mail },
  ];
  return (
    <section className="contact-page shell">
      <div className="contact-intro">
        <ShieldCheck aria-hidden="true" className="section-mark" />
        <h1>{t.contactTitle}</h1>
        <p>{t.contactBody}</p>
      </div>
      <div className="contact-list">
        {contacts.map(({ label, value, href, icon: Icon }) => (
          <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
            <Icon aria-hidden="true" size={22} /><span><small>{label}</small>{value}</span><ArrowUpRight aria-hidden="true" size={19} />
          </a>
        ))}
      </div>
    </section>
  );
}

function Footer({ locale }: { locale: Locale }) {
  const localized = content[locale];
  const t = ui[locale];
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div><Brand reversed /><p>{t.banner}</p></div>
        <div className="footer-links">
          <a href={routes.services[locale]}>{localized.navigation.services}</a>
          <a href={routes.about[locale]}>{localized.navigation.about}</a>
          <a href={routes.contact[locale]}>{localized.navigation.contact}</a>
        </div>
        <div className="footer-contact">
          <a href={business.phone.href}>{business.phone.display}</a>
          <a href={business.email.href}>{business.email.address}</a>
        </div>
      </div>
      <div className="shell footer-meta">
        <p>{localized.footer.copyrightTemplate.replace('{year}', String(new Date().getFullYear()))}</p>
        <p>{business.serviceCity} · RO / RU</p>
      </div>
    </footer>
  );
}

function StructuredData({ page }: { page: PublicPage }) {
  const localized = content[page.locale];
  const graph: unknown[] = [];
  if (page.kind === 'home') {
    graph.push({
      '@type': 'LocalBusiness',
      '@id': `${business.siteUrl}/#business`,
      name: business.name,
      url: business.siteUrl,
      telephone: business.phone.e164,
      email: business.email.address,
      areaServed: { '@type': 'City', name: business.serviceCity },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: business.phone.e164,
        email: business.email.address,
        availableLanguage: ['ro', 'ru'],
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: localized.services.title,
        itemListElement: serviceIds.map((serviceId) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: localized.services.items[serviceId].name },
        })),
      },
    });
  }
  if (page.kind === 'service' && page.serviceId) {
    const service = localized.services.items[page.serviceId];
    graph.push({
      '@type': 'Service',
      name: service.name,
      description: service.description,
      serviceType: service.name,
      url: `${business.siteUrl}${routes[page.routeId][page.locale]}`,
      areaServed: { '@type': 'City', name: business.serviceCity },
      provider: { '@id': `${business.siteUrl}/#business` },
    });
  }
  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: localized.navigation.home, item: `${business.siteUrl}${routes.home[page.locale]}` },
      ...(page.kind === 'service'
        ? [{ '@type': 'ListItem', position: 2, name: localized.services.title, item: `${business.siteUrl}${routes.services[page.locale]}` }]
        : []),
      ...(page.kind !== 'home'
        ? [{ '@type': 'ListItem', position: page.kind === 'service' ? 3 : 2, name: page.kind === 'service' && page.serviceId ? localized.services.items[page.serviceId].name : localized.navigation[page.routeId as 'services' | 'about' | 'contact'], item: `${business.siteUrl}${routes[page.routeId][page.locale]}` }]
        : []),
    ],
  });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }} />;
}

export function PublicSite({ page }: { page: PublicPage }) {
  return (
    <div lang={page.locale}>
      <Header page={page} />
      <main>
        {page.kind === 'home' ? <HomePage locale={page.locale} /> : null}
        {page.kind === 'services' ? <ServicesPage locale={page.locale} /> : null}
        {page.kind === 'service' && page.serviceId ? <ServicePage locale={page.locale} serviceId={page.serviceId} /> : null}
        {page.kind === 'about' ? <AboutPage locale={page.locale} /> : null}
        {page.kind === 'contact' ? <ContactPage locale={page.locale} /> : null}
        {page.kind !== 'contact' ? (
          <section className="closing-cta section--accent">
            <div className="shell"><h2>{ui[page.locale].contactTitle}</h2><ContactActions locale={page.locale} inverse /></div>
          </section>
        ) : null}
      </main>
      <Footer locale={page.locale} />
      <StructuredData page={page} />
    </div>
  );
}
