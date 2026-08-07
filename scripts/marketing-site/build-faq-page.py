#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
faq.html kurucusu.

Kabuk works-with.html'den satir araligi + assert ile dilinir:
  head = 1..622   (head + header + hero + .pp-top-wrap kapanisi)
  tail = 1128..son (</main> + footer + ortak scriptler)

Hero/header/footer/preloader DEGISMEZ; yalniz hero metni, ray etiketleri,
title/description ve main.css surum damgasi degisir.
"""
import html
import json
import os
import re

HAM = os.path.expanduser("~/Desktop/mailmyra ham")
SRC = os.path.join(HAM, "works-with.html")
OUT = os.path.join(HAM, "faq.html")

CSS_VER = "mailmyra-0807-8"

# --------------------------------------------------------------------------
# Icerik
# --------------------------------------------------------------------------
# Her soru: (id, soru, [paragraflar])  — paragraflarda basit <a> serbest.

CATEGORIES = [
    {
        "num": "01",
        "id": "basics",
        "label": "Basics",
        "title": "Basics",
        "blurb": "What Mailmyra is and what it takes to get a first signature out.",
        "items": [
            ("what-does-mailmyra-do", "What does Mailmyra do?", [
                "Mailmyra builds email signatures as table-based HTML with every style written inline &mdash; the format mail clients actually understand. You fill in your details, the preview updates as you type, and the result goes straight into your mail client.",
            ]),
            ("who-is-it-for", "Who is it for?", [
                "It is built for agencies and companies that need one signature across a whole team, but a one-person studio uses exactly the same builder. The difference is how many seats you manage, not what you can design.",
            ]),
            ("do-i-need-html", "Do I need to know HTML?", [
                "No. Pick a template, fill in the fields, adjust the colours and type. Mailmyra writes the email-safe HTML for you &mdash; the tables, the inline styles, the retina image widths.",
            ]),
            ("how-long-does-it-take", "How long does it take to build one?", [
                "A first signature is a few minutes of typing: name, title, contact details, logo. Most of the time goes into deciding what to leave out, not what to add.",
            ]),
            ("try-without-signing-up", "Can I try it without signing up?", [
                "Yes. The builder and the live preview are open to everyone, no account needed. An account is only required when you want to export &mdash; copy the signature or download the <code>.htm</code> file.",
            ]),
        ],
    },
    {
        "num": "02",
        "id": "compatibility",
        "label": "Clients",
        "title": "Compatibility",
        "blurb": "Where signatures render, where they break, and why.",
        "items": [
            ("which-clients", "Which email clients can I build for?", [
                "The templates are written against Outlook Classic on Windows, the new Outlook and Outlook.com, Gmail on web and mobile, Apple Mail and iOS Mail. Outlook Classic is the strictest of them, so it sets the rules every template follows.",
                "There is a fuller breakdown on the <a href=\"works-with.html\">Works with</a> page.",
            ]),
            ("why-outlook-breaks", "Why do email signatures break in Outlook?", [
                "Outlook Classic on Windows renders mail with Microsoft Word&rsquo;s engine, not a browser engine. Flexbox, grid, floats, external stylesheets and modern CSS simply do not exist there, so anything built like a web page falls apart.",
                "Mailmyra builds with tables and inline styles instead, which is what that engine understands.",
            ]),
            ("same-for-everyone", "Will my signature look the same for everyone?", [
                "Close, but never pixel-identical &mdash; no signature is. Mail clients override fonts, resize images and add their own spacing.",
                "What Mailmyra controls is the structure: the layout holds, the hierarchy holds, the colours hold. Small differences in letter spacing or line height are normal and unavoidable.",
            ]),
            ("dark-mode", "What happens in dark mode?", [
                "Some clients invert light backgrounds. A transparent logo drawn in dark ink can disappear against the inverted result.",
                "The templates keep contrast in mind and you can preview the dark variant while you build. If your logo only exists as dark-on-transparent, it is worth preparing a lighter version.",
            ]),
            ("does-it-work-on-phones", "Does it work on phones?", [
                "Yes. The templates stay within 600px and stack sensibly on narrow screens. One of the three is single-column by design, for people whose recipients read mostly on mobile.",
            ]),
            ("images-not-showing", "Why don&rsquo;t my images show up in the recipient&rsquo;s inbox?", [
                "Almost always one of two reasons: the image is not reachable from the public internet, or the recipient&rsquo;s client blocks remote images until they click &ldquo;show images&rdquo;.",
                "Mailmyra handles the first &mdash; every image is served from our own CDN domain with a permanent URL. The second is a setting on the recipient&rsquo;s side that no signature tool can override.",
            ]),
        ],
    },
    {
        "num": "03",
        "id": "design",
        "label": "Design",
        "title": "Templates &amp; design",
        "blurb": "What you can change, and the limits the format puts on it.",
        "items": [
            ("how-many-templates", "How many templates are there?", [
                "Three: a classic horizontal layout, a single-column minimal one, and a bordered card with a full-width call-to-action band. They differ in structure, not just colour &mdash; logo position, dividers, how the contact block stacks.",
                "You can see all three on the <a href=\"templates.html\">template gallery</a>, rendered by the real engine rather than shown as screenshots.",
            ]),
            ("brand-font", "Can I use my brand font?", [
                "Not in the signature itself. Mail clients cannot load web fonts &mdash; whatever you embed gets replaced by a fallback you did not choose.",
                "Mailmyra offers the families already installed on the machines your mail lands on: Arial, Helvetica, Georgia, Times New Roman, Verdana, Tahoma and Trebuchet MS. Your brand font belongs in your logo image, where it renders exactly as drawn.",
            ]),
            ("image-sizes", "What size should my logo and photo be?", [
                "Upload at twice the size you want displayed and Mailmyra handles the rest: logos come out at 360px, avatars at 180px, hand-drawn signatures at 300px, all capped at 600px on the long edge.",
                "PNG, JPG and SVG go in, up to 5MB. SVG is converted to PNG on the way out, because mail clients do not render SVG.",
            ]),
            ("social-icons", "Can I add social icons?", [
                "Yes &mdash; LinkedIn, X, Instagram, Facebook, YouTube, GitHub, Behance and Dribbble, in filled, outline or monochrome style.",
            ]),
            ("banner-or-cta", "Can I add a banner or a call-to-action button?", [
                "You can add a call-to-action with its own label and link, custom fields, and a legal disclaimer line.",
                "Keep it lean, though: every extra element adds weight, and Gmail clips long messages. A signature that grows too large gets cut off mid-way.",
            ]),
        ],
    },
    {
        "num": "04",
        "id": "export",
        "label": "Export",
        "title": "Export &amp; install",
        "blurb": "Getting the signature out of the builder and into a mail client.",
        "items": [
            ("how-do-i-export", "How do I get the signature out of Mailmyra?", [
                "Two ways: copy it to your clipboard as rich HTML and paste it straight into your mail client&rsquo;s signature editor, or download a <code>.htm</code> file. Copying is what you want almost every time.",
            ]),
            ("what-is-the-htm-file", "What is the <code>.htm</code> file for?", [
                "Outlook on Windows keeps signatures as files in a Signatures folder. Dropping the <code>.htm</code> file there is the reliable route when pasting misbehaves, and it is the easiest way to hand a finished signature to someone else.",
            ]),
            ("how-do-i-install", "How do I install it in Outlook, Gmail or Apple Mail?", [
                "Every client hides its signature settings somewhere different, so there is a step-by-step guide for each one: <a href=\"setup-outlook-classic.html\">Outlook Classic</a>, <a href=\"setup-new-outlook.html\">new Outlook</a>, <a href=\"setup-gmail.html\">Gmail</a>, <a href=\"setup-apple-mail.html\">Apple Mail</a> and <a href=\"setup-ios-mail.html\">iOS Mail</a>.",
            ]),
            ("roll-out-to-a-team", "How do I roll one signature out to a whole team?", [
                "You build the signature once, then produce it for each person with their own details and send everyone their file or their copy-paste block.",
                "Mailmyra does not install anything on your mail server and does not sync your directory &mdash; the export is yours to distribute.",
            ]),
        ],
    },
    {
        "num": "05",
        "id": "plans",
        "label": "Plans",
        "title": "Teams, plans &amp; billing",
        "blurb": "How seats work and what you are paying for.",
        # 2026-08-07: bu kategori ESKI fiyat modeline gore yazilmisti (aylik,
        # min 5 koltuk, kademeli fiyat, ayri ajans plani). Model
        # `$1 / aktif gonderici / yil`a gecince hepsi yanlis oldu; yeniden
        # yazildi. Rakamlar /pricing ile ayni kalmali.
        "items": [
            ("what-is-a-seat", "What is a seat?", [
                "A seat is not a login and it is not a saved signature. It is an active sender "
                "identity you manage &mdash; and it only starts counting the first time that "
                "sender is published.",
                "One person with five drafts and one email identity is one seat. Ten employees "
                "whose signatures you manage are ten seats. An admin who manages but has no "
                "signature of their own is zero.",
            ]),
            ("what-does-it-cost", "What does it cost?", [
                "One dollar per active sender, per year. Billed annually, minimum one sender, "
                "and every feature is included &mdash; there are no tiers to climb and no "
                "platform fee on top.",
                "The full breakdown, with a seat calculator, is on the "
                "<a href=\"pricing.html\">pricing page</a>.",
            ]),
            ("is-there-a-free-plan", "Is there a free plan?", [
                "No. The builder and the live preview are free to use for as long as you like "
                "&mdash; you can design a complete signature and see exactly what you would get.",
                "Exporting it is the part that needs an account. There is also a seven-day "
                "trial of the full product that does not ask for a card.",
            ]),
            ("agency-plan", "Do you have something for agencies?", [
                "Yes, though it is not a separate plan. Agency is a way of arranging the "
                "workspace: each client sits in its own isolated organisation under one parent "
                "account, white-label ready.",
                "The price is the same one dollar per active sender, counted across every "
                "client you manage. See <a href=\"pricing.html#agency\">the agency workspace</a>.",
            ]),
            ("how-does-billing-work", "How does billing work right now?", [
                "Manually, on purpose. Early customers are invoiced directly rather than through an automatic subscription system &mdash; <a href=\"contact.html\">get in touch</a> and we will sort out the details with you.",
            ]),
        ],
    },
    {
        "num": "06",
        "id": "privacy",
        "label": "Privacy",
        "title": "Data &amp; privacy",
        "blurb": "What we store, where it lives, and what we deliberately do not do.",
        "items": [
            ("where-does-my-data-live", "Where does my data live?", [
                "On our own servers, in our own PostgreSQL database. Signature content is what you type in: names, titles, contact details, and the images you upload.",
            ]),
            ("where-are-images-hosted", "Where are my images hosted?", [
                "On <code>cdn.mailmyra.com</code> &mdash; our own domain &mdash; under a filename that never changes.",
                "This matters more than it sounds. A signature you send today may sit in someone&rsquo;s inbox for years. If the image URL ever moved, every logo already out in the world would break at once, and there would be no way to fix them. Owning the domain means we can change what sits behind it without touching a single message that has already been sent.",
            ]),
            ("do-you-track", "Do you track who opens or clicks my signature?", [
                "No. There are no tracking pixels, no click counters and no analytics injected into what you export. What leaves Mailmyra is plain signature HTML.",
            ]),
            ("delete-my-account", "What happens if I delete my account?", [
                "Your account and the data in it are removed.",
                "Images already published to the CDN are a separate question: signatures you have already sent point at those URLs and would break if the files vanished. Talk to us before closing an account and we will agree what to keep and what to delete.",
            ]),
        ],
    },
]

STILL_LINKS = [
    ("setup-outlook-classic.html", "fa-brands fa-microsoft", "Outlook Classic"),
    ("setup-new-outlook.html", "fa-brands fa-microsoft", "New Outlook"),
    ("setup-gmail.html", "fa-brands fa-google", "Gmail"),
    ("setup-apple-mail.html", "fa-brands fa-apple", "Apple Mail"),
    ("setup-ios-mail.html", "fa-brands fa-apple", "iOS Mail"),
]

SEARCH_SVG = (
    '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">'
    '<circle cx="8.75" cy="8.75" r="5.75" stroke="currentColor" stroke-width="1.6"/>'
    '<path d="M13.2 13.2L17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    '</svg>'
)


def strip_tags(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text)).strip()


def build_content():
    total = sum(len(c["items"]) for c in CATEGORIES)
    L = []
    a = L.append

    a('                <!-- faq area start -->')
    a('                <div class="mm-qa p-relative z-index-2" id="faq-start" data-bg-color="#f4efe8">')
    a('                    <span class="mm-qa__bg" aria-hidden="true"></span>')
    a('                    <div class="container container-1430">')
    a('                        <div class="row justify-content-center">')
    a('                            <div class="col-xl-11">')

    # intro
    a('                                <div class="row align-items-end mm-qa__intro mb-70">')
    # DIKKAT: kicker ve lead'de `tp_fade_anim` YOK. Tema GSAP'in "from"
    # halini inline yaziyor (opacity:0 + translateY(40px)) ama tetikleyici
    # burada ATESLEMIYOR → iki oge de gorunmez kaliyordu (olculdu 2026-08-07).
    # Bu sinifi bu bolumde kullanma.
    a('                                    <div class="col-xl-7 col-lg-7">')
    a('                                        <span class="mm-section-kicker">Frequently asked</span>')
    a('                                        <h2 class="mm-qa__heading tp-split-text tp-split-right">Everything worth<br><em>asking first.</em></h2>')
    a('                                    </div>')
    a('                                    <div class="col-xl-5 col-lg-5">')
    a('                                        <p class="mm-qa__lead">')
    a('                                            %d answers, grouped the way people actually ask them &mdash;' % total)
    a('                                            starting with what Mailmyra does and ending with what happens')
    a('                                            to your data. Search, or take the rail.')
    a('                                        </p>')
    a('                                    </div>')
    a('                                </div>')

    # body
    a('                                <div class="row mm-qa__body gx-xl-5">')

    # ---- rail ----
    a('                                    <div class="col-lg-4">')
    a('                                        <div class="mm-qa__railwrap">')
    a('                                            <div class="mm-qa__rail" id="mm-qa-rail">')
    a('                                                <div class="mm-qa__search">')
    a('                                                    <span class="mm-qa__search-icon" aria-hidden="true">%s</span>' % SEARCH_SVG)
    a('                                                    <input type="search" id="mm-qa-q" class="mm-qa__input" placeholder="Search the answers" aria-label="Search the answers" autocomplete="off" spellcheck="false">')
    a('                                                    <button type="button" class="mm-qa__clear" id="mm-qa-clear" aria-label="Clear search" hidden><i class="fa-light fa-xmark" aria-hidden="true"></i></button>')
    a('                                                </div>')
    a('                                                <p class="mm-qa__hits" id="mm-qa-hits" role="status" aria-live="polite" hidden></p>')
    a('                                                <nav class="mm-qa__nav" aria-label="Question categories">')
    a('                                                    <ol>')
    for c in CATEGORIES:
        # DIKKAT: `data-mm-scrollto` YOK. Kabuktaki ortak surucu 92px pay
        # birakiyor, o da baslgi header kapsulune SIFIR bosluklu yapistiriyor
        # (olculdu). Ray baglantilarini FAQ surucusu daha genis payla suruyor.
        a('                                                        <li class="mm-qa__navitem%s" data-mm-qa-nav="%s">'
          % (' is-active' if c is CATEGORIES[0] else '', c["id"]))
        a('                                                            <a href="#faq-%s" data-mm-qa-jump>' % c["id"])
        a('                                                                <b>%s</b>' % c["num"])
        a('                                                                <span>%s</span>' % c["label"])
        a('                                                                <em class="mm-qa__count">%d</em>' % len(c["items"]))
        a('                                                            </a>')
        a('                                                        </li>')
    a('                                                    </ol>')
    a('                                                </nav>')
    a('                                            </div>')
    a('                                        </div>')
    a('                                    </div>')

    # ---- list ----
    a('                                    <div class="col-lg-8">')
    a('                                        <div class="mm-qa__list" id="mm-qa-list">')
    for c in CATEGORIES:
        a('                                            <section class="mm-qa__group" id="faq-%s" data-mm-qa-group="%s" aria-labelledby="faq-%s-t">' % (c["id"], c["id"], c["id"]))
        a('                                                <header class="mm-qa__grouphead">')
        a('                                                    <b class="mm-qa__groupnum" aria-hidden="true">%s</b>' % c["num"])
        a('                                                    <h3 class="mm-qa__grouptitle" id="faq-%s-t">%s</h3>' % (c["id"], c["title"]))
        a('                                                    <p class="mm-qa__groupblurb">%s</p>' % c["blurb"])
        a('                                                </header>')
        for qid, q, paras in c["items"]:
            a('                                                <details class="mm-qa__item" id="%s">' % qid)
            a('                                                    <summary class="mm-qa__summary">')
            a('                                                        <span class="mm-qa__q">%s</span>' % q)
            a('                                                        <span class="mm-qa__mark" aria-hidden="true"></span>')
            a('                                                    </summary>')
            # Acilis/kapanis animasyonu icin ayri sarmalayici: yukseklik
            # ANIMASYONU bunun uzerinde kosar, dolgu ictekinde kalir.
            # Dolguyu da animasyona sokunca kapanista 22px'lik kalinti
            # goruluyordu.
            a('                                                    <div class="mm-qa__wrap">')
            a('                                                        <div class="mm-qa__a">')
            for p in paras:
                a('                                                            <p>%s</p>' % p)
            a('                                                        </div>')
            a('                                                    </div>')
            a('                                                </details>')
        a('                                            </section>')
    a('                                        </div>')

    # empty state
    a('                                        <div class="mm-qa__empty" id="mm-qa-empty" hidden>')
    a('                                            <h4>No answer matches that.</h4>')
    a('                                            <p>Try a shorter word &mdash; or jump straight to the step-by-step')
    a('                                                installation guides, or ask us directly.</p>')
    a('                                            <div class="mm-qa__emptylinks">')
    a('                                                <a class="mm-qa__chip" href="setup-outlook-classic.html">Setup guides</a>')
    a('                                                <a class="mm-qa__chip" href="contact.html">Contact us</a>')
    a('                                            </div>')
    a('                                        </div>')
    a('                                    </div>')
    a('                                </div>')

    # ---- still stuck ----
    # Uzun bir ACIK sayfanin sonunda KOYU slab: index'in .mm-proof recetesi
    # (72px izgara + 135deg #050914→#071120→#100a1d + mavi hale). Kagit karta
    # devam etmek sayfayi sonuna kadar duz birakiyordu.
    a('                                <div class="mm-qa__still">')
    a('                                    <span class="mm-qa__still-halo" aria-hidden="true"></span>')
    a('                                    <span class="mm-qa__still-peach" aria-hidden="true"></span>')
    a('                                    <div class="row align-items-center">')
    a('                                        <div class="col-lg-5">')
    a('                                            <div class="mm-qa__still-copy">')
    a('                                                <span class="mm-section-kicker">Still stuck</span>')
    a('                                                <h3 class="mm-qa__still-title">Ask us the <em>real</em><br>question.</h3>')
    a('                                                <p>If the answer is not here it is worth writing down &mdash; the')
    a('                                                    questions people send us are where this page grows from.</p>')
    a('                                                <a class="mm-btn-solid" href="contact.html">')
    a('                                                    <span class="mm-btn__face">')
    a('                                                        <span class="mm-btn__label"><span>Contact us</span><span aria-hidden="true">Contact us</span></span>')
    a('                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">')
    a('                                                            <path d="M2 7h9M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>')
    a('                                                        </svg>')
    a('                                                    </span>')
    a('                                                </a>')
    a('                                            </div>')
    a('                                        </div>')
    a('                                        <div class="col-lg-7">')
    a('                                            <div class="mm-qa__guidebox">')
    a('                                                <p class="mm-qa__still-lead"><span>Setup guides</span>Installing is the part that differs per client.</p>')
    a('                                                <ul class="mm-qa__guides">')
    for i, (href, icon, label) in enumerate(STILL_LINKS, 1):
        a('                                                    <li>')
        a('                                                        <a href="%s">' % href)
        a('                                                            <b class="mm-qa__guidenum">%02d</b>' % i)
        a('                                                            <span class="mm-qa__guideicon"><i class="%s" aria-hidden="true"></i></span>' % icon)
        a('                                                            <span class="mm-qa__guidelabel">%s</span>' % label)
        a('                                                            <i class="fa-light fa-arrow-up-right mm-qa__guidearrow" aria-hidden="true"></i>')
        a('                                                        </a>')
        a('                                                    </li>')
    a('                                                </ul>')
    a('                                            </div>')
    a('                                        </div>')
    a('                                    </div>')
    a('                                </div>')

    a('                            </div>')
    a('                        </div>')
    a('                    </div>')
    a('                </div>')
    a('                <!-- faq area end -->')
    a('')
    return "\n".join(L) + "\n"


def build_jsonld():
    entities = []
    for c in CATEGORIES:
        for qid, q, paras in c["items"]:
            entities.append({
                "@type": "Question",
                "name": strip_tags(q),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": " ".join(strip_tags(p) for p in paras),
                },
            })
    doc = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": entities,
    }
    body = json.dumps(doc, ensure_ascii=False, indent=2)
    return ('    <!-- mm: FAQPage yapisal verisi. YALNIZ bu sayfada bulunur;\n'
            '             how-it-works\'teki .mm-faq bolumune BILEREK konmadi ki\n'
            '             iki sayfa ayni sorularla cakismasin. -->\n'
            '    <script type="application/ld+json">\n'
            + body + '\n'
            '    </script>\n')


def build_driver():
    return r'''
    <!-- mm: FAQ SURUCUSU — uc is yapar:
             (1) arama kutusu sorulari YERINDE filtreler (hicbir sey
                 varsayilan olarak gizli degil, sadece arama gizler),
             (2) kaydirirken sol raydaki aktif kategoriyi isaretler,
             (3) >=992px'te rayi ScrollTrigger ile sabitler.
             position:sticky KULLANILAMAZ: ScrollSmoother #smooth-content'i
             transform ediyor, sticky icerikle birlikte kayiyor (olculdu). -->
    <script>
    (function () {
        var list  = document.getElementById('mm-qa-list');
        if (!list) return;

        var input = document.getElementById('mm-qa-q');
        var clear = document.getElementById('mm-qa-clear');
        var hits  = document.getElementById('mm-qa-hits');
        var empty = document.getElementById('mm-qa-empty');
        var groups = Array.prototype.slice.call(list.querySelectorAll('[data-mm-qa-group]'));
        var navItems = Array.prototype.slice.call(document.querySelectorAll('[data-mm-qa-nav]'));

        /* --- YUMUSAK REFRESH -----------------------------------------------
           Liste yuksekligi degisince (arama filtresi, acilan soru) pin'in
           bitisi yeniden olculmeli. Ama duz `ScrollTrigger.refresh()` iki
           yan etki uretiyordu:
             (a) pinlenen ray DOM'da yer degistirdigi icin SAYFA ZIPLIYOR,
             (b) rayin ICINDEKI arama kutusunun ODAGI KACIYOR — kullanici
                 bir harf yazip her seferinde tekrar tiklamak zorunda kaliyordu.
           Cozum: geciktir (ard arda olaylar tek refresh'te birlesir), kaydirma
           konumunu ve odagi/imleci refresh'ten SONRA geri koy. Yukseklik
           gercekten degismediyse hic refresh etme. */
        var refreshTimer = null;
        var lastListHeight = -1;

        function softRefresh() {
            if (!window.ScrollTrigger) return;
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(function () {
                refreshTimer = null;

                var h = list.offsetHeight;
                if (Math.abs(h - lastListHeight) < 2) return;   /* degismemis */
                lastListHeight = h;

                var sm = (window.ScrollSmoother && ScrollSmoother.get) ? ScrollSmoother.get() : null;
                var y = sm ? sm.scrollTop() : (window.pageYOffset || 0);

                var focused = document.activeElement;
                var caret = (focused && typeof focused.selectionStart === 'number')
                    ? focused.selectionStart : null;

                ScrollTrigger.refresh();

                if (sm) sm.scrollTop(y);
                else window.scrollTo(0, y);

                if (focused && document.contains(focused) && document.activeElement !== focused) {
                    focused.focus({ preventScroll: true });
                    if (caret !== null) {
                        try { focused.setSelectionRange(caret, caret); } catch (e) {}
                    }
                }
            }, 280);
        }

        /* --- arama dizini: her soru icin duz metin --- */
        var index = groups.map(function (group) {
            var items = Array.prototype.slice.call(group.querySelectorAll('.mm-qa__item'));
            return {
                group: group,
                id: group.getAttribute('data-mm-qa-group'),
                nav: navItems.filter(function (n) {
                    return n.getAttribute('data-mm-qa-nav') === group.getAttribute('data-mm-qa-group');
                })[0] || null,
                items: items.map(function (el) {
                    return { el: el, text: (el.textContent || '').toLowerCase().replace(/\s+/g, ' ') };
                })
            };
        });

        function setCount(entry, n) {
            if (!entry.nav) return;
            var badge = entry.nav.querySelector('.mm-qa__count');
            if (badge) badge.textContent = n;
            entry.nav.classList.toggle('is-muted', n === 0);
        }

        function filter(raw) {
            var q = (raw || '').trim().toLowerCase();
            var total = 0;

            index.forEach(function (entry) {
                var shown = 0;
                entry.items.forEach(function (item) {
                    var hit = !q || item.text.indexOf(q) !== -1;
                    item.el.hidden = !hit;
                    if (hit) shown++;
                });
                entry.group.hidden = shown === 0;
                setCount(entry, q ? shown : entry.items.length);
                total += shown;
            });

            if (clear) clear.hidden = !q;
            if (empty) empty.hidden = !(q && total === 0);
            if (hits) {
                hits.hidden = !q;
                hits.textContent = q
                    ? (total === 0 ? 'No match' : total + (total === 1 ? ' answer' : ' answers'))
                    : '';
            }
            softRefresh();
        }

        if (input) {
            input.addEventListener('input', function () { filter(input.value); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { input.value = ''; filter(''); }
            });
        }
        if (clear) {
            clear.addEventListener('click', function () {
                if (input) { input.value = ''; input.focus(); }
                filter('');
            });
        }

        /* --- acilis/kapanis animasyonu -----------------------------------
           <details> yuksekligi native olarak animate EDILEMEZ: tarayici
           kapanista icerigi ayni karede gizliyor. Cozum, kapanisi geciktirip
           yuksekligi Web Animations API ile surmek. `grid-template-rows`
           numarasi burada ise yaramaz, cunku kapali <details> icerigi zaten
           render edilmiyor.
           prefers-reduced-motion acikken hicbir sey baglanmaz → native. */
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

        function animateItem(item) {
            var summary = item.querySelector('summary');
            var wrap = item.querySelector('.mm-qa__wrap');
            if (!summary || !wrap) return;
            var running = null;

            summary.addEventListener('click', function (event) {
                if (reduce.matches) return;   /* native davranis */
                event.preventDefault();

                if (running) { running.cancel(); running = null; }

                var opening = !item.open;
                if (opening) item.open = true;          /* olcebilmek icin ac */
                var full = wrap.scrollHeight;

                var frames = opening
                    ? [{ height: '0px', opacity: 0 }, { height: full + 'px', opacity: 1 }]
                    : [{ height: full + 'px', opacity: 1 }, { height: '0px', opacity: 0 }];

                running = wrap.animate(frames, {
                    duration: opening ? 340 : 260,
                    easing: opening ? 'cubic-bezier(.22,.61,.36,1)' : 'cubic-bezier(.4,0,.2,1)'
                });

                running.onfinish = function () {
                    if (!opening) item.open = false;
                    wrap.style.height = '';
                    running = null;
                    softRefresh();
                };
                running.oncancel = function () { wrap.style.height = ''; };
            });
        }

        Array.prototype.forEach.call(list.querySelectorAll('.mm-qa__item'), animateItem);

        /* --- adres cubugundaki #soru-id ile gelen ziyaretciye soruyu ac --- */
        function openFromHash() {
            var hash = window.location.hash.replace('#', '');
            if (!hash) return;
            var target = document.getElementById(hash);
            if (target && target.classList.contains('mm-qa__item')) target.open = true;
        }
        openFromHash();
        window.addEventListener('hashchange', openFromHash);

        /* --- acilan/kapanan soru sayfa yuksekligini degistiriyor.
               Animasyonlu yolda onfinish zaten softRefresh cagiriyor; bu
               dinleyici hash ile acilan ve reduced-motion (native) yolu
               yakaliyor. softRefresh geciktirdigi icin cift cagri birlesiyor. */
        list.addEventListener('toggle', softRefresh, true);

        /* --- ray baglantilari: kategoriye atla ----------------------------
           Kabuktaki ortak `data-mm-scrollto` surucusu 92px pay birakiyor;
           o pay tam header kapsulunun boyu, yani baslik kapsulun altina
           SIFIR bosluklu yapisiyor (olculdu: bosluk 0px). Burada daha genis
           pay veriliyor. Mobilde smoother olmadigi icin native smooth. */
        var JUMP_GAP = 132;

        Array.prototype.forEach.call(document.querySelectorAll('[data-mm-qa-jump]'), function (link) {
            link.addEventListener('click', function (event) {
                var hash = link.getAttribute('href') || '';
                if (hash.charAt(0) !== '#') return;
                var target = document.querySelector(hash);
                if (!target) return;
                event.preventDefault();
                var sm = (window.ScrollSmoother && ScrollSmoother.get) ? ScrollSmoother.get() : null;
                if (sm) {
                    sm.scrollTo(target, true, 'top ' + JUMP_GAP + 'px');
                } else {
                    window.scrollTo({
                        top: target.getBoundingClientRect().top + window.pageYOffset - JUMP_GAP,
                        behavior: 'smooth'
                    });
                }
            });
        });

        /* --- kaydirirken aktif kategori --- */
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    var id = entry.target.getAttribute('data-mm-qa-group');
                    navItems.forEach(function (n) {
                        n.classList.toggle('is-active', n.getAttribute('data-mm-qa-nav') === id);
                    });
                });
            }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
            groups.forEach(function (g) { io.observe(g); });
        }

        /* --- ray sabitleme: sticky yerine ScrollTrigger pin --- */
        function pinRail() {
            if (!window.gsap || !window.ScrollTrigger) return;
            var rail = document.getElementById('mm-qa-rail');
            if (!rail) return;
            ScrollTrigger.matchMedia({
                '(min-width: 992px)': function () {
                    ScrollTrigger.create({
                        trigger: '.mm-qa__railwrap',
                        start: 'top 120px',
                        endTrigger: '#mm-qa-list',
                        /* Bitis, listenin ALTI rayin ALTINA gelince olmali.
                           'bottom bottom-=40' yazinca pin erken cozuluyor ve
                           ray son kategoride yukari kaciyordu (olculdu: -32px). */
                        end: function () {
                            return 'bottom top+=' + (rail.offsetHeight + 150);
                        },
                        pin: rail,
                        pinSpacing: false,
                        invalidateOnRefresh: true
                    });
                }
            });
        }

        if (window.ScrollTrigger) {
            pinRail();
        } else {
            var tries = 0;
            var wait = setInterval(function () {
                if (window.ScrollTrigger) { clearInterval(wait); pinRail(); }
                else if (++tries > 40) clearInterval(wait);
            }, 150);
        }
    })();
    </script>
'''


# --------------------------------------------------------------------------
# Kabugu dilimle
# --------------------------------------------------------------------------
def main():
    with open(SRC, encoding="utf-8") as fh:
        lines = fh.readlines()

    assert len(lines) == 1768, "works-with.html satir sayisi degismis: %d" % len(lines)
    assert "pp-top-wrap" in lines[506], "507. satirda .pp-top-wrap bekleniyordu"
    assert lines[621].strip() == "</div>", "622. satir .pp-top-wrap kapanisi olmali"
    assert lines[1127].strip() == "</main>", "1128. satir </main> olmali"

    head = "".join(lines[:622])
    tail = "".join(lines[1127:])

    def sub(text, old, new, count=1, where=""):
        found = text.count(old)
        assert found == count, "%s: %r %d kez bekleniyordu, %d bulundu" % (where, old, count, found)
        return text.replace(old, new)

    # --- head: meta ---
    head = sub(head, "<title>Mailmyra | Works with</title>",
               "<title>Mailmyra | FAQ</title>", 1, "title")
    head = sub(head,
               'content="How Mailmyra builds email signatures that render the same in every mail client."',
               'content="Answers about building email signatures with Mailmyra: how they render in Outlook and Gmail, what you can change, how export works, and what happens to your data."',
               1, "description")
    head = sub(head, "assets/css/main.css?v=mailmyra-0806-35",
               "assets/css/main.css?v=" + CSS_VER, 1, "css version")

    # --- head: hero basligi (masaustu + 5 mobil slayt) ---
    head = sub(head, '<h4 class="pp-about-me-title mm-hiw-title">WORKS WITH</h4>',
               '<h4 class="pp-about-me-title mm-hiw-title">FAQ</h4>', 1, "hero h4")
    head = sub(head, '<h4 class="pp-about-me-title">WORKS WITH</h4>',
               '<h4 class="pp-about-me-title">FAQ</h4>', 5, "hero mobil slaytlar")

    # --- head: kicker + lead + CTA ---
    head = sub(head, "ONE SIGNATURE, EVERY INBOX", "STRAIGHT ANSWERS", 1, "kicker")
    head = sub(head, """                                                Made for the tools your team already uses. Build one professional
                                                signature and use it across supported email platforms, clients
                                                and devices.""",
               """                                                The questions people actually ask before building a signature &mdash;
                                                how it renders in Outlook, what you can change, and what
                                                happens to your data.""",
               1, "hero lead")
    head = sub(head, "<span>See the clients</span>", "<span>Browse the answers</span>", 1, "CTA etiketi")
    head = sub(head, '<span aria-hidden="true">See the clients</span>',
               '<span aria-hidden="true">Browse the answers</span>', 1, "CTA gölge etiketi")
    head = sub(head, 'href="#how-start" data-mm-scrollto', 'href="#faq-start" data-mm-scrollto', 1, "CTA hedefi")

    # --- head: hero rayi ---
    head = sub(head, "<span>Connect</span>", "<span>Basics</span>", 1, "ray 01")
    head = sub(head, "<span>Design</span>", "<span>Clients</span>", 1, "ray 02")
    head = sub(head, "<span>Roll&nbsp;out</span>", "<span>Export</span>", 1, "ray 03")
    head = sub(head, "<span>Send</span>", "<span>Plans</span>", 1, "ray 04")

    # --- tail: surucu + yapisal veri, </body>'den once ---
    assert tail.count("</body>") == 1, "tail'de tek </body> bekleniyordu"
    tail = tail.replace("</body>", build_driver() + build_jsonld() + "\n</body>")

    out = head + build_content() + tail

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(out)

    total = sum(len(c["items"]) for c in CATEGORIES)
    print("yazildi: %s" % OUT)
    print("  %d kategori, %d soru, %d satir" % (len(CATEGORIES), total, out.count("\n") + 1))


if __name__ == "__main__":
    main()
