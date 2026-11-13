/**
 * Mantisnet · main.js
 *
 * Principios aplicados:
 *  S — cada función / módulo tiene una única responsabilidad
 *  O — se extiende agregando módulos, sin tocar los existentes
 *  L — init() acepta cualquier objeto que implemente { init() }
 *  I — cada módulo expone solo lo que necesita
 *  D — init() depende de abstracciones (módulos), no de implementaciones concretas
 */

'use strict';

/* ── Configuración ──────────────────────────────────────────────────────── */

/** Pesos argentinos por dólar. Actualizar acá: todos los precios en ARS se recalculan solos. */
const TIPO_DE_CAMBIO = 1530;

/* ── Módulo: navegación mobile ──────────────────────────────────────────── */
const NavToggle = (() => {

  const OPEN_CLASS = 'nav__menu--open';

  /**
   * Abre o cierra el menú mobile actualizando aria-expanded y la clase CSS.
   * @param {HTMLButtonElement} toggle
   * @param {HTMLElement} menu
   */
  function toggle(toggleEl, menuEl) {
    const isOpen = toggleEl.getAttribute('aria-expanded') === 'true';
    const nextState = !isOpen;

    toggleEl.setAttribute('aria-expanded', String(nextState));
    toggleEl.setAttribute('aria-label', nextState ? 'Cerrar menú' : 'Abrir menú');
    menuEl.classList.toggle(OPEN_CLASS, nextState);
  }

  /**
   * Cierra el menú (usado al hacer click en un link interno o al hacer Escape).
   * @param {HTMLButtonElement} toggle
   * @param {HTMLElement} menu
   */
  function close(toggleEl, menuEl) {
    toggleEl.setAttribute('aria-expanded', 'false');
    toggleEl.setAttribute('aria-label', 'Abrir menú');
    menuEl.classList.remove(OPEN_CLASS);
  }

  function init() {
    const toggleEl = document.getElementById('js-nav-toggle');
    const menuEl   = document.getElementById('js-nav-menu');

    if (!toggleEl || !menuEl) return;

    toggleEl.addEventListener('click', () => toggle(toggleEl, menuEl));

    /* Cierra con Escape */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(toggleEl, menuEl);
    });

    /* Cierra al hacer click en cualquier link interno del menú */
    menuEl.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => close(toggleEl, menuEl));
    });
  }

  return { init };
})();


/* ── Módulo: scroll activo en links de navegación ───────────────────────── */
const ActiveNavLink = (() => {

  const ACTIVE_CLASS = 'nav__link--active';

  /**
   * Marca como activo el link cuya sección está en el viewport.
   * @param {NodeListOf<Element>} links
   * @param {IntersectionObserverEntry[]} entries
   */
  function onIntersect(links, entries) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const id = entry.target.getAttribute('id');
      links.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle(ACTIVE_CLASS, isActive);
      });
    });
  }

  function init() {
    const links    = document.querySelectorAll('.nav__link[href^="#"]');
    const sections = document.querySelectorAll('section[id]');

    if (!links.length || !sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => onIntersect(links, entries),
      { rootMargin: '-40% 0px -55% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
  }

  return { init };
})();


/* ── Módulo: animación de entrada al hacer scroll ───────────────────────── */
const RevealOnScroll = (() => {

  const SELECTOR    = '[data-reveal]';
  const VISIBLE_CLASS = 'is-visible';

  function init() {
    const elements = document.querySelectorAll(SELECTOR);
    if (!elements.length) return;

    /* Respeta prefers-reduced-motion */
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      elements.forEach((el) => el.classList.add(VISIBLE_CLASS));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(VISIBLE_CLASS);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((el) => observer.observe(el));
  }

  return { init };
})();


/* ── Módulo: precios en pesos argentinos ────────────────────────────────── */
const PreciosARS = (() => {

  const SELECTOR = '[data-ars-usd]';

  /**
   * Convierte USD a ARS con TIPO_DE_CAMBIO, redondeado a miles.
   * @param {number} usd
   * @returns {string} ej. "230.000"
   */
  function toARS(usd) {
    const ars = Math.round((usd * TIPO_DE_CAMBIO) / 1000) * 1000;
    return ars.toLocaleString('es-AR');
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach((el) => {
      const usd = Number(el.dataset.arsUsd);
      /* Si el precio todavía no está definido (ej. "[X]"), deja el texto como está */
      if (!Number.isFinite(usd) || usd <= 0) return;
      el.textContent = toARS(usd);
    });
  }

  return { init };
})();


/* ── Módulo: presupuesto interactivo (sección Precios) ──────────────────── */
const Presupuesto = (() => {

  const formatoFecha = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  /**
   * Devuelve la fecha de hoy + N días, en texto (ej. "martes 11 de noviembre").
   * @param {number} dias
   * @returns {string}
   */
  function fechaDentroDe(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return formatoFecha.format(fecha);
  }

  /** Escribe en cada panel la fecha estimada de publicación. */
  function pintarFechas(root) {
    root.querySelectorAll('[data-days]').forEach((el) => {
      const dias = Number(el.dataset.days);
      if (!Number.isFinite(dias) || dias <= 0) return;
      el.textContent = `Con el contenido listo hoy, puede estar online el ${fechaDentroDe(dias)}.`;
    });
  }

  function init() {
    const root = document.querySelector('.quote');
    if (!root) return;

    const radios = root.querySelectorAll('input[name="plan"]');
    const sync = () => {
      const elegido = root.querySelector('input[name="plan"]:checked');
      if (elegido) root.dataset.plan = elegido.value;
    };

    radios.forEach((radio) => radio.addEventListener('change', sync));
    sync();
    pintarFechas(root);
  }

  return { init };
})();

/* ── Módulo: año actual en el pie de página ─────────────────────────────── */
const AnioActual = (() => {

  function init() {
    const el = document.getElementById('js-year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  return { init };
})();


/* ── Bootstrap ──────────────────────────────────────────────────────────── */

/**
 * Inicializa todos los módulos.
 * Agregar un módulo nuevo = agregar una línea acá, sin tocar nada más.
 */
function init() {
  const modules = [
    NavToggle,
    ActiveNavLink,
    RevealOnScroll,
    PreciosARS,
    Presupuesto,
    AnioActual,
  ];

  modules.forEach((mod) => mod.init());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}