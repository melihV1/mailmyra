import type { Mirror } from '../types';

/**
 * Üyeler ekranı (app/(app)/app/members/): sayfa, MemberActions,
 * InvitationActions, InviteForm, WorkspaceCard. Rol ETİKETLERİ (Owner/
 * Admin/Editor/Viewer/Member — büyük harfli, rozet ve tablo hücrelerinde)
 * burada TEKRARLANMAZ: kabuk sözlüğü `nav.roleLabels`'tan okunur (bkz.
 * UserMenu.tsx emsali). `roleOptionLabel` bunun DIŞINDA — <select> seçenek
 * metni, EN'de küçük harfli ham değerdi (`owner`), burada da öyle kalır;
 * TR'de küçük harfli sözlükçe karşılığı. Ortak "Cancel"/"Delete" metinleri
 * `common`'dan gelir.
 */

const en = {
  pageTitle: 'Members — Mailmyra',
  heading: 'Members',
  roleNotes: {
    owner: 'Billing, plan, everything',
    admin: 'Members, senders, brand',
    editor: 'Edit & export signatures',
    viewer: 'View only',
  },
  roleOptionLabel: {
    owner: 'owner',
    admin: 'admin',
    editor: 'editor',
    viewer: 'viewer',
  },
  invite: {
    title: 'Invite a teammate',
    subtitle: 'The link is good for 7 days. Owner role is never handed out by invitation.',
    emailLabel: 'Email',
    emailPlaceholder: 'teammate@company.com',
    roleLabel: 'Role',
    sending: 'Sending…',
    submit: 'Invite',
    sentToast: 'Invitation sent — the link is good for 7 days.',
    errors: {
      already_member: 'That address is already a member of this workspace.',
      forbidden: 'Only owners and admins can invite members.',
      generic: 'Could not send — check the address and try again.',
    },
  },
  workspaceCard: {
    title: 'Workspace',
    subtitle: 'This name shows up in invitation and seat-warning e-mails.',
    nameLabel: 'Workspace name',
    saving: 'Saving…',
    rename: 'Rename',
    renamedToast: 'Workspace renamed.',
    readOnlyTrail: '— renaming is up to workspace owners and admins.',
    errors: {
      forbidden: 'Only owners and admins can rename the workspace.',
      generic: 'Enter a name between 1 and 255 characters.',
    },
  },
  allMembers: 'All members',
  table: {
    colMember: 'Member',
    colJoined: 'Joined',
    colRoleActions: 'Role & actions',
    you: 'You',
  },
  actions: {
    changeRoleAria: 'Change role',
    lastOwnerDemoteTip: 'The last owner cannot be demoted.',
    lastOwnerRemoveTip: 'The last owner cannot be removed.',
    leave: 'Leave',
    remove: 'Remove',
    leaveConfirmTitle: 'Leave this workspace?',
    removeConfirmTitle: 'Remove this member?',
    leaveBody: 'You will lose access immediately.',
    removeBody: 'They lose access immediately; signatures and senders stay.',
    roleChangedToast: (role: string) => `Role changed to ${role}.`,
    removedToast: 'Member removed.',
    errors: {
      last_owner: 'The last owner cannot be changed — promote someone else to owner first.',
      forbidden: 'Only owners and admins can manage members.',
      generic: 'Something went wrong.',
    },
  },
  invitationActions: {
    resendAria: 'Resend invitation e-mail',
    resendTip: 'Resend e-mail',
    copyLinkAria: 'Copy invite link',
    copyLinkTip: 'Copy fresh link',
    revoke: 'Revoke',
    revokedToast: 'Invitation revoked.',
    refreshFailedToast: 'Could not refresh the invitation. Please try again.',
    emailSentToast: 'Invitation e-mail sent again — the old link no longer works.',
    linkCopiedToast: 'Fresh invite link copied — the old link no longer works.',
    copyPrompt: 'Copy the invite link:',
  },
  pendingInvitations: 'Pending invitations',
  invitationsTable: {
    colEmail: 'Email',
    colRole: 'Role',
    colExpires: 'Expires',
  },
  matrixTitle: 'What each role can do',
  matrixLabels: [
    'Billing, plan, delete org',
    'Invite members, change roles',
    'Add & publish senders',
    'Brand settings',
    'Edit & export signatures',
    'View',
  ],
  allowedAria: 'Allowed',
  notAllowedAria: 'Not allowed',
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Üyeler — Mailmyra',
  heading: 'Üyeler',
  roleNotes: {
    owner: 'Fatura, plan, her şey',
    admin: 'Üyeler, göndericiler, marka',
    editor: 'İmzaları düzenle ve dışa aktar',
    viewer: 'Yalnızca görüntüleme',
  },
  roleOptionLabel: {
    owner: 'sahip',
    admin: 'yönetici',
    editor: 'düzenleyici',
    viewer: 'görüntüleyici',
  },
  invite: {
    title: 'Ekip arkadaşı davet et',
    subtitle: 'Bağlantı 7 gün geçerlidir. Sahip rolü davetle asla verilmez.',
    emailLabel: 'E-posta',
    emailPlaceholder: 'ekiparkadasi@sirket.com',
    roleLabel: 'Rol',
    sending: 'Gönderiliyor…',
    submit: 'Davet et',
    sentToast: 'Davet gönderildi — bağlantı 7 gün geçerli.',
    errors: {
      already_member: 'Bu adres zaten bu çalışma alanının bir üyesi.',
      forbidden: 'Yalnızca sahipler ve yöneticiler üye davet edebilir.',
      generic: 'Gönderilemedi — adresi kontrol et ve tekrar dene.',
    },
  },
  workspaceCard: {
    title: 'Çalışma alanı',
    subtitle: 'Bu ad davet ve koltuk uyarısı e-postalarında görünür.',
    nameLabel: 'Çalışma alanı adı',
    saving: 'Kaydediliyor…',
    rename: 'Yeniden adlandır',
    renamedToast: 'Çalışma alanı yeniden adlandırıldı.',
    readOnlyTrail: '— yeniden adlandırma çalışma alanı sahiplerine ve yöneticilerine kalmış.',
    errors: {
      forbidden: 'Yalnızca sahipler ve yöneticiler çalışma alanını yeniden adlandırabilir.',
      generic: '1 ile 255 karakter arasında bir ad gir.',
    },
  },
  allMembers: 'Tüm üyeler',
  table: {
    colMember: 'Üye',
    colJoined: 'Katıldı',
    colRoleActions: 'Rol ve işlemler',
    you: 'Sen',
  },
  actions: {
    changeRoleAria: 'Rolü değiştir',
    lastOwnerDemoteTip: 'Son sahip rütbesi düşürülemez.',
    lastOwnerRemoveTip: 'Son sahip çıkarılamaz.',
    leave: 'Ayrıl',
    remove: 'Çıkar',
    leaveConfirmTitle: 'Bu çalışma alanından ayrılınsın mı?',
    removeConfirmTitle: 'Bu üye çıkarılsın mı?',
    leaveBody: 'Erişimini hemen kaybedersin.',
    removeBody: 'Erişimini hemen kaybeder; imzalar ve göndericiler kalır.',
    roleChangedToast: (role: string) => `Rol ${role} olarak değiştirildi.`,
    removedToast: 'Üye çıkarıldı.',
    errors: {
      last_owner: 'Son sahip değiştirilemez — önce başka birini sahip yap.',
      forbidden: 'Yalnızca sahipler ve yöneticiler üyeleri yönetebilir.',
      generic: 'Bir şeyler ters gitti.',
    },
  },
  invitationActions: {
    resendAria: 'Davet e-postasını yeniden gönder',
    resendTip: 'E-postayı yeniden gönder',
    copyLinkAria: 'Davet bağlantısını kopyala',
    copyLinkTip: 'Taze bağlantıyı kopyala',
    revoke: 'İptal et',
    revokedToast: 'Davet iptal edildi.',
    refreshFailedToast: 'Davet yenilenemedi. Lütfen tekrar dene.',
    emailSentToast: 'Davet e-postası tekrar gönderildi — eski bağlantı artık çalışmıyor.',
    linkCopiedToast: 'Taze davet bağlantısı kopyalandı — eski bağlantı artık çalışmıyor.',
    copyPrompt: 'Davet bağlantısını kopyala:',
  },
  pendingInvitations: 'Bekleyen davetler',
  invitationsTable: {
    colEmail: 'E-posta',
    colRole: 'Rol',
    colExpires: 'Sona eriyor',
  },
  matrixTitle: 'Her rol ne yapabilir',
  matrixLabels: [
    'Fatura, plan, organizasyonu sil',
    'Üye davet et, rol değiştir',
    'Gönderici ekle ve yayına al',
    'Marka ayarları',
    'İmzaları düzenle ve dışa aktar',
    'Görüntüle',
  ],
  allowedAria: 'İzinli',
  notAllowedAria: 'İzinli değil',
};

export const members = { en, tr } as const;
