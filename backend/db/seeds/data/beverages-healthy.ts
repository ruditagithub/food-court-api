import type { ThemeTemplate } from './local-culinary'

/**
 * Bank Data Minuman Sehat, Susu Kedelai, Jus Buah Alami, Smoothies, dan Kopi Artisan
 */
export const beveragesHealthyThemes: ThemeTemplate[] = [
  // 1. Susu Kedelai & Minuman Herbal Tradisional
  {
    genre: 'Susu Kedelai & Kembang Tahu',
    nameTemplate: 'Kedai Susu Kedelai Murni & Tahwa 88',
    descTemplate: 'Susu kedelai segar giling harian tanpa pengawet, kembang tahu kuah jahe hangat, dan liang teh',
    categories: [
      {
        name: 'Susu Kedelai Segar',
        items: [
          { name: 'Susu Kedelai Murni Dingin Original', basePrice: 12000, desc: 'Sari kedelai murni segar perasan harian manis pas tanpa bahan pengawet', isDrink: true },
          { name: 'Susu Kedelai Cincau Hitam Grass Jelly', basePrice: 15000, desc: 'Susu kedelai dingin dengan serutan cincau hitam herbal kenyal menyegarkan', isDrink: true },
          { name: 'Susu Kedelai Hangat Gula Aren Asli', basePrice: 14000, desc: 'Susu kedelai panas gurih dengan manis wangi legit sirup gula aren murni', isDrink: true },
          { name: 'Susu Kedelai Matcha Green Tea', basePrice: 18000, desc: 'Perpaduan sari kedelai nabati dengan bubuk teh hijau matcha aromatik', isDrink: true },
          { name: 'Susu Kedelai Cokelat Belgia Dingin', basePrice: 16000, desc: 'Susu kedelai berpadu bubuk kakao cokelat legit kental', isDrink: true },
          { name: 'Susu Kedelai Biji Selasih Pandan', basePrice: 15000, desc: 'Susu kedelai wangi daun pandan bertabur butiran selasih lembut', isDrink: true },
        ],
      },
      {
        name: 'Kembang Tahu & Herbal',
        items: [
          { name: 'Kembang Tahu (Tahwa) Kuah Jahe Hangat', basePrice: 18000, desc: 'Puding tahu sutra lembut selembut awan disiram kuah jahe merah gula merah pedas manis hangat', isDrink: true },
          { name: 'Tahwa Kuah Jahe Topping Kacang Tanah', basePrice: 20000, desc: 'Kembang tahu sutra kuah jahe hangat bertabur kacang tanah sangrai renyah', isDrink: true },
          { name: 'Liang Teh Medan Dingin Pereda Panas Dalam', basePrice: 12000, desc: 'Rebusan aneka daun herbal tradisional cina dingin pereda radang tenggorokan', isDrink: true },
          { name: 'Luo Han Guo Herbal Tea Hangat', basePrice: 14000, desc: 'Seduhan buah biksu luo han guo manis alami tanpa gula', isDrink: true },
        ],
      },
      {
        name: 'Camilan Pendamping Kedelai',
        items: [
          { name: 'Cakwe Goreng Renyah Saus Asam Manis (2 pcs)', basePrice: 10000, desc: 'Roti goreng cakwe berongga renyah gurih dengan saus cabai cocolan' },
          { name: 'Kue Bantal Manis Wijen (2 pcs)', basePrice: 10000, desc: 'Kue goreng manis empuk bertabur biji wijen harum' },
        ],
      },
    ],
  },

  // 2. Fresh Juice & Buah Nusantara
  {
    genre: 'Aneka Jus Buah Nusantara',
    nameTemplate: 'Rumah Jus Buah Segar Murni',
    descTemplate: 'Aneka jus buah asli segar kental: jus alpukat kocok, jus jambu biji merah, dan mangga harum manis',
    categories: [
      {
        name: 'Jus Buah Favorit',
        items: [
          { name: 'Jus Alpukat Kocok Cokelat Kental', basePrice: 20000, desc: 'Daging alpukat mentega segar diblender kental dengan lelehan susu kental manis cokelat di pinggir gelas', isDrink: true },
          { name: 'Jus Jambu Biji Merah Segar Murni', basePrice: 16000, desc: 'Jus buah jambu merah segar kaya vitamin C disaring halus tanpa biji', isDrink: true },
          { name: 'Jus Mangga Gedong Gincu Asli', basePrice: 18000, desc: 'Daging buah mangga gedong harum manis diblender kental dingin', isDrink: true },
          { name: 'Jus Sirsak Bulir Segar Manis Asam', basePrice: 16000, desc: 'Sari buah sirsak putih asam manis segar kaya serat alami', isDrink: true },
          { name: 'Jus Buah Naga Merah Madu', basePrice: 17000, desc: 'Buah naga merah segar antioksidan tinggi dengan tetesan madu murni', isDrink: true },
          { name: 'Jus Belimbing Wuluh Jeruk Nipis', basePrice: 15000, desc: 'Belimbing manis berpadu jeruk nipis segar pelepas dahaga', isDrink: true },
          { name: 'Jus Melon Madu Hijau Segar', basePrice: 15000, desc: 'Melon manis segar dingin pereda panas', isDrink: true },
          { name: 'Jus Wortel Jeruk Peras Segar', basePrice: 18000, desc: 'Wortel manis impor diblender bersama perasan jeruk murni', isDrink: true },
        ],
      },
      {
        name: 'Kombinasi Buah Campur',
        items: [
          { name: 'Jus Mix 3 Rasa (Alpukat, Mangga, Stroberi)', basePrice: 24000, desc: 'Tiga lapisan jus buah segar warna-warni berlapis cantik', isDrink: true },
          { name: 'Jus Tomat Apel Manis Alami', basePrice: 17000, desc: 'Kombinasi tomat segar dan apel fuji kaya nutrisi kulit', isDrink: true },
          { name: 'Jus Semangka Lemon Mint Segar', basePrice: 15000, desc: 'Semangka merah manis diblender dingin dengan perasan lemon dan daun mint', isDrink: true },
        ],
      },
      {
        name: 'Potongan Buah Segar',
        items: [
          { name: 'Piring Buah Segar Campur Dingin', basePrice: 18000, desc: 'Potongan buah melon, semangka, pepaya dan nanas manis segar dengan bumbu rujak terpisah' },
        ],
      },
    ],
  },

  // 3. Smoothies Bowl & Healthy Drink
  {
    genre: 'Smoothies Bowl & Healthy Drink',
    nameTemplate: 'Tropical Acai & Smoothies Bar',
    descTemplate: 'Mangkuk smoothies buah tropis bertabur chia seed, granola madu, dan cold-pressed juice segar',
    categories: [
      {
        name: 'Healthy Smoothie Bowls',
        items: [
          { name: 'Dragonfruit Acai Smoothie Bowl', basePrice: 38000, desc: 'Mangkuk smoothies kental buah naga merah, pisang & berry bertabur granola garing, biji chia, kelapa parut dan irisan kiwi' },
          { name: 'Green Booster Spinach Mango Bowl', basePrice: 38000, desc: 'Smoothie bayam jepang horenzo, mangga manis dan susu almond dengan topping pisang almond renyah' },
          { name: 'Choco Peanut Butter Banana Bowl', basePrice: 36000, desc: 'Smoothies pisang matang, selai kacang murni dan bubuk kakao bertabur potongan cokelat hitam dan granola' },
          { name: 'Berry Berry Good Antioxidant Bowl', basePrice: 42000, desc: 'Perpaduan stroberi, blueberry, raspberry dan yogurt greek dengan taburan biji labu dan madu' },
        ],
      },
      {
        name: 'Cold-Pressed Juices Murni',
        items: [
          { name: 'Green Detox (Kale, Apel Hijau, Timun, Lemon)', basePrice: 28000, desc: 'Jus cold pressed murni tanpa air dan gula untuk detoksifikasi alami tubuh', isDrink: true },
          { name: 'Glowing Skin (Wortel, Apel, Jahe Merah, Lemon)', basePrice: 28000, desc: 'Sari pati wortel segar dan apel dengan sensasi hangat jahe merah', isDrink: true },
          { name: 'Immunity Boost (Jeruk, Nanas, Kunyit, Madu)', basePrice: 28000, desc: 'Jus penyegar daya tahan tubuh tinggi vitamin C dan kurkumin alami', isDrink: true },
        ],
      },
      {
        name: 'Plant-Based Smoothies Minuman',
        items: [
          { name: 'Mango Berry Sunset Smoothie Cup', basePrice: 26000, desc: 'Smoothie mangga dan stroberi dingin dengan yogurt probiotik rendah lemak', isDrink: true },
          { name: 'Almond Milk Iced Matcha Latte', basePrice: 28000, desc: 'Susu almond gurih berpadu seduhan matcha hijau murni dingin', isDrink: true },
        ],
      },
    ],
  },
]
