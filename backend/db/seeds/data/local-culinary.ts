/**
 * Bank Data Kuliner Tradisional & Lokal Nusantara
 */

export interface MenuItemTemplate {
  name: string
  basePrice: number
  desc: string
  isDrink?: boolean
  options?: { name: string; priceAdjustment: number }[]
}

export interface CategoryTemplate {
  name: string
  items: MenuItemTemplate[]
}

export interface ThemeTemplate {
  genre: string
  nameTemplate: string
  descTemplate: string
  categories: CategoryTemplate[]
}

export const localCulinaryThemes: ThemeTemplate[] = [
  // 1. Rawon Jawa Timur
  {
    genre: 'Rawon & Daging Sapi',
    nameTemplate: 'Rawon Nguling Legendaris',
    descTemplate: 'Rawon daging sapi empal dengan kuah hitam kluwek kaya rempah khas Probolinggo',
    categories: [
      {
        name: 'Sajian Rawon Utama',
        items: [
          { name: 'Rawon Daging Empal Spesial', basePrice: 38000, desc: 'Potongan empal sapi empuk dengan kuah kluwek pekat dan sambal terasi' },
          { name: 'Rawon Iga Sapi Bakar', basePrice: 52000, desc: 'Iga sapi empuk dibakar saus kecap disajikan bersama semangkuk rawon panas' },
          { name: 'Rawon Buntut Sapi Kuah Gurih', basePrice: 58000, desc: 'Buntut sapi lembut dengan kuah kaldu rempah hitam gurih' },
          { name: 'Rawon Daging Suwir & Babat', basePrice: 34000, desc: 'Suwiran daging sapi dan babat empuk bumbu rempah' },
          { name: 'Rawon Dengkul Sapi Jumbo', basePrice: 48000, desc: 'Tulang dengkul dan sumsum sapi dengan kuah rawon mendidih' },
          { name: 'Nasi Pecel Rawon Komplit', basePrice: 36000, desc: 'Nasi pecel pincang diguyur kuah rawon kluwek dan rempeyek kacang' },
        ],
      },
      {
        name: 'Lauk Pilihan & Pelengkap',
        items: [
          { name: 'Empal Daging Goreng Ketumbar', basePrice: 17000, desc: 'Daging sapi pipih gurih manis beraroma ketumbar wangi' },
          { name: 'Paru Goreng Serundeng', basePrice: 16000, desc: 'Paru sapi ungkep digoreng renyah bertabur kelapa bumbu' },
          { name: 'Mendol Tempe Khas Malang (3 pcs)', basePrice: 10000, desc: 'Olahan tempe fermentasi bumbu kencur pedas gurih' },
          { name: 'Telur Asin Masir Brebes', basePrice: 7000, desc: 'Telur bebek asin dengan kuning telur masir gurih' },
          { name: 'Perkedel Kentang Daging Cincang', basePrice: 8000, desc: 'Perkedel kentang lembut padat isi daging sapi' },
          { name: 'Kerupuk Kulit Sapi Renyah', basePrice: 9000, desc: 'Kerupuk rambak kulit sapi asli gurih tanpa bahan pengawet' },
        ],
      },
      {
        name: 'Minuman Penutup',
        items: [
          { name: 'Es Sinom Asam Madu Segar', basePrice: 10000, desc: 'Rebusan daun asam muda dan kunyit segar dengan madu alami', isDrink: true },
          { name: 'Es Beras Kencur Gula Jawa', basePrice: 12000, desc: 'Jamu beras kencur manis legit pereda lelah', isDrink: true },
          { name: 'Es Teh Manis Melati Dingin', basePrice: 6000, desc: 'Seduhan teh melati wangi gula asli dingin segar', isDrink: true },
          { name: 'Es Jeruk Nipis Peras', basePrice: 9000, desc: 'Perasan jeruk nipis murni dengan es batu', isDrink: true },
        ],
      },
    ],
  },

  // 2. Soto Lamongan & Ayam Kampung
  {
    genre: 'Soto Nusantara',
    nameTemplate: 'Soto Lamongan Asli Cak Har',
    descTemplate: 'Soto ayam kampung kuah kuning gurih dengan taburan koya udang renyah melimpah',
    categories: [
      {
        name: 'Menu Soto Pilihan',
        items: [
          { name: 'Soto Ayam Kampung Koya Komplit', basePrice: 32000, desc: 'Suwiran ayam kampung, soun, telur rebus, dan koya udang gurih' },
          { name: 'Soto Daging Sengkel Madura', basePrice: 38000, desc: 'Daging sengkel sapi lembut dengan kuah bening kaldu rempah' },
          { name: 'Soto Ayam Ceker & Kulit Garing', basePrice: 28000, desc: 'Ceker lunak berpadu kulit krispi dalam kuah soto panas' },
          { name: 'Soto Uritan Telur Muda Spesial', basePrice: 42000, desc: 'Soto kuah kuning kental dengan telur muda istimewa' },
          { name: 'Soto Babat & Kikil Sapi Lembut', basePrice: 35000, desc: 'Jeroan babat dan kikil empuk dengan aroma seledri wangi' },
          { name: 'Soto Ayam Jumbo Dobel Daging', basePrice: 40000, desc: 'Porsi besar ayam suwir melimpah untuk selera mantap' },
        ],
      },
      {
        name: 'Pelengkap & Ekstra',
        items: [
          { name: 'Koya Udang Gurih (Porsi Mangkuk)', basePrice: 6000, desc: 'Koya kerupuk udang renyah gurih penambah kenikmatan soto' },
          { name: 'Sate Usus Ayam Bacem Goreng', basePrice: 6000, desc: 'Sate usus bumbu bacem digoreng legit gurih' },
          { name: 'Sate Telur Puyuh Manis Gurih', basePrice: 7000, desc: 'Telur puyuh bumbu kecap manis rempah Jawa' },
          { name: 'Sate Ati Ampela Goreng', basePrice: 7000, desc: 'Ati ampela ayam ungkep bumbu kuning' },
          { name: 'Tempe Goreng Tepung Crispy (3 pcs)', basePrice: 10000, desc: 'Tempe goreng tepung daun bawang dengan cocolan sambal petis' },
        ],
      },
      {
        name: 'Minuman Segar',
        items: [
          { name: 'Es Jeruk Manis Peras Asli', basePrice: 9000, desc: 'Perasan jeruk manis murni dingin segar', isDrink: true },
          { name: 'Es Teh Manis Melati Jumbo', basePrice: 8000, desc: 'Teh melati porsi gelas besar dengan es kristal', isDrink: true },
          { name: 'Es Kelapa Muda Gula Aren', basePrice: 14000, desc: 'Daging kelapa muda serut dengan sirup gula aren kental', isDrink: true },
        ],
      },
    ],
  },

  // 3. Masakan Minang & Nasi Padang
  {
    genre: 'Nasi Padang & Minang',
    nameTemplate: 'Nasi Padang Salero Bundo',
    descTemplate: 'Sajian otentik Bukittinggi dengan rendang kayu bakar 8 jam dan santan rempah pekat',
    categories: [
      {
        name: 'Lauk Rendang & Balado',
        items: [
          { name: 'Paket Nasi Rendang Daging Sapi Asli', basePrice: 38000, desc: 'Nasi hangat, rendang daging sapi empuk hitam pekat, daun singkong, gulai nangka & sambal ijo' },
          { name: 'Paket Nasi Ayam Pop Minang', basePrice: 34000, desc: 'Ayam kampung gurih dimasak air kelapa disajikan dengan sambal tomat merah' },
          { name: 'Paket Dendeng Batokok Balado Cabe Merah', basePrice: 42000, desc: 'Daging sapi pipih renyah diguyur minyak cabai merah ulek kasar' },
          { name: 'Paket Dendeng Lambok Balado Basah', basePrice: 40000, desc: 'Dendeng empuk juicy berlumur sambal balado merah segar' },
          { name: 'Ayam Gulai Kurma Rempah Minang', basePrice: 28000, desc: 'Potongan ayam empuk dengan kuah gulai kuning harum kapulaga' },
          { name: 'Ayam Bakar Bumbu Padang', basePrice: 28000, desc: 'Ayam panggang bumbu santan pedas gurih beraroma asap harum' },
        ],
      },
      {
        name: 'Gulai & Olahan Seafood',
        items: [
          { name: 'Gulai Tunjang Kikil Sapi Lembut', basePrice: 38000, desc: 'Kikil kaki sapi empuk kenyal disiram kuah gulai santan kental' },
          { name: 'Gulai Kepala Ikan Kakap Merah', basePrice: 65000, desc: 'Kepala kakap segar berukuran besar dalam kuah asam pedas gurih' },
          { name: 'Gulai Cumi Isi Tahu Telur', basePrice: 36000, desc: 'Cumi segar utuh berbalut kuah santan kuning pekat' },
          { name: 'Paru Sapi Balado Crispy', basePrice: 22000, desc: 'Irisan paru goreng renyah bumbu cabai merah balado' },
          { name: 'Telur Dadar Barendo Khas Minang', basePrice: 15000, desc: 'Telur bebek dadar tebal renyah berserat daun bawang' },
        ],
      },
      {
        name: 'Minuman Khas Minang',
        items: [
          { name: 'Teh Talua Telur Bebek Kocok', basePrice: 16000, desc: 'Teh tubruk berbusa lembut dengan kocokan kuning telur bebek dan kayu manis', isDrink: true },
          { name: 'Es Tebak Cendol Minang', basePrice: 15000, desc: 'Es serut tapai ketan hitam, mie beras tebak kenyal, kolang-kaling dan santan', isDrink: true },
          { name: 'Es Jeruk Nipis Murni', basePrice: 10000, desc: 'Jeruk nipis peras dingin pembersih langit-langit lidah', isDrink: true },
        ],
      },
    ],
  },

  // 4. Gudeg Khas Yogyakarta
  {
    genre: 'Gudeg & Kuliner Mataram',
    nameTemplate: 'Gudeg Yu Djum Wijilan',
    descTemplate: 'Gudeg nangka muda kering manis legit bumbu kelapa dengan sambal krecek pedas',
    categories: [
      {
        name: 'Paket Gudeg Komplit',
        items: [
          { name: 'Nasi Gudeg Komplit Ayam Paha Atas', basePrice: 42000, desc: 'Nasi, gudeg nangka kering, opor ayam paha atas, krecek kacang tolo, dan telur bacem' },
          { name: 'Nasi Gudeg Dada Ayam Kampung', basePrice: 45000, desc: 'Dada ayam kampung empuk disandingkan gudeg manis gurih dan krecek pedas' },
          { name: 'Nasi Gudeg Telur & Tahu Bacem', basePrice: 28000, desc: 'Paket ekonomis nasi gudeg dengan telur bebek bacem dan tahu basah' },
          { name: 'Nasi Gudeg Suwir Ayam Krecek Mercon', basePrice: 34000, desc: 'Ayam suwir gurih berpadu sambal goreng krecek ekstra pedas' },
          { name: 'Nasi Gudeg Ati Ampela Bacem', basePrice: 32000, desc: 'Ati ampela bumbu manis bacem dengan areh santan kental' },
        ],
      },
      {
        name: 'Lauk Tambahan & Baceman',
        items: [
          { name: 'Sambal Goreng Krecek Pedas (Porsi Piring)', basePrice: 18000, desc: 'Kulit sapi krecek kenyal gurih dengan cabai rawit utuh' },
          { name: 'Tahu & Tempe Bacem Gula Aren (2 pcs)', basePrice: 12000, desc: 'Baceman legit manis bumbu ketumbar dan gula kelapa asli' },
          { name: 'Telur Bebek Bacem Utuh', basePrice: 8000, desc: 'Telur bebek cokelat manis legit bumbu meresap sampai ke kuning' },
          { name: 'Opor Ayam Kampung Potong', basePrice: 24000, desc: 'Ayam kampung kuah opor santan putih gurih harum serai' },
        ],
      },
      {
        name: 'Minuman Khas Jogja',
        items: [
          { name: 'Wedang Ronde Jahe Wangi', basePrice: 14000, desc: 'Bola ketan kenyal isi kacang tanah dalam kuah jahe hangat wangi pandan', isDrink: true },
          { name: 'Es Beras Kencur Karamel', basePrice: 12000, desc: 'Minuman rempah beras kencur dingin pereda lelah', isDrink: true },
          { name: 'Es Teh Manis Gula Batu', basePrice: 7000, desc: 'Teh melati seduh panas disajikan dengan gula batu dan es', isDrink: true },
        ],
      },
    ],
  },

  // 5. Pempek Asli Palembang
  {
    genre: 'Pempek & Kuliner Palembang',
    nameTemplate: 'Pempek Pak Raden Palembang',
    descTemplate: 'Pempek ikan tenggiri asli dengan kuah cuko hitam kental manis asam pedas gula batok',
    categories: [
      {
        name: 'Pempek Satuan & Porsi',
        items: [
          { name: 'Pempek Kapal Selam Telur Utuh', basePrice: 26000, desc: 'Pempek adonan ikan tenggiri goreng garing berisi telur bebek utuh' },
          { name: 'Pempek Lenjer Besar Potong', basePrice: 24000, desc: 'Lenjer panjang ikan tenggiri kenyal gurih digoreng renyah' },
          { name: 'Porsi Pempek Campur (4 pcs)', basePrice: 32000, desc: 'Kombinasi pempek adaan, kulit krispi, keriting, dan telur kecil' },
          { name: 'Pempek Kulit Crispy Gurih', basePrice: 18000, desc: 'Pempek kulit ikan renyah garing beraroma gurih wangi bawang' },
          { name: 'Pempek Adaan Bawang (3 pcs)', basePrice: 20000, desc: 'Pempek bulat kenyal dengan campuran irisan bawang merah gurih' },
          { name: 'Tekwan Kuah Kaldu Udang', basePrice: 28000, desc: 'Butiran adonan ikan kenyal dengan jamur kuping, bengkuang, dan bunga sedap malam' },
          { name: 'Model Ikan Tahu Kuah Bening', basePrice: 28000, desc: 'Pempek isi tahu lembut disajikan dengan kuah kaldu udang hangat' },
        ],
      },
      {
        name: 'Minuman Penyegar',
        items: [
          { name: 'Es Kacang Merah Santan Gurih', basePrice: 18000, desc: 'Kacang merah empuk manis berpadu es serut, sirup mawar & susu kental manis', isDrink: true },
          { name: 'Es Jeruk Kunci Bangka Segar', basePrice: 12000, desc: 'Jeruk kunci harum asam segar dengan sirup gula murni', isDrink: true },
          { name: 'Es Teh Manis Dingin', basePrice: 6000, desc: 'Teh melati dingin penyegar setelah makan pempek', isDrink: true },
        ],
      },
    ],
  },

  // 6. Bebek & Ayam Goreng Madura
  {
    genre: 'Bebek & Unggas Madura',
    nameTemplate: 'Bebek Madura Bumbu Hitam Cak Yasin',
    descTemplate: 'Bebek goreng empuk dengan lumuran bumbu rempah hitam pedas pekat dan sambal mangga',
    categories: [
      {
        name: 'Sajian Bebek & Ayam',
        items: [
          { name: 'Nasi Bebek Bumbu Hitam Pedas', basePrice: 38000, desc: 'Bebek goreng garing dengan lumuran bumbu rempah hitam pedas medok' },
          { name: 'Nasi Bebek Goreng Kremes Sambal Korek', basePrice: 36000, desc: 'Bebek ungkep gurih dengan taburan kremesan renyah dan sambal korek bawang' },
          { name: 'Bebek Bakar Kecap Bumbu Madura', basePrice: 40000, desc: 'Bebek bakar manis pedas aroma arang dengan cocolan sambal pencit' },
          { name: 'Ayam Goreng Bumbu Hitam Rempah', basePrice: 28000, desc: 'Ayam pejantan empuk dengan lumuran bumbu hitam berminyak gurih' },
          { name: 'Ayam Bakar Bumbu Rujak Pedas', basePrice: 29000, desc: 'Ayam panggang bumbu santan kelapa pedas manis khas Jawa' },
          { name: 'Bebek Goreng Paha Utuh Jumbo', basePrice: 44000, desc: 'Potongan paha bebek ukuran besar dengan serundeng laos melimpah' },
        ],
      },
      {
        name: 'Lalapan & Sayur',
        items: [
          { name: 'Sayur Asem Segar Jagung Manis', basePrice: 14000, desc: 'Sayur asem bening menyegarkan pelepas dahaga' },
          { name: 'Plecing Kangkung Sambal Terasi', basePrice: 15000, desc: 'Kangkung rebus segar dengan siraman sambal tomat terasi pedas' },
          { name: 'Tahu & Tempe Goreng Kuning (4 pcs)', basePrice: 10000, desc: 'Tahu tempe ungkep kunyit digoreng hangat' },
          { name: 'Sambal Pencit Mangga Muda Ekstra', basePrice: 6000, desc: 'Parutan mangga muda pedas asam segar penambah nafsu makan' },
        ],
      },
      {
        name: 'Minuman Pendamping',
        items: [
          { name: 'Es Timun Serut Jeruk Nipis', basePrice: 11000, desc: 'Serutan mentimun segar penurun kolesterol berpadu perasan jeruk nipis', isDrink: true },
          { name: 'Es Teh Tawar Segar', basePrice: 4000, desc: 'Teh melati dingin tanpa gula', isDrink: true },
          { name: 'Es Jeruk Nipis Madu', basePrice: 12000, desc: 'Kombinasi asam jeruk nipis dan madu alami dingin', isDrink: true },
        ],
      },
    ],
  },

  // 7. Kuliner Bali & Lombok
  {
    genre: 'Kuliner Khas Bali & Lombok',
    nameTemplate: 'Ayam Betutu Khas Gilimanuk',
    descTemplate: 'Ayam betutu bumbu base genep rempah 15 jenis dengan kuah pedas dan sambal matah wangi',
    categories: [
      {
        name: 'Menu Utama Betutu & Lilit',
        items: [
          { name: 'Paket Nasi Ayam Betutu Kuah Pedas', basePrice: 38000, desc: 'Ayam empuk bumbu base genep Bali, kuah pedas, kacang goreng, kangkung & sambal matah' },
          { name: 'Ayam Betutu Panggang Bumbu Rempah', basePrice: 40000, desc: 'Ayam panggang oven bumbu Bali wangi daun pisang' },
          { name: 'Paket Sate Lilit Ayam Batang Serai (5 tusuk)', basePrice: 35000, desc: 'Sate adonan daging ayam cincang, parutan kelapa muda & rempah dililitkan serai' },
          { name: 'Nasi Campur Bali Komplit Halal', basePrice: 42000, desc: 'Nasi dengan suwiran ayam sisit, sate lilit, telur pedas, lawar kacang panjang & sambal embe' },
          { name: 'Ayam Taliwang Bakar Pedas Khas Lombok', basePrice: 42000, desc: 'Ayam kampung bakar bumbu cabai rawit terasi khas Lombok' },
        ],
      },
      {
        name: 'Sambal & Sayuran Bali',
        items: [
          { name: 'Sambal Matah Bali Asli Minyak Kelapa', basePrice: 7000, desc: 'Irisan bawang merah, serai, cabai rawit segar dengan minyak kelapa murni' },
          { name: 'Sambal Embe Goreng Bawang Renyah', basePrice: 7000, desc: 'Sambal bawang merah goreng garing dengan cabai dan terasi' },
          { name: 'Plecing Kangkung Khas Lombok', basePrice: 16000, desc: 'Kangkung lombok segar dengan sambal tomat terasi dan kacang tanah goreng' },
        ],
      },
      {
        name: 'Minuman Tropis',
        items: [
          { name: 'Es Daluman Cincau Khas Bali', basePrice: 15000, desc: 'Daun daluman segar berpadu santan gurih dan sirup gula aren Bali', isDrink: true },
          { name: 'Es Kelapa Muda Jeruk Bali', basePrice: 16000, desc: 'Air kelapa muda segar disiram perasan jeruk manis', isDrink: true },
          { name: 'Es Teh Lemongrass Sereh', basePrice: 10000, desc: 'Seduhan teh segar beraroma serai wangi alami', isDrink: true },
        ],
      },
    ],
  },

  // 8. Coto & Konro Khas Makassar
  {
    genre: 'Kuliner Makassar & Bugis',
    nameTemplate: 'Coto Makassar & Sop Konro Daeng Tata',
    descTemplate: 'Coto Makassar kuah kacang gurih pekat dan Sop Konro iga sapi raksasa bakar bumbu rempah',
    categories: [
      {
        name: 'Coto & Konro Pilihan',
        items: [
          { name: 'Coto Makassar Daging Sapi Campur', basePrice: 38000, desc: 'Potongan daging sapi sengkel, babat, dan hati dalam kuah kaldu kacang tanah gurih' },
          { name: 'Coto Makassar Daging Has Dalam Murni', basePrice: 44000, desc: 'Daging sapi has dalam empuk tanpa jeroan dengan kuah coto gurih kental' },
          { name: 'Sop Konro Iga Sapi Kuah Kluwek', basePrice: 62000, desc: 'Iga sapi jumbo berkuah kaldu rempah kluwek harum ketumbar dan pala' },
          { name: 'Konro Bakar Saus Bumbu Kacang', basePrice: 68000, desc: 'Iga sapi empuk dibakar saus kecap pedas disiram saus kacang gurih khas Makassar' },
          { name: 'Sop Saudara Pangkep Daging Paru', basePrice: 38000, desc: 'Sop daging sapi berempah kuah gurih disajikan dengan soun dan perkedel kentang' },
        ],
      },
      {
        name: 'Karbohidrat & Ketupat',
        items: [
          { name: 'Ketupat Daun Pandan (2 pcs)', basePrice: 8000, desc: 'Ketupat beras pulen harum wangi pandan pendamping coto' },
          { name: 'Burasa Santan Khas Bugis', basePrice: 10000, desc: 'Nasi santan bungkus daun pisang gurih padat' },
          { name: 'Perkedel Singkong Daging', basePrice: 6000, desc: 'Perkedel singkong gurih renyah pendamping kuah sop' },
        ],
      },
      {
        name: 'Dessert & Minuman Makassar',
        items: [
          { name: 'Es Pisang Ijo Asli Makassar', basePrice: 20000, desc: 'Pisang raja dibalut adonan pandan hijau, bubur sumsum lembut, sirup DHT & susu', isDrink: true },
          { name: 'Es Palu Butung Saus Manis', basePrice: 18000, desc: 'Potongan pisang manis dengan bubur sumsum lembut dan es serut sirup merah', isDrink: true },
          { name: 'Es Markisa Asli Malino', basePrice: 14000, desc: 'Sirup sari buah markisa asli pegunungan Malino segar', isDrink: true },
        ],
      },
    ],
  },
]
