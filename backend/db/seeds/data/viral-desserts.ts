import type { ThemeTemplate } from './local-culinary'

/**
 * Bank Data Jajanan Viral, Seblak, Gohyong, Cromboloni, Mille Crepes, Salad Buah, dan Martabak
 */
export const viralDessertsThemes: ThemeTemplate[] = [
  // 1. Jajanan Viral & Tradisional Bandung
  {
    genre: 'Jajanan Viral & Gorengan',
    nameTemplate: 'Gohyong Cikini & Jajanan Sore Viral',
    descTemplate: 'Gohyong ayam udang kulit tahu renyah kuah asam manis cikini dan batagor bandung',
    categories: [
      {
        name: 'Gohyong & Batagor',
        items: [
          { name: 'Gohyong Ayam Udang Kulit Tahu Garing (6 pcs)', basePrice: 28000, desc: 'Adonan ayam dan cincangan udang berbalut kulit kembang tahu digoreng renyah dengan siraman kuah saus asam manis gurih' },
          { name: 'Gohyong Jumbo Kuah Asam Pedas Cikini', basePrice: 32000, desc: 'Porsi besar gohyong renyah bertabur irisan cabai rawit hijau segar dan bawang goreng' },
          { name: 'Batagor Bandung Asli Ikan Tenggiri', basePrice: 28000, desc: 'Tahu dan siomay goreng renyah disiram bumbu kacang tanah gurih kental beraroma jeruk limau' },
          { name: 'Siomay Kukus Ikan Tenggiri Bumbu Kacang', basePrice: 28000, desc: 'Siomay kukus empuk, kentang, kol, pare dan tahu putih dengan siraman saus kacang gurih' },
          { name: 'Cireng Crispy Bumbu Rujak Pedas Manis (10 pcs)', basePrice: 16000, desc: 'Olahan aci kenyal digoreng renyah garing dengan cocolan sambal rujak gula merah pedas' },
          { name: 'Tahu Gejrot Cirebon Kuah Asam Pedas', basePrice: 15000, desc: 'Tahu pong kopong digunting disiram kuah gula merah asam jawa dan ulekan cabai rawit bawang merah' },
        ],
      },
      {
        name: 'Gorengan Gurih',
        items: [
          { name: 'Pisang Goreng Crispy Saus Cokelat Keju', basePrice: 20000, desc: 'Pisang kepok manis berbalut tepung krispi dengan taburan keju cheddar parut dan susu cokelat' },
          { name: 'Tahu Walik Banyuwangi Sambal Petis (5 pcs)', basePrice: 18000, desc: 'Tahu goreng dibalik diisi adonan ayam gurih kenyal renyah' },
        ],
      },
      {
        name: 'Minuman Tradisional Dingin',
        items: [
          { name: 'Es Cendol Nangka Santan Gula Aren', basePrice: 16000, desc: 'Bulir cendol pandan kenyal berpadu potongan nangka wangi, santan kelapa gurih dan gula aren kental', isDrink: true },
          { name: 'Es Doger Bandung Komplit Mutiara', basePrice: 16000, desc: 'Es serut kelapa merah muda dengan tapai singkong, ketan hitam, pacar mutiara dan roti tawar', isDrink: true },
          { name: 'Es Teh Manis Melati Dingin', basePrice: 6000, desc: 'Teh melati dingin segar', isDrink: true },
        ],
      },
    ],
  },

  // 2. Seblak Prasmanan & Pedas
  {
    genre: 'Seblak Prasmanan Bandung',
    nameTemplate: 'Seblak Prasmanan Juara Kencur Pedas',
    descTemplate: 'Seblak basah kuah kencur pedas berlevel dengan aneka topping kerupuk, cuanki, dan ceker',
    categories: [
      {
        name: 'Paket Seblak Komplit',
        items: [
          { name: 'Seblak Komplit Ceker & Bakso Sapi Kuah Kencur', basePrice: 26000, desc: 'Kerupuk basah kenyal, ceker empuk, bakso sapi, sosis, sawi hijau dan telur orak-arik kuah kencur pedas merah' },
          { name: 'Seblak Seafood Dumpling Keju & Odeng', basePrice: 32000, desc: 'Aneka olahan seafood dumpling keju lumer, crabstick, odeng fishcake dan mie kuning kuah kencur gurih' },
          { name: 'Seblak Mie Jebred Ekstra Pedas Level 5', basePrice: 24000, desc: 'Mie keriting, kerupuk mawar oranye, telur orak-arik dan makaroni bumbu cabai rawit melimpah' },
          { name: 'Seblak Tulang Rawan & Tetelan Sapi', basePrice: 30000, desc: 'Tulang rawan ayam renyah dan tetelan sapi empuk dalam kuah seblak merah pedas beraroma kencur segar' },
          { name: 'Seblak Batagor Kering & Cuanki Lidah', basePrice: 25000, desc: 'Cuanki lidah kenyal, batagor mini kering dan siomay kerikil dalam kuah seblak gurih' },
        ],
      },
      {
        name: 'Camilan Aci Gurih',
        items: [
          { name: 'Cimol Bojot Bumbu Bawang Cabai Rawit', basePrice: 15000, desc: 'Cimol kenyal setengah matang diguyur minyak bawang harum dan cabai bubuk pedas' },
          { name: 'Cilung Telur Gulung Bumbu Balado (5 tusuk)', basePrice: 14000, desc: 'Aci digulung telur ayam dengan taburan bumbu balado pedas manis gurih' },
        ],
      },
      {
        name: 'Pereda Pedas',
        items: [
          { name: 'Susu UHT Putih Dingin Pereda Pedas', basePrice: 10000, desc: 'Susu sapi murni dingin penetral rasa pedas di lidah', isDrink: true },
          { name: 'Es Teh Manis Jumbo Gelas Besar', basePrice: 8000, desc: 'Teh melati dingin manis segar porsi besar', isDrink: true },
          { name: 'Es Jeruk Peras Manis', basePrice: 9000, desc: 'Jeruk peras manis dingin', isDrink: true },
        ],
      },
    ],
  },

  // 3. Bakery & Pastry Viral
  {
    genre: 'Bakery & Dessert Viral',
    nameTemplate: 'Le Cromboloni & Mille Crepes Bar',
    descTemplate: 'Cromboloni renyah berlapis vla lumer, mille crepes cake lembut berlapis, dan burnt cheesecake',
    categories: [
      {
        name: 'Cromboloni Renyah Lumer',
        items: [
          { name: 'Cromboloni Pistachio Creamy Filling', basePrice: 34000, desc: 'Pastry melingkar renyah berlapis dengan isian vla krim kacang pistachio lembut dan taburan kacang cincang' },
          { name: 'Cromboloni Dark Choco Supreme Lumer', basePrice: 32000, desc: 'Kulit pastry garing berlapis mentega dengan cokelat hitam belgia leleh melimpah' },
          { name: 'Cromboloni Salted Caramel Almond', basePrice: 32000, desc: 'Vla karamel mentega gurih asin dengan drizzle saus karamel dan irisan almond panggang' },
          { name: 'Cromboloni Strawberry Cheese Velvet', basePrice: 33000, desc: 'Isian krim keju lembut dan selai buah stroberi asam manis segar' },
        ],
      },
      {
        name: 'Mille Crepes & Cake Slices',
        items: [
          { name: 'Matcha Uji Mille Crepes Cake Slice', basePrice: 36000, desc: 'Kue berlapis 30 lembar crepes tipis dengan selingan krim matcha hijau aromatik impor jepang' },
          { name: 'French Vanilla Bean Mille Crepes', basePrice: 34000, desc: 'Crepes berlapis krim vanila asli madagaskar lembut dingin lumer di mulut' },
          { name: 'Tiramisu Tradizionale Cup Mascarpone', basePrice: 38000, desc: 'Biskuit ladyfinger celup espresso kental dengan krim keju mascarpone bertabur bubuk kakao' },
          { name: 'Basque Burnt Cheesecake Slice', basePrice: 36000, desc: 'Kue keju panggang dengan permukaan cokelat karamel khas spanyol bertekstur tengah meleleh lembut' },
        ],
      },
      {
        name: 'Minuman Cafe',
        items: [
          { name: 'Iced Sea Salt Caramel Latte', basePrice: 26000, desc: 'Kopi susu dengan foam krim gurih berbutir garam laut dan sirup karamel', isDrink: true },
          { name: 'Strawberry Hibiscus Sparkling Iced Tea', basePrice: 22000, desc: 'Teh bunga rosella merah segar berpadu sari stroberi dan air soda berkarbonasi', isDrink: true },
          { name: 'Hot Dark Chocolate Belgian Marshmallow', basePrice: 24000, desc: 'Cokelat panas kental belgia dengan topping marshmallow lembut mengapung', isDrink: true },
        ],
      },
    ],
  },

  // 4. Salad Buah & Dessert Segar
  {
    genre: 'Salad Buah & Dessert Dingin',
    nameTemplate: 'Salad Buah Sultan & Buko Pandan Bar',
    descTemplate: 'Salad buah saus yoghurt keju melimpah, buko pandan creamy filipina, dan mango sago',
    categories: [
      {
        name: 'Salad Buah Premium',
        items: [
          { name: 'Salad Buah Saus Yoghurt Keju Sultan (Porsi Sedang)', basePrice: 28000, desc: 'Potongan melon, apel fuji, pir, anggur, nata de coco disiram dressing yoghurt manis creamy bertabur gundukan keju parut' },
          { name: 'Salad Buah Jumbo Keju Melimpah', basePrice: 38000, desc: 'Porsi besar aneka buah segar lengkap dengan taburan keju cheddar tebal dan leci' },
          { name: 'Mango Sago Kelapa Muda Creamy', basePrice: 24000, desc: 'Puree mangga manis kental, daging kelapa muda, sagu mutiara kenyal dan susu evaporasi dingin' },
          { name: 'Buko Pandan Creamy Khas Filipina', basePrice: 24000, desc: 'Puding pandan hijau kenyal, kelapa muda serut, nata de coco dalam kuah susu pandan kental wangi' },
          { name: 'Ximilu Sop Buah Hong Kong Kuah Nabati', basePrice: 25000, desc: 'Aneka buah melon, semangka, stroberi, selasih dan jelly dalam kuah krimer nabati manis dingin menyegarkan tanpa santan' },
        ],
      },
      {
        name: 'Puding & Jelly Segar',
        items: [
          { name: 'Caramel Pudding Sutra Lembut', basePrice: 18000, desc: 'Puding susu telur selembut sutra dengan saus karamel gula hangus manis gurih' },
          { name: 'Avocado Sago Mutiara Susu', basePrice: 26000, desc: 'Daging alpukat mentega segar dengan sagu mutiara merah dan susu kental manis' },
        ],
      },
      {
        name: 'Minuman Buah Segar',
        items: [
          { name: 'Es Kelapa Jeruk Nipis Madu', basePrice: 16000, desc: 'Air kelapa muda segar disiram perasan jeruk nipis dan madu murni', isDrink: true },
          { name: 'Es Leci Selasih Dingin', basePrice: 15000, desc: 'Buah leci utuh manis dengan biji selasih kenyal dingin menyegarkan', isDrink: true },
        ],
      },
    ],
  },

  // 5. Martabak Manis & Telur
  {
    genre: 'Martabak Manis & Telur',
    nameTemplate: 'Martabak Bangka Holland Premium',
    descTemplate: 'Martabak manis adonan tebal bersarang oles mentega wijsman dan martabak telur bebek gurih',
    categories: [
      {
        name: 'Martabak Manis Spesial',
        items: [
          { name: 'Martabak Manis Cokelat Kacang Wijen Wijsman', basePrice: 45000, desc: 'Martabak tebal bersarang lembut oles butter wijsman dengan isian meises cokelat, kacang tanah sangrai dan wijen' },
          { name: 'Martabak Pandan Jagung Keju Susu', basePrice: 48000, desc: 'Adonan sari pandan wangi asli dengan isian jagung manis pipil dan keju cheddar tebal' },
          { name: 'Martabak Red Velvet Cream Cheese Oreo', basePrice: 56000, desc: 'Adonan red velvet merah merona dengan olesan krim keju tebal dan remahan biskuit oreo' },
          { name: 'Martabak Nutella Banana Keju', basePrice: 58000, desc: 'Olesan selai hazelnut cokelat nutella tebal dengan irisan buah pisang manis dan parutan keju' },
          { name: 'Martabak Tipis Kering (Tipker) Cokelat Keju', basePrice: 28000, desc: 'Martabak tipis garing renyah berkeripik dengan isian cokelat meises dan keju gurih' },
        ],
      },
      {
        name: 'Martabak Telur Bebek',
        items: [
          { name: 'Martabak Telur Bebek Daging Sapi Spesial (3 Telur)', basePrice: 48000, desc: 'Kulit martabak renyah garing isi daging sapi cincang bumbu kari dan irisan daun bawang telur bebek gurih' },
          { name: 'Martabak Telur Bebek Super Daging Sapi (4 Telur)', basePrice: 58000, desc: 'Porsi tebal daging sapi melimpah dengan kuah cuka acar mentimun cabai rawit segar' },
        ],
      },
      {
        name: 'Minuman Hangat & Dingin',
        items: [
          { name: 'Wedang Ronde Jahe Merah Hangat', basePrice: 15000, desc: 'Ronde ketan isi kacang kuah jahe merah hangat pengusir dingin malam', isDrink: true },
          { name: 'Es Teh Manis Dingin', basePrice: 6000, desc: 'Teh melati dingin segar penetral manis martabak', isDrink: true },
        ],
      },
    ],
  },
]
