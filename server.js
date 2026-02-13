const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

// --- CONFIGURACIÓN ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de Sesión (Memoria temporal)
app.use(session({
    secret: 'softkob-secret-key',
    resave: false,
    saveUninitialized: true
}));

// --- RUTAS ---

app.get('/', (req, res) => {
    // Inicializar base de datos en sesión si no existe
    if (!req.session.turnos) {
        req.session.turnos = [];
    }

    // Ordenar turnos por fecha (del más reciente al más antiguo)
    const turnosOrdenados = req.session.turnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.render('index', { 
        turnos: turnosOrdenados,
        reporte: null // Por defecto no mostramos reporte de sumas
    });
});

app.post('/agregar-turno', (req, res) => {
    const { fecha, ventas, gastos, notas } = req.body;
    
    // Crear objeto turno
    const nuevoTurno = {
        id: Date.now(), // ID único basado en tiempo
        fecha: fecha,
        ventas: parseFloat(ventas) || 0,
        gastos: parseFloat(gastos) || 0,
        ganancia: (parseFloat(ventas) || 0) - (parseFloat(gastos) || 0),
        notas: notas
    };

    if (!req.session.turnos) req.session.turnos = [];
    req.session.turnos.push(nuevoTurno);
    
    res.redirect('/');
});

app.post('/generar-informe', (req, res) => {
    const { fechaInicio, fechaFin } = req.body;
    const turnos = req.session.turnos || [];

    // Filtrar turnos dentro del rango
    const turnosFiltrados = turnos.filter(t => {
        return t.fecha >= fechaInicio && t.fecha <= fechaFin;
    });

    // Calcular sumatorias
    const totalVentas = turnosFiltrados.reduce((acc, t) => acc + t.ventas, 0);
    const totalGastos = turnosFiltrados.reduce((acc, t) => acc + t.gastos, 0);
    const totalGanancia = totalVentas - totalGastos;

    // Renderizar la página PERO inyectando el objeto 'reporte'
    res.render('index', {
        turnos: turnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
        reporte: {
            inicio: fechaInicio,
            fin: fechaFin,
            diasContados: turnosFiltrados.length,
            totalVentas,
            totalGastos,
            totalGanancia
        }
    });
});

app.post('/limpiar', (req, res) => {
    req.session.turnos = [];
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SoftKob System online en puerto ${PORT}`);
});