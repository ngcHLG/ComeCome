// comun.js - Funciones compartidas del panel ComeCome
(function() {
  const SUPABASE_URL = 'https://xjjbrnjgpncxwqishseo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_e68llCL_CYuf2M9TyVcdWA_HdMDYpVF';

  // Inicializar Supabase en una variable con nombre único
  window.comecomeSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Verificar sesión
  async function verificarSesion() {
    const { data: { session } } = await window.comecomeSupabase.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  // Cerrar sesión
  window.cerrarSesion = async function() {
    await window.comecomeSupabase.auth.signOut();
    window.location.href = 'login.html';
  };

  // Ejecutar verificación al cargar la página
  document.addEventListener('DOMContentLoaded', async () => {
    await verificarSesion();
  });
})();