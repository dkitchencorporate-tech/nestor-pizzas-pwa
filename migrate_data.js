const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'js', 'products.js');
const destPath = path.join(__dirname, 'src', 'data', 'products.ts');

let content = fs.readFileSync(srcPath, 'utf8');

// Convertir a TypeScript quitando `const` y agregando `export const`
content = content.replace(/const NESTOR_CATEGORIES/g, 'export const NESTOR_CATEGORIES');
content = content.replace(/const NESTOR_INGREDIENTS_OFICIAL/g, 'export const NESTOR_INGREDIENTS_OFICIAL');
content = content.replace(/const NESTOR_PRODUCTS/g, 'export const NESTOR_PRODUCTS');
content = content.replace(/const NESTOR_UPSELLS/g, 'export const NESTOR_UPSELLS');

// Añadir interfaces
const tsHeader = `
export interface Category {
    id: string;
    name: string;
    subtitle: string | null;
    desc: string;
}

export interface Product {
    id: number;
    category: string;
    name: string;
    desc: string;
    price: number;
    badge: string;
    img: string;
}

export interface UpsellItem {
    id: string;
    name: string;
    desc: string;
    price: number;
}

export interface UpsellCategory {
    category: string;
    items: UpsellItem[];
}
`;

// Modificar "Pizzas Blancas" description
content = content.replace(
    "'Base de nata cremosa sin tomate — sin gluten de trigo adicional'",
    "'Base de nata cremosa sin tomate'"
);

// Añadir "SECRET BURGUER" a NESTOR_CATEGORIES
content = content.replace(
    /\{\s*id: 'ALGO MÁS'/g,
    `{
        id: 'SECRET BURGUER',
        name: 'SECRET BURGUER',
        subtitle: null,
        desc: 'Hamburguesas especiales de fin de semana'
    },
    {
        id: 'ALGO MÁS'`
);

// Añadir productos de SECRET BURGUER
const secretBurguerProducts = `
    // -----------------------------------------------------------------------
    // SECRET BURGUER (3 productos)
    // -----------------------------------------------------------------------
    {
        id: 50, category: 'SECRET BURGUER',
        name: 'CHEDDAR LOVE',
        desc: 'Hamburguesa artesana, doble cheddar, bacon',
        price: 9.90,
        badge: 'LIMITED',
        img: './assets/img/products/smash_burger.jpeg'
    },
    {
        id: 51, category: 'SECRET BURGUER',
        name: 'CABRONA',
        desc: 'Hamburguesa artesana, queso de cabra, cebolla caramelizada',
        price: 9.90,
        badge: 'LIMITED',
        img: './assets/img/products/smash_burger.jpeg' // placeholder
    },
    {
        id: 52, category: 'SECRET BURGUER',
        name: 'PULLED BBQ',
        desc: 'Hamburguesa artesana, pulled pork, salsa BBQ',
        price: 9.90,
        badge: 'LIMITED',
        img: './assets/img/products/smash_burger.jpeg' // placeholder
    },

    // -----------------------------------------------------------------------
    // BEBIDAS`;
content = content.replace(/\/\/ -----------------------------------------------------------------------\r?\n\s*\/\/ BEBIDAS/g, secretBurguerProducts);

// Reemplazar "base +" por "Base margarita o nata. "
content = content.replace(/'base \+ /g, "'Base margarita o nata. ");

// Modificar Pizza Parmesana (id 9)
content = content.replace(
    /name: 'PARMESANA',\s*desc: 'Base margarita o nata. exquisita mezcla de 4 quesos',/,
    "name: 'PARMESANA',\n        desc: 'Base margarita o nata. Exquisita mezcla de 4 quesos (SIN queso azul)',"
);
content = content.replace(
    /img: '.\/assets\/img\/products\/p09_pizza_parmesana.jpeg'/g,
    "img: ''"
);

// Modificar Patatas Gratinadas
content = content.replace(
    /desc: 'Patatas gratinadas con salsa cheddar',/g,
    "desc: 'Llevan bacon y salsa cheddar',"
);
content = content.replace(
    /desc: 'Patatas gratinadas estilo morisco',/g,
    "desc: 'Llevan bacon y salsa cheddar',"
);

// Add Types to the arrays
content = content.replace('export const NESTOR_CATEGORIES = [', 'export const NESTOR_CATEGORIES: Category[] = [');
content = content.replace('export const NESTOR_PRODUCTS = [', 'export const NESTOR_PRODUCTS: Product[] = [');
content = content.replace('export const NESTOR_UPSELLS = [', 'export const NESTOR_UPSELLS: UpsellCategory[] = [');
content = content.replace('export const NESTOR_INGREDIENTS_OFICIAL = [', 'export const NESTOR_INGREDIENTS_OFICIAL: string[] = [');


fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, tsHeader + '\\n' + content, 'utf8');

console.log('Migración completada exitosamente.');
