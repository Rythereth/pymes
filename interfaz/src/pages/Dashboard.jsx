import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Package, AlertTriangle, Wallet } from 'lucide-react'

const KpiCard = ({ titulo, valor, subtitulo, icono, bgIcono }) => {
  return (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ backgroundColor: bgIcono, padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {icono}
      </div>
      <div>
        <p style={{ margin: '0 0 5px 0', color: '#64748B', fontSize: '14px', fontWeight: 'bold' }}>{titulo}</p>
        <h3 style={{ margin: 0, color: '#024D60', fontSize: '24px' }}>{valor}</h3>
        <p style={{ margin: '5px 0 0 0', color: '#2CACAD', fontSize: '12px', fontWeight: 'bold' }}>{subtitulo}</p>
      </div>
    </div>
  )
}

function Dashboard() {
  const [inventario, setInventario] = useState({ totalProductos: 0, valorEstancado: 0, bajoStock: 0 })
  const [ventasHoy, setVentasHoy] = useState(0)
  const [datosGraficoVentas, setDatosGraficoVentas] = useState([])
  const [datosTopProductos, setDatosTopProductos] = useState([])

  const cargarDatosReales = async () => {
    // 1. INVENTARIO Y ALERTAS (Tabla 'productos')
    const { data: prods, error: errProds } = await supabase.from('productos').select('*').eq('activo', true)
    if (!errProds && prods) {
      let valorTotal = 0
      let alertasStock = 0
      prods.forEach(p => {
        valorTotal += (Number(p.precio_compra) * Number(p.stock_actual))
        if (Number(p.stock_actual) <= Number(p.stock_minimo)) alertasStock++
      })
      setInventario({ totalProductos: prods.length, valorEstancado: valorTotal, bajoStock: alertasStock })
    }

    // 2. VENTAS DE HOY Y FLUJO DE 7 DÍAS (Tabla 'ventas')
    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 6)
    hace7Dias.setHours(0, 0, 0, 0)

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const { data: ventas, error: errVentas } = await supabase
      .from('ventas')
      .select('total_venta, created_at')
      .gte('created_at', hace7Dias.toISOString())

    if (!errVentas && ventas) {
      // Calcular Ventas de Hoy
      const totalHoy = ventas
        .filter(v => new Date(v.created_at) >= hoy)
        .reduce((acc, v) => acc + Number(v.total_venta), 0)
      setVentasHoy(totalHoy)

      // Preparar estructura para gráfico de 7 días (llenando días vacíos con 0)
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const mapaVentas = {}
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        mapaVentas[d.toLocaleDateString()] = { dia: diasSemana[d.getDay()], ventas: 0 }
      }

      // Sumar las ventas reales a los días correspondientes
      ventas.forEach(v => {
        const fechaVenta = new Date(v.created_at).toLocaleDateString()
        if (mapaVentas[fechaVenta]) {
          mapaVentas[fechaVenta].ventas += Number(v.total_venta)
        }
      })

      setDatosGraficoVentas(Object.values(mapaVentas))
    }

    // 3. TOP MÁS VENDIDOS (Tablas 'detalles_venta' y 'productos')
    const { data: detalles, error: errDetalles } = await supabase
      .from('detalles_venta')
      .select('cantidad, productos(nombre)')

    if (!errDetalles && detalles) {
      const conteoProductos = {}
      detalles.forEach(d => {
        const nombreProd = d.productos?.nombre || 'Producto sin nombre'
        if (!conteoProductos[nombreProd]) conteoProductos[nombreProd] = 0
        conteoProductos[nombreProd] += Number(d.cantidad)
      })

      // Convertir a arreglo, ordenar de mayor a menor y tomar los 4 primeros
      const topList = Object.keys(conteoProductos).map(nombre => ({
        nombre,
        cantidad: conteoProductos[nombre]
      }))
      
      topList.sort((a, b) => b.cantidad - a.cantidad)
      setDatosTopProductos(topList.slice(0, 4))
    }
  }

  useEffect(() => {
    cargarDatosReales()
  }, [])

  return (
    <div style={{ padding: '30px', backgroundColor: '#F8F9FA', minHeight: '100%' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#024D60', margin: 0, fontSize: '28px' }}>Visión General</h1>
        <p style={{ color: '#64748B', marginTop: '5px' }}>Métricas de rendimiento conectadas en tiempo real</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <KpiCard 
          titulo="VENTAS DE HOY" 
          valor={`$${ventasHoy.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} 
          subtitulo="Ingresos del día"
          icono={<DollarSign size={28} color="#10B981" />} 
          bgIcono="#D1FAE5" 
        />
        <KpiCard 
          titulo="VALOR DEL INVENTARIO" 
          valor={`$${inventario.valorEstancado.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} 
          subtitulo="Capital a precio de compra"
          icono={<Wallet size={28} color="#1C4EA7" />} 
          bgIcono="#DBEAFE" 
        />
        <KpiCard 
          titulo="CUENTAS POR COBRAR" 
          valor="$0.00" 
          subtitulo="Módulo pendiente"
          icono={<AlertTriangle size={28} color="#F59E0B" />} 
          bgIcono="#FEF3C7" 
        />
        <KpiCard 
          titulo="ALERTAS DE STOCK" 
          valor={inventario.bajoStock} 
          subtitulo="Bajo stock mínimo"
          icono={<Package size={28} color="#E11D48" />} 
          bgIcono="#FEE2E2" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#024D60' }}>Flujo de Efectivo (Últimos 7 días)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            {datosGraficoVentas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosGraficoVentas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} tickFormatter={(value) => `$${value}`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => [`$${value}`, 'Ventas']} />
                  <Line type="monotone" dataKey="ventas" stroke="#2CACAD" strokeWidth={4} dot={{ r: 4, fill: '#2CACAD', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748B' }}>Cargando gráfica...</div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#024D60' }}>Más Vendidos</h3>
          <div style={{ width: '100%', height: '300px' }}>
            {datosTopProductos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosTopProductos} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={120} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => [value, 'Unidades vendidas']} />
                  <Bar dataKey="cantidad" fill="#1C4EA7" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748B' }}>Realiza ventas para ver el top de productos</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard