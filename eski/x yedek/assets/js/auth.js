const MAILMYRA_KEYS = {
  user: "mailmyra.user",
  subscription: "mailmyra.subscription",
  signatures: "mailmyra.signatures",
  pendingSignature: "mailmyra.pendingSignature",
};

const MAILMYRA_PLANS = {
  creator: {
    name: "Creator",
    price: "$0",
    interval: "/year",
    seats: "1 seat",
    signatures: "3 signatures",
  },
  professional: {
    name: "Professional",
    price: "$84",
    interval: "/year",
    seats: "1 seat",
    signatures: "25 signatures",
  },
  business: {
    name: "Business",
    price: "$180",
    interval: "/user/year",
    seats: "5 seats",
    signatures: "150 signatures",
  },
  agency: {
    name: "Agency",
    price: "$540",
    interval: "/year",
    seats: "10 clients",
    signatures: "500 signatures",
  },
};

function readMailmyraJSON(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeMailmyraJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeMailmyraItem(key) {
  localStorage.removeItem(key);
}

function mailmyraUser() {
  return readMailmyraJSON(MAILMYRA_KEYS.user);
}

function mailmyraSubscription() {
  return readMailmyraJSON(MAILMYRA_KEYS.subscription);
}

function mailmyraHasActivePlan() {
  const subscription = mailmyraSubscription();
  return Boolean(subscription?.active && subscription?.billing === "yearly");
}

function safeRedirect(value, fallback = "dashboard.html") {
  if (!value) return fallback;
  const decoded = decodeURIComponent(value);
  if (/^(https?:)?\/\//i.test(decoded)) return fallback;
  if (!/^[\w./?#=&%-]+\.html/i.test(decoded) && !decoded.startsWith("#")) return fallback;
  return decoded;
}

function returnToLogin(target = "dashboard.html") {
  return `login.html?redirect=${encodeURIComponent(target)}`;
}

function returnToCheckout(plan = "professional", target = "dashboard.html") {
  return `checkout.html?plan=${encodeURIComponent(plan)}&redirect=${encodeURIComponent(target)}`;
}

function updateAccountLinks() {
  const user = mailmyraUser();

  document.querySelectorAll(".login-button").forEach((link) => {
    if (link.matches("[data-logout]")) return;
    link.href = user ? "dashboard.html" : "login.html";
    link.textContent = user ? "Dashboard" : "Log in";
  });

  document.querySelectorAll("[data-user-email]").forEach((element) => {
    element.textContent = user?.email || "Not signed in";
  });
}

function guardActionLinks() {
  document.querySelectorAll('a[href="products.html"]').forEach((link) => {
    const text = link.textContent.trim().toLowerCase();
    const shouldGate = /(create|launch|start|build)/.test(text);
    if (!shouldGate) return;

    link.addEventListener("click", (event) => {
      if (mailmyraUser()) return;
      event.preventDefault();
      window.location.href = returnToLogin("products.html");
    });
  });
}

function savePendingSignature(data) {
  writeMailmyraJSON(MAILMYRA_KEYS.pendingSignature, {
    ...data,
    savedAt: new Date().toISOString(),
  });
}

function saveSignatureRecord(data) {
  const signatures = readMailmyraJSON(MAILMYRA_KEYS.signatures, []);
  const record = {
    id: `sig-${Date.now()}`,
    name: data.name || "Untitled signature",
    email: data.email || mailmyraUser()?.email || "hello@mailmyra.com",
    company: data.company || "Mailmyra",
    title: data.title || "Signature",
    html: data.html || "",
    status: "Active",
    source: data.source || "Created in generator",
    updatedAt: new Date().toISOString(),
  };

  writeMailmyraJSON(MAILMYRA_KEYS.signatures, [record, ...signatures].slice(0, 24));
  return record;
}

function promotePendingSignature() {
  if (!mailmyraHasActivePlan()) return null;

  const pendingSignature = readMailmyraJSON(MAILMYRA_KEYS.pendingSignature);
  if (!pendingSignature) return null;

  const record = saveSignatureRecord({
    ...pendingSignature,
    status: "Active",
    source: "Created before checkout",
  });

  removeMailmyraItem(MAILMYRA_KEYS.pendingSignature);
  return record;
}

function requestSignatureExport(data) {
  if (!mailmyraUser()) {
    savePendingSignature(data);
    window.location.href = returnToLogin("products.html?intent=export");
    return false;
  }

  if (!mailmyraHasActivePlan()) {
    savePendingSignature(data);
    window.location.href = returnToCheckout("professional", "products.html?intent=export");
    return false;
  }

  return true;
}

function initLoginPage() {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const redirect = safeRedirect(params.get("redirect"), "dashboard.html");
  const emailInput = form.querySelector('[name="email"]');
  const passwordInput = form.querySelector('[name="password"]');
  const notice = document.querySelector("[data-login-notice]");

  if (mailmyraUser() && notice) {
    notice.textContent = "You are already signed in. Continue to your dashboard or start a new signature.";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = emailInput.value.trim() || "hello@mailmyra.com";
    const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

    writeMailmyraJSON(MAILMYRA_KEYS.user, {
      name,
      email,
      signedInAt: new Date().toISOString(),
    });

    if (passwordInput) passwordInput.value = "";
    window.location.href = redirect;
  });
}

function initCheckoutPage() {
  const form = document.querySelector("[data-checkout-form]");
  if (!form) return;

  const user = mailmyraUser();
  const params = new URLSearchParams(window.location.search);
  const selectedPlan = MAILMYRA_PLANS[params.get("plan")] ? params.get("plan") : "professional";
  const redirect = safeRedirect(params.get("redirect"), "dashboard.html");
  const plan = MAILMYRA_PLANS[selectedPlan];

  if (!user) {
    window.location.href = returnToLogin(`checkout.html?plan=${selectedPlan}&redirect=${encodeURIComponent(redirect)}`);
    return;
  }

  document.querySelectorAll("[data-selected-plan]").forEach((element) => {
    element.textContent = plan.name;
  });
  document.querySelectorAll("[data-selected-price]").forEach((element) => {
    element.textContent = plan.price;
  });
  document.querySelectorAll("[data-selected-interval]").forEach((element) => {
    element.textContent = plan.interval;
  });
  document.querySelectorAll("[data-selected-seats]").forEach((element) => {
    element.textContent = plan.seats;
  });
  document.querySelectorAll("[data-selected-limit]").forEach((element) => {
    element.textContent = plan.signatures;
  });

  const emailField = form.querySelector('[name="billingEmail"]');
  if (emailField && !emailField.value) emailField.value = user.email;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    writeMailmyraJSON(MAILMYRA_KEYS.subscription, {
      active: true,
      plan: selectedPlan,
      planName: plan.name,
      billing: "yearly",
      price: plan.price,
      interval: plan.interval,
      seats: plan.seats,
      signatures: plan.signatures,
      renewedAt: new Date().toISOString(),
      renewsOn: "July 9, 2027",
    });
    window.location.href = redirect === "products.html?intent=export" ? "dashboard.html" : redirect;
  });
}

function signatureSeed(user) {
  return [
    {
      id: "seed-founder",
      name: "Huseyin Celiktas",
      email: user?.email || "hello@mailmyra.com",
      company: "Mailmyra",
      title: "Founder & Creative Director",
      status: "Active",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "seed-team",
      name: "Mailmyra Team",
      email: "team@mailmyra.com",
      company: "Mailmyra",
      title: "Team Signature",
      status: "Draft",
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "seed-support",
      name: "Support Desk",
      email: "support@mailmyra.com",
      company: "Mailmyra",
      title: "Customer Support",
      status: "Ready",
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

function initDashboardPage() {
  const dashboard = document.querySelector("[data-dashboard]");
  if (!dashboard) return;

  const user = mailmyraUser();
  if (!user) {
    window.location.href = returnToLogin("dashboard.html");
    return;
  }

  const subscription = mailmyraSubscription();
  const isActive = mailmyraHasActivePlan();
  const plan = subscription?.planName || "No active plan";
  if (isActive) promotePendingSignature();
  const storedSignatures = readMailmyraJSON(MAILMYRA_KEYS.signatures, []);
  const signatures = isActive ? [...storedSignatures, ...signatureSeed(user)] : [];

  document.querySelectorAll("[data-dashboard-name]").forEach((element) => {
    element.textContent = user.name || "Mailmyra user";
  });
  document.querySelectorAll("[data-dashboard-email]").forEach((element) => {
    element.textContent = user.email;
  });
  document.querySelectorAll("[data-dashboard-plan]").forEach((element) => {
    element.textContent = plan;
  });
  document.querySelectorAll("[data-dashboard-renewal]").forEach((element) => {
    element.textContent = subscription?.renewsOn || "Activate yearly billing";
  });
  document.querySelectorAll("[data-dashboard-status]").forEach((element) => {
    element.textContent = isActive ? "Active yearly plan" : "Payment required";
  });
  document.querySelectorAll("[data-signature-count]").forEach((element) => {
    element.textContent = String(signatures.length);
  });

  dashboard.classList.toggle("is-locked", !isActive);

  const list = document.querySelector("[data-signature-list]");
  if (list) {
    list.innerHTML = "";

    if (!isActive) {
      list.innerHTML = `
        <article class="dashboard-empty">
          <span>Payment required</span>
          <h3>Your email signature list unlocks after a yearly plan is active.</h3>
          <p>Choose a yearly plan to manage saved signatures, team email identities and export-ready HTML.</p>
          <a class="home-primary sand" href="checkout.html?plan=professional&redirect=dashboard.html">Activate yearly plan</a>
        </article>
      `;
      return;
    }

    signatures.forEach((signature) => {
      const item = document.createElement("article");
      item.className = "signature-row";

      const identity = document.createElement("div");
      const name = document.createElement("strong");
      const details = document.createElement("span");
      const email = document.createElement("a");
      const status = document.createElement("span");

      name.textContent = signature.name;
      details.textContent = `${signature.title} / ${signature.company}`;
      email.href = `mailto:${signature.email}`;
      email.textContent = signature.email;
      status.className = "status-pill";
      status.textContent = signature.status;

      identity.append(name, details);
      item.append(identity, email, status);
      list.append(item);
    });
  }
}

function initLogout() {
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.removeItem(MAILMYRA_KEYS.user);
      window.location.href = "index.html";
    });
  });
}

window.MailmyraAuth = {
  user: mailmyraUser,
  subscription: mailmyraSubscription,
  hasActivePlan: mailmyraHasActivePlan,
  requestSignatureExport,
  saveSignatureRecord,
};

updateAccountLinks();
guardActionLinks();
initLoginPage();
initCheckoutPage();
initDashboardPage();
initLogout();
