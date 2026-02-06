/**
 * Start & Help Commands
 * /start, /help, /yardim, /nasil, /menu, /ping, /ornekler
 */

const state = require('../state');
const { sendSafeMessage } = require('../utils/helpers');
const userDao = require('../db/dao/userDao');
const inviteDao = require('../db/dao/inviteDao');
const { ADMIN_USER_ID } = require('../config');
const { requireAuth, handleUnauthorized } = require('../middleware/auth');

function register(bot) {
    // /start, /help, /yardim - with optional invite code
    bot.onText(/\/(start|help|yardim)(?: (.+))?/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const inviteCode = match[2] ? match[2].trim() : null;

        // Already registered?
        const existingUser = userDao.findByTelegramId(userId);

        if (existingUser) {
            if (existingUser.is_banned) {
                return sendSafeMessage(bot, chatId, 'Hesabiniz engellenmis.');
            }

            // Show help menu for registered users
            const { targetTwitterUsername, currentFormat, currentPersona } = state.getUserSettings(userId);

            const help = `
\u{1F916} *VibeEval Bot v1.9 - Viral Alpha*

\u{2728} *API KULLANAN KOMUTLAR (Kredi Harcar):*
\u{1F4DD} \`/tweet <konu>\` - Tweet uretir \u{1F4B3}
\u{1F3B2} \`/rastgele\` - Otomatik tweet \u{1F4B3}
\u{1F504} \`/remix\` - (Reply) Yeniden yaz \u{1F4B3}
\u{1F9F5} \`/thread <konu>\` - Thread uret \u{1F4B3}
\u{1F4AC} \`/reply <url>\` - Cevap onerisi \u{1F4B3}
\u{1F3AF} \`/cevap\` - (Reply) Cevap menusu \u{1F4B3}
\u{1F3AF} \`/rekabet <user>\` - Rakip analizi \u{1F4B3}
\u{1F500} \`/ab <konu>\` - A/B Testi \u{1F4B3}
\u{1F3D7}\u{FE0F} \`/framework\` - Viral Iskeletler \u{1F4B3}
\u{1F399}\u{FE0F} *Sesli Tweet* - Sesini tweetle \u{1F4B3}

\u{1F193} *UCRETSIZ KOMUTLAR:*
\u{1FA9D} \`/hooks\` - Viral giris cumleleri
\u{1F4A1} \`/fikir\` - Icerik fikri
\u{1F50D} \`/analiz <metin>\` - Algoritma testi
\u{1F9E0} \`/vibe\` - (Reply) Duygu Analizi
\u{1F4C8} \`/viral\` - En iyi paylasim saati
\u{1F4CA} \`/stats\` - Istatistikler
\u{1F4BE} \`/kaydet\` - Taslaga kaydet
\u{1F4C2} \`/taslaklar\` - Taslaklari listele
\u{1F5D1}\u{FE0F} \`/sil <id>\` - Taslagi sil
\u{1F525} \`/gundem\` - Trend konular
\u{1F4C5} \`/takvim\` - Haftalik plan
\u{1F3A8} \`/prompt\` - (Reply) Gorsel prompt
\u{1F3B0} \`/slot\` - Motivasyon carki
\u{1F4DD} \`/sablon\` - Hazir taslaklar
\u{2702}\u{FE0F} \`/snippet\` - Kayitli parcalar
\u{1F3AF} \`/hedef\` - Gunluk hedef belirle
\u{1F3C6} \`/rutbe\` - Seviye ve Streak
\u{2600}\u{FE0F} \`/sabah\` - Gunluk Rapor
\u{1F50D} \`/izle <user>\` - Rakip Gozetle
\u{1F4E1} \`/radar\` - Rakip Radari
\u{23F0} \`/rezerve\` - Yayin Rezerve Et
\u{1F4A1} \`/ornekler\` - Pratik Ornekler
\u{1F9EE} \`/hesapla\` - (Reply) Metin analizi
\u{2753} \`/nasil\` - Tam rehber
\u{1F9F9} \`/clean\` - Ekrani temizle

\u{2699}\u{FE0F} *AYARLAR:*
\u{1F464} Profil: @${targetTwitterUsername} (\`/setuser\`)
\u{1F3A8} Format: \`${currentFormat}\` (\`/setformat\`)
\u{1F3AD} Persona: \`${currentPersona}\` (\`/setpersona\`)
\u{1F511} API Key: \`/setkey\`
\u{1F4B3} Bakiye: \`/kredi\`

\u{1F4CB} *TUM FORMATLAR:*
micro, punch, classic, spark, storm, longform, thunder, mega

\u{1F3AD} *TUM PERSONALAR:*
authority, news, shitpost, mentalist, bilgi, sigma, doomer, hustler
`;
            return sendSafeMessage(bot, chatId, help, true);
        }

        // Not registered - check if admin
        if (ADMIN_USER_ID && userId === ADMIN_USER_ID) {
            userDao.createUser({ telegramId: userId, username: msg.from.username, firstName: msg.from.first_name });
            userDao.setAdmin(userId);
            return sendSafeMessage(bot, chatId,
                'Admin olarak kayit oldunuz!\n\n/setkey ile XPatla API anahtarinizi girin.', true);
        }

        // Not registered - need invite code
        if (!inviteCode) {
            return sendSafeMessage(bot, chatId,
                'Bu bot davet koduyla calisir.\n\nKayit: `/start DAVET_KODU`\n\nDavet kodu icin admin ile iletisime gecin.', true);
        }

        // Validate invite code
        const result = inviteDao.useInviteCode(inviteCode, userId);
        if (!result.valid) {
            return sendSafeMessage(bot, chatId, `Gecersiz davet kodu: ${result.reason}`, true);
        }

        userDao.createUser({ telegramId: userId, username: msg.from.username, firstName: msg.from.first_name, invitedBy: result.invitedBy });
        sendSafeMessage(bot, chatId,
            'Hosgeldin! Kayit tamamlandi.\n\n/setkey ile XPatla API anahtarini gir.\nArdindan /help ile tum komutlari gor.', true);
    });

    // /nasil
    bot.onText(/\/nasil/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const guide = `
\u{1F4DA} *VibeEval Bot v1.9 Tam Kilavuz*

\u{26A0}\u{FE0F} *KREDI BILGISI:*
\u{1F4B3} = API kullanir, kredi harcar
\u{1F193} = Ucretsiz, kredi harcamaz

\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}\u{2501}

\u{2728} *ICERIK URETIMI* \u{1F4B3}
\u{2022} \`/tweet <konu>\` - Tweet yaz
\u{2022} \`/rastgele\` - Otomatik tweet
\u{2022} \`/thread <konu>\` - 5 tweetlik seri
\u{2022} \`/remix\` - (Reply) Farkli persona
\u{2022} \`/reply <url>\` - Tweete cevap
\u{2022} \`/cevap\` - (Yanitla) Cevap menusu
\u{2022} \`/rekabet <user>\` - Rakip analizi
\u{2022} \`/ab <konu>\` - A/B Testi
\u{2022} \`/framework\` - Viral Iskeletler
\u{2022} \u{1F399}\u{FE0F} *Ses Kaydi Gonder* - Sesli Tweet

\u{1F193} *UCRETSIZ ARACLAR*
\u{2022} \`/fikir\` - Konu onerir
\u{2022} \`/hooks\` - Viral girisler
\u{2022} \`/analiz <metin>\` - Skor hesaplar
\u{2022} \`/vibe\` - Duygu/Enerji analizi
\u{2022} \`/viral\` - Ideal paylasim saati
\u{2022} \`/gundem\` - Trend konular
\u{2022} \`/takvim\` - Haftalik plan
\u{2022} \`/prompter\` - (Reply) Gorsel prompt
\u{2022} \`/vmaster <konu>\` - 1.8M'lik hikaye tarzinda uretim \u{1F525}
\u{2022} \`/snippet ekle <ad> <metin>\` - Parca kaydet
\u{2022} \`/sablon\` - Hazir sablonlar

\u{1F4CA} *ISTATISTIK & HESAP* \u{1F193}
\u{2022} \`/stats\` - Kullanim istatistikleri
\u{2022} \`/kredi\` - Bakiye sorgula
\u{2022} \`/rutbe\` - Oyunlastirma durumu
\u{2022} \`/hedef <sayi>\` - Gunluk hedef koy
\u{2022} \`/sabah\` - Gunluk rapor

\u{1F4BE} *TASLAKLAR* \u{1F193}
\u{2022} \`/kaydet\` - (Reply) Sakla
\u{2022} \`/taslaklar\` - Listele
\u{2022} \`/sil <id>\` - Sil
\u{2022} \`/rezerve <id> <saat>\` - Hatirlatici kur

\u{2699}\u{FE0F} *AYARLAR*
\u{2022} \`/setuser <kadi>\` - Hesap degistir
\u{2022} \`/setformat <tip>\` - Format ayarla
\u{2022} \`/setpersona <tip>\` - Persona ayarla
\u{2022} \`/setkey <api_key>\` - XPatla API anahtari
\u{2022} \`/ornekler\` - Komut kullanim ornekleri
\u{2022} \`/clean\` - Ekrani temizle
`;
        sendSafeMessage(bot, msg.chat.id, guide, true);
    });

    // /menu
    bot.onText(/\/menu/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const { targetTwitterUsername, currentFormat, currentPersona } = state.getUserSettings(userId);

        const menuText = `
\u{1F680} *XPatla Bot - Gelismis Kontrol Paneli*

Hos geldin! Tam donanimli viral icerik asistanin hazir.

\u{1F464} *Profil:* @${targetTwitterUsername}
\u{1F3AD} *Persona:* ${currentPersona}
\u{1F3A8} *Format:* ${currentFormat}

\u{1F447} *Ne yapmak istersin?*`;

        bot.sendMessage(chatId, menuText, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '\u{270D}\u{FE0F} Tweet Uret', callback_data: 'quick_tweet' },
                        { text: '\u{1F9F5} Thread Yap', callback_data: 'quick_thread' }
                    ],
                    [
                        { text: '\u{1F504} Remix', callback_data: 'quick_remix' },
                        { text: '\u{1F4AC} Cevap', callback_data: 'quick_reply' },
                        { text: '\u{1F3B2} Fikir', callback_data: 'random_idea' }
                    ],
                    [
                        { text: '\u{1F3D7}\u{FE0F} Frameworks', callback_data: 'show_frameworks' },
                        { text: '\u{1FA9D} Hooks', callback_data: 'show_hooks' },
                        { text: '\u{1F50D} Analiz', callback_data: 'quick_analyze' }
                    ],
                    [
                        { text: '\u{1F4CA} Istatistikler', callback_data: 'show_stats' },
                        { text: '\u{1F4B0} Kredi', callback_data: 'show_credits' },
                        { text: '\u{1F3C6} Rutbe', callback_data: 'show_rank' }
                    ],
                    [
                        { text: '\u{2699}\u{FE0F} Ayarlar', callback_data: 'show_settings' },
                        { text: '\u{2753} Nasil?', callback_data: 'show_help' }
                    ]
                ]
            }
        });
    });

    // /ping
    bot.onText(/\/ping/, (msg) => {
        sendSafeMessage(bot, msg.chat.id, '\u{1F3D3} *Pong!* Baglanti aktif. \u{2705}', true);
    });

    // /ornekler (FREE - auth only)
    bot.onText(/\/ornekler/, (msg) => {
        const userId = msg.from.id;
        const auth = requireAuth(userId);
        if (!auth.authorized) return handleUnauthorized(bot, msg, auth.reason);

        const examples = `
\u{1F680} *VibeEval Tam Kullanim Kilavuzu*

\u{1F4DD} *1. ICERIK URETIMI (Kredi Harcar \u{1F4B3})*
\u{2022} \`/tweet DeepSeek vs ChatGPT\` (Konu bazli tweet)
\u{2022} \`/rastgele\` (Zaman tuneline uygun rastgele tweet)
\u{2022} \`/thread Yazilimda 20 yil kurali\` (5'li tweet serisi)
\u{2022} \`/ab Yapay zeka sanati\` (2 farkli persona ile A/B testi)
\u{2022} \`/remix\` (Yanitla) -> Farkli bir tarzda yeniden yazdirir
\u{2022} \`/reply <url>\` -> Belirli bir tweete en etkili cevabi yazar
\u{2022} \`/cevap\` (Yanitla) -> Cevap menusunu (Mizahi, Karsi Gorus vb.) acar

\u{1F50D} *2. ANALIZ & STRATEJI (Ucretsiz \u{1F193})*
\u{2022} \`/analiz <metin>\` -> Algoritma skorunu hesaplar (0-100)
\u{2022} \`/hesapla\` (Yanitla) -> Mevcut metni detayli analiz eder
\u{2022} \`/vibe\` (Yanitla) -> Metnin duygusal "vibe"ini olcer \u{2705}
\u{2022} \`/viral\` -> Sehrine gore en iyi paylasim saati
\u{2022} \`/gundem\` -> O anki X trendlerini listeler
\u{2022} \`/takvim\` -> Haftalik icerik plani cikarir
\u{2022} \`/rekabet elonmusk\` -> Rakip analizi ve strateji sunar \u{1F4B3}

\u{1F6E0}\u{FE0F} *3. TASLAK & VERIMLILIK (Ucretsiz \u{1F193})*
\u{2022} \`/kaydet\` (Yanitla) -> Tweeti taslaklara ekler
\u{2022} \`/taslaklar\` -> Kayitli taslaklari listeler
\u{2022} \`/sil <id>\` -> Belirli bir taslagi siler
\u{2022} \`/snippet ekle imza Bio'ya tikla!\` -> Kalip kaydeder
\u{2022} \`/snippet imza\` -> Kayitli kalibi getirir
\u{2022} \`/sablon\` -> Hazir icerik sablonlari secer
\u{2022} \`/framework\` -> Viral iskelet kutuphanesini acar \u{1F4B3} \u{2705}
\u{2022} \`/rezerve <id> <saat>\` -> Taslagi saate kurar (Orn: \`/rezerve 123 18:00\`)
\u{2022} \`/prompt\` (Yanitla) -> Tweet icin gorsel uretim promptu hazirlar

\u{2699}\u{FE0F} *4. AYARLAR & HESAP*
\u{2022} \`/kredi\` -> Kalan API kredini gosterir
\u{2022} \`/stats\` -> Kullanim istatistiklerini doker
\u{2022} \`/rutbe\` -> XP ve Rutbe durumunu gosterir
\u{2022} \`/hedef 5\` -> Gunluk tweet hedefini belirler
\u{2022} \`/setuser hrrcnes\` -> X profilini degistirir
\u{2022} \`/setformat punch\` -> Varsayilan yazim formatini ayarlar
\u{2022} \`/setpersona sigma\` -> Varsayilan kisiligi ayarlar
\u{2022} \`/setkey <api_key>\` -> XPatla API anahtarini ayarlar

\u{2728} *5. DIGER*
\u{2022} \`/voice\` (Ses kaydi at) -> Sesi tweet'e cevirir
\u{2022} \`/sabah\` -> Gunluk ozet raporunu sunar
\u{2022} \`/slot\` -> Motivasyon carkini cevirir
\u{2022} \`/clean\` -> Sohbet ekranini temizler
`;
        sendSafeMessage(bot, msg.chat.id, examples, true);
    });
}

module.exports = { register };
