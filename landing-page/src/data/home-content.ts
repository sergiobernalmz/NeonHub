// Contenido único de la home. Lo consumen las 5 variantes y, cuando se elija
// una, también la home real (/).
//
// REGLA: cada dato sale de código o páginas que ya existen. Fuente entre corchetes.
// Sin em-dashes (regla de taste-skill). Sin cifras, testimonios ni claims nuevos.

export type PlanId = "starter" | "installation" | "enterprise";

export interface PlanContent {
  id: PlanId;
  name: string;
  subtitle: string;
  priceInstall: number;
  priceMonthly: number;
  priceLabel?: string;
  features: string[];
  cta: string;
  featured: boolean;
  accent: "indigo" | "violet" | "amber";
}

// [src/components/Pricing.jsx] Los precios NO incluyen IVA [precios.astro:106, terminos.astro:45]
export const PLANS: PlanContent[] = [
  {
    id: "starter",
    name: "Esencial",
    subtitle: "Todo lo necesario para empezar a vender online sin complicaciones.",
    priceInstall: 499,
    priceMonthly: 29,
    accent: "indigo",
    featured: false,
    cta: "Empezar ahora",
    features: [
      "Tienda online completa y funcional",
      "Tu dirección web personalizada",
      "Hosting y servidor incluidos",
      "Certificado SSL de seguridad",
      "Panel de gestión fácil de usar",
      "Soporte por email",
    ],
  },
  {
    id: "installation",
    name: "Profesional",
    subtitle: "Digitalización completa y diseño personalizado por expertos.",
    priceInstall: 999,
    priceMonthly: 49,
    accent: "violet",
    featured: true,
    cta: "Contratar servicio",
    features: [
      "Todo lo del plan Esencial",
      "Diseño personalizado con tu marca",
      "Configuración inicial de productos",
      "Soporte prioritario por chat",
      "Backups diarios automáticos",
      "1 hora de asesoramiento incluida",
      "Actualizaciones durante 1 año",
    ],
  },
  {
    id: "enterprise",
    name: "Premium",
    subtitle: "Tu socio tecnológico para proyectos de alta escala.",
    priceInstall: 1499,
    priceLabel: "Desde",
    priceMonthly: 79,
    accent: "amber",
    featured: false,
    cta: "Solicitar presupuesto",
    features: [
      "Todo lo del plan Profesional",
      "Diseño exclusivo a medida",
      "Integraciones con tus herramientas",
      "3 horas de asesoramiento incluidas",
      "Soporte premium dedicado",
      "Actualizaciones y mejoras prioritarias",
      "Gestor de cuenta personal",
    ],
  },
];

export const PLANS_NOTE =
  "Todos los planes incluyen hosting, servidor, certificado SSL y soporte por email. Los backups diarios automáticos entran desde el plan Profesional. Alta única, no reembolsable. Precios sin IVA.";

export interface FeatureContent {
  id: string;
  title: string;
  description: string;
  icon: "Palette" | "CreditCard" | "LayoutDashboard" | "Globe" | "ShieldCheck" | "LifeBuoy";
  linkTo?: string;
}

// Seis bloques, todos con fuente. Sustituyen a "edge delivery", "infraestructura que
// se adapta automáticamente" y "SEO posicionado desde el día uno", que no son verificables.
export const FEATURES: FeatureContent[] = [
  {
    id: "personalizacion",
    title: "Personalización total",
    description:
      "20 temas predefinidos y editor visual de colores. En los planes Profesional y Premium, diseño con tu marca.", // [servicio.astro:32, Pricing.jsx]
    icon: "Palette",
    linkTo: "/servicio",
  },
  {
    id: "pagos",
    title: "Pagos con Stripe",
    description:
      "Integración nativa con Stripe para cobrar con tarjeta en tu tienda.", // [servicio.astro:30]
    icon: "CreditCard",
  },
  {
    id: "gestion",
    title: "Todo en un solo panel",
    description:
      "Productos, pedidos, clientes, devoluciones y facturación en la misma plataforma.", // [servicio.astro:39, :23]
    icon: "LayoutDashboard",
    linkTo: "/servicio",
  },
  {
    id: "idiomas",
    title: "Varios idiomas y monedas",
    description:
      "Vende en distintos idiomas y monedas desde la misma tienda.", // [servicio.astro:33]
    icon: "Globe",
  },
  {
    id: "hosting",
    title: "Hosting y SSL incluidos",
    description:
      "Hosting, servidor y certificado SSL en todos los planes. Backups diarios automáticos desde Profesional.", // [Pricing.jsx]
    icon: "ShieldCheck",
  },
  {
    id: "soporte",
    title: "Soporte en español",
    description:
      "Soporte por email con respuesta en 24-48 h en todos los planes. Chat prioritario en Profesional y gestor de cuenta en Premium.", // [precios.astro:98]
    icon: "LifeBuoy",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

// FAQ reducida para la home (4 preguntas). No repite la de /precios.
// Las respuestas son copiadas literalmente de /precios [precios.astro].
export const HOME_FAQ: FaqItem[] = [
  {
    q: "¿Hay permanencia o contrato mínimo?",
    a: "No. Puedes cancelar en cualquier momento sin penalizaciones. La cuota mensual se factura mes a mes y puedes darte de baja cuando quieras.",
  },
  {
    q: "¿El precio de instalación es un pago único?",
    a: "Sí. El precio de instalación (499 €, 999 € o 1.499 €) es un pago único que cubre la puesta en marcha de tu tienda. Después solo pagas la cuota mensual.",
  },
  {
    q: "¿Qué incluye el soporte técnico?",
    a: "Todos los planes incluyen soporte por email con respuesta en 24-48h. El plan Profesional incluye soporte por chat con respuesta prioritaria. El plan Premium incluye un gestor de cuenta personal.",
  },
  {
    q: "¿Puedo cambiar de plan más adelante?",
    a: "Sí, puedes hacer upgrade o downgrade de tu plan en cualquier momento desde tu panel de control. Los cambios se aplican en el siguiente ciclo de facturación.",
  },
];

// Pasos del onboarding tal como están en onboarding.astro [onboarding.astro:140-160]
export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Regístrate con tu email",
    description: "Crea una cuenta en NeonHub. Sin tarjeta de crédito.",
  },
  {
    step: 2,
    title: "Elige tu subdominio y tipo de negocio",
    description: "Define el nombre de tu tienda y el sector en el que operas.",
  },
  {
    step: 3,
    title: "Tu tienda está lista",
    description: "Recibe tus datos de acceso y empieza a vender.",
  },
];

// Mockup del panel dibujado en HTML/CSS. Sin cifras: solo etiquetas y barras decorativas fijas.
export const PRODUCT_MOCKUP = {
  url: "demo.neonhub.es",
  sidebar: ["Resumen", "Pedidos", "Productos", "Clientes", "Facturación"],
  cards: ["Ventas", "Pedidos", "Clientes", "Productos"],
  bars: [40, 55, 48, 72, 60, 80, 65, 90, 70, 85, 58, 78],
} as const;

// SEO. Title 58 chars. Description ~152 chars. Sin meta keywords (Google las ignora).
export const HOME_SEO = {
  title: "NeonHub: plataforma para crear tu tienda online en español",
  description:
    "Crea tu tienda online con soporte en español: puesta en marcha, hosting y SSL incluidos. Prueba 7 días gratis sin tarjeta. Desde 499 € + 29 €/mes + IVA.",
  canonical: "https://neonhub.es/",
} as const;

// H1, subtítulo y CTAs del hero
export const HERO = {
  h1: "Crea tu tienda online y empieza a vender",
  subtitle:
    "Catálogo, pedidos, clientes, facturación y pagos con Stripe en un solo panel. Con la puesta en marcha incluida y soporte en español.",
  ctaPrimary: {
    label: "Probar 7 días gratis",
    href: "/register",
  },
  ctaSecondary: {
    label: "Ver demo en vivo",
    href: "https://demo.neonhub.es",
  },
  ctaMicrocopy: "Prueba del plan Profesional. Sin tarjeta. Una prueba por cuenta.",
} as const;

export const CTA_BAND = {
  title: "¿Tienes dudas antes de empezar?",
  subtitle: "Escribenos a soporte@neonhub.es y te respondemos en 24-48 h laborables.",
} as const;

export const SITE = {
  name: "NeonHub",
  company: "NeonLabs",
  url: "https://neonhub.es",
  locale: "es_ES",
  supportEmail: "soporte@neonhub.es",
  supportPhone: "+34 662552645",
  city: "Valencia, España",
  partnerUrl: "https://getneonlabs.com/",
  demoUrl: "https://demo.neonhub.es",
} as const;

// Navegación para el footer y navbar
export const NAV_LINKS = [
  { label: "Servicio", href: "/servicio" },
  { label: "Precios", href: "/precios" },
  { label: "Demo", href: "https://demo.neonhub.es" },
  { label: "Contacto", href: "/contacto" },
] as const;

// JSON-LD para la home. Sin aggregateRating (no hay reseñas reales).
// Sin FAQPage (Google ya no las muestra en la home para ecommerce).
export const HOME_JSONLD = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NeonHub",
    url: "https://neonhub.es",
    logo: "https://neonhub.es/neonhub.png",
    contactPoint: {
      "@type": "ContactPoint",
      email: "soporte@neonhub.es",
      telephone: "+34 662552645",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Valencia",
        addressCountry: "ES",
      },
      contactOption: "SpanishLanguage",
    },
    sameAs: ["https://getneonlabs.com/"],
  },
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NeonHub",
    url: "https://neonhub.es",
  },
  softwareApp: (price: number, planName: string, planId: string) => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `NeonHub - Plan ${planName}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Cloud",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      offerCount: 3,
      lowPrice: 29,
      highPrice: 79,
      offer: [
        {
          "@type": "Offer",
          name: `Alta - Plan ${planName}`,
          price: price.toString(),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: `Cuota mensual - Plan ${planName}`,
          price: (price === 499 ? 29 : price === 999 ? 49 : 79).toString(),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          billingDuration: "P1M",
          billingIncrement: 1,
          unitCode: "MON",
        },
      ],
    },
  }),
};
