/**
 * Kurulum rehberlerinin İÇERİĞİ — tek kaynak. Bileşen sadece çizer.
 *
 * Metinlerde iki kural pazarlıksız:
 *  1. CLAUDE.md §Test matrisi'ndeki 6 istemci birebir karşılanır.
 *  2. Ürün kapsamı dışındaki hiçbir şey vaat edilmez: directory sync,
 *    Outlook eklentisi, sunucu tarafı transport rule YOK (CLAUDE.md
 *    §YAPILMAYACAKLAR). Anlatılan akış her yerde aynı: yönetici imzayı
 *    üretir/iletir, kişi kendi istemcisine elle kurar.
 *
 * Adım gövdelerinde `backtick` → <code> (bileşendeki RichText). Veri dosyası
 * düz TS kalsın diye tek işaretleme kuralı bu; başka biçimlendirme yok.
 */

/** İstemcinin zengin HTML imzayı taşıyıp taşımadığı — rozet dili. */
export type Fidelity = 'rich' | 'text';

export interface GuideStep {
  readonly title: string;
  readonly body: string;
}

export interface StepGroup {
  readonly title: string;
  /** Grubun ne zaman tercih edileceği — kart altbaşlığı. */
  readonly note?: string;
  readonly steps: readonly GuideStep[];
}

export interface Guide {
  /** Derin bağlantı anahtarı: /app/guides?client=<slug> */
  readonly slug: string;
  /** Sol sekme etiketi (kısa). */
  readonly label: string;
  readonly icon: string;
  /** Sağ panel başlığı (tam ad). */
  readonly headline: string;
  readonly blurb: string;
  readonly fidelity: Fidelity;
  /** "Neyi kullanır" rozeti: pano, .htm dosyası, düz metin. */
  readonly uses: string;
  readonly groups: readonly StepGroup[];
  /** Sorun giderme / dürüstlük notları — abartısız. */
  readonly notes?: readonly string[];
}

/**
 * Üstteki özet kartı: taslak → yayında gönderici → kopyala/indir zinciri.
 * Panelin kendi gerçeğinden türetildi (senders: draft/live/inactive,
 * export-zip yalnız imzası atanmış CANLI göndericileri toplar).
 */
export const EXPORT_CHAIN: readonly GuideStep[] = [
  {
    title: 'Design and save',
    body: 'Build the signature in the builder. It saves as a draft, and drafts cost nothing — no seat is used until a sender goes live.',
  },
  {
    title: 'Assign and publish',
    body: 'On the Senders screen, assign the signature to a sender and publish them. A live sender with an assigned signature is what an export contains.',
  },
  {
    title: 'Copy or download',
    body: 'Copy the signature to the clipboard as rich HTML, download it as a single `.htm` file, or take a `.zip` of every live sender from the Senders screen.',
  },
];

export const GUIDES = [
  /* ---------------------------------------------------------------- */
  {
    slug: 'outlook-classic',
    label: 'Outlook Classic',
    icon: 'tabler-brand-windows',
    headline: 'Outlook Classic (Windows)',
    blurb: 'The desktop Outlook that renders mail with the Word engine — the client our templates are hardened against.',
    fidelity: 'rich',
    uses: '.htm file or clipboard',
    groups: [
      {
        title: 'Option 1 — drop the .htm into the Signatures folder',
        note: 'The cleaner route, and the one to use when you are handing a finished file to a colleague.',
        steps: [
          {
            title: 'Download the file',
            body: 'In the builder, use the `.htm` download under the preview. For a whole team, open Senders and use Export zip — the archive holds one `.htm` per live sender.',
          },
          {
            title: 'Close Outlook completely',
            body: 'Outlook reads the Signatures folder when it starts. Quit it before copying anything in, otherwise the new file is ignored.',
          },
          {
            title: 'Open the Signatures folder',
            body: 'Press `Windows`+`R`, paste `%APPDATA%\\Microsoft\\Signatures` and press Enter.',
          },
          {
            title: 'Copy the file in',
            body: 'Put the `.htm` in that folder. The file name becomes the signature name inside Outlook, so rename it to something you will recognise — for example `Company 2026.htm`.',
          },
          {
            title: 'Start Outlook and select it',
            body: 'File → Options → Mail → Signatures…. Pick the account, then set the signature for New messages and for Replies/forwards.',
          },
          {
            title: 'Send yourself a test',
            body: 'Mail your own address and open the result on a phone as well as on the desktop before rolling it out to anyone else.',
          },
        ],
      },
      {
        title: 'Option 2 — paste it instead',
        note: 'Use this when the Signatures folder is not reachable, or when signatures are stored on the account.',
        steps: [
          {
            title: 'Copy from the builder',
            body: 'Use the copy button under the preview. It writes real HTML to the clipboard (`text/html`), which is why the pasted signature keeps its layout instead of arriving as code.',
          },
          {
            title: 'Open the signature editor',
            body: 'File → Options → Mail → Signatures… → New, and give the signature a name.',
          },
          {
            title: 'Paste and save',
            body: 'Click into the large edit box, press `Ctrl`+`V`, then OK. Set it as the default for New messages and Replies/forwards while you are there.',
          },
          {
            title: 'Compare against the preview',
            body: 'Outlook rewrites what you paste. If spacing, colours or the logo drift, use the `.htm` route above — that file reaches Outlook untouched.',
          },
        ],
      },
    ],
    notes: [
      'Nothing appears in the signature list? Recent Microsoft 365 builds keep signatures on the mailbox instead of the local folder, and then the folder is ignored. Use the paste route in that case.',
      'Thin lines around the layout are an Outlook 2512 bug that adds borders to signature tables. Our templates already set `border="0"` and `border:none` on every table — re-export rather than hand-editing the HTML.',
      'Missing images are usually the recipient’s setting: Outlook blocks remote images from senders it does not trust yet. The signature itself is fine.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'new-outlook',
    label: 'New Outlook',
    icon: 'tabler-mail',
    headline: 'New Outlook & Outlook.com',
    blurb: 'The rebuilt Windows app and the web client share one settings screen — and one signature stored on the mailbox.',
    fidelity: 'rich',
    uses: 'Clipboard',
    groups: [
      {
        title: 'Paste the signature into mailbox settings',
        note: 'There is no Signatures folder here, so the `.htm` file has nowhere to go — the clipboard is the way in.',
        steps: [
          {
            title: 'Copy from the builder',
            body: 'Open the signature in the builder and use the copy button under the preview.',
          },
          {
            title: 'Open Settings',
            body: 'Click the gear icon in the top right, then Mail → Compose and reply.',
          },
          {
            title: 'Create a signature',
            body: 'Under Email signature choose New signature and give it a name.',
          },
          {
            title: 'Paste it',
            body: 'Click into the editor and press `Ctrl`+`V` (`Cmd`+`V` on a Mac). Layout, colours and the logo come across.',
          },
          {
            title: 'Choose when it is used',
            body: 'Set the dropdowns for New messages and for Replies/forwards, then Save.',
          },
          {
            title: 'Send yourself a test',
            body: 'Compose to your own address and check the result before sharing the guide with the rest of the team.',
          },
        ],
      },
    ],
    notes: [
      'The signature is stored on the mailbox, so the new Outlook app and outlook.com in a browser show the same list.',
      'Whether Outlook Classic picks it up depends on your Microsoft 365 build. Do not assume it does — check that client separately and set it up there if the list is empty.',
      'If the paste lands as plain text, the clipboard write was blocked. Reload the builder, allow clipboard access when the browser asks, and copy again.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'gmail-web',
    label: 'Gmail (web)',
    icon: 'tabler-brand-google',
    headline: 'Gmail on the web',
    blurb: 'Gmail keeps a rich signature per address and applies it when you compose in the browser.',
    fidelity: 'rich',
    uses: 'Clipboard',
    groups: [
      {
        title: 'Paste into Gmail settings',
        steps: [
          {
            title: 'Copy the signature first',
            body: 'Use the copy button under the builder preview. The signature has to be on the clipboard before you open the Gmail settings box — there is no file upload there.',
          },
          {
            title: 'Open the settings',
            body: 'Gear icon in the top right → See all settings → the General tab.',
          },
          {
            title: 'Find the Signature section',
            body: 'Scroll down to Signature, choose Create new, and name it.',
          },
          {
            title: 'Paste it',
            body: 'Click into the signature editor and press `Ctrl`+`V` (`Cmd`+`V` on a Mac).',
          },
          {
            title: 'Set the defaults',
            body: 'Under Signature defaults, pick the signature for New emails use and for On reply/forward use.',
          },
          {
            title: 'Save changes',
            body: 'Scroll to the bottom of the page and press Save Changes. Leaving the page without it throws the signature away.',
          },
          {
            title: 'Send yourself a test',
            body: 'Mail your own address, then open it on a phone too — that is where clipped or oversized signatures show up first.',
          },
        ],
      },
    ],
    notes: [
      'Gmail limits a signature to 10,000 characters. A single signature is far below that; pasting several into one box is what hits the ceiling.',
      'Tick “Insert this signature before quoted text in replies” if you do not want the signature pushed to the bottom of long threads.',
      'Gmail clips long messages behind a “View entire message” link. Keeping the signature small is part of why our templates link images from the CDN instead of embedding them.',
      'Google Workspace admins can append a footer to all outgoing mail from the Admin console. That is Google’s own feature and separate from Mailmyra — we do not push signatures into anyone’s mailbox.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'gmail-mobile',
    label: 'Gmail (mobile)',
    icon: 'tabler-device-mobile',
    headline: 'Gmail on Android and iOS',
    blurb: 'Honest answer first: the Gmail app cannot hold a formatted signature. Plan for a short text line here.',
    fidelity: 'text',
    uses: 'Plain text',
    groups: [
      {
        title: 'Set a plain-text mobile signature',
        note: 'The Gmail app has its own Mobile Signature setting, and it accepts text only — no logo, no colours, no links.',
        steps: [
          {
            title: 'Open the app settings',
            body: 'Gmail app → the menu (three lines, top left) → Settings → tap the account you are setting up.',
          },
          {
            title: 'Open the signature setting',
            body: 'On Android it is called Mobile Signature; on iOS it sits under Signature settings for that account.',
          },
          {
            title: 'Type two or three lines',
            body: 'Name, job title and a phone number is enough. Keep it consistent with the full signature so the two do not contradict each other.',
          },
          {
            title: 'Or switch it off',
            body: 'Leaving it empty (iOS: turning Mobile Signature off) means replies sent from the phone carry nothing, and only desktop mail shows the branded signature. For most teams this is the tidier choice.',
          },
        ],
      },
    ],
    notes: [
      'The rich signature you set at mail.google.com applies when you compose there. The Gmail app does not fall back to it — that is Gmail’s behaviour, and no signature tool can change it.',
      'If your people mostly reply from phones, set expectations accordingly: a branded signature is a desktop-first artifact.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'apple-mail',
    label: 'Apple Mail',
    icon: 'tabler-brand-apple',
    headline: 'Apple Mail on macOS',
    blurb: 'Apple Mail keeps the pasted formatting, but only once you turn off one setting that would otherwise strip it.',
    fidelity: 'rich',
    uses: 'Clipboard',
    groups: [
      {
        title: 'Paste into the signature editor',
        steps: [
          {
            title: 'Copy from the builder',
            body: 'Use the copy button under the preview and leave the browser tab open in case you need to copy again.',
          },
          {
            title: 'Open the signature settings',
            body: 'Mail → Settings… (Preferences on older macOS releases) → the Signatures tab.',
          },
          {
            title: 'Pick the account and add a signature',
            body: 'Select the mail account in the left column, press `+`, and name the new signature.',
          },
          {
            title: 'Turn off font matching first',
            body: 'Untick “Always match my default message font”. Left on, Mail strips your fonts and colours the moment you paste.',
          },
          {
            title: 'Paste it',
            body: 'Click into the right-hand preview area and press `Cmd`+`V`.',
          },
          {
            title: 'Make it the default',
            body: 'With the account still selected, set Choose Signature to the new one so it is added to outgoing mail automatically.',
          },
          {
            title: 'Send yourself a test',
            body: 'Compare the received mail against the builder preview — Mail’s editor is the step most likely to have changed something.',
          },
        ],
      },
    ],
    notes: [
      'Mail’s editor is picky: it can drop a table cell or nudge an image. If the test mail looks wrong, delete the signature and paste it again rather than editing it in place.',
      'Advanced fallback: quit Mail, edit the `.mailsignature` files under `~/Library/Mail/V*/MailData/Signatures/`, then lock the file so Mail does not rewrite it. The exact path changes between macOS releases, so treat this as a last resort.',
      'Signatures set here belong to this Mac. They do not appear on an iPhone or iPad — set those up separately with the iOS Mail guide.',
    ],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'ios-mail',
    label: 'iOS Mail',
    icon: 'tabler-device-mobile-message',
    headline: 'Mail on iPhone and iPad',
    blurb: 'The iOS signature field is a plain-text box. Pasting HTML into it does not produce a formatted signature.',
    fidelity: 'text',
    uses: 'Plain text',
    groups: [
      {
        title: 'Set a plain-text signature',
        steps: [
          {
            title: 'Open the setting',
            body: 'Settings → Apps → Mail → Signature. On iOS releases before 18 the path is Settings → Mail → Signature.',
          },
          {
            title: 'Choose the scope',
            body: 'All Accounts uses one line for every mailbox; Per Account lets work and personal mail differ.',
          },
          {
            title: 'Type two or three lines',
            body: 'Name, job title, phone. Match the wording of the desktop signature so the two read as the same person.',
          },
          {
            title: 'Send yourself a test',
            body: 'Mail your own address from the phone and confirm the lines break where you expect.',
          },
        ],
      },
    ],
    notes: [
      'The trick going around — mail the signature to yourself, open it, copy the rendered block and paste it into the Signature field — sometimes keeps some formatting, but images and links break often enough that we do not recommend it for a company rollout.',
      'An Exchange or Microsoft 365 account on the phone does not pull the signature you set in Outlook on the desktop. iOS Mail always uses this field.',
      'Same rule as Gmail on mobile: the branded signature is for desktop clients, and a clean two-line text signature is the honest mobile equivalent.',
    ],
  },
] as const satisfies readonly Guide[];

/** Geçersiz/eksik `?client=` ilk istemciye düşer (ölü uç yok). */
export function guideFor(slug: string | null): Guide {
  return GUIDES.find((g) => g.slug === slug) ?? GUIDES[0];
}
