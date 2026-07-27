/* =========================================================================
   NÉSTOR PIZZAS — DICCIONARIO OFICIAL 1:1 FLYER FÍSICO
   Versión: v20260726 | Estructura modular — NO MODIFICAR SIN AUTORIZACIÓN
   ========================================================================= */

// ==========================================================================
// 8 CATEGORÍAS EXACTAS DEL FLYER (NOMBRES IDÉNTICOS, NI UNA LETRA DISTINTA)
// ==========================================================================
const NESTOR_CATEGORIES = [
    {
        id: 'NUESTRAS PIZZAS',
        name: 'NUESTRAS PIZZAS',
        subtitle: '33 ø',
        desc: 'Base de tomate natural y mozzarella fior di latte — masa artesana horneada al momento'
    },
    {
        id: 'PIZZAS BLANCAS',
        name: 'PIZZAS BLANCAS',
        subtitle: '33 ø',
        desc: 'Base de nata cremosa sin tomate — sin gluten de trigo adicional'
    },
    {
        id: 'NUESTRAS PATATAS',
        name: 'NUESTRAS PATATAS',
        subtitle: null,
        desc: 'Raciones crujientes recién hechas para compartir'
    },
    {
        id: 'PARA ACOMPAÑAR',
        name: 'PARA ACOMPAÑAR',
        subtitle: null,
        desc: 'Complementos dorados y crujientes recién salidos de cocina'
    },
    {
        id: 'POR INGREDIENTES',
        name: 'POR INGREDIENTES',
        subtitle: '33 ø',
        desc: 'Crea tu propia pizza — base de tomate, mozzarella y orégano con los ingredientes que tú elijas'
    },
    {
        id: 'MAZZI PIZZAS',
        name: 'MAZZI PIZZAS',
        subtitle: '31 ø',
        desc: 'Nuestra masa artesana, exquisita mezcla de cinco quesos, una lámina de masa, nuestra base y la selección que más te apetezca. *Unidades limitadas'
    },
    {
        id: 'ALGO MÁS',
        name: 'ALGO MÁS',
        subtitle: null,
        desc: 'Spaguetti boloñesa y carbonara, pollo al curry con arroz y postre de temporada'
    },
    {
        id: 'BEBIDAS',
        name: 'BEBIDAS',
        subtitle: null,
        desc: 'Agua, refrescos y cervezas bien frías'
    }
];

// ==========================================================================
// INGREDIENTES OFICIALES (extraídos literalmente del flyer)
// ==========================================================================
const NESTOR_INGREDIENTS_OFICIAL = [
    'Aceitunas negras', 'Cebolla', 'Champiñón', 'Pimiento rojo',
    'Pimiento verde', 'Maíz', 'Atún', 'Gambas', 'Delicias de mar',
    'Bacon', 'Carne kebab', 'Jamón serrano', 'Jamón york', 'Peperoni',
    'Pollo', 'Salami', 'Salchichas', 'Ternera', 'Extra mozzarella',
    'Roquefort', 'Queso de cabra', 'Huevo', 'Piña', 'Alioli gratinado',
    'Salsa barbacoa', 'Salsa cheddar', 'Salsa kebab', 'Salsa picante'
];

// ==========================================================================
// 49 PRODUCTOS EXACTOS DEL FLYER — NINGÚN NOMBRE INVENTADO
// ==========================================================================
const NESTOR_PRODUCTS = [

    // -----------------------------------------------------------------------
    // NUESTRAS PIZZAS (18 pizzas — lado frontal del flyer)
    // -----------------------------------------------------------------------
    {
        id: 1, category: 'NUESTRAS PIZZAS',
        name: 'MILANESA',
        desc: 'base + york',
        price: 6.50,
        badge: 'BASE + YORK',
        img: './assets/img/products/p01_pizza_milanesa.jpeg'
    },
    {
        id: 2, category: 'NUESTRAS PIZZAS',
        name: 'CALABRESA',
        desc: 'base + york y queso de cabra',
        price: 7.50,
        badge: 'YORK Y QUESO DE CABRA',
        img: './assets/img/products/p02_pizza_calabresa.jpeg'
    },
    {
        id: 3, category: 'NUESTRAS PIZZAS',
        name: 'KEBAB',
        desc: 'base + cebolla, carne kebab y salsa kebab',
        price: 8.50,
        badge: 'CARNE KEBAB Y SALSA',
        img: './assets/img/products/p03_pizza_kebab.jpeg'
    },
    {
        id: 4, category: 'NUESTRAS PIZZAS',
        name: 'FLORENTINA',
        desc: 'base + york, piña y extra de mozzarella',
        price: 8.50,
        badge: 'YORK, PIÑA Y MOZZARELLA',
        img: './assets/img/products/p04_pizza_florentina.jpeg'
    },
    {
        id: 5, category: 'NUESTRAS PIZZAS',
        name: 'SICILIANA',
        desc: 'base + champiñón, york y atún',
        price: 8.50,
        badge: 'CHAMPIÑÓN, YORK Y ATÚN',
        img: './assets/img/products/p05_pizza_siciliana.jpeg'
    },
    {
        id: 6, category: 'NUESTRAS PIZZAS',
        name: 'NAPOLITANA',
        desc: 'base + champiñón, bacon y serrano',
        price: 8.50,
        badge: 'CHAMPIÑÓN, BACON Y SERRANO',
        img: './assets/img/products/p06_pizza_napolitana.jpeg'
    },
    {
        id: 7, category: 'NUESTRAS PIZZAS',
        name: 'VENECIANA',
        desc: 'base + york, salami y salchichas',
        price: 8.50,
        badge: 'YORK, SALAMI Y SALCHICHAS',
        img: './assets/img/products/p07_pizza_veneciana.jpeg'
    },
    {
        id: 8, category: 'NUESTRAS PIZZAS',
        name: 'GENOVESA',
        desc: 'base + champiñón, gambas y atún',
        price: 8.50,
        badge: 'CHAMPIÑÓN, GAMBAS Y ATÚN',
        img: './assets/img/products/p08_pizza_genovesa.jpeg'
    },
    {
        id: 9, category: 'NUESTRAS PIZZAS',
        name: 'PARMESANA',
        desc: 'base + exquisita mezcla de 4 quesos',
        price: 8.50,
        badge: 'MEZCLA 4 QUESOS',
        img: './assets/img/products/p09_pizza_parmesana.jpeg'
    },
    {
        id: 10, category: 'NUESTRAS PIZZAS',
        name: 'MARINERA',
        desc: 'base + atún, gambas y delicias de mar',
        price: 8.50,
        badge: 'ATÚN, GAMBAS Y MAR',
        img: './assets/img/products/p10_pizza_marinera.jpeg'
    },
    {
        id: 11, category: 'NUESTRAS PIZZAS',
        name: 'CANILERA',
        desc: 'base + serrano, pollo, pimiento verde y alioli gratinado',
        price: 9.50,
        badge: 'ESPECIALIDAD CANILES',
        img: './assets/img/products/p11_pizza_canilera.jpeg'
    },
    {
        id: 12, category: 'NUESTRAS PIZZAS',
        name: 'TOSCANA',
        desc: 'base + peperoni, ternera, cebolla y salsa picante',
        price: 9.50,
        badge: 'PEPERONI Y SALSA PICANTE',
        img: './assets/img/products/p12_pizza_toscana.jpeg'
    },
    {
        id: 13, category: 'NUESTRAS PIZZAS',
        name: 'TEXANA',
        desc: 'base + bacon, ternera, cebolla y salsa barbacoa',
        price: 9.50,
        badge: 'BACON Y SALSA BARBACOA',
        img: './assets/img/products/p13_pizza_texana.jpeg'
    },
    {
        id: 14, category: 'NUESTRAS PIZZAS',
        name: 'ROMANA',
        desc: 'base + champiñón, pimiento rojo, pimiento verde y cebolla',
        price: 9.50,
        badge: 'VERDURAS Y CHAMPIÑÓN',
        img: './assets/img/products/p14_pizza_romana.jpeg'
    },
    {
        id: 15, category: 'NUESTRAS PIZZAS',
        name: 'AMERICANA',
        desc: 'base + bacon, ternera, y salsa cheddar',
        price: 8.50,
        badge: 'BACON Y SALSA CHEDDAR',
        img: './assets/img/products/p15_pizza_americana.jpeg'
    },
    {
        id: 16, category: 'NUESTRAS PIZZAS',
        name: 'BOLOÑESA',
        desc: 'base + salsa boloñesa',
        price: 8.50,
        badge: 'SALSA BOLOÑESA',
        img: './assets/img/products/p16_pizza_bolonesa.jpeg'
    },
    {
        id: 17, category: 'NUESTRAS PIZZAS',
        name: 'CALZONE CURRY',
        desc: 'base + mozzarella + pollo al curry',
        price: 9.50,
        badge: 'POLLO AL CURRY',
        img: './assets/img/products/p17_calzone_curry.jpeg'
    },
    {
        id: 18, category: 'NUESTRAS PIZZAS',
        name: 'CALZONE CARBONARA',
        desc: 'base + mozzarella + pollo + salsa carbonara',
        price: 9.50,
        badge: 'POLLO Y CARBONARA ★ NEW',
        img: './assets/img/products/p18_calzone_carbonara.jpeg'
    },

    // -----------------------------------------------------------------------
    // PIZZAS BLANCAS (3 pizzas)
    // -----------------------------------------------------------------------
    {
        id: 19, category: 'PIZZAS BLANCAS',
        name: 'PANNA',
        desc: 'Nata, mozzarella, champiñón, bacon, pollo',
        price: 8.50,
        badge: 'NATA · CHAMPIÑÓN · BACON',
        img: './assets/img/products/p19_pizza_panna.jpeg'
    },
    {
        id: 20, category: 'PIZZAS BLANCAS',
        name: 'LIONESA',
        desc: 'Nata, mozzarella, york, bacon, huevo al horno',
        price: 8.50,
        badge: 'NATA · YORK · HUEVO',
        img: './assets/img/products/p20_pizza_lionesa.jpeg'
    },
    {
        id: 21, category: 'PIZZAS BLANCAS',
        name: 'CARBONARA',
        desc: 'Nata, mozzarella, york, bacon, cebolla',
        price: 8.50,
        badge: 'NATA · YORK · BACON',
        img: './assets/img/products/p21_pizza_carbonara.jpeg'
    },

    // -----------------------------------------------------------------------
    // NUESTRAS PATATAS (4 productos)
    // -----------------------------------------------------------------------
    {
        id: 32, category: 'NUESTRAS PATATAS',
        name: 'PATATAS FRITAS',
        desc: 'Ración de patatas fritas crujientes',
        price: 2.00,
        badge: 'RACIÓN CRUJIENTE',
        img: './assets/img/products/p32_patatas_fritas.jpeg'
    },
    {
        id: 33, category: 'NUESTRAS PATATAS',
        name: 'PATATAS GAJOS',
        desc: 'Salsas a elegir: Alioli, Barbacoa, Brava, o morisca',
        price: 3.00,
        badge: 'GAJOS A ELEGIR SALSA',
        img: './assets/img/products/p33_patatas_gajos.jpeg'
    },
    {
        id: 34, category: 'NUESTRAS PATATAS',
        name: 'GRATINADAS CHEDDAR',
        desc: 'Patatas gratinadas con salsa cheddar',
        price: 7.50,
        badge: 'GRATINADAS CHEDDAR',
        img: './assets/img/products/p34_gratinadas_cheddar.jpeg'
    },
    {
        id: 35, category: 'NUESTRAS PATATAS',
        name: 'GRATINADAS MORISCA',
        desc: 'Patatas gratinadas estilo morisco',
        price: 7.50,
        badge: 'GRATINADAS MORISCA',
        img: './assets/img/products/p35_gratinadas_morisca.jpeg'
    },

    // -----------------------------------------------------------------------
    // PARA ACOMPAÑAR (3 productos)
    // -----------------------------------------------------------------------
    {
        id: 36, category: 'PARA ACOMPAÑAR',
        name: 'NUGUETTS DE POLLO',
        desc: '6 Und',
        price: 3.50,
        badge: 'NUGUETTS (6 UND)',
        img: './assets/img/products/p36_nuguetts_pollo.jpeg'
    },
    {
        id: 37, category: 'PARA ACOMPAÑAR',
        name: 'AROS DE CEBOLLA',
        desc: '8 Und',
        price: 4.00,
        badge: 'AROS CEBOLLA (8 UND)',
        img: './assets/img/products/p37_aros_cebolla.jpeg'
    },
    {
        id: 38, category: 'PARA ACOMPAÑAR',
        name: 'ALITAS DE POLLO',
        desc: '6 Und',
        price: 5.00,
        badge: 'ALITAS (6 UND)',
        img: './assets/img/products/p38_alitas_pollo.jpeg'
    },

    // -----------------------------------------------------------------------
    // POR INGREDIENTES (5 productos)
    // -----------------------------------------------------------------------
    {
        id: 22, category: 'POR INGREDIENTES',
        name: 'PIZZA BASE',
        desc: 'Tomate, mozzarella, orégano',
        price: 5.50,
        badge: 'BASE · TOMATE · MOZZARELLA',
        img: './assets/img/products/p22_pizza_base_33cm.jpeg'
    },
    {
        id: 23, category: 'POR INGREDIENTES',
        name: 'PIZZA BASE + 1 INGREDIENTE',
        desc: 'Base + 1 ingrediente a tu elección',
        price: 6.50,
        badge: '+ 1 INGREDIENTE',
        img: './assets/img/products/p23_pizza_base_1ing.jpeg'
    },
    {
        id: 24, category: 'POR INGREDIENTES',
        name: 'PIZZA BASE + 2 INGREDIENTES',
        desc: 'Base + 2 ingredientes a tu elección',
        price: 7.50,
        badge: '+ 2 INGREDIENTES',
        img: './assets/img/products/p24_pizza_base_2ing.jpeg'
    },
    {
        id: 25, category: 'POR INGREDIENTES',
        name: 'PIZZA BASE + 3 INGREDIENTES',
        desc: 'Base + 3 ingredientes a tu elección',
        price: 8.50,
        badge: '+ 3 INGREDIENTES',
        img: './assets/img/products/p25_pizza_base_3ing.jpeg'
    },
    {
        id: 26, category: 'POR INGREDIENTES',
        name: 'PIZZA BASE + 4 INGREDIENTES',
        desc: 'Base + 4 ingredientes a tu elección',
        price: 9.50,
        badge: '+ 4 INGREDIENTES',
        img: './assets/img/products/p26_pizza_base_4ing.jpeg'
    },

    // -----------------------------------------------------------------------
    // MAZZI PIZZAS (5 productos)
    // -----------------------------------------------------------------------
    {
        id: 27, category: 'MAZZI PIZZAS',
        name: 'MAZZI PIZZA (MP) BASE',
        desc: 'Nuestra masa artesana, exquisita mezcla de cinco quesos',
        price: 8.50,
        badge: 'MAZZI BASE 5 QUESOS',
        img: './assets/img/products/p27_mazzi_base_31cm.jpeg'
    },
    {
        id: 28, category: 'MAZZI PIZZAS',
        name: 'M.PIZZA BASE + 1 INGREDIENTE',
        desc: 'Mazzi 5 quesos + 1 ingrediente a tu elección',
        price: 9.50,
        badge: 'MAZZI + 1 INGREDIENTE',
        img: './assets/img/products/p28_mazzi_1ing.jpeg'
    },
    {
        id: 29, category: 'MAZZI PIZZAS',
        name: 'M.PIZZA BASE + 2 INGREDIENTES',
        desc: 'Mazzi 5 quesos + 2 ingredientes a tu elección',
        price: 10.50,
        badge: 'MAZZI + 2 INGREDIENTES',
        img: './assets/img/products/p29_mazzi_2ing.jpeg'
    },
    {
        id: 30, category: 'MAZZI PIZZAS',
        name: 'M.PIZZA BASE + 3 INGREDIENTES',
        desc: 'Mazzi 5 quesos + 3 ingredientes a tu elección',
        price: 11.50,
        badge: 'MAZZI + 3 INGREDIENTES',
        img: './assets/img/products/p30_mazzi_3ing.jpeg'
    },
    {
        id: 31, category: 'MAZZI PIZZAS',
        name: 'M.PIZZA BASE + 4 INGREDIENTES',
        desc: 'Mazzi 5 quesos + 4 ingredientes a tu elección',
        price: 12.50,
        badge: 'MAZZI + 4 INGREDIENTES',
        img: './assets/img/products/p31_mazzi_4ing.jpeg'
    },

    // -----------------------------------------------------------------------
    // ALGO MÁS (4 productos)
    // -----------------------------------------------------------------------
    {
        id: 39, category: 'ALGO MÁS',
        name: 'SPAGUETTI BOLOÑESA',
        desc: 'Spaguetti con salsa boloñesa casera',
        price: 6.50,
        badge: 'PASTA BOLOÑESA',
        img: './assets/img/products/p39_spaguetti_bolonesa.jpeg'
    },
    {
        id: 40, category: 'ALGO MÁS',
        name: 'SPAGUETTI CARBONARA',
        desc: 'Spaguetti con cremosa salsa carbonara',
        price: 6.50,
        badge: 'PASTA CARBONARA',
        img: './assets/img/products/p40_spaguetti_carbonara.jpeg'
    },
    {
        id: 41, category: 'ALGO MÁS',
        name: 'POLLO AL CURRY CON ARROZ',
        desc: 'Pollo al curry con arroz',
        price: 9.00,
        badge: 'ESPECIAL CURRY',
        img: './assets/img/products/p41_pollo_curry_arroz.jpeg'
    },
    {
        id: 42, category: 'ALGO MÁS',
        name: 'PIZZA DULCE',
        desc: 'consultar pizza dulce del mes',
        price: 5.00,
        badge: 'POSTRE ARTESANO ★ NEW',
        img: './assets/img/products/p42_pizza_dulce.jpeg'
    },

    // -----------------------------------------------------------------------
    // BEBIDAS (7 productos)
    // -----------------------------------------------------------------------
    {
        id: 43, category: 'BEBIDAS',
        name: 'Agua Pequeña',
        desc: 'Agua mineral pequeña fría',
        price: 1.00,
        badge: 'AGUA PEQUEÑA',
        img: './assets/img/products/p43_agua_pequena.jpeg'
    },
    {
        id: 44, category: 'BEBIDAS',
        name: 'Agua 1,5 Litros',
        desc: 'Botella de agua mineral 1,5L fría',
        price: 1.50,
        badge: 'AGUA 1,5 LITROS',
        img: './assets/img/products/p44_agua_litro.jpeg'
    },
    {
        id: 45, category: 'BEBIDAS',
        name: 'Refrescos Lata',
        desc: 'Lata de refresco 33cl fría',
        price: 1.50,
        badge: 'REFRESCO LATA',
        img: './assets/img/products/p45_refrescos_lata.jpeg'
    },
    {
        id: 46, category: 'BEBIDAS',
        name: 'Cerveza Lata',
        desc: 'Lata de cerveza 33cl fría',
        price: 1.50,
        badge: 'CERVEZA LATA',
        img: './assets/img/products/p46_cerveza_lata.jpeg'
    },
    {
        id: 47, category: 'BEBIDAS',
        name: 'Aquarius',
        desc: 'Lata de Aquarius fría',
        price: 1.60,
        badge: 'AQUARIUS',
        img: './assets/img/products/p47_aquarius.jpeg'
    },
    {
        id: 48, category: 'BEBIDAS',
        name: 'Cerveza Litro',
        desc: 'Botella de cerveza 1 litro fría',
        price: 2.50,
        badge: 'CERVEZA LITRO',
        img: './assets/img/products/p48_cerveza_litro.jpeg'
    },
    {
        id: 49, category: 'BEBIDAS',
        name: 'Refreco 2 Litros',
        desc: 'Botella de refresco 2 litros familiar fría',
        price: 3.00,
        badge: 'REFRESCO 2 LITROS',
        img: './assets/img/products/p49_refresco_2litros.jpeg'
    }
];

const NESTOR_UPSELLS = [
    { id: 'u1', name: 'Patatas Gajos + Salsa', desc: 'Con salsa especial a elegir', price: 3.00, img: './assets/img/products/p33_patatas_gajos.jpeg' },
    { id: 'u2', name: 'Cerveza Lata', desc: 'Bien fría para acompañar tu pizza', price: 1.50, img: './assets/img/products/p46_cerveza_lata.jpeg' },
    { id: 'u3', name: 'Alitas de Pollo (6 Und)', desc: 'Crujientes con salsa barbacoa', price: 5.00, img: './assets/img/products/p38_alitas_pollo.jpeg' }
];
