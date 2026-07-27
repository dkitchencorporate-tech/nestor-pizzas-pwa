window.CATALOG_EN = {
    categories: {
        'NUESTRAS PIZZAS': { 
            name: 'OUR PIZZAS', 
            desc: 'Natural tomato base and fior di latte mozzarella — artisan dough baked instantly' 
        },
        'PIZZAS BLANCAS': { 
            name: 'WHITE PIZZAS', 
            desc: 'Cream base without tomato — no additional wheat gluten' 
        },
        'NUESTRAS PATATAS': { 
            name: 'OUR FRIES', 
            desc: 'Crispy freshly made portions to share' 
        },
        'PARA ACOMPAÑAR': { 
            name: 'SIDES', 
            desc: 'Golden and crispy sides fresh from the kitchen' 
        },
        'POR INGREDIENTES': { 
            name: 'CUSTOM INGREDIENTS', 
            desc: 'Create your own pizza — tomato base, mozzarella and oregano with your choice of toppings' 
        },
        'MAZZI PIZZAS': { 
            name: 'MAZZI PIZZAS', 
            desc: 'Our artisan dough, exquisite five-cheese blend, dough sheet, our base and your favorite selection. *Limited units' 
        },
        'ALGO MÁS': { 
            name: 'SOMETHING ELSE', 
            desc: 'Spaghetti bolognese and carbonara, chicken curry with rice and seasonal dessert' 
        },
        'BEBIDAS': { 
            name: 'DRINKS', 
            desc: 'Water, soft drinks and cold beers' 
        }
    }
};

window.app = window.app || {};
window.app.t_cat = function(catId, field) {
    if (window.app.currentLang !== 'en') {
        // Find original from products.js to return Spanish if needed, 
        // but we assume the caller passes the original string except when field is needed from ID.
        return null;
    }
    if (window.CATALOG_EN && window.CATALOG_EN.categories[catId]) {
        return window.CATALOG_EN.categories[catId][field];
    }
    return null;
};
