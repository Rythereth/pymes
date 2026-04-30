import { useState } from 'react'
import { supabase } from '../supabase'
import { Store, Delete, CheckCircle } from 'lucide-react'

function Login({ onLoginExitoso }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const colors = {
    midnightGreen: '#024D60', lightSeaGreen: '#2CACAD', background: '#F8F9FA', danger: '#E11D48'
  }

  const teclearNumero = (num) => {
    if (pin.length < 6) {
      setPin(prev => prev + num)
      setError('')
    }
  }

  const borrarNumero = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const validarPin = async () => {
    if (pin.length === 0) return
    setCargando(true)
    setError('')

    // Buscamos en tu tabla 'usuarios' el PIN ingresado
    const { data, error: errSupabase } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, rol_id, activo')
      .eq('pin_acceso', pin)
      .eq('activo', true)
      .single()

    if (errSupabase || !data) {
      setError('PIN incorrecto o usuario inactivo')
      setPin('')
      setCargando(false)
      return
    }

    // Si el PIN existe, pasamos los datos del usuario al sistema principal
    onLoginExitoso(data)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: colors.midnightGreen, fontFamily: "'Segoe UI', sans-serif" }}>
      
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <Store size={48} color={colors.lightSeaGreen} style={{ marginBottom: '10px' }} />
        <h1 style={{ color: colors.midnightGreen, margin: '0 0 5px 0', fontSize: '24px' }}>Mi Pyme</h1>
        <p style={{ color: '#64748B', margin: '0 0 20px 0', fontSize: '14px' }}>Ingresa tu PIN de acceso</p>

        {/* Pantalla del PIN */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', height: '50px', alignItems: 'center' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: i < pin.length ? colors.midnightGreen : '#E2E8F0', transition: 'background-color 0.2s' }} />
          ))}
        </div>

        {error && <p style={{ color: colors.danger, fontWeight: 'bold', fontSize: '14px', margin: '0 0 15px 0' }}>{error}</p>}

        {/* Teclado Numérico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', width: '100%', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => teclearNumero(num.toString())} style={styles.tecla}>
              {num}
            </button>
          ))}
          <button onClick={borrarNumero} style={{...styles.tecla, backgroundColor: '#FEF2F2', color: colors.danger, border: 'none'}}>
            <Delete size={24} />
          </button>
          <button onClick={() => teclearNumero('0')} style={styles.tecla}>0</button>
          <button onClick={validarPin} disabled={pin.length === 0 || cargando} style={{...styles.tecla, backgroundColor: pin.length > 0 ? colors.lightSeaGreen : '#E2E8F0', color: 'white', border: 'none'}}>
            <CheckCircle size={24} />
          </button>
        </div>

      </div>
    </div>
  )
}

const styles = {
  tecla: { height: '65px', fontSize: '24px', fontWeight: 'bold', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#024D60', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.1s' }
}

export default Login