const homeMegaItems = document.querySelectorAll(".nav-item.has-mega");
const homeLanguageMenu = document.querySelector(".language-menu");
const homeLanguageButton = document.querySelector(".language-button");
const homeLanguageLabel = homeLanguageButton?.querySelector("span");
const homeFaqItems = document.querySelectorAll(".faq-list details");
const billingButtons = document.querySelectorAll("[data-billing]");
const priceValues = document.querySelectorAll(".price-value");
const blogFilterButtons = document.querySelectorAll(".blog-filter");
const blogCards = document.querySelectorAll("[data-blog-topic]");
const faqSearchInput = document.querySelector(".faq-search-input");
const faqTopicButtons = document.querySelectorAll(".faq-topic-chip");
const faqSearchItems = document.querySelectorAll(".faq-search-results .faq-item");
const faqEmptyState = document.querySelector(".faq-empty-state");
let activeFaqFilter = "all";

function closeHomeMegaMenus(exceptItem = null) {
  homeMegaItems.forEach((item) => {
    if (item === exceptItem) return;
    item.classList.remove("is-open");
    item.querySelector(".nav-link")?.setAttribute("aria-expanded", "false");
  });
}

function closeHomeLanguageMenu() {
  homeLanguageMenu?.classList.remove("is-open");
  homeLanguageButton?.setAttribute("aria-expanded", "false");
}

homeMegaItems.forEach((item) => {
  const trigger = item.querySelector(".nav-link");
  const isDirectLink = trigger?.tagName === "A" && trigger.getAttribute("href") && !trigger.getAttribute("href").startsWith("#");

  trigger?.addEventListener("click", (event) => {
    if (isDirectLink) return;

    event.preventDefault();
    const willOpen = !item.classList.contains("is-open");
    closeHomeMegaMenus(item);
    closeHomeLanguageMenu();
    item.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });
});

homeLanguageButton?.addEventListener("click", () => {
  const willOpen = !homeLanguageMenu.classList.contains("is-open");
  closeHomeMegaMenus();
  homeLanguageMenu.classList.toggle("is-open", willOpen);
  homeLanguageButton.setAttribute("aria-expanded", String(willOpen));
});

document.querySelectorAll(".language-option").forEach((option) => {
  option.addEventListener("click", () => {
    if (homeLanguageLabel) homeLanguageLabel.textContent = option.textContent;
    closeHomeLanguageMenu();
  });
});

homeFaqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    homeFaqItems.forEach((otherItem) => {
      if (otherItem !== item) otherItem.open = false;
    });
  });
});

billingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const billing = button.dataset.billing;

    billingButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    priceValues.forEach((price) => {
      const value = billing === "yearly" ? price.dataset.yearly : price.dataset.monthly;
      if (value) price.textContent = value;
    });
  });
});

blogFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.blogFilter || "all";

    blogFilterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    blogCards.forEach((card) => {
      const topics = (card.dataset.blogTopic || "").split(/\s+/);
      const isVisible = filter === "all" || topics.includes(filter);
      card.classList.toggle("is-hidden", !isVisible);
    });
  });
});

function updateFaqResults() {
  if (!faqSearchItems.length) return;

  const query = (faqSearchInput?.value || "").trim().toLowerCase();
  let visibleCount = 0;

  faqSearchItems.forEach((item) => {
    const categoryMatches = activeFaqFilter === "all" || item.dataset.faqCategory === activeFaqFilter;
    const searchableText = `${item.dataset.faqText || ""} ${item.textContent || ""}`.toLowerCase();
    const queryMatches = !query || searchableText.includes(query);
    const isVisible = categoryMatches && queryMatches;

    item.classList.toggle("is-hidden", !isVisible);
    if (!isVisible) item.open = false;
    if (isVisible) visibleCount += 1;
  });

  faqEmptyState?.classList.toggle("is-visible", visibleCount === 0);
}

faqTopicButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFaqFilter = button.dataset.faqFilter || "all";

    faqTopicButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    updateFaqResults();
  });
});

faqSearchInput?.addEventListener("input", updateFaqResults);
updateFaqResults();

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (!target.closest(".nav-item.has-mega")) closeHomeMegaMenus();
  if (!target.closest(".language-menu")) closeHomeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeHomeMegaMenus();
  closeHomeLanguageMenu();
});

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.classList.add("motion-ready");

  if (reduceMotion) return;

  const stableRevealItems = [
    ".home-kicker",
    ".hero-copy p",
    ".hero-actions",
    ".proof-row",
    ".hero-visual",
    ".integration-strip",
    ".section-heading",
    ".platform-card",
    ".feature-matrix article",
    ".signature-sample",
    ".workflow-steps article",
    ".use-case-grid article",
    ".pricing-grid article",
    ".price-card",
    ".enterprise-band",
    ".value-cards article",
    ".comparison-table-wrap",
    ".testimonial-pricing-grid article",
    ".editorial-feature-card",
    ".blog-card",
    ".faq-list details",
    ".faq-card-grid article",
    ".faq-search-panel",
    ".resource-stack article",
    ".newsletter-card",
    ".support-card",
    ".auth-card",
    ".auth-copy",
    ".checkout-form",
    ".checkout-plan-card",
    ".dashboard-account-card",
    ".dashboard-stat",
    ".dashboard-workspace",
    ".dashboard-planning",
    ".final-cta-card",
    ".footer-cta",
    ".footer-main",
    ".footer-bottom",
  ].join(", ");

  const revealTargets = [...document.querySelectorAll(stableRevealItems)];

  revealTargets.forEach((item, index) => {
    item.classList.add("mm-reveal");
    item.style.setProperty("--mm-order", String(index % 6));
  });

  if ("IntersectionObserver" in window) {
    const stableRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          stableRevealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealTargets.forEach((item) => stableRevealObserver.observe(item));
    window.setTimeout(() => {
      revealTargets.forEach((item) => item.classList.add("is-visible"));
    }, 900);
  } else {
    revealTargets.forEach((item, index) => {
      window.setTimeout(() => item.classList.add("is-visible"), 40 + index * 35);
    });
  }

  return;

  function addPageCurtain() {
    const curtain = document.createElement("div");
    curtain.className = "mm-page-curtain";
    curtain.setAttribute("aria-hidden", "true");
    document.body.append(curtain);
    curtain.addEventListener("animationend", () => curtain.remove(), { once: true });
    window.setTimeout(() => curtain.remove(), 1900);
  }

  function revealOnScroll() {
    const selectors = [
      ".home-kicker",
      ".hero-copy p",
      ".hero-actions",
      ".proof-row",
      ".hero-visual",
      ".integration-strip",
      ".section-heading",
      ".platform-card",
      ".feature-matrix article",
      ".signature-sample",
      ".workflow-steps article",
      ".use-case-grid article",
      ".pricing-grid article",
      ".price-card",
      ".enterprise-band",
      ".value-cards article",
      ".comparison-table-wrap",
      ".testimonial-pricing-grid article",
      ".editorial-feature-card",
      ".blog-card",
      ".faq-list details",
      ".faq-card-grid article",
      ".faq-search-panel",
      ".resource-stack article",
      ".newsletter-card",
      ".support-card",
      ".auth-card",
      ".auth-copy",
      ".checkout-form",
      ".checkout-plan-card",
      ".dashboard-account-card",
      ".dashboard-stat",
      ".dashboard-workspace",
      ".dashboard-planning",
      ".final-cta-card",
      ".footer-cta",
      ".footer-main",
      ".footer-bottom",
    ].join(", ");

    const items = [...document.querySelectorAll(selectors)];
    if (!items.length) return;

    items.forEach((item, index) => {
      item.classList.add("mm-reveal");
      item.style.setProperty("--mm-order", String(index % 9));
    });

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    items.forEach((item) => observer.observe(item));
  }

  function splitTitle(title) {
    if (title.children.length > 0) {
      title.classList.add("mm-reveal");
      return;
    }

    const text = title.textContent.trim().replace(/\s+/g, " ");
    if (!text || title.dataset.mmSplit === "true") return;

    title.dataset.mmSplit = "true";
    title.setAttribute("aria-label", text);
    title.textContent = "";
    title.classList.add("mm-title-split");

    let charIndex = 0;
    text.split(" ").forEach((word, wordIndex) => {
      if (wordIndex > 0) title.append(document.createTextNode(" "));

      const wordWrap = document.createElement("span");
      wordWrap.className = "mm-word";
      [...word].forEach((char) => {
        const charWrap = document.createElement("span");
        charWrap.className = "mm-char";
        charWrap.style.setProperty("--mm-char-index", String(charIndex));
        charWrap.textContent = char;
        wordWrap.append(charWrap);
        charIndex += 1;
      });

      title.append(wordWrap);
    });
  }

  function animateTitles() {
    const titleSelectors = [
      ".hero-copy h1",
      ".section-heading h2",
      ".pricing-hero-copy h1",
      ".editorial-hero h1",
      ".auth-copy h1",
      ".checkout-summary h1",
      ".dashboard-hero h1",
      ".footer-cta h2",
      ".final-cta-card h2",
    ].join(", ");

    const titles = [...document.querySelectorAll(titleSelectors)];
    titles.forEach(splitTitle);

    if (!titles.length) return;
    if (!("IntersectionObserver" in window)) {
      titles.forEach((title) => title.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.2 }
    );

    titles.forEach((title) => observer.observe(title));
  }

  function addMarquee() {
    document.querySelectorAll(".integration-list").forEach((list) => {
      if (list.dataset.mmMarquee === "true") return;
      const children = [...list.children];
      if (children.length < 2) return;

      list.dataset.mmMarquee = "true";
      children.forEach((child) => {
        const clone = child.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        list.append(clone);
      });
      list.classList.add("is-marquee");
    });
  }

  function addCursor() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const cursor = document.createElement("div");
    const dot = document.createElement("div");
    cursor.className = "mm-cursor";
    dot.className = "mm-cursor-dot";
    cursor.setAttribute("aria-hidden", "true");
    dot.setAttribute("aria-hidden", "true");
    document.body.append(cursor, dot);

    let mouseX = -80;
    let mouseY = -80;
    let ringX = mouseX;
    let ringY = mouseY;

    window.addEventListener("mousemove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      cursor.classList.add("is-visible");
      dot.classList.add("is-visible");
      dot.style.transform = `translate3d(${mouseX - 3.5}px, ${mouseY - 3.5}px, 0)`;
    });

    function animateCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursor.style.transform = `translate3d(${ringX - cursor.offsetWidth / 2}px, ${ringY - cursor.offsetHeight / 2}px, 0)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.querySelectorAll("a, button, input, textarea, select, summary, .mm-tilt").forEach((element) => {
      element.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
      element.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
    });
  }

  function addTilt() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const selectors = [
      ".platform-card",
      ".feature-matrix article",
      ".signature-sample",
      ".workflow-steps article",
      ".use-case-grid article",
      ".price-card",
      ".pricing-grid article",
      ".blog-card",
      ".faq-card-grid article",
      ".newsletter-card",
      ".support-card",
      ".final-cta-card",
      ".editorial-feature-card",
      ".checkout-plan-card",
      ".dashboard-account-card",
      ".dashboard-stat",
    ].join(", ");

    document.querySelectorAll(selectors).forEach((card) => {
      card.classList.add("mm-tilt");

      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        const rotateX = (50 - y) * 0.08;
        const rotateY = (x - 50) * 0.08;

        card.style.setProperty("--mm-mx", `${x}%`);
        card.style.setProperty("--mm-my", `${y}%`);
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.removeProperty("--mm-mx");
        card.style.removeProperty("--mm-my");
      });
    });
  }

  function addParallax() {
    const elements = [...document.querySelectorAll(".hero-visual, .pricing-summary-card, .editorial-feature-card, .faq-search-panel, .checkout-plan-card, .dashboard-account-card")];
    if (!elements.length) return;

    let ticking = false;
    const update = () => {
      const viewportHeight = window.innerHeight || 1;
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        element.style.setProperty("--mm-parallax-y", `${Math.max(-20, Math.min(20, distance * -24))}px`);
      });
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  addPageCurtain();
  revealOnScroll();
  animateTitles();
  addMarquee();
  addTilt();
  addCursor();
  addParallax();
})();
