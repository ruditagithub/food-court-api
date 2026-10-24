import { localCulinaryThemes, type ThemeTemplate } from './local-culinary'
import { asianInternationalThemes } from './asian-international'
import { westernBrunchThemes } from './western-brunch'
import { beveragesHealthyThemes } from './beverages-healthy'
import { viralDessertsThemes } from './viral-desserts'

export * from './local-culinary'

/**
 * 5 Additional Cultural & Regional Indonesian Themes to reach 30 complete themes
 */
export const additionalNusantaraThemes: ThemeTemplate[] = [
  // 26. Sate Nusantara
  {
    genre: 'Sate Khas Nusantara',
    nameTemplate: 'Sate Senayan Warisan Nusantara',
    descTemplate: 'Aneka sate daging pilihan: sate ayam bumbu kacang halus, sate kambing muda kecap, dan sate taichan',
    categories: [
      {
        name: 'Sate Pilihan Daging',
        items: [
          { name: 'Sate Ayam Madura Saus Kacang Halus (10 tusuk)', basePrice: 35000, desc: 'Daging ayam paha empuk juicy dibakar arang disiram saus kacang tanah gurih lembut dan kecap manis' },
          { name: 'Sate Kambing Muda Bumbu Kecap Rawit (10 tusuk)', basePrice: 48000, desc: 'Daging kambing muda empuk tanpa aroma prengus dengan cocolan kecap manis, bawang merah dan cabai rawit merah' },
          { name: 'Sate Maranggi Sapi Purwakarta (10 tusuk)', basePrice: 45000, desc: 'Daging sapi marinasi bumbu ketumbar gula merah disajikan dengan sambal tomat segar asam pedas' },
          { name: 'Sate Taichan Daging Dada Ayam Sambal Bawang (10 tusuk)', basePrice: 28000, desc: 'Sate ayam bakar polos gurih asin disajikan dengan perasan jeruk nipis dan ulekan sambal cabai rawit pedas menyengat' },
          { name: 'Sate Kulit Ayam Goreng Crispy Gurih (5 tusuk)', basePrice: 20000, desc: 'Kulit ayam garing renyah bertabur bumbu gurih rempah' },
        ],
      },
      {
        name: 'Lontong & Pendamping',
        items: [
          { name: 'Lontong Daun Pisang Lembut (2 pcs)', basePrice: 8000, desc: 'Lontong beras pulen harum daun pisang' },
          { name: 'Gulai Kambing Kuah Rempah Panas', basePrice: 32000, desc: 'Kuah gulai santan berempah hangat dengan potongan daging kambing empuk' },
        ],
      },
      {
        name: 'Minuman Penutup',
        items: [
          { name: 'Es Cincau Hitam Sirup Pandan', basePrice: 12000, desc: 'Cincau hitam kenyal dingin berpadu sirup pandan wangi', isDrink: true },
          { name: 'Es Teh Manis Dingin Segar', basePrice: 6000, desc: 'Teh melati dingin segar', isDrink: true },
        ],
      },
    ],
  },

  // 27. Kwetiau & Chinese Wok
  {
    genre: 'Kwetiau Sapi & Wok Express',
    nameTemplate: 'Kwetiau Sapi 78 Mangga Besar',
    descTemplate: 'Kwetiau beras wangi asap smokey wajan panas dengan irisan daging sapi sengkel, babat dan urat empuk',
    categories: [
      {
        name: 'Kwetiau & Mie Wok',
        items: [
          { name: 'Kwetiau Goreng Sapi Komplit Asap Wok', basePrice: 42000, desc: 'Kwetiau beras ditumis api besar dengan irisan daging sapi, babat, tauge, telur bebek dan aroma smokey wajan' },
          { name: 'Kwetiau Siram Sapi Kuah Kental Telur', basePrice: 44000, desc: 'Kwetiau goreng garing disiram kuah kental kaldu sapi, irisan daging sapi empuk, sawi hijau dan telur' },
          { name: 'Kwetiau Bun Sapi Kuah Nyemek Gurih', basePrice: 44000, desc: 'Kwetiau berkuah nyemek sedikit gurih kental bumbu bawang putih dan kecap ikan' },
          { name: 'Bakmi Goreng Ayam Seafood Koki Wok', basePrice: 38000, desc: 'Mie telur kenyal goreng bumbu kecap gurih dengan suwiran ayam, bakso ikan dan udang' },
          { name: 'Bihun Goreng Bebek Jamur Shiitake', basePrice: 42000, desc: 'Bihun beras lembut ditumis suwiran daging bebek gurih dan jamur hioko' },
        ],
      },
      {
        name: 'Sup Daging Sapi',
        items: [
          { name: 'Sup Daging Sapi Urat Sengkel Kuah Bening', basePrice: 38000, desc: 'Potongan daging sengkel empuk dan urat sapi kenyal dalam kuah kaldu rempah bening bertabur seledri' },
          { name: 'Bakso Sapi Urat Kuah Kaldu (5 pcs)', basePrice: 28000, desc: 'Bakso sapi urat kenyal gurih dalam semangkuk kaldu sapi panas' },
        ],
      },
      {
        name: 'Minuman Segar',
        items: [
          { name: 'Es Liang Teh Cincau Dingin', basePrice: 12000, desc: 'Seduhan herbal liang teh dingin dengan serutan cincau hitam', isDrink: true },
          { name: 'Es Jeruk Sonkit Asam Manis', basePrice: 14000, desc: 'Jeruk kesturi sonkit peras dengan aroma khas segar dingin', isDrink: true },
        ],
      },
    ],
  },

  // 28. Sei Sapi Khas Kupang NTT
  {
    genre: 'Sei Sapi Asap Khas Kupang',
    nameTemplate: 'Sei Sapi Asap Aroma Kosambi',
    descTemplate: 'Daging sapi asap pengasapan kayu kosambi tradisional dengan sambal lu at asam pedas dan rumpu rampe',
    categories: [
      {
        name: 'Paket Nasi Sei Sapi',
        items: [
          { name: 'Paket Nasi Sei Sapi Sambal Luat Khas Kupang', basePrice: 42000, desc: 'Nasi, irisan daging sapi asap aroma kayu kosambi garing juicy, tumis rumpu rampe daun singkong, kuah kaldu dan sambal luat asam pedas fermentasi' },
          { name: 'Paket Nasi Sei Sapi Sambal Matah Bali', basePrice: 42000, desc: 'Daging sapi asap disajikan dengan sambal matah serai minyak kelapa wangi' },
          { name: 'Paket Nasi Sei Sapi Sambal Ijo Padang', basePrice: 40000, desc: 'Daging sapi asap berpadu ulekan cabai hijau tomat hijau gurih' },
          { name: 'Sei Ayam Asap Sambal Rica Manado', basePrice: 35000, desc: 'Fillet ayam asap juicy dengan siraman sambal rica pedas menyala' },
          { name: 'Sei Sapi Porsi Jumbo 150g Daging Asap Murni', basePrice: 58000, desc: 'Porsi besar daging sapi asap tanpa nasi untuk kepuasan pecinta daging' },
        ],
      },
      {
        name: 'Sayur & Ekstra',
        items: [
          { name: 'Tumis Rumpu Rampe Bunga Pepaya', basePrice: 16000, desc: 'Tumisan daun singkong dan bunga pepaya gurih tanpa rasa pahit' },
          { name: 'Sambal Luat Ekstra Mangkuk Kecil', basePrice: 6000, desc: 'Sambal khas timor dengan perasan jeruk nipis dan daun suli' },
          { name: 'Kuah Kaldu Sapi Asap Hangat', basePrice: 6000, desc: 'Semangkuk kaldu sapi hangat beraroma asap harum' },
        ],
      },
      {
        name: 'Minuman Dingin',
        items: [
          { name: 'Es Gula Asam Dingin Segar', basePrice: 10000, desc: 'Minuman asam jawa berpadu gula merah dingin penyegar dahaga', isDrink: true },
          { name: 'Es Teh Manis Melati', basePrice: 6000, desc: 'Teh melati dingin manis segar', isDrink: true },
        ],
      },
    ],
  },

  // 29. Nasi Uduk Betawi
  {
    genre: 'Nasi Uduk & Betawi',
    nameTemplate: 'Nasi Uduk Kebon Kacang Bang Udin',
    descTemplate: 'Nasi uduk kukus santan pandan gurih dibungkus daun pisang dengan semur tahu kentang dan ayam goreng',
    categories: [
      {
        name: 'Sajian Nasi Uduk Betawi',
        items: [
          { name: 'Paket Nasi Uduk Ayam Goreng Kampung Kalasan', basePrice: 38000, desc: 'Nasi uduk gurih daun pisang, ayam kampung goreng bumbu laos, tahu tempe, bihun goreng, sambal kacang & kerupuk' },
          { name: 'Paket Nasi Uduk Empal Daging Sapi Serundeng', basePrice: 40000, desc: 'Nasi uduk beraroma serai daun salam dengan empal sapi manis gurih dan serundeng' },
          { name: 'Paket Nasi Uduk Semur Telur Tahu Tempe', basePrice: 28000, desc: 'Nasi uduk disiram kuah semur kecap betawi manis gurih berempah cengkeh' },
          { name: 'Nasi Uduk Bebek Goreng Betawi', basePrice: 42000, desc: 'Bebek goreng garing berpadu nasi uduk santan pulen dan sambal terasi terong' },
        ],
      },
      {
        name: 'Lauk Satuan & Baceman',
        items: [
          { name: 'Semur Jengkol Betawi Empuk Legit', basePrice: 20000, desc: 'Jengkol tua empuk dimasak kuah semur manis pekat tidak berbau tajam' },
          { name: 'Bakwan Udang Sayur Renyah (2 pcs)', basePrice: 12000, desc: 'Gorengan bakwan sayur renyah dengan udang utuh di atasnya' },
          { name: 'Bihun Goreng Betawi Porsi Piring', basePrice: 14000, desc: 'Bihun goreng kecap manis dengan irisan sawi dan kol gurih' },
        ],
      },
      {
        name: 'Minuman Khas Betawi',
        items: [
          { name: 'Bir Pletok Rempah Betawi Dingin', basePrice: 14000, desc: 'Minuman non-alkohol dari jahe, kayu secang, serai dan kapulaga segar dingin berkhasiat', isDrink: true },
          { name: 'Es Selendang Mayang Betawi', basePrice: 16000, desc: 'Kue kenyal warna-warni dari tepung hunkwe disiram santan dan sirup gula merah es serut', isDrink: true },
        ],
      },
    ],
  },

  // 30. Mie Aceh & Serambi Mekkah
  {
    genre: 'Mie Aceh & Kari Melayu',
    nameTemplate: 'Mie Aceh Razali Serambi Mekkah',
    descTemplate: 'Mie kuning tebal bumbu kari rempah aceh pedas pekat dengan irisan daging sapi dan kepiting',
    categories: [
      {
        name: 'Mie Aceh Spesial',
        items: [
          { name: 'Mie Aceh Goreng Daging Sapi Rempah Pedas', basePrice: 38000, desc: 'Mie kuning tebal digoreng bumbu kari 16 rempah aceh pekat, potongan daging sapi, emping & acar bawang merah' },
          { name: 'Mie Aceh Kuah Nyemek Kepiting Laut', basePrice: 52000, desc: 'Mie aceh berkuah nyemek kental merah menyala dengan potongan kepiting laut segar gurih' },
          { name: 'Mie Aceh Tumis Udang Cumi Seafood', basePrice: 42000, desc: 'Mie aceh ditumis kuah kental dengan udang windu dan cumi segar beraroma kari wangi' },
          { name: 'Nasi Goreng Aceh Daging Kambing', basePrice: 42000, desc: 'Nasi goreng bumbu kari aceh pekat dengan potongan daging kambing gurih dan emping melinjo' },
        ],
      },
      {
        name: 'Roti Canai & Martabak Aceh',
        items: [
          { name: 'Roti Canai Kuah Kari Kambing Aceh', basePrice: 28000, desc: 'Roti canai garing gurih disajikan dengan semangkuk kari kambing pekat rempah aceh' },
          { name: 'Martabak Telur Kulit Tipis Khas Aceh', basePrice: 24000, desc: 'Roti canai dibalut telur kocok daun bawang digoreng garing renyah' },
        ],
      },
      {
        name: 'Kopi & Minuman Khas Aceh',
        items: [
          { name: 'Kopi Sanger Dingin Khas Ulee Kareng', basePrice: 16000, desc: 'Kopi saring tubruk aceh ditarik dengan susu kental manis berbusa lembut dingin', isDrink: true },
          { name: 'Kopi Tarik Hitam Gayo Single Origin', basePrice: 15000, desc: 'Kopi arabika gayo aceh seduh saring ditarik tinggi harum aroma rempah buah', isDrink: true },
          { name: 'Es Timun Serut Asam Manis', basePrice: 11000, desc: 'Parutan mentimun segar dengan perasan jeruk nipis dan sirup gula', isDrink: true },
        ],
      },
    ],
  },
]

/**
 * All 30 Handcrafted, Deeply Authentic Indonesian & Global Themes
 */
export const allCuratedThemes: ThemeTemplate[] = [
  ...localCulinaryThemes,       // 8 themes
  ...asianInternationalThemes,  // 5 themes
  ...westernBrunchThemes,       // 4 themes
  ...beveragesHealthyThemes,    // 3 themes
  ...viralDessertsThemes,       // 5 themes
  ...additionalNusantaraThemes, // 5 themes
]
