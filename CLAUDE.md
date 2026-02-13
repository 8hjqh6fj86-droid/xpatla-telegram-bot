# XPatla TG Bot

Telegram botu - XPatla API ile tweet uretme, thread, reply, remix, viral analiz.
Multi-user, invite-only sistem. SQLite veritabani.

## Tech Stack

- **Runtime:** Node.js
- **Telegram:** node-telegram-bot-api (polling)
- **Database:** SQLite (better-sqlite3)
- **HTTP:** axios
- **Config:** dotenv

## Dizin Yapisi

```
bot.js              # Giris noktasi
src/
  config.js         # .env okuma
  state.js          # State manager (SQLite proxy + in-memory context)
  commands/         # Komut handler'lari (tweet, thread, reply, remix, settings, admin, ...)
  callbacks/        # Inline keyboard callback handler'lari
  keyboards/        # Inline keyboard tanimlari
  middleware/       # Auth guard, chat type guard
  services/         # API client factory, viral hesaplama
  db/
    connection.js   # SQLite baglantisi
    schema.js       # Tablo olusturma
    dao/            # Data access (userDao, historyDao, draftsDao, ...)
  handlers/         # Ozel mesaj handler'lari
  utils/            # Constants, helpers
data/               # hooks.json, ideas.json, templates.json
```

## Calistirma

```bash
node bot.js
```

## .env Degiskenleri

```
TELEGRAM_BOT_TOKEN=...
XPATLA_API_BASE_URL=https://xpatla.com/api/v1
ADMIN_USER_ID=<telegram_user_id>
```

API key'ler per-user SQLite'da saklanir (`/setkey` komutu ile).

## Kurallar

- Turkce UI, Turkce degisken isimleri degil (English code)
- Immutability: Object spread ile yeni nesne olustur, mutation yapma
- Kucuk dosyalar: Her modul tek sorumluluk, 200-400 satir hedef
- Her komut handler'i `{ register(bot) }` pattern'i ile export eder
- Hassas komutlar (setkey, mykey, delkey) sadece DM'de calisir
- Grup'ta hassas komut yazilirsa mesaj silinir + DM'de uyari verilir
