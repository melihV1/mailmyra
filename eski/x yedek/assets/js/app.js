const form = document.querySelector("#signatureForm");
const panels = [...document.querySelectorAll(".step-panel")];
const tabs = [...document.querySelectorAll(".step-tab")];
const prevButton = document.querySelector("#prevStep");
const nextButton = document.querySelector("#nextStep");
const signature = document.querySelector("#signaturePreview");
const templateCards = [...document.querySelectorAll(".template-card")];
const customFields = document.querySelector("#customFields");
const customPreview = document.querySelector("#customPreview");
const addCustomFieldButton = document.querySelector("#addCustomField");
const clearFieldsButton = document.querySelector("#clearFields");
const createSignatureButton = document.querySelector("#createSignature");
const toast = document.querySelector("#toast");
const fontSizeLabel = document.querySelector("#fontSizeLabel");

const preview = {
  name: document.querySelector("#previewName"),
  title: document.querySelector("#previewTitle"),
  companyLine: document.querySelector("#previewCompanyLine"),
  phoneRow: document.querySelector("#phoneRow"),
  phone: document.querySelector("#previewPhone"),
  emailRow: document.querySelector("#emailRow"),
  email: document.querySelector("#previewEmail"),
  websiteRow: document.querySelector("#websiteRow"),
  website: document.querySelector("#previewWebsite"),
  addressRow: document.querySelector("#addressRow"),
  address: document.querySelector("#previewAddress"),
  profileWrap: document.querySelector(".portrait-wrap"),
  profileImage: document.querySelector("#previewProfileImage"),
  logoWrap: document.querySelector(".company-logo-wrap"),
  companyLogo: document.querySelector("#previewCompanyLogo"),
  handSignature: document.querySelector("#previewHandSignature"),
  socialRow: document.querySelector("#socialRow"),
  cta: document.querySelector("#previewCta"),
  legal: document.querySelector("#previewLegal"),
  createdWith: document.querySelector("#createdWithMailmyra"),
};

const socialMap = [
  ["linkedin", "in", "LinkedIn"],
  ["facebook", "f", "Facebook"],
  ["twitter", "x", "X / Twitter"],
  ["instagram", "ig", "Instagram"],
  ["whatsapp", "wa", "WhatsApp"],
];

const ctaDefaults = {
  meeting: "Book a meeting",
  portfolio: "View portfolio",
  download: "Download profile",
  custom: "Learn more",
};

const fontMap = {
  Arial: "Arial, Helvetica, sans-serif",
  Helvetica: "Helvetica, Arial, sans-serif",
  Georgia: "Georgia, serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  Inter: "Inter, Arial, sans-serif",
  Poppins: "Poppins, Arial, sans-serif",
};

let currentStep = 0;
let customFieldIndex = 0;
let previewPulseFrame = 0;
let previewPulseTimer = 0;

function fieldValue(name) {
  const field = form.querySelector(`[data-field="${name}"]`);
  if (!field) return "";
  if (field.type === "checkbox") return field.checked;
  return field.value.trim();
}

function setText(element, value, fallback = "") {
  element.textContent = value || fallback;
}

function setRowVisibility(row, isVisible) {
  row.classList.toggle("is-hidden", !isVisible);
}

function normalizeHref(value) {
  if (!value) return "#";
  if (/^(mailto:|tel:|https?:\/\/)/i.test(value)) return value;
  return `https://${value}`;
}

function updateImage(wrapper, image, value, imageClass = "has-image") {
  const src = value.trim();

  if (image.dataset.currentSrc === src) {
    wrapper.classList.toggle(imageClass, Boolean(src) && image.complete && image.naturalWidth !== 0);
    return;
  }

  image.dataset.currentSrc = src;
  wrapper.classList.remove(imageClass);
  image.removeAttribute("src");

  if (!src) return;

  image.onload = () => wrapper.classList.add(imageClass);
  image.onerror = () => {
    wrapper.classList.remove(imageClass);
    image.removeAttribute("src");
  };
  image.src = src;
}

function updateStandaloneImage(image, value) {
  const src = value.trim();

  if (image.dataset.currentSrc === src) {
    image.classList.toggle("has-image", Boolean(src) && image.complete && image.naturalWidth !== 0);
    return;
  }

  image.dataset.currentSrc = src;
  image.classList.remove("has-image");
  image.removeAttribute("src");

  if (!src) return;

  image.onload = () => image.classList.add("has-image");
  image.onerror = () => {
    image.classList.remove("has-image");
    image.removeAttribute("src");
  };
  image.src = src;
}

function updateSocials() {
  preview.socialRow.innerHTML = "";

  socialMap.forEach(([field, label, aria]) => {
    const url = fieldValue(field);
    if (!url) return;

    const anchor = document.createElement("a");
    anchor.href = normalizeHref(url);
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.ariaLabel = aria;
    anchor.textContent = label;
    preview.socialRow.append(anchor);
  });

  preview.socialRow.classList.toggle("is-hidden", preview.socialRow.children.length === 0);
}

function updateCustomPreview() {
  customPreview.innerHTML = "";

  [...customFields.querySelectorAll(".custom-field-row")].forEach((row) => {
    const label = row.querySelector("[data-custom-label]").value.trim();
    const value = row.querySelector("[data-custom-value]").value.trim();
    if (!label && !value) return;

    const item = document.createElement("li");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    const text = document.createElement("span");
    const strong = document.createElement("strong");

    icon.classList.add("icon");
    use.setAttribute("href", "#icon-briefcase");
    icon.append(use);

    if (label) {
      strong.textContent = `${label}: `;
      text.append(strong);
    }

    text.append(document.createTextNode(value || "Custom information"));
    item.append(icon, text);
    customPreview.append(item);
  });

  customPreview.classList.toggle("is-hidden", customPreview.children.length === 0);
}

function updateCta() {
  const type = fieldValue("ctaType");
  const text = fieldValue("ctaText") || ctaDefaults[type] || "";
  const url = fieldValue("ctaUrl");
  const shouldShow = Boolean(type || text || url);

  preview.cta.classList.toggle("is-visible", shouldShow);
  preview.cta.textContent = text;
  preview.cta.href = normalizeHref(url);
}

function updateFontSize() {
  const sizeValue = Number(fieldValue("fontSize") || 1);
  const classes = ["size-small", "size-medium", "size-large"];
  const labels = ["Small", "Medium", "Large"];
  const progress = (sizeValue / 2) * 100;

  signature.classList.remove(...classes);
  signature.classList.add(classes[sizeValue] || "size-medium");
  fontSizeLabel.textContent = labels[sizeValue] || "Medium";

  const range = form.querySelector('[data-field="fontSize"]');
  range.style.background = `linear-gradient(90deg, var(--brand-blue) 0 ${progress}%, rgba(255,255,255,0.3) ${progress}% 100%)`;
}

function pulsePreview() {
  if (!signature) return;

  signature.classList.remove("is-preview-updating");
  window.cancelAnimationFrame(previewPulseFrame);
  window.clearTimeout(previewPulseTimer);

  previewPulseFrame = window.requestAnimationFrame(() => {
    signature.classList.add("is-preview-updating");
    previewPulseTimer = window.setTimeout(() => {
      signature.classList.remove("is-preview-updating");
    }, 420);
  });
}

function updatePreview() {
  const firstName = fieldValue("firstName");
  const lastName = fieldValue("lastName");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const department = fieldValue("department");
  const company = fieldValue("company");
  const companyLine = [department, company].filter(Boolean).join(" / ");
  const phone = [fieldValue("officePhone"), fieldValue("mobilePhone")].filter(Boolean).join(" | ");
  const email = fieldValue("email");
  const website = fieldValue("website");
  const address = fieldValue("address");
  const fontFamily = fieldValue("fontFamily") || "Inter";

  setText(preview.name, fullName, "Your Name");
  setText(preview.title, fieldValue("jobTitle"), "Job Title");
  setText(preview.companyLine, companyLine, "Department / Company");

  setRowVisibility(preview.phoneRow, Boolean(phone));
  setText(preview.phone, phone);

  setRowVisibility(preview.emailRow, Boolean(email));
  preview.email.textContent = email;
  preview.email.href = email ? `mailto:${email}` : "#";

  setRowVisibility(preview.websiteRow, Boolean(website));
  preview.website.textContent = website;
  preview.website.href = normalizeHref(website);

  setRowVisibility(preview.addressRow, Boolean(address));
  setText(preview.address, address);

  updateImage(preview.profileWrap, preview.profileImage, fieldValue("profileImage"));
  updateImage(preview.logoWrap, preview.companyLogo, fieldValue("companyLogo"));
  updateStandaloneImage(preview.handSignature, fieldValue("handSignature"));
  updateSocials();
  updateCustomPreview();
  updateCta();

  preview.legal.textContent = fieldValue("legal");
  preview.createdWith.classList.toggle("is-hidden", !fieldValue("createdWith"));

  document.documentElement.style.setProperty("--signature-font", fontMap[fontFamily] || fontMap.Inter);
  updateFontSize();
  pulsePreview();
}

function showStep(step) {
  const nextStep = Math.max(0, Math.min(step, panels.length - 1));
  const currentPanel = panels[currentStep];

  if (currentPanel && nextStep !== currentStep) {
    currentPanel.classList.add("is-leaving");
    window.setTimeout(() => currentPanel.classList.remove("is-leaving"), 240);
  }

  currentStep = nextStep;

  panels.forEach((panel, index) => {
    panel.classList.toggle("is-active", index === currentStep);
  });

  tabs.forEach((tab, index) => {
    const isActive = index === currentStep;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-current", isActive ? "step" : "false");
  });

  prevButton.disabled = currentStep === 0;
  nextButton.textContent = currentStep === panels.length - 1 ? "Finish" : "Next";

  const panelWrap = document.querySelector(".generator-panel");
  panelWrap.scrollTo({ top: 0, behavior: "smooth" });
  window.MailmyraMotion?.refreshStep(currentStep);
}

function selectTemplate(templateNumber) {
  [...signature.classList].forEach((className) => {
    if (className.startsWith("template-")) signature.classList.remove(className);
  });

  signature.classList.add(`template-${templateNumber}`);

  templateCards.forEach((card) => {
    const selected = card.dataset.template === String(templateNumber);
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-checked", String(selected));
  });
}

function sanitizeHex(value) {
  const clean = value.replace(/[^0-9a-f]/gi, "").slice(0, 6);
  if (clean.length === 3) {
    return clean
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase();
  }
  return clean.toUpperCase();
}

function setSignatureColor(type, value) {
  const clean = sanitizeHex(value);
  const hexInput = document.querySelector(`[data-style-color="${type}"]`);
  const picker = document.querySelector(`[data-style-picker="${type}"]`);

  hexInput.value = clean;

  if (clean.length === 6) {
    const color = `#${clean}`;
    const variable = type === "theme" ? "--signature-theme" : type === "text" ? "--signature-text" : "--signature-link";
    document.documentElement.style.setProperty(variable, color);
    picker.value = color;
  }
}

function addCustomField(label = "", value = "") {
  customFieldIndex += 1;
  const row = document.createElement("div");
  row.className = "custom-field-row";
  row.innerHTML = `
    <label class="field">
      <span>Field Label</span>
      <input data-custom-label type="text" value="${label}" placeholder="Pronunciation" />
    </label>
    <label class="field">
      <span>Field Value</span>
      <input data-custom-value type="text" value="${value}" placeholder="Your custom detail" />
    </label>
    <button class="icon-button" type="button" aria-label="Remove custom field">
      <svg class="icon"><use href="#icon-refresh"></use></svg>
    </button>
  `;

  row.querySelector(".icon-button").addEventListener("click", () => {
    row.remove();
    updatePreview();
  });

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", updatePreview);
  });

  customFields.append(row);
  updatePreview();
}

function clearFields() {
  form.querySelectorAll("input, textarea, select").forEach((field) => {
    if (field.matches("[data-style-color], [data-style-picker]")) return;

    if (field.type === "checkbox") {
      field.checked = false;
    } else if (field.type === "range") {
      field.value = "1";
    } else if (field.tagName === "SELECT") {
      field.selectedIndex = field.dataset.field === "fontFamily" ? 4 : 0;
    } else {
      field.value = "";
    }
  });

  customFields.innerHTML = "";
  updatePreview();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

async function copySignature() {
  const html = signature.outerHTML;
  const signatureData = {
    html,
    name: preview.name.textContent,
    title: preview.title.textContent,
    company: fieldValue("company") || "Mailmyra",
    email: fieldValue("email") || "hello@mailmyra.com",
  };

  if (window.MailmyraAuth && !window.MailmyraAuth.requestSignatureExport(signatureData)) return;

  try {
    await navigator.clipboard.writeText(html);
    window.MailmyraAuth?.saveSignatureRecord(signatureData);
    showToast("Signature saved to dashboard and HTML copied.");
  } catch (error) {
    window.MailmyraAuth?.saveSignatureRecord(signatureData);
    showToast("Signature saved to dashboard. HTML preview is ready.");
  }
}

form.addEventListener("input", (event) => {
  if (event.target.matches("[data-style-color]")) {
    setSignatureColor(event.target.dataset.styleColor, event.target.value);
    return;
  }

  if (event.target.matches("[data-style-picker]")) {
    setSignatureColor(event.target.dataset.stylePicker, event.target.value);
    return;
  }

  updatePreview();
});

form.addEventListener("change", (event) => {
  if (event.target.matches("[data-style-picker]")) {
    setSignatureColor(event.target.dataset.stylePicker, event.target.value);
    return;
  }

  updatePreview();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showStep(Number(tab.dataset.stepTarget)));
});

prevButton.addEventListener("click", () => showStep(currentStep - 1));
nextButton.addEventListener("click", () => {
  if (currentStep === panels.length - 1) {
    copySignature();
    return;
  }

  showStep(currentStep + 1);
});

templateCards.forEach((card) => {
  card.addEventListener("click", () => selectTemplate(card.dataset.template));
});

document.querySelectorAll("[data-style-color]").forEach((input) => {
  input.addEventListener("blur", () => setSignatureColor(input.dataset.styleColor, input.value));
});

addCustomFieldButton.addEventListener("click", () => addCustomField());
clearFieldsButton.addEventListener("click", clearFields);
createSignatureButton.addEventListener("click", copySignature);

showStep(0);
setSignatureColor("theme", "719AD1");
setSignatureColor("text", "111827");
setSignatureColor("link", "DCA16F");
updatePreview();

const headerMegaItems = document.querySelectorAll(".nav-item.has-mega");
const languageMenu = document.querySelector(".language-menu");
const languageButton = document.querySelector(".language-button");
const languageLabel = languageButton?.querySelector("span");

function closeHeaderMenus(exceptItem = null) {
  headerMegaItems.forEach((item) => {
    if (item === exceptItem) return;
    item.classList.remove("is-open");
    item.querySelector(".nav-link")?.setAttribute("aria-expanded", "false");
  });
}

function closeLanguageMenu() {
  languageMenu?.classList.remove("is-open");
  languageButton?.setAttribute("aria-expanded", "false");
}

headerMegaItems.forEach((item) => {
  const trigger = item.querySelector(".nav-link");

  trigger?.addEventListener("click", () => {
    const willOpen = !item.classList.contains("is-open");
    closeHeaderMenus(item);
    closeLanguageMenu();
    item.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });
});

languageButton?.addEventListener("click", () => {
  const willOpen = !languageMenu.classList.contains("is-open");
  closeHeaderMenus();
  languageMenu.classList.toggle("is-open", willOpen);
  languageButton.setAttribute("aria-expanded", String(willOpen));
});

document.querySelectorAll(".language-option").forEach((option) => {
  option.addEventListener("click", () => {
    if (languageLabel) languageLabel.textContent = option.textContent;
    closeLanguageMenu();
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (!target.closest(".nav-item.has-mega")) closeHeaderMenus();
  if (!target.closest(".language-menu")) closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeHeaderMenus();
  closeLanguageMenu();
});

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.classList.add("motion-ready");

  if (reduceMotion) return;

  function showStableStepMotion() {
    const activePanel = panels[currentStep];
    const visibleItems = [
      ...document.querySelectorAll(".control-shell, .preview-stage, .preview-inner, .preview-actions, .step-tab"),
      ...(activePanel ? activePanel.querySelectorAll(".panel-heading, .panel-copy, .field, .toggle-row, .template-card, .color-field, .cta-panel, .section-title, .image-help-link") : []),
    ];

    [...new Set(visibleItems)].forEach((item, index) => {
      item.classList.add("mm-reveal");
      item.style.setProperty("--mm-order", String(index % 6));
      item.classList.remove("is-visible");
      window.setTimeout(() => item.classList.add("is-visible"), 30 + index * 28);
    });
  }

  window.MailmyraMotion = {
    refreshStep: showStableStepMotion,
  };

  showStableStepMotion();
  return;

  function addPageCurtain() {
    const curtain = document.createElement("div");
    curtain.className = "mm-page-curtain";
    curtain.setAttribute("aria-hidden", "true");
    document.body.append(curtain);
    curtain.addEventListener("animationend", () => curtain.remove(), { once: true });
    window.setTimeout(() => curtain.remove(), 1900);
  }

  function revealShell() {
    const shellItems = [...document.querySelectorAll(".control-shell, .preview-stage, .preview-inner, .preview-actions, .step-tab")];
    shellItems.forEach((item, index) => {
      item.classList.add("mm-reveal");
      item.style.setProperty("--mm-order", String(index));
      window.setTimeout(() => item.classList.add("is-visible"), 80 + index * 55);
    });
  }

  function refreshStepMotion() {
    const activePanel = panels[currentStep];
    if (!activePanel) return;

    const activeItems = [
      ...activePanel.querySelectorAll(".panel-heading, .panel-copy, .field, .toggle-row, .template-card, .color-field, .cta-panel, .section-title, .image-help-link"),
    ];

    activeItems.forEach((item, index) => {
      item.classList.add("mm-reveal");
      item.style.setProperty("--mm-order", String(index % 10));
      item.classList.remove("is-visible");
      window.setTimeout(() => item.classList.add("is-visible"), 35 + index * 32);
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

    document.querySelectorAll("a, button, input, textarea, select, .template-card, .step-tab").forEach((element) => {
      element.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
      element.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
    });
  }

  function addTilt() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.querySelectorAll(".template-card, .mail-window, .action-button, .panel-wrap").forEach((card) => {
      card.classList.add("mm-tilt");

      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        const rotateX = (50 - y) * 0.045;
        const rotateY = (x - 50) * 0.045;

        card.style.setProperty("--mm-mx", `${x}%`);
        card.style.setProperty("--mm-my", `${y}%`);
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.removeProperty("--mm-mx");
        card.style.removeProperty("--mm-my");
      });
    });
  }

  function addPreviewGlow() {
    const previewStage = document.querySelector(".preview-stage");
    if (!previewStage) return;

    previewStage.addEventListener("mousemove", (event) => {
      const rect = previewStage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      previewStage.style.setProperty("--mm-preview-x", `${x}%`);
      previewStage.style.setProperty("--mm-preview-y", `${y}%`);
    });
  }

  function addBuilderParallax() {
    const previewStage = document.querySelector(".preview-stage");
    const panel = document.querySelector(".control-shell");
    if (!previewStage && !panel) return;

    let ticking = false;
    const update = () => {
      const scrollY = window.scrollY || 0;
      previewStage?.style.setProperty("--mm-mail-y", `${Math.sin(scrollY / 220) * 6}px`);
      panel?.style.setProperty("--mm-builder-y", `${Math.cos(scrollY / 260) * 4}px`);
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

  window.MailmyraMotion = {
    refreshStep: refreshStepMotion,
  };

  addPageCurtain();
  revealShell();
  refreshStepMotion();
  addPreviewGlow();
  addBuilderParallax();
  addTilt();
  addCursor();
})();
