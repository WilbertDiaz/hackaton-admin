const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'softkob-motel-v3',
    resave: false,
    saveUninitialized: true
}));

// --- RUTAS ---

app.get('/', (req, res) => {
    if (!req.session.config) {
        return res.render('index', { modo: 'setup', datos: null });
    }
    
    const turnos = req.session.turnos || [];
    const turnosOrdenados = turnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.render('index', { 
        modo: 'dashboard',
        config: req.session.config,
        turnos: turnosOrdenados,
        reporte: null
    });
});

// 1. CONFIGURACIÓN INICIAL
app.post('/guardar-config', (req, res) => {
    const { nombreNegocio, room_name, room_type, room_price } = req.body;
    
    // Convertir a arrays para manejar 1 o muchos
    const names = [].concat(room_name);
    const types = [].concat(room_type);
    const prices = [].concat(room_price);

    let habitaciones = [];
    names.forEach((nom, i) => {
        if(nom) {
            habitaciones.push({
                id: Date.now() + i, // ID único
                nombre: nom,
                tipo: types[i],
                precio: parseFloat(prices[i]) || 0
            });
        }
    });

    req.session.config = { nombre: nombreNegocio, habitaciones };
    res.redirect('/');
});

// 2. AGREGAR NUEVA HABITACIÓN (POST-INIT)
app.post('/agregar-habitacion-extra', (req, res) => {
    const { nuevo_nombre, nuevo_tipo, nuevo_precio } = req.body;
    if(req.session.config) {
        req.session.config.habitaciones.push({
            id: Date.now(),
            nombre: nuevo_nombre,
            tipo: nuevo_tipo,
            precio: parseFloat(nuevo_precio)
        });
    }
    res.redirect('/');
});

// 3. GUARDAR TURNO (Lógica de múltiples ocupaciones)
app.post('/agregar-turno', (req, res) => {
    const { fecha, trabajador } = req.body;
    const config = req.session.config;
    
    // Arrays que vienen del formulario dinámico
    // Usamos [].concat para asegurar que sea array aunque sea solo 1 registro
    const ids_habitaciones = [].concat(req.body.habitacion_selec || []); 
    const extras_montos = [].concat(req.body.extra_monto || []);
    const extras_desc = [].concat(req.body.extra_desc || []);

    let ocupaciones = [];
    let totalRentas = 0;
    let totalExtras = 0;

    // Procesar cada ocupación registrada
    ids_habitaciones.forEach((idHab, index) => {
        const habitacionReal = config.habitaciones.find(h => h.id == idHab);
        
        if (habitacionReal) {
            const extraVal = parseFloat(extras_montos[index]) || 0;
            const extraTxt = extras_desc[index] || '';
            
            ocupaciones.push({
                cuarto: habitacionReal.nombre,
                tipo: habitacionReal.tipo,
                precioBase: habitacionReal.precio,
                extra: extraVal,
                notaExtra: extraTxt,
                subtotal: habitacionReal.precio + extraVal
            });

            totalRentas += habitacionReal.precio;
            totalExtras += extraVal;
        }
    });

    const nuevoTurno = {
        id: Date.now(),
        fecha: fecha,
        trabajador: trabajador,
        totalRentas: totalRentas,
        totalExtras: totalExtras,
        totalGeneral: totalRentas + totalExtras,
        ocupaciones: ocupaciones,
        cantidadOcupaciones: ocupaciones.length
    };

    if (!req.session.turnos) req.session.turnos = [];
    req.session.turnos.push(nuevoTurno);
    
    res.redirect('/');
});

app.post('/generar-informe', (req, res) => {
    const { fechaInicio, fechaFin } = req.body;
    const turnos = req.session.turnos || [];
    const filtrados = turnos.filter(t => t.fecha >= fechaInicio && t.fecha <= fechaFin);
    
    const totalCaja = filtrados.reduce((acc, t) => acc + t.totalGeneral, 0);
    const totalOcupaciones = filtrados.reduce((acc, t) => acc + t.cantidadOcupaciones, 0);

    res.render('index', {
        modo: 'dashboard',
        config: req.session.config,
        turnos: turnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
        reporte: { inicio: fechaInicio, fin: fechaFin, turnos: filtrados.length, ocupaciones: totalOcupaciones, totalCaja }
    });
});

app.post('/reset-total', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`SoftKob Motel V3 running on ${PORT}`); });