const TREND_TOPICS = [
    'DeepSeek vs ChatGPT',
    'Vibe Coding Devrimi',
    'Yapay Zeka Düzenlemeleri',
    'Junior Yazılımcıların Geleceği',
    'Cursor Editör Tüyoları',
    'No-Code/Low-Code Tartışmaları',
    'AGI Ne Zaman Geliyor?',
    'Teknoloji Bağımlılığı',
    'Algoritma Değişiklikleri'
];

const VALID_FORMATS = ['micro', 'punch', 'classic', 'spark', 'storm', 'longform', 'thunder', 'mega'];
const VALID_PERSONAS = ['authority', 'news', 'shitpost', 'mentalist', 'bilgi', 'sigma', 'doomer', 'hustler'];

const VIRAL_FRAMEWORKS = {
    'case_study': { name: 'Vaka Analizi', description: 'Bir başarının veya projenin analizini yapar.' },
    'bridge': { name: 'Köprü (Before/After)', description: 'Eski vs Yeni hallerin kıyaslandığı dönüşüm hikayesi.' },
    'unpopular': { name: 'Zıt Görüş', description: 'Herkesin aksine savunduğunuz provokatif bir fikir.' },
    'how_to': { name: 'Pratik Rehber', description: 'Adım adım fayda sağlayan liste/rehber.' },
    'viral_story': { name: 'Viral Hikaye (1.8M Style)', description: 'Merak uyandırıcı, duygusal ve algoritma dostu bir hikaye formatı.' },
    'storytelling': { name: 'Hikaye Anlatıcılığı', description: 'Giriş, gelişme ve vurucu bir ders içeren anlatım tarzı.' }
};

const LEGENDARY_VIRAL_TEXT = `bizim şirketteki stajyer çocuk, geçen toplantıda ceonun gözüne girmek için bir proje fikri attı ortaya... (ve gpt-5 ile 4 saatte bitirdi). Artık kod yazmayı değil, vibeı yönetmeyi öğrenmemiz lazım.`;

const XP_MAP = {
    'session_tweets': 10,
    'session_threads': 30,
    'session_replies': 5,
    'session_remixes': 15
};

const RANK_THRESHOLDS = [
    { min: 0, name: '👶 Çaylak' },
    { min: 50, name: '✍️ Yazar' },
    { min: 200, name: '🌟 Fenomen' },
    { min: 500, name: '🤖 Algorithm God' },
    { min: 1000, name: '👑 XPatla CEO' }
];

const BOT_COMMANDS = [
    { command: '/tweet', description: 'Tweet Yaz 💳' },
    { command: '/thread', description: 'Thread Oluştur 💳' },
    { command: '/remix', description: 'Yeniden Yaz (Remix) 💳' },
    { command: '/ab', description: 'A/B Testi 💳' },
    { command: '/framework', description: 'Viral İskeletler 💳' },
    { command: '/voice', description: 'Sesli Tweet Rehberi' },
    { command: '/reply', description: 'Tweete Cevap Ver 💳' },
    { command: '/cevap', description: 'Cevap Seçenekleri 💳' },
    { command: '/rastgele', description: 'Otomatik Tweet 💳' },
    { command: '/rekabet', description: 'Rakip Analizi 💳' },
    { command: '/vibe', description: 'Duygu Analizi 🆓' },
    { command: '/hooks', description: 'Viral Girişler 🆓' },
    { command: '/fikir', description: 'İçerik Fikirleri 🆓' },
    { command: '/analiz', description: 'Metin Analizi 🆓' },
    { command: '/viral', description: 'Paylaşım Saati 🆓' },
    { command: '/gundem', description: 'Trend Konular 🆓' },
    { command: '/takvim', description: 'Haftalık Plan 🆓' },
    { command: '/stats', description: 'İstatistikler 🆓' },
    { command: '/kredi', description: 'Bakiye Sorgula 🆓' },
    { command: '/rutbe', description: 'Rütbe & Streak 🆓' },
    { command: '/hedef', description: 'Günlük Hedef 🆓' },
    { command: '/snippet', description: 'Kayıtlı Parçalar 🆓' },
    { command: '/sablon', description: 'Hazır Şablonlar 🆓' },
    { command: '/kaydet', description: 'Taslağa Sakla 🆓' },
    { command: '/taslaklar', description: 'Taslak Listesi 🆓' },
    { command: '/rezerve', description: 'Yayın Rezerve Et 🆓' },
    { command: '/sabah', description: 'Günlük Rapor 🆓' },
    { command: '/ornekler', description: 'Kullanım Örnekleri 🆓' },
    { command: '/nasil', description: 'Tam Kılavuz 🆓' },
    { command: '/clean', description: 'Ekranı Temizle 🆓' }
];

module.exports = {
    TREND_TOPICS,
    VALID_FORMATS,
    VALID_PERSONAS,
    VIRAL_FRAMEWORKS,
    LEGENDARY_VIRAL_TEXT,
    XP_MAP,
    RANK_THRESHOLDS,
    BOT_COMMANDS
};
