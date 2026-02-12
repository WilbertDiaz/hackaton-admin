const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

// 1. Configuración básica
app.set('view engine', 'ejs');
app.use(express.static('public')); // Para archivos estáticos si los necesitas
app.use(bodyParser.urlencoded({ extended: true }));

// 2. Configuración de la sesión (Aquí se guardan los datos temporalmente)
app.use(session({
    secret: 'secreto-super-seguro-hackaton',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Pon true si usas HTTPS en producción, false para dev
}));

// 3. Datos Simulados (Opciones que el admin puede elegir)
const OPCIONES_NEGOCIO = [
    { id: 1, nombre: 'Aprobar Presupuesto', costo: 0 },
    { id: 2, nombre: 'Solicitar Suministros', costo: 150 },
    { id: 3, nombre: 'Agendar Reunión Staff', costo: 0 },
    { id: 4, nombre: 'Lanzar Promo Flash', costo: 50 }
];

// 4. Rutas
app.get('/', (req, res) => {
    // Si no existe la lista en la sesión, la creamos vacía
    if (!req.session.seleccionadas) {
        req.session.seleccionadas = [];
    }
    
    res.render('index', { 
        opciones: OPCIONES_NEGOCIO,
        seleccionadas: req.session.seleccionadas
    });
});

app.post('/agregar', (req, res) => {
    const opcionId = parseInt(req.body.opcion);
    const opcionEncontrada = OPCIONES_NEGOCIO.find(o => o.id === opcionId);

    if (opcionEncontrada) {
        if (!req.session.seleccionadas) req.session.seleccionadas = [];
        // Agregamos con timestamp para diferenciar
        req.session.seleccionadas.push({
            ...opcionEncontrada,
            timestamp: new Date().toLocaleTimeString()
        });
    }
    res.redirect('/');
});

app.post('/limpiar', (req, res) => {
    req.session.seleccionadas = [];
    res.redirect('/');
});

// 5. Encender motor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 App volando en el puerto ${PORT}`);
});