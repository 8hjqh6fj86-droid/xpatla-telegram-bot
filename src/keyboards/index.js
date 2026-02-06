/**
 * XPatla Bot - Keyboard Modülü
 * Tüm inline keyboard'ları burada tanımlıyoruz
 */

// Ana menü keyboard
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '✍️ Tweet Üret', callback_data: 'menu_tweet' },
                { text: '🧵 Thread Oluştur', callback_data: 'menu_thread' }
            ],
            [
                { text: '💬 Reply Yaz', callback_data: 'menu_reply' },
                { text: '🔄 Remix', callback_data: 'menu_remix' }
            ],
            [
                { text: '🔥 Viral Frameworkler', callback_data: 'menu_frameworks' },
                { text: '💡 Fikirler', callback_data: 'menu_ideas' }
            ],
            [
                { text: '📊 İstatistikler', callback_data: 'menu_stats' },
                { text: '⚙️ Ayarlar', callback_data: 'menu_settings' }
            ]
        ]
    }
};

// Format seçim keyboard
const formatMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '👊 Punch', callback_data: 'format_punch' },
                { text: '📖 Story', callback_data: 'format_story' }
            ],
            [
                { text: '🧵 Thread', callback_data: 'format_thread' },
                { text: '🔥 Viral', callback_data: 'format_viral' }
            ],
            [
                { text: '🎭 Bilgelik', callback_data: 'format_wisdom' },
                { text: '📊 İstatistik', callback_data: 'format_stat' }
            ],
            [{ text: '◀️ Geri', callback_data: 'back_main' }]
        ]
    }
};

// Persona seçim keyboard
const personaMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '🔮 Vibe Coder', callback_data: 'persona_vibe_coding' },
                { text: '🤖 Algorithm God', callback_data: 'persona_algorithm_god' }
            ],
            [
                { text: '🌐 Virtual Entity', callback_data: 'persona_virtual_entity' },
                { text: '💪 Disiplin', callback_data: 'persona_discipline_motivation' }
            ],
            [{ text: '◀️ Geri', callback_data: 'back_main' }]
        ]
    }
};

// Framework seçim keyboard
const frameworkMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '🎬 VİRAL HİKAYE', callback_data: 'fw_viral_story' }],
            [{ text: '🔥 UNPOPULAR OPİNİON', callback_data: 'fw_unpopular' }],
            [{ text: '🎯 PROBLEMLİ ÇÖZÜM', callback_data: 'fw_problem_solution' }],
            [{ text: '❓ DİKKAT ÇEKİCİ SORU', callback_data: 'fw_attention_question' }],
            [{ text: '📝 LİSTE FORMAT', callback_data: 'fw_list' }],
            [{ text: '⚡ KISA VE ETKİLİ', callback_data: 'fw_short_impact' }],
            [{ text: '🧠 DERİN DÜŞÜNCE', callback_data: 'fw_deep_thought' }],
            [{ text: '◀️ Geri', callback_data: 'back_main' }]
        ]
    }
};

// Onay keyboard
const confirmMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '✅ Evet', callback_data: 'confirm_yes' },
                { text: '❌ Hayır', callback_data: 'confirm_no' }
            ]
        ]
    }
};

// Tweet aksiyonları keyboard
function tweetActions(tweetId) {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📋 Kopyala', callback_data: `copy_${tweetId}` },
                    { text: '🔄 Yenile', callback_data: `regen_${tweetId}` }
                ],
                [
                    { text: '💾 Taslak Kaydet', callback_data: `draft_${tweetId}` },
                    { text: '📊 Skor', callback_data: `score_${tweetId}` }
                ]
            ]
        }
    };
}

// Pagination keyboard
function paginationKeyboard(currentPage, totalPages, prefix) {
    const buttons = [];

    if (currentPage > 0) {
        buttons.push({ text: '◀️ Önceki', callback_data: `${prefix}_page_${currentPage - 1}` });
    }

    buttons.push({ text: `${currentPage + 1}/${totalPages}`, callback_data: 'noop' });

    if (currentPage < totalPages - 1) {
        buttons.push({ text: 'Sonraki ▶️', callback_data: `${prefix}_page_${currentPage + 1}` });
    }

    return {
        reply_markup: {
            inline_keyboard: [
                buttons,
                [{ text: '◀️ Geri', callback_data: 'back_main' }]
            ]
        }
    };
}

module.exports = {
    mainMenu,
    formatMenu,
    personaMenu,
    frameworkMenu,
    confirmMenu,
    tweetActions,
    paginationKeyboard
};
