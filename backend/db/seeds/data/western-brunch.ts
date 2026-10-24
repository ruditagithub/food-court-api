import type { ThemeTemplate } from './local-culinary'

/**
 * Bank Data Kuliner Barat, Pizza, Pasta, Burger, dan All-Day English Breakfast
 */
export const westernBrunchThemes: ThemeTemplate[] = [
  // 1. Artisan Italian Pizza
  {
    genre: 'Italian Pizza & Calzone',
    nameTemplate: 'Bella Napoli Artisan Pizza',
    descTemplate: 'Pizza tipis renyah adonan fermentasi 48 jam dengan keju mozzarella impor dan saus tomat roma',
    categories: [
      {
        name: 'Artisan Neapolitan Pizza',
        items: [
          { name: 'Pizza Margherita Klasik Daun Basil', basePrice: 58000, desc: 'Saus tomat roma asam manis, keju mozzarella fior di latte leleh, minyak zaitun extra virgin dan daun basil segar' },
          { name: 'Pizza Pepperoni Beef Supremo', basePrice: 68000, desc: 'Irisan daging sapi pepperoni gurih berlimpah dengan lelehan keju mozzarella dan oregano' },
          { name: 'Truffle Mushroom Creamy Pizza', basePrice: 75000, desc: 'Saus krim keju putih, aneka jamur champignon tumis, dan semprotan minyak black truffle harum' },
          { name: 'Quattro Formaggi Empat Keju', basePrice: 72000, desc: 'Kombinasi 4 keju lezat: mozzarella, cheddar, gorgonzola dan parmesan dengan siraman madu' },
          { name: 'Meat Lovers BBQ Beef & Sosis', basePrice: 78000, desc: 'Cincangan daging sapi bumbu BBQ, sosis panggang, irisan smoked beef dan bawang bombay manis' },
          { name: 'Spicy Hawaiian Chicken Pizza', basePrice: 65000, desc: 'Potongan ayam panggang, keju mozzarella, nanas manis asam segar dan taburan cabai serpih' },
        ],
      },
      {
        name: 'Snack & Garlic Bread',
        items: [
          { name: 'Garlic Knots Roti Bawang Putih (4 pcs)', basePrice: 24000, desc: 'Adonan pizza dipilin dengan olesan mentega bawang putih wangi daun peterseli' },
          { name: 'Cheesy Mozzarella Cheese Sticks (4 pcs)', basePrice: 28000, desc: 'Stik keju berbalut tepung roti krispi dengan saus cocolan marinara tomat' },
          { name: 'Caesar Salad Parmesan Croutons', basePrice: 32000, desc: 'Selada romaine segar dengan saus caesar gurih, parutan keju parmesan dan roti panggang renyah' },
        ],
      },
      {
        name: 'Minuman Italia',
        items: [
          { name: 'Italian Lemon Iced Tea', basePrice: 16000, desc: 'Teh seduhan lemon segar dengan daun mint', isDrink: true },
          { name: 'Sparkling Peach Soda Bellini', basePrice: 22000, desc: 'Sari buah persik manis lembut dengan air soda berkarbonasi dingin', isDrink: true },
          { name: 'Espresso Single Shot Panas', basePrice: 14000, desc: 'Ekstraksi kopi murni biji arabica aroma kacang cokelat pekat', isDrink: true },
        ],
      },
    ],
  },

  // 2. Pasta & Trattoria
  {
    genre: 'Italian Pasta & Risotto',
    nameTemplate: 'Pasta Pronto Fresh Trattoria',
    descTemplate: 'Aneka pasta segar buatan tangan disiram saus creamy carbonara, bolognese daging sapi, dan aglio olio',
    categories: [
      {
        name: 'Aneka Pasta Pilihan',
        items: [
          { name: 'Fettuccine Carbonara Smoked Beef Creamy', basePrice: 48000, desc: 'Fettuccine aldente berlumur saus krim kuning telur keju parmesan gurih dengan irisan smoked beef renyah' },
          { name: 'Spaghetti Bolognese Daging Cincang Sapi', basePrice: 46000, desc: 'Spaghetti saus tomat ragu daging sapi cincang bumbu rempah italia bertabur keju parmesan' },
          { name: 'Spaghetti Aglio Olio Udang Ekstra Pedas', basePrice: 45000, desc: 'Spaghetti tumis minyak zaitun extra virgin, bawang putih cincang, cabai rawit merah dan udang segar' },
          { name: 'Penne Creamy Pesto Ayam Panggang', basePrice: 48000, desc: 'Pasta penne saus kemangi pesto hijau wangi kacang mete dan potongan dada ayam grill' },
          { name: 'Beef Lasagna Panggang Keju Mozzarella', basePrice: 52000, desc: 'Pasta lembaran berlapis daging sapi cincang, saus bechamel lembut dan keju panggang keemasan' },
          { name: 'Mac & Cheese Cheddar Panggang Gurih', basePrice: 38000, desc: 'Makaroni berlumur saus keju cheddar leleh gurih kental berkerak renyah' },
        ],
      },
      {
        name: 'Sup & Bruschetta',
        items: [
          { name: 'Bruschetta Pomodoro Tomat Basil (3 pcs)', basePrice: 22000, desc: 'Roti baguette panggang bertabur cincangan tomat segar, daun basil, bawang putih dan minyak zaitun' },
          { name: 'Cream of Mushroom Soup Truffle', basePrice: 28000, desc: 'Sup krim jamur kental hangat disajikan dengan roti garlic toast renyah' },
        ],
      },
      {
        name: 'Minuman Peneman Pasta',
        items: [
          { name: 'Lemonade Mint Mojito Virgin', basePrice: 18000, desc: 'Perasan lemon segar, daun mint ditumbuk, sirup gula dan air soda dingin', isDrink: true },
          { name: 'Iced Green Tea Peach Infused', basePrice: 16000, desc: 'Teh hijau dingin beraroma buah persik lembut manis', isDrink: true },
          { name: 'Affogato Es Krim Vanilla Espresso', basePrice: 22000, desc: 'Satu scoop es krim vanilla disiram satu shot espresso panas kental', isDrink: true },
        ],
      },
    ],
  },

  // 3. Gourmet Burger & Steak
  {
    genre: 'Gourmet Burger & Steak',
    nameTemplate: 'Wagyu Smash Burger & Steakery',
    descTemplate: 'Smash burger daging sapi wagyu juicy berkerak gurih dan sirloin steak panggang saus jamur',
    categories: [
      {
        name: 'Gourmet Burgers',
        items: [
          { name: 'Double Wagyu Cheeseburger Smash', basePrice: 56000, desc: 'Dua patty daging sapi wagyu smash berkerak renyah, keju cheddar amerika leleh, acar mentimun & saus rahasia' },
          { name: 'Truffle Mushroom Swiss Burger', basePrice: 62000, desc: 'Patty daging sapi tebal juicy dengan tumisan jamur champignon saus minyak truffle dan keju swiss leleh' },
          { name: 'Crispy Buttermilk Chicken Burger', basePrice: 44000, desc: 'Paha ayam marinasi buttermilk digoreng tepung garing keemasan dengan saus coleslaw manis pedas' },
          { name: 'Smoked BBQ Bacon Cheeseburger', basePrice: 58000, desc: 'Patty sapi dengan saus smokey barbecue karamel, irisan smoked beef bacon renyah dan onion ring' },
          { name: 'Classic Single Cheeseburger Original', basePrice: 38000, desc: 'Burger roti brioche bermentega dengan single patty sapi empuk dan keju cheddar leleh' },
        ],
      },
      {
        name: 'Steak & Grilled Meats',
        items: [
          { name: 'Australian Sirloin Steak 200g French Fries', basePrice: 85000, desc: 'Daging sapi sirloin australia dipanggang tingkat kematangan pas disajikan kentang goreng & saus blackpepper' },
          { name: 'Ribeye Steak Meltique Saus Jamur', basePrice: 88000, desc: 'Potongan ribeye juicy bertabur bumbu rempah butter dengan saus krim jamur kental dan buncis tumis' },
          { name: 'Grilled Chicken Steak Mushroom Sauce', basePrice: 46000, desc: 'Fillet paha ayam panggang tanpa tulang berlumur saus jamur gurih disajikan sayuran kukus' },
        ],
      },
      {
        name: 'Sides & Fries',
        items: [
          { name: 'Truffle Parmesan French Fries', basePrice: 26000, desc: 'Kentang goreng garing bertabur minyak truffle wangi dan parutan keju parmesan asin gurih' },
          { name: 'Crispy Golden Onion Rings (6 pcs)', basePrice: 22000, desc: 'Bawang bombay manis berbalut adonan tepung bir renyah dengan cocolan saus tartar' },
          { name: 'Loaded Cheese & Beef Fries', basePrice: 32000, desc: 'Kentang goreng disiram saus keju cheddar hangat dan taburan daging cincang bumbu' },
        ],
      },
      {
        name: 'Milkshake & Minuman',
        items: [
          { name: 'Classic Chocolate Milkshake Kental', basePrice: 24000, desc: 'Es krim cokelat premium diblender susu segar bertabur whipped cream dan saus cokelat', isDrink: true },
          { name: 'Vanilla Salted Caramel Shake', basePrice: 24000, desc: 'Milkshake es krim vanilla berpadu saus karamel mentega gurih asin legit', isDrink: true },
          { name: 'Iced Lemon Cola Splash', basePrice: 15000, desc: 'Minuman kola berkarbonasi dingin dengan perasan lemon segar', isDrink: true },
        ],
      },
    ],
  },

  // 4. All-Day English Breakfast & Brunch
  {
    genre: 'English Breakfast & Brunch',
    nameTemplate: 'The Londoner All-Day Brunch Club',
    descTemplate: 'Sajian sarapan ala inggris komplit, telur benedict, roti panggang alpukat, dan pancake lembut',
    categories: [
      {
        name: 'All-Day Breakfast Plates',
        items: [
          { name: 'Full English Breakfast Komplit', basePrice: 62000, desc: 'Dua butir telur mata sapi, sosis sapi panggang, baked beans kacang merah saus tomat, tomat panggang, jamur tumis & roti sourdough' },
          { name: 'Eggs Benedict Smoked Beef Hollandaise', basePrice: 54000, desc: 'Dua butir telur rebus setengah matang poached egg, irisan smoked beef di atas roti muffin disiram saus hollandaise mentega' },
          { name: 'Avocado Toast Roti Sourdough Telur Poached', basePrice: 42000, desc: 'Tumbukan alpukat mentega segar berbumbu lemon lada hitam di atas roti sourdough panggang garing' },
          { name: 'Scrambled Eggs Creamy Truffle Sourdough', basePrice: 38000, desc: 'Telur orak-arik super lembut bermentega dengan aroma minyak black truffle di atas roti panggang' },
          { name: 'Fluffy Buttermilk Pancakes Maple Butter (3 pcs)', basePrice: 36000, desc: 'Pancake tebal lembut empuk dengan olesan mentega gurih dan sirup maple manis wangi' },
          { name: 'Belgian Waffle Fried Chicken Honey', basePrice: 48000, desc: 'Waffle renyah manis disandingkan ayam goreng tepung garing dan kucuran madu murni' },
        ],
      },
      {
        name: 'Pastry & Camilan Brunch',
        items: [
          { name: 'Butter Croissant Prancais Hangat', basePrice: 20000, desc: 'Croissant renyah berlapis mentega prancis disajikan dengan selai stroberi' },
          { name: 'Pain Au Chocolat Cokelat Belgia', basePrice: 22000, desc: 'Pastry garing bermentega dengan isian stik cokelat hitam belgia leleh' },
          { name: 'Banana Nutella Toast Panggang', basePrice: 28000, desc: 'Roti brioche tebal oles selai cokelat nutella dengan potongan buah pisang manis' },
        ],
      },
      {
        name: 'Kopi & Teh Brunch',
        items: [
          { name: 'English Breakfast Tea Panas Teko', basePrice: 16000, desc: 'Teh hitam kental aromatik khas inggris disajikan susu segar terpisah', isDrink: true },
          { name: 'Cafe Latte Dingin Susu Creamy', basePrice: 24000, desc: 'Espresso double shot berpadu susu segar dingin lembut berbusa', isDrink: true },
          { name: 'Fresh Orange Juice Peras Murni', basePrice: 20000, desc: 'Jus jeruk peras murni tanpa tambahan air dan gula pemanis', isDrink: true },
        ],
      },
    ],
  },
]
