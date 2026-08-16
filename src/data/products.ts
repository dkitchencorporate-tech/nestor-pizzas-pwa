export interface Category {
    id: string;
    name: string;
    name_en?: string;
    subtitle: string | null;
    desc: string;
}

export interface Product {
    id: number;
    category: string;
    name: string;
    name_en?: string;
    desc: string;
    description_en?: string;
    price: number;
    badge: string;
    img: string;
    subcategory?: string;
    isGroup?: boolean;
    subProducts?: any[];
}

export interface UpsellItem {
    id: string;
    name: string;
    name_en?: string;
    desc: string;
    description_en?: string;
    price: number;
}

export interface UpsellCategory {
    category: string;
    items: UpsellItem[];
}
export const NESTOR_CATEGORIES: Category[] = [
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
        desc: 'Base de nata cremosa sin tomate'
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
        id: 'SECRET BURGUER',
        name: 'SECRET BURGUER',
        subtitle: null,
        desc: 'Hamburguesas especiales de fin de semana'
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
    },
    {
        id: 'PROMOCIONES',
        name: 'PROMOCIONES',
        subtitle: null,
        desc: 'Ofertas especiales y promociones exclusivas'
    }
];

// ==========================================================================
// INGREDIENTES OFICIALES (extraídos literalmente del flyer)
// ==========================================================================
export const NESTOR_INGREDIENTS_OFICIAL: string[] = [
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
export const NESTOR_PRODUCTS: Product[] = [

    // -----------------------------------------------------------------------
    // PROMOCIONES
    // -----------------------------------------------------------------------
    {
        id: 999, category: 'PROMOCIONES',
        name: 'Jueves Locos (2x11€)',
        desc: 'Dos pizzas por 11 euros. Promoción válida solo los jueves. (Pulsa para configurar)',
        price: 11.00,
        badge: 'SOLO JUEVES',
        img: './assets/img/products/jueves_locos_2_pizzas.png'
    },

    // -----------------------------------------------------------------------
    // NUESTRAS PIZZAS (18 pizzas — lado frontal del flyer)
    // -----------------------------------------------------------------------
    {
        id: 1, category: 'NUESTRAS PIZZAS',
        name: 'MILANESA',
        desc: 'Base margarita o nata. york',
        price: 7.00,
        badge: 'BASE + YORK',
        img: './assets/img/products/p01_pizza_milanesa.jpeg'
    },
    {
        id: 2, category: 'NUESTRAS PIZZAS',
        name: 'CALABRESA',
        desc: 'Base margarita o nata. york y queso de cabra',
        price: 8.00,
        badge: 'YORK Y QUESO DE CABRA',
        img: './assets/img/products/p02_pizza_calabresa.jpeg'
    },
    {
        id: 3, category: 'NUESTRAS PIZZAS',
        name: 'KEBAB',
        desc: 'Base margarita o nata. cebolla, carne kebab y salsa kebab',
        price: 9.00,
        badge: 'CARNE KEBAB Y SALSA',
        img: './assets/img/products/p03_pizza_kebab.jpeg'
    },
    {
        id: 4, category: 'NUESTRAS PIZZAS',
        name: 'FLORENTINA',
        desc: 'Base margarita o nata. york, piña y extra de mozzarella',
        price: 9.00,
        badge: 'YORK, PIÑA Y MOZZARELLA',
        img: './assets/img/products/p04_pizza_florentina.jpeg'
    },
    {
        id: 5, category: 'NUESTRAS PIZZAS',
        name: 'SICILIANA',
        desc: 'Base margarita o nata. champiñón, york y atún',
        price: 9.00,
        badge: 'CHAMPIÑÓN, YORK Y ATÚN',
        img: './assets/img/products/p05_pizza_siciliana.jpeg'
    },
    {
        id: 6, category: 'NUESTRAS PIZZAS',
        name: 'NAPOLITANA',
        desc: 'Base margarita o nata. champiñón, bacon y serrano',
        price: 9.00,
        badge: 'CHAMPIÑÓN, BACON Y SERRANO',
        img: './assets/img/products/p06_pizza_napolitana.jpeg'
    },
    {
        id: 7, category: 'NUESTRAS PIZZAS',
        name: 'VENECIANA',
        desc: 'Base margarita o nata. york, salami y salchichas',
        price: 9.00,
        badge: 'YORK, SALAMI Y SALCHICHAS',
        img: './assets/img/products/p07_pizza_veneciana.jpeg'
    },
    {
        id: 8, category: 'NUESTRAS PIZZAS',
        name: 'GENOVESA',
        desc: 'Base margarita o nata. champiñón, gambas y atún',
        price: 9.00,
        badge: 'CHAMPIÑÓN, GAMBAS Y ATÚN',
        img: './assets/img/products/p08_pizza_genovesa.jpeg'
    },
    {
        id: 9, category: 'NUESTRAS PIZZAS',
        name: 'PARMESANA',
        desc: 'Base margarita o nata. Exquisita mezcla de 4 quesos (SIN queso azul)',
        price: 9.00,
        badge: 'MEZCLA 4 QUESOS',
        img: './assets/img/products/p11_pizza_4quesos_sin_azul.png'
    },
    {
        id: 10, category: 'NUESTRAS PIZZAS',
        name: 'MARINERA',
        desc: 'Base margarita o nata. atún, gambas y delicias de mar',
        price: 9.00,
        badge: 'ATÚN, GAMBAS Y MAR',
        img: './assets/img/products/p10_pizza_marinera.jpeg'
    },
    {
        id: 11, category: 'NUESTRAS PIZZAS',
        name: 'CANILERA',
        desc: 'Base margarita o nata. serrano, pollo, pimiento verde y alioli gratinado',
        price: 10.00,
        badge: 'ESPECIALIDAD CANILES',
        img: './assets/img/products/p11_pizza_canilera.jpeg'
    },
    {
        id: 12, category: 'NUESTRAS PIZZAS',
        name: 'TOSCANA',
        desc: 'Base margarita o nata. peperoni, ternera, cebolla y salsa picante',
        price: 10.00,
        badge: 'PEPERONI Y SALSA PICANTE',
        img: './assets/img/products/p12_pizza_toscana.jpeg'
    },
    {
        id: 13, category: 'NUESTRAS PIZZAS',
        name: 'TEXANA',
        desc: 'Base margarita o nata. bacon, ternera, cebolla y salsa barbacoa',
        price: 10.00,
        badge: 'BACON Y SALSA BARBACOA',
        img: './assets/img/products/p13_pizza_texana.jpeg'
    },
    {
        id: 14, category: 'NUESTRAS PIZZAS',
        name: 'ROMANA',
        desc: 'Base margarita o nata. champiñón, pimiento rojo, pimiento verde y cebolla',
        price: 10.00,
        badge: 'VERDURAS Y CHAMPIÑÓN',
        img: './assets/img/products/p14_pizza_romana.jpeg'
    },
    {
        id: 15, category: 'NUESTRAS PIZZAS',
        name: 'AMERICANA',
        desc: 'Base margarita o nata. bacon, ternera, y salsa cheddar',
        price: 9.00,
        badge: 'BACON Y SALSA CHEDDAR',
        img: './assets/img/products/p15_pizza_americana.jpeg'
    },
    {
        id: 16, category: 'NUESTRAS PIZZAS',
        name: 'BOLOÑESA',
        desc: 'Base margarita o nata. salsa boloñesa',
        price: 9.00,
        badge: 'SALSA BOLOÑESA',
        img: './assets/img/products/p16_pizza_bolonesa.jpeg'
    },
    {
        id: 17, category: 'NUESTRAS PIZZAS',
        name: 'CALZONE CURRY',
        desc: 'Base margarita o nata. mozzarella + pollo al curry',
        price: 10.00,
        badge: 'POLLO AL CURRY',
        img: './assets/img/products/p17_calzone_curry.jpeg'
    },
    {
        id: 18, category: 'NUESTRAS PIZZAS',
        name: 'CALZONE CARBONARA',
        desc: 'Base margarita o nata. mozzarella + pollo + salsa carbonara',
        price: 10.00,
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
        price: 9.00,
        badge: 'NATA · CHAMPIÑÓN · BACON',
        img: './assets/img/products/p19_pizza_panna.jpeg'
    },
    {
        id: 20, category: 'PIZZAS BLANCAS',
        name: 'LIONESA',
        desc: 'Nata, mozzarella, york, bacon, huevo al horno',
        price: 9.00,
        badge: 'NATA · YORK · HUEVO',
        img: './assets/img/products/p20_pizza_lionesa.jpeg'
    },
    {
        id: 21, category: 'PIZZAS BLANCAS',
        name: 'CARBONARA',
        desc: 'Nata, mozzarella, york, bacon, cebolla',
        price: 9.00,
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
        price: 2.50,
        badge: 'RACIÓN CRUJIENTE',
        img: './assets/img/products/p32_patatas_fritas.jpeg'
    },
    {
        id: 33, category: 'NUESTRAS PATATAS',
        name: 'PATATAS GAJOS',
        desc: 'Salsas a elegir: Alioli, Barbacoa, Brava, o morisca',
        price: 3.50,
        badge: 'GAJOS A ELEGIR SALSA',
        img: './assets/img/products/p33_patatas_gajos.jpeg'
    },
    {
        id: 34, category: 'NUESTRAS PATATAS',
        name: 'GRATINADAS CHEDDAR',
        desc: 'Llevan bacon y salsa cheddar',
        price: 8.00,
        badge: 'GRATINADAS CHEDDAR',
        img: './assets/img/products/p34_gratinadas_cheddar.jpeg'
    },
    {
        id: 35, category: 'NUESTRAS PATATAS',
        name: 'GRATINADAS MORISCA',
        desc: 'Llevan bacon y salsa cheddar, gratinadas con salsa morisca',
        price: 8.00,
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
        price: 4.00,
        badge: 'NUGUETTS (6 UND)',
        img: './assets/img/products/p36_nuguetts_pollo.jpeg'
    },
    {
        id: 37, category: 'PARA ACOMPAÑAR',
        name: 'ROSCAS DE INGREDIENTES',
        desc: '8 Und',
        price: 4.50,
        badge: 'ROSCAS (8 UND)',
        img: './assets/img/products/p37_aros_cebolla.jpeg'
    },
    {
        id: 38, category: 'PARA ACOMPAÑAR',
        name: 'ALITAS DE POLLO',
        desc: '6 Und',
        price: 5.50,
        badge: 'ALITAS (6 UND)',
        img: './assets/img/products/p38_alitas_pollo.jpeg'
    },

    // -----------------------------------------------------------------------
    // POR INGREDIENTES (1 producto)
    // -----------------------------------------------------------------------
    {
        id: 22, category: 'POR INGREDIENTES',
        name: 'PIZZA MARGARITA',
        desc: 'Tomate, mozzarella, orégano',
        price: 6.00,
        badge: 'BASE · TOMATE · MOZZARELLA',
        img: './assets/img/products/p22_pizza_base_33cm.jpeg'
    },

    // -----------------------------------------------------------------------
    // MAZZI PIZZAS (1 producto)
    // -----------------------------------------------------------------------
    {
        id: 23, category: 'MAZZI PIZZAS',
        name: 'MAZZI PIZZA',
        desc: 'Masa artesana, cinco quesos, lámina de masa y base. ¡Añade tus ingredientes!',
        price: 9.50,
        badge: 'BASE · 5 QUESOS',
        img: './assets/img/products/p27_maxi_pizza_nueva.png'
    },

    // -----------------------------------------------------------------------
    // ALGO MÁS (4 productos)
    // -----------------------------------------------------------------------
    {
        id: 39, category: 'ALGO MÁS',
        name: 'SPAGUETTI BOLOÑESA',
        desc: 'Spaguetti con salsa boloñesa casera',
        price: 7.00,
        badge: 'PASTA BOLOÑESA',
        img: './assets/img/products/p39_spaguetti_bolonesa.jpeg'
    },
    {
        id: 40, category: 'ALGO MÁS',
        name: 'SPAGUETTI CARBONARA',
        desc: 'Spaguetti con cremosa salsa carbonara',
        price: 7.00,
        badge: 'PASTA CARBONARA',
        img: './assets/img/products/p40_spaguetti_carbonara.jpeg'
    },
    {
        id: 41, category: 'ALGO MÁS',
        name: 'POLLO AL CURRY CON ARROZ',
        desc: 'Pollo al curry con arroz',
        price: 9.50,
        badge: 'ESPECIAL CURRY',
        img: './assets/img/products/p41_pollo_curry_arroz.jpeg'
    },
    {
        id: 42, category: 'ALGO MÁS',
        name: 'PIZZA DULCE',
        desc: 'consultar pizza dulce del mes',
        price: 5.50,
        badge: 'POSTRE ARTESANO ★ NEW',
        img: './assets/img/products/p42_pizza_dulce.jpeg'
    },
    {
        id: 53, category: 'ALGO MÁS',
        name: 'BURGUER CRUJIENTE',
        desc: 'Pollo crujiente, lechuga, cheddar loncha y bacon',
        price: 7.40,
        badge: 'POLLO CRUJIENTE',
        img: './assets/img/products/p54_burguer_crujiente.png'
    },
    {
        id: 54, category: 'ALGO MÁS',
        name: 'BOCATA EXTREMEÑO',
        desc: 'Escalope de pollo, bacon y cheddar loncha, acompañado de salsa morisca',
        price: 8.40,
        badge: 'ESCALOPE POLLO',
        img: './assets/img/products/p53_bocata_extremeno.png'
    },
    {
        id: 55, category: 'ALGO MÁS',
        name: 'BOCATA SERRANITO',
        desc: 'Escalope de lomo, pimiento verde y jamón serrano, acompañado de salsa alioli',
        price: 8.40,
        badge: 'ESCALOPE LOMO',
        img: './assets/img/products/p55_bocata_serranito.png'
    },
    
    // -----------------------------------------------------------------------
    // SECRET BURGUER (3 productos)
    // -----------------------------------------------------------------------
    {
        id: 50, category: 'SECRET BURGUER',
        name: 'CHEDDAR LOVE',
        desc: '100 gramos de carne de ternera, queso cheddar, bacon y salsa cheddar',
        price: 10.40,
        badge: 'LIMITED',
        img: './assets/img/products/secret_burger_cheddar_love_1786580857322.png'
    },
    {
        id: 51, category: 'SECRET BURGUER',
        name: 'CABRONA',
        desc: '100 gramos de carne de ternera, queso de cabra, cebolla caramelizada y salsa miel-mostaza',
        price: 10.40,
        badge: 'LIMITED',
        img: './assets/img/products/secret_burger_cabrona_1786580864855.png'
    },
    {
        id: 52, category: 'SECRET BURGUER',
        name: 'PULLED BBQ',
        desc: '100 gramos de carne de ternera, queso cheddar, pulled pork y salsa barbacoa',
        price: 10.40,
        badge: 'LIMITED',
        img: './assets/img/products/secret_burger_pulled_bbq_1786580874530.png'
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

export const NESTOR_UPSELLS: UpsellCategory[] = [
    {
        category: 'PARA PICAR',
        items: [
            { id: 'u1', name: 'Patatas Gajos + Salsa', desc: 'Con salsa especial a elegir', price: 3.50 },
            { id: 'u3', name: 'Alitas de Pollo (6 Und)', desc: 'Crujientes con salsa barbacoa', price: 5.50 },
            { id: 'u4', name: 'Aros de Cebolla (6 Und)', desc: 'Crujientes y dorados', price: 3.50 }
        ]
    },
    {
        category: 'BEBIDAS',
        items: [
            { id: 'u2', name: 'Cerveza Lata', desc: 'Bien fría', price: 1.50 },
            { id: 'u5', name: 'Refresco Lata', desc: 'Cola, Naranja, Limón', price: 1.50 },
            { id: 'u6', name: 'Agua 500ml', desc: 'Agua mineral natural', price: 1.00 }
        ]
    },
    {
        category: 'POSTRES',
        items: [
            { id: 'u7', name: 'Helado Sandwich', desc: 'Nata y chocolate', price: 2.50 },
            { id: 'u8', name: 'Cono de Helado', desc: 'Vainilla con almendras', price: 2.50 }
        ]
    }
];
