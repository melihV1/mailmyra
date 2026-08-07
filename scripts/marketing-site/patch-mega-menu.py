#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mega-menudeki fiyat metinlerini yeni modelle esitler.

NEDEN: menu 13 sayfada "$5/mo flat", "$1 per seat/mo, minimum 5 seats",
"From $0.83 per seat" yaziyor. /pricing artik "$1 per active sender / year"
diyor. Menu duzeltilmezse pricing sayfasinin KENDI HEADER'I govdesini yalanlar.

Her dosyada her kalibin TAM 2 kez gecmesi beklenir (masaustu mm-mega +
mobil mmnav__mega). Sapma olursa script durur, kismi yama birakmaz.

DIKKAT: index-it-solution-dark.html'de ucuncu bir <strong>Pro</strong> var
(satir ~1924, kendi fiyat vitrini, <small>Solo workspace</small>). Kaliplar
tam <span> metniyle eslestigi icin ona DOKUNULMAZ.

Ayrica `agencies.html` (404) ve `templates-*.html` gibi olu linkler var;
bunlar fiyat modeliyle ilgisiz, BILEREK dokunulmadi -- yalniz Pricing
menusunun kendi alt linki contact'a cevrildi.
"""
import os
import sys

HAM = os.path.expanduser("~/Desktop/mailmyra ham")

# DIKKAT: kaynakta GERCEK em-dash karakteri var (U+2014), `&mdash;` entity'si
# DEGIL. Ilk turda entity yazdigim icin hicbiri eslesmedi ve script (dogru
# davranarak) hicbir dosyaya dokunmadan durdu.
D = "—"

PAIRS = [
    # (eski, yeni, beklenen adet)
    ('<strong>Pro</strong><span>$5/mo flat %s one seat, unlimited signatures.</span>' % D,
     '<strong>Pro</strong><span>$1 per sender/year %s one person, one brand.</span>' % D, 2),

    ('<strong>Team</strong><span>$1 per seat/mo, minimum 5 seats.</span>',
     '<strong>Team</strong><span>Same $1 %s many senders, one brand.</span>' % D, 2),

    ('<strong>Business</strong><span>From $0.83 per seat %s volume tiers.</span>' % D,
     '<strong>Agency</strong><span>Same $1 %s isolated client orgs, white-label.</span>' % D, 2),

    ('href="pricing.html#business"', 'href="pricing.html#agency"', 2),

    # Pricing menusunun alt linki -> agencies.html 404, contact'a cevriliyor.
    # (Solutions menusundeki "For agencies" linkine DOKUNULMUYOR: o ayri bir
    #  olu link, fiyat modeliyle ilgisi yok.)
    ('<a href="agencies.html">Agency plans %s pooled seats, talk to us' % D,
     '<a href="contact.html">Agency plans %s pooled seats, talk to us' % D, 2),
]

# Yalniz CANLI Mailmyra sayfalari. Tema sayfalari ve lab dosyalari (nav-lab,
# hero-lab, sayfa-sablonu) disarida: onlarda menu tek kopya ve sayfa canli degil.
FILES = [
    "index-it-solution-dark.html",
    "how-it-works.html",
    "features.html",
    "templates.html",
    "works-with.html",
    "contact.html",
    "faq.html",
    "pricing.html",
    "setup-outlook-classic.html",
    "setup-new-outlook.html",
    "setup-gmail.html",
    "setup-apple-mail.html",
    "setup-ios-mail.html",
]


def main():
    dry = "--apply" not in sys.argv
    touched, skipped, problems = [], [], []

    for name in FILES:
        path = os.path.join(HAM, name)
        with open(path, encoding="utf-8") as fh:
            src = fh.read()

        if PAIRS[0][0] not in src and PAIRS[1][0] not in src:
            skipped.append(name)
            continue

        counts = [(old, src.count(old), want) for old, _new, want in PAIRS]
        bad = [(o, c, w) for o, c, w in counts if c != w]
        if bad:
            problems.append((name, [(o[:46], c, w) for o, c, w in bad]))
            continue

        out = src
        for old, new, want in PAIRS:
            out = out.replace(old, new)

        if not dry:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(out)
        touched.append(name)

    print("%s  —  %d dosya yamalandi, %d atlandi" %
          ("KURU KOSU (yazilmadi)" if dry else "UYGULANDI", len(touched), len(skipped)))
    for n in touched:
        print("   ✓ %s" % n)
    if skipped:
        print("   (menu tasimayanlar: %s)" % ", ".join(skipped))
    if problems:
        print("\n!! BEKLENMEYEN ADET — bu dosyalara DOKUNULMADI:")
        for n, rows in problems:
            print("   %s" % n)
            for o, c, w in rows:
                print("      %-48s bulunan %d, beklenen %d" % (o, c, w))
        sys.exit(1)


if __name__ == "__main__":
    main()
