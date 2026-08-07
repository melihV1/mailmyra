#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pricing.html kurucusu.

Kabuk works-with.html'den satir araligi + assert ile dilinir:
  head = 1..622   (head + header + hero + .pp-top-wrap kapanisi)
  tail = 1128..son (</main> + footer + ortak scriptler)

Hero/header/footer/preloader DEGISMEZ; yalniz hero metni, ray etiketleri,
title/description ve main.css surum damgasi degisir.

TEK KAYNAK: asagidaki sabitler. Rakamlar HEM HTML'e (JS kapaliyken de fiyat
gorunmeli) HEM sayfa sonundaki MM_PRICING objesine yazilir. faq.html'e ELLE
rakam gomulmez -- ayni sekilde buraya da.
"""
import html as _html
import json
import os

HAM = os.path.expanduser("~/Desktop/mailmyra ham")
SRC = os.path.join(HAM, "works-with.html")
OUT = os.path.join(HAM, "pricing.html")

CSS_VER = "mailmyra-0807-8"

# --------------------------------------------------------------------------
# CONFIG SOZLESMESI  (brief §12'nin statik karsiligi)
# --------------------------------------------------------------------------
PRICE_PER_SEAT_YEAR_CENTS = 100          # $1
CURRENCY = "USD"
MIN_SEATS = 1
MAX_SEATS_UI = 1000                      # ustunde clamp
CONTACT_ABOVE = 500                      # bu sayidan itibaren kurumsal kapi
TRIAL_DAYS = 7

LAUNCH_OFFER = {
    "active": False,                     # <- kampanyayi tek satirla ac/kapa
    "code": "TEAM_LAUNCH_10",
    "seats": 10,
    "first_year_cents": 800,
    "renew_cents": 1000,
}

CALC_EXAMPLES = [1, 10, 25, 100]         # koltuk tanimi bloğundaki ornekler


def money(cents):
    """Kurus yoksa tam dolar goster: 100 -> $1, 850 -> $8.50"""
    return "$%d" % (cents // 100) if cents % 100 == 0 else "$%.2f" % (cents / 100.0)


PRICE = money(PRICE_PER_SEAT_YEAR_CENTS)

# --------------------------------------------------------------------------
# ICERIK
# --------------------------------------------------------------------------
TRUST = [
    ("fa-light fa-calendar-check", "%d-day full trial" % TRIAL_DAYS,
     "Every feature from the first day. Nothing is held back for a paid tier."),
    ("fa-light fa-credit-card", "No card required",
     "Start without payment details. We ask for them when you decide to stay."),
    ("fa-light fa-shield-check", "Email never routed through us",
     "Your mail leaves your own server. We never sit in the delivery path."),
]

PLAN_FEATURES = [
    "Unlimited saved signatures and templates",
    "Copy as rich HTML or download a .htm file",
    "Pro, Team and Agency workspaces",
    "Brand controls and one approved signature system",
    "No feature gates &mdash; the price is the whole product",
]

SEAT_EXAMPLES = [
    ("One person, five saved drafts, one email identity", "1 seat"),
    ("Ten employees whose signatures you manage", "10 seats"),
    ("An admin who manages but has no signature of their own", "0 seats"),
    ("A draft nobody has published yet", "0 seats"),
]

MODES = [
    ("pro", "fa-light fa-user", "Pro", "One person, one brand space.",
     "You manage your own signature and nothing else. One active sender, one seat."),
    ("team", "fa-light fa-users", "Team", "Many senders, one brand.",
     "Everyone shares one approved signature system while keeping their own details. "
     "You pay for the senders you actually publish."),
    ("agency", "fa-light fa-building", "Agency", "Isolated client organisations.",
     "Each client sits in its own space under one parent account, white-label ready. "
     "Seats are counted across all of them, at the same list price."),
]

BUILT_FOR = [
    ("fa-brands fa-microsoft", "Outlook Classic"),
    ("fa-brands fa-microsoft", "New Outlook"),
    ("fa-brands fa-google", "Gmail"),
    ("fa-light fa-mobile-screen", "Gmail mobile"),
    ("fa-brands fa-apple", "Apple Mail"),
    ("fa-brands fa-apple", "iOS Mail"),
]

FAQ_ITEMS = [
    ("pr-introductory-price", "Is %s an introductory price?" % PRICE, [
        "No. %s per active sender is the list price, and it is what the subscription "
        "renews at. There is no first-year rate that quietly doubles later." % PRICE,
    ]),
    ("pr-hidden-fee", "Is there a platform fee on top?", [
        "No. The seat price is the whole invoice. There is no onboarding fee, no "
        "per-workspace charge and no tier you have to climb into for a feature.",
        "Taxes are calculated at invoice, and shown before you pay.",
    ]),
    ("pr-why-so-low", "How is the price this low?", [
        "Because your email never passes through our servers. We are not carrying the "
        "cost of routing, storing or scanning your mail &mdash; we build the signature "
        "and hand it to you.",
        "The price is not a discount. It is what a deliberately simple product costs to run.",
    ]),
    ("pr-support", "What does support look like at this price?", [
        "Self-serve, and written to actually be read: step-by-step installation guides "
        "per mail client, plus the answers on our <a href=\"faq.html\">FAQ page</a>.",
        "Hands-on migration for a large team is a separate service &mdash; "
        "<a href=\"contact.html\">talk to us</a> and we will scope it.",
    ]),
    ("pr-team-shrinks", "It is annual only &mdash; what if my team shrinks?", [
        "There is no refund inside a paid period, but you can deactivate a sender at "
        "any time and their seat stops being active.",
        "The new count is what you are billed for at renewal.",
    ]),
    ("pr-email-privacy", "Does my email pass through your servers?", [
        "No, and this is the part worth checking against every alternative you are "
        "looking at. Server-side signature tools sit in the delivery path, which means "
        "your mail passes through a third party.",
        "Mailmyra produces signature HTML. Your mail leaves your own server, as it did before.",
    ]),
    ("pr-trial-card", "Do I need a card to try it?", [
        "No. The %d-day trial is the full product with no payment details, and the "
        "builder and live preview are open to everyone without an account &mdash; "
        "an account is only needed to export." % TRIAL_DAYS,
    ]),
]

MINUS_SVG = ('<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">'
             '<path d="M3 8h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>')
PLUS_SVG = ('<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">'
            '<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>')
ARROW_SVG = ('<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">'
             '<path d="M2 7h9M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" stroke-width="1.8" '
             'stroke-linecap="round" stroke-linejoin="round"/></svg>')


def btn(href, label, cls="mm-btn-solid"):
    return ('<a class="%s" href="%s"><span class="mm-btn__face">'
            '<span class="mm-btn__label"><span>%s</span>'
            '<span aria-hidden="true">%s</span></span>%s</span></a>'
            % (cls, href, label, label, ARROW_SVG))


# --------------------------------------------------------------------------
# BOLUMLER
# --------------------------------------------------------------------------
def build_content():
    L = []
    a = L.append
    I = "                                "   # temel girinti

    a('                <!-- pricing area start -->')
    a('                <div class="mm-tariff p-relative z-index-2" id="pricing-start" data-bg-color="#f4efe8">')
    a('                    <span class="mm-tariff__bg" aria-hidden="true"></span>')
    a('                    <div class="container container-1430">')
    a('                        <div class="row justify-content-center">')
    a('                            <div class="col-xl-11">')

    # ---------- 2. guven satiri ----------
    a(I + '<ul class="mm-tariff__trust">')
    for icon, title, body in TRUST:
        a(I + '    <li>')
        a(I + '        <span class="mm-tariff__trust-icon"><i class="%s" aria-hidden="true"></i></span>' % icon)
        a(I + '        <div><b>%s</b><span>%s</span></div>' % (title, body))
        a(I + '    </li>')
    a(I + '</ul>')

    # ---------- 3. tek fiyat karti ----------
    a(I + '<div class="row mm-tariff__planrow align-items-center">')
    a(I + '    <div class="col-lg-5">')
    a(I + '        <div class="mm-tariff__intro">')
    a(I + '            <span class="mm-section-kicker">Pricing</span>')
    a(I + '            <h2 class="mm-tariff__heading">One price.<br><em>Every way you work.</em></h2>')
    a(I + '            <p class="mm-tariff__lead">You pay for active senders &mdash; not for templates,')
    a(I + '                not for exports, not for a platform tier. One product, one annual seat price,')
    a(I + '                the same for a freelancer and for an agency running a hundred clients.</p>')
    a(I + '        </div>')
    a(I + '    </div>')
    a(I + '    <div class="col-lg-7">')
    a(I + '        <div class="mm-tariff__plan">')
    a(I + '            <div class="mm-tariff__plan-head">')
    a(I + '                <span class="mm-tariff__plan-name">Mailmyra</span>')
    a(I + '                <p class="mm-tariff__plan-price">')
    a(I + '                    <b>%s</b>' % PRICE)
    a(I + '                    <span>per active sender<br>per year</span>')
    a(I + '                </p>')
    a(I + '                <p class="mm-tariff__plan-note">Billed annually. Minimum %d active sender.</p>' % MIN_SEATS)
    a(I + '            </div>')
    a(I + '            <p class="mm-tariff__plan-all">All features included</p>')
    a(I + '            <ul class="mm-tariff__plan-list">')
    for f in PLAN_FEATURES:
        a(I + '                <li><i class="fa-light fa-check" aria-hidden="true"></i><span>%s</span></li>' % f)
    a(I + '            </ul>')
    a(I + '            <div class="mm-tariff__plan-foot">')
    a(I + '                %s' % btn("contact.html", "Start the %d-day trial" % TRIAL_DAYS))
    a(I + '                <p>No card required. Taxes calculated at invoice.</p>')
    a(I + '            </div>')
    a(I + '        </div>')
    a(I + '    </div>')
    a(I + '</div>')

    # ---------- 5. teklif kutusu (yalniz active ise) ----------
    if LAUNCH_OFFER["active"]:
        o = LAUNCH_OFFER
        saving = o["renew_cents"] - o["first_year_cents"]
        a(I + '<div class="mm-tariff__offer">')
        a(I + '    <span class="mm-tariff__offer-tag">First year offer</span>')
        a(I + '    <h3>%d active senders</h3>' % o["seats"])
        a(I + '    <dl>')
        a(I + '        <div><dt>List price</dt><dd>%s/year</dd></div>' % money(o["renew_cents"]))
        a(I + '        <div><dt>Launch saving</dt><dd class="is-saving">&minus;%s</dd></div>' % money(saving))
        a(I + '        <div class="is-due"><dt>Due today</dt><dd>%s</dd></div>' % money(o["first_year_cents"]))
        a(I + '        <div><dt>Renews at</dt><dd>%s/year</dd></div>' % money(o["renew_cents"]))
        a(I + '    </dl>')
        a(I + '</div>')

    # ---------- 4. hesaplayici ----------
    a(I + '<div class="mm-tariff__calc">')
    a(I + '    <div class="row align-items-center">')
    a(I + '        <div class="col-lg-6">')
    a(I + '            <h3 class="mm-tariff__calc-title">How many senders<br><em>are you managing?</em></h3>')
    a(I + '            <p class="mm-tariff__calc-note">Move the number. There is no volume table behind it')
    a(I + '                and no tier to cross &mdash; the total is simply the number of active senders')
    a(I + '                times %s.</p>' % PRICE)
    a(I + '        </div>')
    a(I + '        <div class="col-lg-6">')
    a(I + '            <div class="mm-tariff__calc-box">')
    a(I + '                <label class="mm-tariff__calc-label" for="mm-seats">Active senders</label>')
    a(I + '                <div class="mm-tariff__stepper">')
    a(I + '                    <button type="button" class="mm-tariff__step" data-mm-step="-1" aria-label="One sender fewer">%s</button>' % MINUS_SVG)
    a(I + '                    <input id="mm-seats" class="mm-tariff__input" type="number" inputmode="numeric"')
    a(I + '                           value="10" min="%d" max="%d" step="1" autocomplete="off">' % (MIN_SEATS, MAX_SEATS_UI))
    a(I + '                    <button type="button" class="mm-tariff__step" data-mm-step="1" aria-label="One sender more">%s</button>' % PLUS_SVG)
    a(I + '                </div>')
    a(I + '                <p class="mm-tariff__calc-out" id="mm-calc-out" role="status" aria-live="polite">')
    a(I + '                    <b id="mm-calc-total">%s</b>' % money(10 * PRICE_PER_SEAT_YEAR_CENTS))
    a(I + '                    <span id="mm-calc-detail">10 senders &times; %s per year</span>' % PRICE)
    a(I + '                </p>')
    a(I + '                <p class="mm-tariff__calc-contact" id="mm-calc-contact" hidden>')
    a(I + '                    Managing %d+ senders? <a href="contact.html">Talk to us</a>.' % CONTACT_ABOVE)
    a(I + '                </p>')
    a(I + '            </div>')
    a(I + '        </div>')
    a(I + '    </div>')
    a(I + '</div>')

    # ---------- 5. koltuk nedir ----------
    a(I + '<div class="mm-tariff__seat" id="seat">')
    a(I + '    <div class="row">')
    a(I + '        <div class="col-lg-5">')
    a(I + '            <span class="mm-section-kicker">The unit</span>')
    a(I + '            <h3 class="mm-tariff__seat-title">What counts as<br><em>a seat?</em></h3>')
    a(I + '        </div>')
    a(I + '        <div class="col-lg-7">')
    a(I + '            <p class="mm-tariff__seat-lead">A seat is not a login and it is not a saved signature.')
    a(I + '                It is an <b>active sender identity you manage</b> &mdash; and it only starts')
    a(I + '                counting the first time that sender is published. Drafts are free.</p>')
    a(I + '            <ul class="mm-tariff__seat-list">')
    for text, count in SEAT_EXAMPLES:
        zero = ' is-zero' if count.startswith('0') else ''
        a(I + '                <li><span>%s</span><b class="mm-tariff__seat-count%s">%s</b></li>' % (text, zero, count))
    a(I + '            </ul>')
    a(I + '        </div>')
    a(I + '    </div>')
    a(I + '</div>')

    # ---------- 6. calisma alani modlari ----------
    a(I + '<div class="mm-tariff__modes">')
    a(I + '    <div class="mm-tariff__modes-head">')
    a(I + '        <span class="mm-section-kicker">Workspaces</span>')
    a(I + '        <h3 class="mm-tariff__modes-title">Three ways to work.<br><em>One list price.</em></h3>')
    a(I + '        <p>Pro, Team and Agency are not pricing tiers. They are how the workspace is')
    a(I + '            arranged &mdash; the seat count and the %s stay exactly the same.</p>' % PRICE)
    a(I + '    </div>')
    a(I + '    <div class="row">')
    for slug, icon, name, tag, body in MODES:
        a(I + '        <div class="col-lg-4 col-md-6">')
        a(I + '            <div class="mm-tariff__mode" id="%s">' % slug)
        a(I + '                <span class="mm-tariff__mode-icon"><i class="%s" aria-hidden="true"></i></span>' % icon)
        a(I + '                <h4>%s</h4>' % name)
        a(I + '                <p class="mm-tariff__mode-tag">%s</p>' % tag)
        a(I + '                <p class="mm-tariff__mode-body">%s</p>' % body)
        a(I + '                <p class="mm-tariff__mode-price">%s <span>per active sender / year</span></p>' % PRICE)
        a(I + '            </div>')
        a(I + '        </div>')
    a(I + '    </div>')
    a(I + '</div>')

    a('                            </div>')
    a('                        </div>')
    a('                    </div>')
    a('                </div>')
    a('                <!-- pricing area end -->')
    a('')

    # ---------- 7. "Why only $1?" — KOYU SLAB ----------
    a('                <!-- why area start -->')
    a('                <div class="mm-tariff-why" data-bg-color="#050914">')
    a('                    <span class="mm-tariff-why__grid" aria-hidden="true"></span>')
    a('                    <span class="mm-tariff-why__halo" aria-hidden="true"></span>')
    a('                    <div class="container container-1430">')
    a('                        <div class="row justify-content-center">')
    a('                            <div class="col-xl-10">')
    a(I + '<span class="mm-section-kicker">Why %s</span>' % PRICE)
    a(I + '<h2 class="mm-tariff-why__title">One product.<br><em>One annual seat price.</em></h2>')
    a(I + '<div class="row mm-tariff-why__body">')
    a(I + '    <div class="col-lg-6">')
    a(I + '        <p>We charge for active senders &mdash; not for templates, not for exports, not for')
    a(I + '            hidden platform layers. Your email never passes through Mailmyra&rsquo;s servers,')
    a(I + '            so we are not carrying the cost of routing it, storing it or scanning it.</p>')
    a(I + '    </div>')
    a(I + '    <div class="col-lg-6">')
    a(I + '        <p>This price is not a discount and it is not a launch rate. It is what a')
    a(I + '            deliberately simple product costs to run, and it is what the subscription')
    a(I + '            renews at.</p>')
    a(I + '    </div>')
    a(I + '</div>')
    a(I + '<p class="mm-tariff-why__market">Signature management is usually priced')
    a(I + '    <b>per user, per month</b>. Mailmyra is priced <b>per active sender, per year</b>.</p>')
    a('                            </div>')
    a('                        </div>')
    a('                    </div>')
    a('                </div>')
    a('                <!-- why area end -->')
    a('')

    # ---------- 8 + 9. built-for bandi + SSS ----------
    a('                <!-- built + faq area start -->')
    a('                <div class="mm-tariff-more p-relative z-index-2" data-bg-color="#f4efe8">')
    a('                    <span class="mm-tariff__bg" aria-hidden="true"></span>')
    a('                    <div class="container container-1430">')
    a('                        <div class="row justify-content-center">')
    a('                            <div class="col-xl-11">')

    a(I + '<div class="mm-tariff-built">')
    a(I + '    <div class="row align-items-center">')
    a(I + '        <div class="col-lg-5">')
    a(I + '            <span class="mm-section-kicker">What you get</span>')
    a(I + '            <h3 class="mm-tariff-built__title">Built for Outlook,<br><em>Gmail &amp; Apple Mail.</em></h3>')
    a(I + '            <p>Table-based markup with every style written inline &mdash; written against')
    a(I + '                Outlook&rsquo;s Word rendering engine, which is the one that breaks everything')
    a(I + '                built like a web page.</p>')
    a(I + '            <a class="mm-tariff-built__link" href="works-with.html">See how it holds up')
    a(I + '                <i class="fa-light fa-arrow-up-right" aria-hidden="true"></i></a>')
    a(I + '        </div>')
    a(I + '        <div class="col-lg-7">')
    a(I + '            <ul class="mm-tariff-built__grid">')
    for icon, label in BUILT_FOR:
        a(I + '                <li><span><i class="%s" aria-hidden="true"></i></span>%s</li>' % (icon, label))
    a(I + '            </ul>')
    a(I + '        </div>')
    a(I + '    </div>')
    a(I + '</div>')

    a(I + '<div class="mm-tariff-faq" id="pricing-faq">')
    a(I + '    <div class="row">')
    a(I + '        <div class="col-lg-4">')
    a(I + '            <span class="mm-section-kicker">Before you decide</span>')
    a(I + '            <h3 class="mm-tariff-faq__title">The questions<br><em>worth asking.</em></h3>')
    a(I + '            <p>Everything else lives on the <a href="faq.html">full FAQ</a>.</p>')
    a(I + '        </div>')
    a(I + '        <div class="col-lg-8">')
    a(I + '            <div class="mm-tariff-faq__list" id="mm-tariff-faq-list">')
    for qid, q, paras in FAQ_ITEMS:
        a(I + '                <details class="mm-tariff-faq__item" id="%s">' % qid)
        a(I + '                    <summary class="mm-tariff-faq__summary">')
        a(I + '                        <span class="mm-tariff-faq__q">%s</span>' % q)
        a(I + '                        <span class="mm-tariff-faq__mark" aria-hidden="true"></span>')
        a(I + '                    </summary>')
        a(I + '                    <div class="mm-tariff-faq__wrap"><div class="mm-tariff-faq__a">')
        for p in paras:
            a(I + '                        <p>%s</p>' % p)
        a(I + '                    </div></div>')
        a(I + '                </details>')
    a(I + '            </div>')
    a(I + '        </div>')
    a(I + '    </div>')
    a(I + '</div>')

    a('                            </div>')
    a('                        </div>')
    a('                    </div>')
    a('                </div>')
    a('                <!-- built + faq area end -->')
    a('')

    # ---------- 10. kapanis CTA — KOYU SLAB ----------
    a('                <!-- cta area start -->')
    a('                <div class="mm-tariff-cta" data-bg-color="#050914">')
    a('                    <span class="mm-tariff-why__grid" aria-hidden="true"></span>')
    a('                    <span class="mm-tariff-cta__halo" aria-hidden="true"></span>')
    a('                    <div class="container container-1430">')
    a('                        <div class="row justify-content-center text-center">')
    a('                            <div class="col-xl-8">')
    a(I + '<span class="mm-section-kicker mm-tariff-cta__kicker">Get started</span>')
    a(I + '<h2 class="mm-tariff-cta__title">Build one first.<br><em>Decide after.</em></h2>')
    a(I + '<p>The builder and the live preview are open without an account. Type in your')
    a(I + '    details, watch the signature take shape, and see what you would be paying for.</p>')
    a(I + '<div class="mm-tariff-cta__actions">')
    a(I + '    %s' % btn("builder.html", "Try the builder"))
    a(I + '    %s' % btn("contact.html", "Talk to us", "mm-btn-outline"))
    a(I + '</div>')
    a('                            </div>')
    a('                        </div>')
    a('                    </div>')
    a('                </div>')
    a('                <!-- cta area end -->')
    a('')
    return "\n".join(L) + "\n"


# --------------------------------------------------------------------------
# SAYFA SURUCUSU
# --------------------------------------------------------------------------
def build_driver():
    cfg = json.dumps({
        "centsPerSeatYear": PRICE_PER_SEAT_YEAR_CENTS,
        "currency": CURRENCY,
        "minSeats": MIN_SEATS,
        "maxSeats": MAX_SEATS_UI,
        "contactAbove": CONTACT_ABOVE,
    }, ensure_ascii=False)

    return r'''
    <!-- mm: PRICING SURUCUSU.
             (1) koltuk hesaplayicisi — saf `koltuk x liste fiyati`, kademe YOK,
                 teklif kutusuna BAGLI DEGIL (esik mantigi motor isi).
             (2) SSS akordeonu — <details> yuksekligi native animate edilemez,
                 Web Animations API ile suruluyor (faq.html ile ayni desen).
             Rakamlar MM_PRICING'den okunur; sayfaya elle gomulmez. Ayni degerler
             HTML'e de yazildi, boylece JS kapaliyken de fiyat gorunur. -->
    <script>
    window.MM_PRICING = __CFG__;
    (function () {
        var C = window.MM_PRICING;

        /* ---------------- hesaplayici ---------------- */
        var input = document.getElementById('mm-seats');
        if (input) {
            var total   = document.getElementById('mm-calc-total');
            var detail  = document.getElementById('mm-calc-detail');
            var contact = document.getElementById('mm-calc-contact');

            function money(cents) {
                return cents % 100 === 0
                    ? '$' + (cents / 100)
                    : '$' + (cents / 100).toFixed(2);
            }

            /* Bos / 0 / negatif / harf girisi -> sessizce min'e cek. Hata
               gostermiyoruz: kullanici yaziyorken kirmizi uyari cikarmak
               hesaplayicida gereksiz gurultu. */
            function normalise(raw) {
                var s = String(raw);
                /* Eksi isaretini ONCE yakala: rakam disini temizleyince "-5"
                   "5"e donusuyor ve negatif girdi 5 koltuk gibi okunuyordu. */
                var negative = /^\s*-/.test(s);
                var n = parseInt(s.replace(/[^0-9]/g, ''), 10);
                if (negative || !isFinite(n) || n < C.minSeats) n = C.minSeats;
                if (n > C.maxSeats) n = C.maxSeats;
                return n;
            }

            function render(seats) {
                var cents = seats * C.centsPerSeatYear;
                total.textContent = money(cents);
                detail.textContent = seats + (seats === 1 ? ' sender' : ' senders')
                    + ' × ' + money(C.centsPerSeatYear) + ' per year';
                if (contact) contact.hidden = seats < C.contactAbove;
            }

            /* Yazarken kutuya dokunma (kullanici "1" yazip "10" yazacakken
               1'e kilitlenmesin); sadece hesabi guncelle. Duzeltmeyi blur'da
               ve buton tiklamasinda yap. */
            input.addEventListener('input', function () {
                render(normalise(input.value));
            });
            input.addEventListener('blur', function () {
                var n = normalise(input.value);
                input.value = n;
                render(n);
            });

            Array.prototype.forEach.call(
                document.querySelectorAll('[data-mm-step]'), function (b) {
                    b.addEventListener('click', function () {
                        var n = normalise(input.value) + parseInt(b.getAttribute('data-mm-step'), 10);
                        n = normalise(n);
                        input.value = n;
                        render(n);
                        input.focus({ preventScroll: true });
                    });
                });

            render(normalise(input.value));
        }

        /* ---------------- SSS akordeonu ---------------- */
        var list = document.getElementById('mm-tariff-faq-list');
        if (!list) return;
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

        Array.prototype.forEach.call(list.querySelectorAll('details'), function (item) {
            var summary = item.querySelector('summary');
            var wrap = item.querySelector('.mm-tariff-faq__wrap');
            if (!summary || !wrap) return;
            var running = null;

            summary.addEventListener('click', function (event) {
                if (reduce.matches) return;              /* native davranis */
                event.preventDefault();
                if (running) { running.cancel(); running = null; }

                var opening = !item.open;
                if (opening) item.open = true;           /* olcebilmek icin ac */
                var full = wrap.scrollHeight;

                running = wrap.animate(
                    opening
                        ? [{ height: '0px', opacity: 0 }, { height: full + 'px', opacity: 1 }]
                        : [{ height: full + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
                    { duration: opening ? 340 : 260,
                      easing: opening ? 'cubic-bezier(.22,.61,.36,1)' : 'cubic-bezier(.4,0,.2,1)' });

                running.onfinish = function () {
                    if (!opening) item.open = false;
                    wrap.style.height = '';
                    running = null;
                };
                running.oncancel = function () { wrap.style.height = ''; };
            });
        });
    })();
    </script>
'''.replace('__CFG__', cfg)


# --------------------------------------------------------------------------
# KABUGU DILIMLE
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

    head = sub(head, "<title>Mailmyra | Works with</title>",
               "<title>Mailmyra | Pricing</title>", 1, "title")
    head = sub(head,
               'content="How Mailmyra builds email signatures that render the same in every mail client."',
               'content="%s per active sender, per year. One product, no feature gates, no platform fee '
               '&mdash; and your email never routes through Mailmyra."' % PRICE,
               1, "description")
    head = sub(head, "assets/css/main.css?v=mailmyra-0806-35",
               "assets/css/main.css?v=" + CSS_VER, 1, "css version")

    head = sub(head, '<h4 class="pp-about-me-title mm-hiw-title">WORKS WITH</h4>',
               '<h4 class="pp-about-me-title mm-hiw-title">PRICING</h4>', 1, "hero h4")
    head = sub(head, '<h4 class="pp-about-me-title">WORKS WITH</h4>',
               '<h4 class="pp-about-me-title">PRICING</h4>', 5, "hero mobil slaytlar")

    head = sub(head, "ONE SIGNATURE, EVERY INBOX", "ONE PRODUCT, ONE PRICE", 1, "kicker")
    head = sub(head, """                                                Made for the tools your team already uses. Build one professional
                                                signature and use it across supported email platforms, clients
                                                and devices.""",
               """                                                %s per active sender, per year &mdash; the same price whether you
                                                manage one signature or a hundred. No feature gates, no platform
                                                fee, and your email never routes through us.""" % PRICE,
               1, "hero lead")
    head = sub(head, "<span>See the clients</span>", "<span>See the price</span>", 1, "CTA etiketi")
    head = sub(head, '<span aria-hidden="true">See the clients</span>',
               '<span aria-hidden="true">See the price</span>', 1, "CTA golge etiketi")
    head = sub(head, 'href="#how-start" data-mm-scrollto', 'href="#pricing-start" data-mm-scrollto', 1, "CTA hedefi")

    head = sub(head, "<span>Connect</span>", "<span>Price</span>", 1, "ray 01")
    head = sub(head, "<span>Design</span>", "<span>Seats</span>", 1, "ray 02")
    head = sub(head, "<span>Roll&nbsp;out</span>", "<span>Modes</span>", 1, "ray 03")
    head = sub(head, "<span>Send</span>", "<span>Answers</span>", 1, "ray 04")

    assert tail.count("</body>") == 1, "tail'de tek </body> bekleniyordu"
    tail = tail.replace("</body>", build_driver() + "\n</body>")

    out = head + build_content() + tail
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(out)

    print("yazildi: %s" % OUT)
    print("  fiyat %s/aktif gonderici/yil | deneme %d gun | kampanya %s"
          % (PRICE, TRIAL_DAYS, "ACIK" if LAUNCH_OFFER["active"] else "kapali"))
    print("  %d satir" % (out.count("\n") + 1))


if __name__ == "__main__":
    main()
