const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'softkob-motel-secret',
    resave: false,
    saveUninitialized: true
}));

// --- RUTAS ---

app.get('/', (req, res) => {
    // 1. Si no hay configuración del Motel, enviamos flag para mostrar el Wizard
    if (!req.session.config) {
        return res.render('index', { 
            modo: 'setup',
            datos: null
        });
    }

    // 2. Si ya está configurado, mostramos el Dashboard
    const turnos = req.session.turnos || [];
    // Ordenar turnos por fecha descendente
    const turnosOrdenados = turnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.render('index', { 
        modo: 'dashboard',
        config: req.session.config,
        turnos: turnosOrdenados,
        reporte: null
    });
});

// GUARDAR CONFIGURACIÓN DEL MOTEL
app.post('/guardar-config', (req, res) => {
    const { nombreNegocio, room_names, room_types, room_prices } = req.body;
    
    // Procesamos las habitaciones que vienen como arrays
    let habitaciones = [];
    
    // Verificamos si es un array (varias habitacion) o string (una sola)
    if (Array.isArray(room_names)) {
        for(let i=0; i < room_names.length; i++) {
            if(room_names[i]) { // Solo si tiene nombre
                habitaciones.push({
                    id: i,
                    nombre: room_names[i],
                    tipo: room_types[i],
                    precio: parseFloat(room_prices[i]) || 0
                });
            }
        }
    } else {
        // Caso borde: solo registró 1 habitación
        habitaciones.push({
            id: 0,
            nombre: room_names,
            tipo: room_types,
            precio: parseFloat(room_prices)
        });
    }

    req.session.config = {
        nombre: nombreNegocio,
        habitaciones: habitaciones
    };
    
    res.redirect('/');
});

// GUARDAR TURNO (DÍA)
app.post('/agregar-turno', (req, res) => {
    const { fecha, trabajador } = req.body;
    const config = req.session.config;
    
    let detalleUso = [];
    let totalHabitaciones = 0;
    let totalExtras = 0;

    // Iteramos sobre las habitaciones configuradas para ver cuáles se usaron
    config.habitaciones.forEach(hab => {
        // req.body[`uso_${hab.id}`] vendrá como "on" si se marcó el checkbox
        const seUso = req.body[`uso_${hab.id}`] === 'on';
        const extra = parseFloat(req.body[`extra_${hab.id}`]) || 0;

        if (seUso || extra > 0) {
            const costoHabitacion = seUso ? hab.precio : 0;
            
            detalleUso.push({
                nombre: hab.nombre,
                tipo: hab.tipo,
                seUso: seUso,
                precioBase: costoHabitacion,
                extra: extra,
                subtotal: costoHabitacion + extra
            });

            totalHabitaciones += costoHabitacion;
            totalExtras += extra;
        }
    });

    const nuevoTurno = {
        id: Date.now(),
        fecha: fecha,
        trabajador: trabajador,
        totalHabitaciones: totalHabitaciones,
        totalExtras: totalExtras,
        totalGeneral: totalHabitaciones + totalExtras,
        detalles: detalleUso
    };

    if (!req.session.turnos) req.session.turnos = [];
    req.session.turnos.push(nuevoTurno);

    res.redirect('/');
});

// GENERAR REPORTE (Sin cambios mayores, solo ajustado a nuevas variables)
app.post('/generar-informe', (req, res) => {
    const { fechaInicio, fechaFin } = req.body;
    const turnos = req.session.turnos || [];
    
    const filtrados = turnos.filter(t => t.fecha >= fechaInicio && t.fecha <= fechaFin);
    
    const totalCaja = filtrados.reduce((acc, t) => acc + t.totalGeneral, 0);
    const totalExtras = filtrados.reduce((acc, t) => acc + t.totalExtras, 0);

    res.render('index', {
        modo: 'dashboard',
        config: req.session.config,
        turnos: turnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
        reporte: {
            inicio: fechaInicio,
            fin: fechaFin,
            dias: filtrados.length,
            totalCaja,
            totalExtras
        }
    });
});

app.post('/reset-total', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SoftKob Motel System running on port ${PORT}`);
});