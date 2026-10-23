/**
 * Indonesian Names and Brand Data Bank for Food Court Seeding
 */

export const firstNames = [
  'Ahmad', 'Budi', 'Rizky', 'Siti', 'Dewi', 'Maya', 'Dian', 'Eko', 'Hendra', 'Agus',
  'Bagus', 'Putri', 'Indah', 'Aditya', 'Fajar', 'Ilham', 'Wahyu', 'Dimas', 'Bayu', 'Reza',
  'Anisa', 'Rina', 'Nanda', 'Tri', 'Sari', 'Nur', 'Arif', 'Bambang', 'Joko', 'Gilang',
  'Dwi', 'Mega', 'Tari', 'Ratna', 'Fitri', 'Wulan', 'Rian', 'Doni', 'Kevin', 'Daniel',
  'Jessica', 'Grace', 'Michael', 'William', 'Christian', 'David', 'Maria', 'Stephanie', 'Jonathan', 'Steven',
  'Ayu', 'Citra', 'Nadia', 'Farhan', 'Satria', 'Bagas', 'Surya', 'Teguh', 'Gita', 'Lestari',
]

export const lastNames = [
  'Pratama', 'Saputra', 'Wijaya', 'Kusuma', 'Santoso', 'Hidayat', 'Nugroho', 'Setiawan',
  'Ramadhan', 'Wibowo', 'Kurniawan', 'Siregar', 'Nasution', 'Lubis', 'Simanjuntak', 'Hutapea',
  'Sinaga', 'Pasaribu', 'Tanoto', 'Salim', 'Suryajaya', 'Widjaja', 'Anggoro', 'Prasetyo',
  'Utomo', 'Wardhana', 'Permana', 'Firmansyah', 'Gunawan', 'Chandra', 'Susanto', 'Halim',
  'Hartono', 'Purnomo', 'Hakim', 'Mahendra', 'Wahyudi', 'Sudirman', 'Dharmawan', 'Kusnadi',
]

export interface FoodCourtConfig {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  city: string
  managerEmail: string
  managerName: string
}

export const foodCourtConfigs: FoodCourtConfig[] = [
  {
    id: 'fc-grand-city-surabaya',
    name: 'Amici Food Court Grand City Surabaya',
    slug: 'amici-food-court-grand-city',
    address: 'Jl. Walikota Mustajab No. 1, Lantai 4 FoodLoft, Surabaya, Jawa Timur 60272',
    phone: '031-5459001',
    city: 'Surabaya',
    managerEmail: 'manager@foodcourt.com', // Akun manajer default
    managerName: 'Manajer Grand City',
  },
  {
    id: 'fc-grand-indonesia-jakarta',
    name: 'Amici Food Court Grand Indonesia Jakarta',
    slug: 'amici-food-court-grand-indonesia',
    address: 'Jl. M.H. Thamrin No. 1, West Mall Lantai 3 Foodprint, Menteng, Jakarta Pusat 10310',
    phone: '021-23580001',
    city: 'Jakarta Pusat',
    managerEmail: 'manager.jakarta@foodcourt.com',
    managerName: 'Hendra Gunawan',
  },
  {
    id: 'fc-paris-van-java-bandung',
    name: 'Amici Food Court Paris Van Java Bandung',
    slug: 'amici-food-court-paris-van-java',
    address: 'Jl. Sukajadi No. 131-139, Concourse Level, Bandung, Jawa Barat 40162',
    phone: '022-82063001',
    city: 'Bandung',
    managerEmail: 'manager.bandung@foodcourt.com',
    managerName: 'Dewi Lestari',
  },
  {
    id: 'fc-beachwalk-kuta-bali',
    name: 'Amici Food Court Beachwalk Kuta Bali',
    slug: 'amici-food-court-beachwalk-bali',
    address: 'Jl. Pantai Kuta, Lantai 3 Sunset Food Corner, Kuta, Badung, Bali 80361',
    phone: '0361-8464001',
    city: 'Badung',
    managerEmail: 'manager.bali@foodcourt.com',
    managerName: 'I Wayan Pratama',
  },
  {
    id: 'fc-pakuwon-mall-jogja',
    name: 'Amici Food Court Pakuwon Mall Jogja',
    slug: 'amici-food-court-pakuwon-jogja',
    address: 'Jl. Ring Road Utara, Lantai 2 Food Society, Sleman, D.I. Yogyakarta 55281',
    phone: '0274-2924001',
    city: 'Yogyakarta',
    managerEmail: 'manager.jogja@foodcourt.com',
    managerName: 'Bagus Wicaksono',
  },
]

export interface TenantTemplate {
  genre: string
  nameTemplate: string
  descTemplate: string
  categories: {
    name: string
    menuPool: { name: string; basePrice: number; desc: string; isDrink?: boolean }[]
  }[]
}

export const tenantTemplates: TenantTemplate[] = [
  {
    genre: 'Rawon & Daging',
    nameTemplate: 'Warung Rawon Bu Siti',
    descTemplate: 'Rawon daging sapi empal kuah hitam kluwek medok khas Jawa Timur',
    categories: [
      {
        name: 'Sajian Rawon Utama',
        menuPool: [
          { name: 'Rawon Daging Spesial Empal', basePrice: 35000, desc: 'Daging empal empuk dengan kuah rawon kluwek kaya rempah & telur asin' },
          { name: 'Rawon Iga Sapi Kuah Gurih', basePrice: 48000, desc: 'Iga sapi empuk berdaging tebal berpadu tauge segar & sambal terasi' },
          { name: 'Rawon Buntut Sapi Bakar', basePrice: 55000, desc: 'Buntut sapi empuk bakar kecap disajikan bersama semangkuk kuah rawon panas' },
          { name: 'Rawon Daging Suwir Komplit', basePrice: 32000, desc: 'Suwiran daging sapi empuk dengan kuah rawon hangat, tempe mendol & sambal' },
          { name: 'Rawon Kikil & Babat Sapi', basePrice: 36000, desc: 'Kikil kenyal dan babat lembut dalam rempah hitam gurih' },
          { name: 'Nasi Pecel Rawon Campur', basePrice: 38000, desc: 'Perpaduan legendaris nasi pecel sayur bumbu kacang gurih disiram kuah rawon' },
        ],
      },
      {
        name: 'Lauk Pelengkap',
        menuPool: [
          { name: 'Empal Daging Goreng Manis', basePrice: 16000, desc: 'Daging empal bumbu ketumbar digoreng renyah wangi' },
          { name: 'Paru Sapi Goreng Gurih', basePrice: 15000, desc: 'Paru sapi ungkep digoreng renyah berempah' },
          { name: 'Tempe Mendol Malang (3 pcs)', basePrice: 9000, desc: 'Tempe kedelai fermentasi bumbu kencur khas Jawa Timur' },
          { name: 'Perkedel Kentang Daging', basePrice: 7000, desc: 'Perkedel kentang lembut dengan cincangan daging sapi' },
          { name: 'Telur Asin Brebes Utuh', basePrice: 7000, desc: 'Telur bebek asin masir gurih berkualitas' },
        ],
      },
      {
        name: 'Minuman Tradisional',
        menuPool: [
          { name: 'Es Teh Manis Melati', basePrice: 6000, desc: 'Seduhan teh melati wangi gula asli dingin segar', isDrink: true },
          { name: 'Es Sinom Segar Madu', basePrice: 10000, desc: 'Minuman herbal daun asam & kunyit segar pemulih stamina', isDrink: true },
          { name: 'Es Beras Kencur Karamel', basePrice: 12000, desc: 'Jamu beras kencur manis alami berpadu es batu', isDrink: true },
          { name: 'Es Jeruk Nipis Peras', basePrice: 9000, desc: 'Perasan jeruk nipis segar dengan gula pasir murni', isDrink: true },
        ],
      },
    ],
  },
  {
    genre: 'Soto & Sup',
    nameTemplate: 'Soto Lamongan Cak Har',
    descTemplate: 'Soto ayam kuah kuning gurih dengan koya udang melimpah renyah',
    categories: [
      {
        name: 'Soto Ayam Koya',
        menuPool: [
          { name: 'Soto Ayam Kampung Koya Komplit', basePrice: 32000, desc: 'Daging ayam kampung suwir, soun, telur rebus, dan koya udang gurih' },
          { name: 'Soto Daging Sapi Madura', basePrice: 38000, desc: 'Potongan daging sengkel empuk dengan kuah kaldu rempah bening' },
          { name: 'Soto Ayam Ceker & Kulit Krispi', basePrice: 28000, desc: 'Ceker ayam lunak berpadu kulit krispi dalam kuah soto gurih' },
          { name: 'Soto Sulung Jeroan Sapi', basePrice: 36000, desc: 'Soto khas Surabaya dengan jeroan babat & usus empuk wangi jeruk nipis' },
          { name: 'Soto Ambengan Daging & Telur Muda', basePrice: 42000, desc: 'Soto kaldu ayam kental dengan uritan telur muda istimewa' },
        ],
      },
      {
        name: 'Minuman & Extra Koya',
        menuPool: [
          { name: 'Es Jeruk Manis Peras', basePrice: 9000, desc: 'Jeruk peras manis segar tanpa pemanis buatan', isDrink: true },
          { name: 'Es Teh Manis Jumbo', basePrice: 8000, desc: 'Teh melati manis segar porsi besar', isDrink: true },
          { name: 'Koya Udang Gurih (Porsi Ekstra)', basePrice: 5000, desc: 'Taburan koya kerupuk udang gurih renyah' },
          { name: 'Es Kelapa Muda Jeruk', basePrice: 15000, desc: 'Daging kelapa muda segar disiram perasan jeruk manis', isDrink: true },
        ],
      },
    ],
  },
  {
    genre: 'Bebek & Ayam Goreng',
    nameTemplate: 'Bebek Sinjay Madura',
    descTemplate: 'Bebek goreng bumbu rempah serundeng renyah dan sambal pencit mangga muda',
    categories: [
      {
        name: 'Menu Unggas Spesial',
        menuPool: [
          { name: 'Bebek Goreng Kremes Sambal Pencit', basePrice: 39000, desc: 'Bebek ungkep bumbu rempah digoreng garing dengan parutan mangga muda' },
          { name: 'Bebek Bakar Madu Kecap Pedas', basePrice: 42000, desc: 'Bebek bakar bumbu karamel madu dengan olesan sambal pedas manis' },
          { name: 'Ayam Goreng Lengkuas Rempah', basePrice: 28000, desc: 'Ayam ungkep bumbu laos serundeng garing gurih wangi' },
          { name: 'Bebek Peking Cabe Ijo', basePrice: 44000, desc: 'Potongan bebek lembut dimasak balado cabai hijau segar' },
          { name: 'Ayam Bakar Bumbu Rujak', basePrice: 30000, desc: 'Ayam panggang dengan bumbu rujak kelapa pedas manis khas Jawa' },
        ],
      },
      {
        name: 'Sayur & Pendamping',
        menuPool: [
          { name: 'Sayur Asem Jakarta Segar', basePrice: 14000, desc: 'Sayur asem bening dengan jagung manis, labu siam, dan melinjo' },
          { name: 'Tumis Kangkung Terasi Pedas', basePrice: 16000, desc: 'Kangkung hijau segar ditumis bumbu terasi udang wangi' },
          { name: 'Tahu & Tempe Bacem Legit', basePrice: 10000, desc: 'Tahu tempe ungkep gula merah manis gurih meresap' },
        ],
      },
      {
        name: 'Minuman Penyegar',
        menuPool: [
          { name: 'Es Timun Serut Jeruk Nipis', basePrice: 11000, desc: 'Serutan mentimun segar berpadu perasan jeruk nipis dingin', isDrink: true },
          { name: 'Es Teh Tawar Dingin', basePrice: 4000, desc: 'Seduhan teh melati dingin segar', isDrink: true },
          { name: 'Es Badak Sarsaparilla Float', basePrice: 18000, desc: 'Minuman legendaris sarsaparilla float es krim vanilla', isDrink: true },
        ],
      },
    ],
  },
  {
    genre: 'Bakso & Mie Nusantara',
    nameTemplate: 'Bakso Malang Cak Man',
    descTemplate: 'Bakso daging urat sapi kenyal, siomay kukus, pangsit goreng renyah, dan tahu bakso',
    categories: [
      {
        name: 'Pilihan Bakso & Kuah',
        menuPool: [
          { name: 'Bakso Campur Komplit Spesial', basePrice: 32000, desc: 'Bakso halus, bakso urat, tahu bakso, siomay kukus, dan pangsit goreng garing' },
          { name: 'Bakso Urat Granat Pedas', basePrice: 35000, desc: 'Bakso urat sapi ukuran jumbo berisi cincangan cabai rawit pedas' },
          { name: 'Bakso Telur Asin Lumer', basePrice: 36000, desc: 'Bakso sapi kenyal dengan isian kuning telur asin gurih lumer' },
          { name: 'Bakso Keju Mozzarella Molor', basePrice: 34000, desc: 'Bakso daging sapi berisi keju mozzarella gurih meleleh' },
          { name: 'Bakso Rusuk Iga Sapi Kuah Kaldu', basePrice: 48000, desc: 'Iga sapi empuk bertabur daun seledri dan bawang goreng wangi' },
        ],
      },
      {
        name: 'Gorengan & Topping',
        menuPool: [
          { name: 'Pangsit Goreng Bunga Mawar (3 pcs)', basePrice: 12000, desc: 'Kulit pangsit renyah gurih isi adonan ayam udang' },
          { name: 'Siomay Basah Ikan Tenggiri', basePrice: 10000, desc: 'Siomay kukus empuk kenyal dari olahan ikan tenggiri segar' },
          { name: 'Tahu Bakso Kukus Gurih', basePrice: 9000, desc: 'Tahu putih lembut diisi adonan daging sapi cincang' },
        ],
      },
      {
        name: 'Minuman',
        menuPool: [
          { name: 'Es Campur Oyen Durian', basePrice: 18000, desc: 'Es serut kelapa muda, alpukat, nangka, dan mutiara dengan aroma durian', isDrink: true },
          { name: 'Es Teler Nangka Santan Gurih', basePrice: 17000, desc: 'Alpukat mentega, potongan nangka wangi, sirup pandan & susu kental manis', isDrink: true },
          { name: 'Es Cincau Hijau Gula Jawa', basePrice: 10000, desc: 'Cincau hijau alami segar dengan sirup gula aren dan santan', isDrink: true },
        ],
      },
    ],
  },
  {
    genre: 'Nasi Padang & Minang',
    nameTemplate: 'Nasi Padang Salero Bundo',
    descTemplate: 'Sajian otentik Minangkabau dengan santan kelapa kental rempah asli Bukittinggi',
    categories: [
      {
        name: 'Lauk Utama Rendang & Gulai',
        menuPool: [
          { name: 'Paket Rendang Daging Sapi Sumpu', basePrice: 38000, desc: 'Daging rendang hitam legit bumbu rempah 8 jam, daun singkong & sambal ijo' },
          { name: 'Paket Ayam Pop Minang Asli', basePrice: 35000, desc: 'Ayam kampung gurih empuk disajikan sambal tomat merah khas Minang' },
          { name: 'Paket Dendeng Batokok Balado', basePrice: 42000, desc: 'Daging sapi pipih renyah diguyur sambal balado cabai merah segar' },
          { name: 'Gulai Tunjang Kikil Lembut', basePrice: 39000, desc: 'Kikil sapi empuk kenyal berpadu kuah gulai santan kental berbumbu pekat' },
          { name: 'Gulai Kepala Kakap Merah', basePrice: 65000, desc: 'Kepala ikan kakap segar gurih dengan kuah asam pedas gulai Minang' },
          { name: 'Ayam Gulai Kurma Rempah', basePrice: 32000, desc: 'Ayam bumbu gulai kuning lembut harum cengkeh dan kapulaga' },
        ],
      },
      {
        name: 'Minuman Khas Minang',
        menuPool: [
          { name: 'Teh Talua Kocok Pinang', basePrice: 16000, desc: 'Teh kocok telur bebek rempah berbusa lembut pembangkit energi', isDrink: true },
          { name: 'Es Tebak Padang Cendol', basePrice: 15000, desc: 'Es serut khas Minang berisi tapai ketan hitam, tebak, cincau & santan', isDrink: true },
          { name: 'Es Jeruk Murni Dingin', basePrice: 10000, desc: 'Segarnya perasan jeruk alami dengan es batu', isDrink: true },
        ],
      },
    ],
  },
  {
    genre: 'Kopi & Minuman Kekinian',
    nameTemplate: 'Kopi Kenangan Senja',
    descTemplate: 'Artisan kopi susu gula aren, seduhan teh wangi, dan minuman segar kekinian',
    categories: [
      {
        name: 'Espresso & Kopi Susu',
        menuPool: [
          { name: 'Kopi Susu Gula Aren Senja', basePrice: 20000, desc: 'Espresso blend Arabica-Robusta dengan susu segar dan sirup gula aren asli', isDrink: true },
          { name: 'Karamel Macchiato Dingin', basePrice: 26000, desc: 'Espresso lapis susu vanila dengan drizzle saus karamel lezat', isDrink: true },
          { name: 'Kopi Kenangan Avocado Coffee', basePrice: 28000, desc: 'Perpaduan jus alpukat kental, espresso shot, dan es krim cokelat', isDrink: true },
          { name: 'Americano Dingin Single Origin', basePrice: 18000, desc: 'Double espresso seduh dingin biji kopi Mandailing Sumatera', isDrink: true },
          { name: 'Pandan Latte Espresso', basePrice: 24000, desc: 'Kopi susu dengan sari daun pandan wangi alami', isDrink: true },
        ],
      },
      {
        name: 'Non-Kopi & Teh Herbal',
        menuPool: [
          { name: 'Matcha Green Tea Latte Uji', basePrice: 25000, desc: 'Matcha murni impor berpadu susu creamy lembut', isDrink: true },
          { name: 'Earl Grey Milk Tea Cheese Cream', basePrice: 26000, desc: 'Teh hitam aromatik dengan topping krim keju gurih asin', isDrink: true },
          { name: 'Taro Velvet Milk Cream', basePrice: 22000, desc: 'Rasa talas ungu manis lembut dipadu susu segar', isDrink: true },
          { name: 'Lychee Tea Buah Asli', basePrice: 19000, desc: 'Teh seduh dingin dengan buah leci utuh segar', isDrink: true },
        ],
      },
      {
        name: 'Camilan Pastry & Toast',
        menuPool: [
          { name: 'Croissant Cokelat Almond', basePrice: 22000, desc: 'Pastry renyah bermentega isi cokelat leleh bertabur almond slice' },
          { name: 'Roti Bakar Srikaya Pandan', basePrice: 18000, desc: 'Roti brioche panggang garing oles selai srikaya buatan rumahan' },
          { name: 'Donat Gula Klasik Kampung (2 pcs)', basePrice: 14000, desc: 'Donat kentang empuk tabur gula halus manis' },
        ],
      },
    ],
  },
  {
    genre: 'Seafood & Ikan Bakar',
    nameTemplate: 'Ikan Bakar Jimbaran',
    descTemplate: 'Sajian ikan laut segar bakar bumbu rempah jimbaran, cumi krispi, dan udang madu',
    categories: [
      {
        name: 'Ikan Laut & Bakaran',
        menuPool: [
          { name: 'Gurame Bakar Bumbu Jimbaran', basePrice: 48000, desc: 'Gurame segar dibakar bumbu rempah tomat pedas manis wangi arang' },
          { name: 'Kerapu Saus Tiram Mentega', basePrice: 58000, desc: 'Ikan kerapu goreng saus tiram gurih bertabur daun bawang' },
          { name: 'Cumi Goreng Tepung Calamari', basePrice: 34000, desc: 'Cincin cumi empuk dibalut tepung renyah dengan saus tartar' },
          { name: 'Udang Bakar Madu Saus Pedas', basePrice: 42000, desc: 'Udang windu bakar olesan madu alami beraroma asap harum' },
          { name: 'Kerang Dara Saus Padang', basePrice: 28000, desc: 'Kerang dara rebus kuah saus tiram pedas cabai rawit merah' },
        ],
      },
      {
        name: 'Minuman Pantai',
        menuPool: [
          { name: 'Kelapa Muda Batok Utuh', basePrice: 20000, desc: 'Air dan daging kelapa muda segar langsung dari batok', isDrink: true },
          { name: 'Es Jeruk Nipis Madu Asli', basePrice: 14000, desc: 'Asam manis alami pembersih langit-langit lidah', isDrink: true },
          { name: 'Es Markisa Medan Segar', basePrice: 15000, desc: 'Bulir buah markisa asli asam manis segar', isDrink: true },
        ],
      },
    ],
  },
  {
    genre: 'Kuliner Oriental & Dimsum',
    nameTemplate: 'Dimsum House 88',
    descTemplate: 'Dimsum kukus dan goreng halal, hakau udang transparan, dan mie wonton gurih',
    categories: [
      {
        name: 'Dimsum Pilihan',
        menuPool: [
          { name: 'Siomay Udang Ayam Kukus (4 pcs)', basePrice: 24000, desc: 'Olahan daging ayam paha dan udang segar bertabur tobiko' },
          { name: 'Hakau Udang Kristal (3 pcs)', basePrice: 26000, desc: 'Kulit transparan tipis kenyal berisi udang utuh segar renyah' },
          { name: 'Lumpia Kulit Tahu Goreng Udang', basePrice: 22000, desc: 'Kulit tahu renyah keemasan isi adonan ayam udang wangi wijen' },
          { name: 'Pangsit Udang Mayonnaise', basePrice: 24000, desc: 'Pangsit goreng garing dengan cocolan saus mayonnaise manis gurih' },
          { name: 'Bakpao Cokelat Lumer (3 pcs)', basePrice: 18000, desc: 'Bakpao kukus lembut putih berisi cokelat hangat meleleh' },
        ],
      },
      {
        name: 'Mie & Nasi Wok',
        menuPool: [
          { name: 'Nasi Goreng Yang Chow Halal', basePrice: 34000, desc: 'Nasi goreng harum wangi telur, ayam panggang & udang tanpa kecap' },
          { name: 'Mie Tarik Sapi Kuah Szechuan', basePrice: 38000, desc: 'Mie kenyal buatan tangan dengan kaldu sapi pedas khas Szechuan' },
          { name: 'Kwetiau Goreng Seafood Sapi', basePrice: 36000, desc: 'Kwetiau beras tumis wajan panas dengan aroma asap smokey mantap' },
        ],
      },
      {
        name: 'Teh Herbal Cina',
        menuPool: [
          { name: 'Teh Chrysanthemum Madu Dingin', basePrice: 12000, desc: 'Seduhan bunga krisan wangi pembuang panas dalam', isDrink: true },
          { name: 'Teh Jasmine Oolong Hangat', basePrice: 10000, desc: 'Teh oolong aroma melati klasik peredam lemak makanan', isDrink: true },
        ],
      },
    ],
  },
]
