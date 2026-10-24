import type { ThemeTemplate } from './local-culinary'

/**
 * Bank Data Kuliner Asia & Internasional (Ramen, Sushi, Nasi Kandar, Korean, Thai, Pho)
 */
export const asianInternationalThemes: ThemeTemplate[] = [
  // 1. Japanese Ramen & Donburi
  {
    genre: 'Japanese Ramen & Don',
    nameTemplate: 'Tokyo Tori Paitan Ramen Bar',
    descTemplate: 'Ramen kuah kaldu ayam kental 12 jam, mie kenyal artisan, dan donburi daging sapi wagyu',
    categories: [
      {
        name: 'Artisan Ramen',
        items: [
          { name: 'Tori Paitan Ramen Kaldu Ayam Kental', basePrice: 48000, desc: 'Ramen mie lurus dengan kuah kaldu ayam pekat creamy, chashu ayam lembut & ajitsuke tamago' },
          { name: 'Spicy Tantanmen Ramen Daging Cincang', basePrice: 52000, desc: 'Kuah wijen pedas beraroma minyak cabai jepang dengan taburan daging cincang gurih' },
          { name: 'Tokyo Shoyu Ramen Kaldu Bening', basePrice: 45000, desc: 'Ramen kaldu kecap asin jepang klasik dengan rebung menma, nori & telur setengah matang' },
          { name: 'Miso Ramen Butter Corn Spesial', basePrice: 49000, desc: 'Ramen kuah pasta miso kedelai jepang bertabur jagung manis dan lelehan mentega gurih' },
          { name: 'Abura Soba Mie Kering Tanpa Kuah', basePrice: 44000, desc: 'Mie tebal diaduk minyak aromatik gurih, rebung, nori, daun bawang & kuning telur' },
          { name: 'Black Garlic Tonkotsu Chicken Ramen', basePrice: 54000, desc: 'Kaldu ayam pekat dengan aroma minyak bawang putih hitam fermentasi wangi pekat' },
        ],
      },
      {
        name: 'Donburi & Rice Bowl',
        items: [
          { name: 'Gyudon Slices Beef Bowl Original', basePrice: 46000, desc: 'Irisan tipis daging sapi US shortplate ditumis saus manis gurih di atas nasi jepang pulen' },
          { name: 'Chicken Katsu Curry Rice Jepang', basePrice: 45000, desc: 'Fillet ayam goreng tepung roti renyah disiram saus kari jepang kental wortel kentang' },
          { name: 'Oyako Donburi Ayam Telur Gurih', basePrice: 38000, desc: 'Potongan ayam paha empuk dimasak bersama telur orak-arik kuah dashi manis' },
          { name: 'Salmon Teriyaki Donburi Bakar', basePrice: 58000, desc: 'Potongan salmon segar dipanggang saus teriyaki manis gurih beraroma wijen' },
        ],
      },
      {
        name: 'Gyoza & Side Dishes',
        items: [
          { name: 'Gyoza Ayam Panggang Pan-Seared (5 pcs)', basePrice: 28000, desc: 'Pangsit jepang isi adonan ayam kubis daun bawang digoreng garing bawahnya' },
          { name: 'Chicken Karaage Saus Tartar', basePrice: 32000, desc: 'Daging ayam paha goreng tepung renyah beraroma jahe bawang putih' },
          { name: 'Edamame Rebus Tabur Garam Laut', basePrice: 16000, desc: 'Kacang kedelai jepang muda rebus bertabur garam laut gurih' },
        ],
      },
      {
        name: 'Minuman Khas Jepang',
        items: [
          { name: 'Ocha Hijau Dingin (Free Refill)', basePrice: 8000, desc: 'Teh hijau jepang seduhan dingin segar tanpa gula pembersih lemak', isDrink: true },
          { name: 'Matcha Latte Dingin Creamy', basePrice: 24000, desc: 'Bubuk matcha murni kyoto berpadu susu segar creamy dingin', isDrink: true },
          { name: 'Yuzu Honey Soda Segar', basePrice: 22000, desc: 'Bulir jeruk yuzu jepang berpadu madu dan air soda dingin menyegarkan', isDrink: true },
        ],
      },
    ],
  },

  // 2. Japanese Sushi & Sashimi
  {
    genre: 'Japanese Sushi Express',
    nameTemplate: 'Sushi Matsu Express Bar',
    descTemplate: 'Aneka sushi roll kreatif, nigiri salmon segar, dan donburi bento bowl berkualitas',
    categories: [
      {
        name: 'Special Fusion Rolls',
        items: [
          { name: 'Salmon Mentai Aburi Roll (8 pcs)', basePrice: 58000, desc: 'Sushi isi kani kepiting & timun, bertabur irisan salmon segar dibakar saus mentai gurih' },
          { name: 'Crunchy Spicy Tuna Roll (8 pcs)', basePrice: 52000, desc: 'Daging ikan tuna segar cincang bumbu pedas dengan taburan kremesan tempura garing' },
          { name: 'Dragon Roll Ebi Furai & Alpukat', basePrice: 62000, desc: 'Udang goreng tepung crispy di dalam, dilapisi irisan alpukat mentega segar dan saus unagi' },
          { name: 'California Roll Tobiko Telur Ikan', basePrice: 46000, desc: 'Sushi klasik isi kepiting kani, alpukat, mentimun bertabur telur ikan terbang oranye' },
          { name: 'Beef Floss Cheese Volcano Roll', basePrice: 48000, desc: 'Roll bertabur abon sapi pedas manis dengan lelehan keju mozarella torch' },
        ],
      },
      {
        name: 'Nigiri & Gunkan',
        items: [
          { name: 'Salmon Nigiri Duo (2 pcs)', basePrice: 24000, desc: 'Irisan daging ikan salmon segar impor norwegia di atas kepalan nasi cuka jepang' },
          { name: 'Salmon Aburi Cheese Nigiri (2 pcs)', basePrice: 26000, desc: 'Salmon dibakar kilat dengan selembar keju gurih leleh' },
          { name: 'Chuka Wakame Rumput Laut Gunkan (2 pcs)', basePrice: 18000, desc: 'Salad rumput laut jepang segar manis asam wijen dalam balutan nori' },
          { name: 'Tamagoyaki Omelet Nigiri (2 pcs)', basePrice: 16000, desc: 'Telur dadar manis jepang berlapis lembut' },
        ],
      },
      {
        name: 'Sup & Salad',
        items: [
          { name: 'Miso Soup Tahu Sutra & Wakame', basePrice: 15000, desc: 'Sup kaldu dashi pasta miso dengan potongan tahu sutra lembut dan rumput laut' },
          { name: 'Kani Salad Saus Wijen Sangrai', basePrice: 28000, desc: 'Suwiran daging kepiting kani, selada segar, jagung, dan saus gomadare wijen sangrai' },
        ],
      },
      {
        name: 'Minuman',
        items: [
          { name: 'Cold Ocha Green Tea', basePrice: 8000, desc: 'Seduhan teh hijau jepang dingin segar', isDrink: true },
          { name: 'Hojicha Roasted Green Tea', basePrice: 18000, desc: 'Teh hijau panggang jepang beraroma karamel earthy lembut', isDrink: true },
          { name: 'Melon Soda Float Vanilla', basePrice: 22000, desc: 'Soda melon jepang hijau cerah disajikan dengan satu scoop es krim vanilla', isDrink: true },
        ],
      },
    ],
  },

  // 3. Nasi Kandar & Melayu Penang
  {
    genre: 'Nasi Kandar & Melayu',
    nameTemplate: 'Nasi Kandar Pelita Penang',
    descTemplate: 'Sajian nasi kandar kari banjir kuah campur pekat, ayam bawang renyah & telur sotong',
    categories: [
      {
        name: 'Paket Nasi Kandar Kari Banjir',
        items: [
          { name: 'Nasi Kandar Ayam Bawang Goreng Rempah', basePrice: 45000, desc: 'Nasi hangat disiram aneka kuah kari campur banjir, paha ayam goreng bumbu bawang manis, bendi & telur asin' },
          { name: 'Nasi Kandar Daging Sapi Masak Kicap', basePrice: 48000, desc: 'Potongan daging sapi empuk bumbu kecap pekat berpadu kuah kari dal & sambal kelapa' },
          { name: 'Nasi Kandar Kari Kambing Mutton Gulai', basePrice: 58000, desc: 'Daging kambing empuk tanpa bau prengus dalam kuah kari rempah pekat india melayu' },
          { name: 'Nasi Kandar Sotong Cumi Goreng Kunyit', basePrice: 46000, desc: 'Cumi segar digoreng renyah bumbu kunyit bawang bombay dengan siraman kuah kari melimpah' },
          { name: 'Nasi Kandar Ikan Tenggiri Kari Asam', basePrice: 42000, desc: 'Potongan ikan tenggiri berdaging tebal dalam kuah kari asam pedas penang' },
        ],
      },
      {
        name: 'Roti Canai & Prata',
        items: [
          { name: 'Roti Canai Original Kuah Kari Dal', basePrice: 18000, desc: 'Roti canai pipih garing berlapis lembut dengan cocolan kuah kari kacang dal' },
          { name: 'Roti Canai Telur Bawang Spesial', basePrice: 22000, desc: 'Roti canai berisi telur kocok dan irisan bawang merah harum' },
          { name: 'Roti Tisu Karamel Manis Krispi', basePrice: 20000, desc: 'Roti garing menjulang kerucut bertabur susu kental manis dan gula' },
          { name: 'Murtabak Daging Sapi Cincang Kari', basePrice: 38000, desc: 'Martabak telur tebal isi daging sapi giling rempah kari disajikan acar bawang merah' },
        ],
      },
      {
        name: 'Minuman Mamak Penang',
        items: [
          { name: 'Teh Tarik Panas Tarik Berbusa', basePrice: 14000, desc: 'Teh hitam ceylon ditarik tinggi berbusa lembut dengan susu kental manis legit', isDrink: true },
          { name: 'Es Teh Tarik Kaw Dingin', basePrice: 16000, desc: 'Teh tarik kental pekat es batu segar gaya kedai mamak', isDrink: true },
          { name: 'Milo Dinosaur Es Tabur Melimpah', basePrice: 20000, desc: 'Es milo susu kental dingin bertabur gundukan bubuk milo cokelat di atasnya', isDrink: true },
          { name: 'Sirap Bandung Selasih Soda', basePrice: 15000, desc: 'Sirup mawar merah manis wangi berpadu susu kental dan biji selasih kenyal', isDrink: true },
        ],
      },
    ],
  },

  // 4. Korean Street Food
  {
    genre: 'Korean Street Food',
    nameTemplate: 'Daebak Myeongdong Street Food',
    descTemplate: 'Jajanan viral myeongdong korea: tteokbokki saus gochujang, odeng kuah kaldu, dan corndog',
    categories: [
      {
        name: 'Tteokbokki & Odeng',
        items: [
          { name: 'Tteokbokki Saus Gochujang Pedas Manis', basePrice: 32000, desc: 'Kue beras kenyal tteok, fishcake odeng dalam kuah kental saus cabai korea bertabur wijen' },
          { name: 'Cheese Mozzarella Tteokbokki Molor', basePrice: 38000, desc: 'Tteokbokki pedas gurih dengan selimut keju mozzarella leleh melimpah' },
          { name: 'Odeng Eomuk Tang Kuah Kaldu Teri (2 tusuk)', basePrice: 24000, desc: 'Fishcake tusuk korea lembut kenyal dalam kuah kaldu dashi lobak hangat gurih' },
          { name: 'Rabokki (Ramen Tteokbokki) Komplit Telur', basePrice: 42000, desc: 'Perpaduan mie ramen kenyal, kue beras, odeng dan telur rebus kuah gochujang' },
          { name: 'Rose Tteokbokki Creamy Mild', basePrice: 36000, desc: 'Kue beras saus gochujang berpadu susu cooking cream lembut gurih tidak terlalu pedas' },
        ],
      },
      {
        name: 'Chicken & Corndog',
        items: [
          { name: 'Yangnyeom Korean Fried Chicken Boneless', basePrice: 38000, desc: 'Potongan ayam renyah tanpa tulang dibalut saus pedas manis korea bertabur kacang' },
          { name: 'Honey Butter Chicken Popcorn', basePrice: 36000, desc: 'Ayam garing bites dibalut bumbu manis mentega madu gurih harum' },
          { name: 'Mozzarella Corndog Tarik Keju', basePrice: 26000, desc: 'Sosis berbalut keju mozarella tebal digoreng tepung roti dengan saus mayonaise & saus tomat' },
          { name: 'Kimbap Daging Sapi Bulgogi Klasik', basePrice: 32000, desc: 'Gulungan nasi nori isi daging sapi bulgogi, acar lobak danmuji, wortel & telur' },
        ],
      },
      {
        name: 'Minuman Khas Korea',
        items: [
          { name: 'Banana Milk Korean Style Dingin', basePrice: 18000, desc: 'Susu pisang manis wangi creamy khas korea dingin', isDrink: true },
          { name: 'Korean Strawberry Milk Latte Buah Asli', basePrice: 22000, desc: 'Susu segar dingin dengan compote selai stroberi buah asli segar', isDrink: true },
          { name: 'Yuzu Citron Tea Honey Dingin', basePrice: 19000, desc: 'Teh seduhan selai jeruk yuzu madu menyegarkan tenggorokan', isDrink: true },
        ],
      },
    ],
  },

  // 5. Thai Street Kitchen
  {
    genre: 'Thai Street Kitchen',
    nameTemplate: 'Bangkok Siam Tom Yum & Noodle',
    descTemplate: 'Sajian tom yum asam pedas harum serai lengkuas, pad thai udang, dan mango sticky rice',
    categories: [
      {
        name: 'Sajian Khas Thailand',
        items: [
          { name: 'Tom Yum Goong Seafood Kuah Santan', basePrice: 48000, desc: 'Sup asam pedas khas bangkok dengan udang windu segar, cumi, jamur merang & serai wangi' },
          { name: 'Pad Thai Mie Beras Goreng Udang', basePrice: 42000, desc: 'Kwetiau tipis tumis saus asam jawa dengan udang segar, tauge, telur & taburan kacang tanah sangrai' },
          { name: 'Green Curry Ayam Terong Pipit Thailand', basePrice: 44000, desc: 'Kari hijau santan harum daun kemangi thailand dan potongan ayam empuk' },
          { name: 'Pad Krapow Gai Nasi Daging Cincang Basil', basePrice: 38000, desc: 'Tumisan daging ayam cincang bumbu cabai bawang kemangi disajikan dengan telur mata sapi renyah' },
          { name: 'Nasi Goreng Nanas Seafood Khao Pad Sapparod', basePrice: 45000, desc: 'Nasi goreng kunyit dengan potongan nanas manis, kismis, udang & abon ayam' },
        ],
      },
      {
        name: 'Dessert & Snack Thailand',
        items: [
          { name: 'Mango Sticky Rice Ketan Mangga Manis', basePrice: 28000, desc: 'Ketan gurih pandan disajikan bersama irisan mangga harum manis matang dan saus santan kental' },
          { name: 'Singkong Thailand Saus Santan Gurih', basePrice: 20000, desc: 'Singkong empuk pulen disiram vla santan gurih kental beraroma pandan' },
        ],
      },
      {
        name: 'Minuman Asli Thailand',
        items: [
          { name: 'Cha Yen Thai Milk Tea Asli ChaTraMue', basePrice: 16000, desc: 'Seduhan teh hitam merah thailand beraroma khas berpadu susu kental manis dingin', isDrink: true },
          { name: 'Thai Green Milk Tea Dingin', basePrice: 17000, desc: 'Teh hijau melati thailand dengan susu manis creamy dingin', isDrink: true },
          { name: 'Es Lemon Lemongrass Thai Segar', basePrice: 14000, desc: 'Minuman dingin batang serai dan perasan lemon pembersih lemak', isDrink: true },
        ],
      },
    ],
  },
]
