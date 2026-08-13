const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// I will just append the missing CSS before </head>
const missingCSS = `
        }
        .category-pill.active {
            background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
            color: #FFFFFF;
            font-weight: 800;
            box-shadow: 0 0 25px rgba(34, 197, 94, 0.5);
            border-color: #4ADE80;
        }

        .card-curved {
            background-color: #14141E;
            border: 2px solid rgba(34, 197, 94, 0.4);
            border-radius: 2rem;
            transition: all 0.38s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-curved:hover {
            border-color: #22C55E;
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.35);
            transform: translateY(-4px);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade { animation: fadeIn 0.4s ease-out forwards; }
    </style>
`;

content = content.replace('</head>', missingCSS + '</head>');
fs.writeFileSync(htmlPath, content, 'utf8');
