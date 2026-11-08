import {
  agregarImagenes, carpetaImagenes, filtrarImagenes, nombreVisible, quitarImagen, rutaImagen,
  absorberPropios, calcularNovedades, claveNota, compararRespaldo, hashTxt, restaurarRespaldo, sinCandado, sinNovedades,
  type Novedades, type Respaldo, candadoNuevo, decidirEscritura, decidirToma, deshacer, foto, historialVacio, parseMD, puedeSoltar, rehacer,
  registrarDeshacer, toMD, VERSION_GESTOR, VERSION_TXT, type Documento, type Foto, type Historial,
} from '@gestor/core';
import type { Almacenamiento, ArchivoAbierto } from '../almacenamiento/tipos';
import { localEnMemoria, type Local } from '../almacenamiento/local';

export interface Interaccion {
  confirmar(mensaje: string): Promise<boolean>;
  avisar(mensaje: string): void;
  /** Pide el nombre de quien edita (null si cancela) */
  pedirUsuario(): Promise<string | null>;
}

export interface EstadoSesion {
  doc: Documento | null;
  nombre: string;
  modo: 'lectura' | 'edicion';
  usuario: string;
  /** El archivo lo guardó una versión más nueva: sólo se puede ver */
  masNuevo: boolean;
  error: string;
  guardado: Date | null;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  novedades: Novedades;
  /** ¿Se puede escribir el archivo abierto? (false en navegadores sin File System Access API) */
  puedeEscribir: boolean;
  /** Cuándo viste por última vez este archivo (base de las novedades) */
  vistoFecha: string;
}

export interface OpcionesSesion {
  almacen: Almacenamiento;
  ui: Interaccion;
  usuario?: string;
  guardarUsuario?: (u: string) => void;
  /** ms entre renovaciones del candado (por defecto 60 s) */
  latidoMs?: number;
  /** Datos locales: lo que has visto y los respaldos */
  local?: Local;
}

const MAX_RESPALDOS = 40, RESPALDO_AUTO = 10 * 60e3, VISITA_MIN = 60e3;

const fmtHora = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Sesión de trabajo sobre un .md: lectura, candado de edición, escritura en cola, bitácora y deshacer.
 * Es un store externo (subscribe/getSnapshot) para usarlo con useSyncExternalStore.
 */
export class Sesion {
  private estado: EstadoSesion;
  private oyentes = new Set<() => void>();
  private previo: Foto = {};
  private historial: Historial = historialVacio();
  private textoCargado = '';
  private cola: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly alm: Almacenamiento;
  private readonly ui: Interaccion;
  private readonly local: Local;
  private visto: Foto | null = null;
  private vistoFecha = '';
  private notasVistas = new Set<string>();
  private inicioVisita = 0;
  private mencionesAvisadas = new Set<string>();
  private ultimoRespaldoT = 0;

  constructor(private op: OpcionesSesion) {
    this.alm = op.almacen; this.ui = op.ui;
    this.estado = { doc: null, nombre: '', modo: 'lectura', usuario: op.usuario ?? '', masNuevo: false, error: '', guardado: null, puedeDeshacer: false, puedeRehacer: false, novedades: sinNovedades(), puedeEscribir: true, vistoFecha: '' };
    this.local = op.local ?? localEnMemoria();
  }

  subscribe = (f: () => void) => { this.oyentes.add(f); return () => { this.oyentes.delete(f); }; };
  getSnapshot = () => this.estado;
  private set(p: Partial<EstadoSesion>) { this.estado = { ...this.estado, ...p }; this.oyentes.forEach(f => f()); }
  private flags() { this.set({ puedeDeshacer: this.historial.pasadas.length > 0, puedeRehacer: this.historial.futuras.length > 0 }); }

  /* ---------- lectura ---------- */

  private aplicar(texto: string, nombre = this.estado.nombre): Documento {
    const doc = parseMD(texto);
    this.textoCargado = texto; this.previo = foto(doc.actividades);
    this.historial = registrarDeshacer(historialVacio(), doc);   // estado base: el primer cambio también se puede deshacer
    this.set({ doc, nombre, masNuevo: (doc.meta.version || 0) > VERSION_GESTOR, error: '' });
    this.flags();
    this.recalcular();
    return doc;
  }

  async abrir() {
    if (!(await this.soltar())) return;
    try {
      const a = await this.alm.abrir();
      if (a) {
        await this.cerrarVisita();
        this.visto = null;
        this.aplicar(a.texto, a.nombre); this.set({ modo: 'lectura', puedeEscribir: this.alm.puedeEscribir() });
        await this.cargarVisto(a.nombre);
        await this.respaldar('Al abrir el archivo', a.texto);
        this.avisarMenciones();
      }
    } catch (e) { this.set({ error: `No se pudo abrir: ${(e as Error).message}` }); }
  }

  async refrescar({ silencioso = false } = {}) {
    let a: ArchivoAbierto | null;
    try { a = await this.alm.releer(); } catch (e) { if (!silencioso) this.set({ error: `No se pudo leer el archivo: ${(e as Error).message}` }); return; }
    if (!a) return;
    const d = parseMD(a.texto);
    if (this.estado.modo === 'edicion') {
      if (d.candado && d.candado.usuario !== this.estado.usuario) this.perderCandado(d, a.texto);
      else if (!silencioso) this.ui.avisar('Tienes el archivo tomado: ya estás viendo la versión más reciente.');
      return;
    }
    if (a.texto !== this.textoCargado) {
      const antes = this.estado.novedades.total;
      this.aplicar(a.texto); void this.respaldar('Cambios de otra persona', a.texto);
      const n = this.estado.novedades.total;
      this.ui.avisar(n > antes ? `Llegaron cambios: ${n} ${n === 1 ? 'novedad' : 'novedades'} desde tu última visita` : 'Archivo actualizado');
      this.avisarMenciones();
    }
    else if (!silencioso) this.ui.avisar('Archivo actualizado');
  }

  /* ---------- candado ---------- */

  private async asegurarUsuario(): Promise<boolean> {
    if (this.estado.usuario) return true;
    const n = (await this.ui.pedirUsuario())?.trim();
    if (!n) return false;
    this.op.guardarUsuario?.(n); this.set({ usuario: n });
    return true;
  }

  async tomar() {
    const { modo, doc } = this.estado;
    if (modo === 'edicion' || !doc) return;
    if (!this.alm.puedeEscribir()) { this.ui.avisar('Este navegador no permite escribir el archivo. Usa Chrome o Edge.'); return; }
    try { if (!(await this.alm.permisoEscritura())) { this.ui.avisar('Se necesita permiso de escritura para editar el archivo.'); return; } }
    catch (e) { this.ui.avisar(`Vuelve a intentarlo. (${(e as Error).message})`); return; }
    if (!(await this.asegurarUsuario())) return;
    const a = await this.alm.releer();
    if (!a) return;
    const d = parseMD(a.texto), decision = decidirToma(d, this.estado.usuario);
    if (decision.tipo === 'masNuevo') { this.aplicar(a.texto); this.ui.avisar(this.avisoVersion(d)); return; }
    if (decision.tipo === 'ocupado') {
      this.aplicar(a.texto);
      this.ui.avisar(`${decision.por} está editando el archivo desde ${fmtHora(decision.desde)}. Espera a que lo suelte.`);
      return;
    }
    if (decision.tipo === 'abandonado' && !(await this.ui.confirmar(
      `${decision.por} tomó el archivo, pero no tiene actividad desde ${fmtHora(decision.latido)}. Puede que haya cerrado sin soltarlo.\n\n¿Tomarlo tú?`))) return;
    await this.respaldar('Antes de editar', a.texto);
    const doc2 = this.aplicar(a.texto);
    this.set({ doc: { ...doc2, candado: candadoNuevo(d.candado, this.estado.usuario) }, modo: 'edicion' });
    await this.escribirAhora(true);
    this.iniciarLatido();
    this.ui.avisar('Archivo tomado. Nadie más puede editarlo hasta que lo sueltes.');
  }

  /**
   * Crea un archivo nuevo con `doc` (un sprint o un proyecto vacío) y pasa a editarlo. Antes suelta el archivo actual.
   * Devuelve false si se canceló o si sólo se pudo descargar (en navegadores sin acceso a archivos).
   */
  async nuevoArchivo(doc: Documento, sugerido: string, respaldoPrevio?: string): Promise<boolean> {
    if (!(await this.asegurarUsuario())) return false;
    if (respaldoPrevio) await this.respaldar(respaldoPrevio);
    if (!(await this.soltar())) return false;
    await this.cerrarVisita();
    const conCandado = { ...doc, candado: candadoNuevo(null, this.estado.usuario) }, texto = toMD(conCandado);
    let nombre: string | null;
    try { nombre = await this.alm.crear(sugerido, texto); } catch (e) { this.set({ error: `No se pudo crear el archivo: ${(e as Error).message}` }); return false; }
    if (!nombre) { this.ui.avisar(this.alm.puedeEscribir() ? 'Creación cancelada' : `Se descargó ${sugerido}. Ábrelo con "Abrir .md" para editarlo.`); return false; }
    await this.local.set(`visto|${nombre}`, null);
    this.visto = null;
    this.aplicar(texto, nombre);
    this.set({ modo: 'edicion', puedeEscribir: true });
    await this.cargarVisto(nombre);
    this.iniciarLatido();
    await this.respaldar('Al crear el archivo');
    return true;
  }

  /** Libera un candado que quedó a tu nombre (p. ej. al recargar la página mientras editabas) */
  async liberar() {
    if (this.estado.modo === 'edicion') return;
    try {
      if (!(await this.alm.permisoEscritura())) return;
      const a = await this.alm.releer();
      if (!a) return;
      const d = parseMD(a.texto);
      if ((d.meta.version || 0) > VERSION_GESTOR) { this.aplicar(a.texto); this.ui.avisar(this.avisoVersion(d)); return; }
      if (d.candado && d.candado.usuario === this.estado.usuario) {
        const doc = { ...d, candado: null };
        await this.escribir(doc); this.aplicar(toMD(doc));
      }
      this.ui.avisar('Archivo liberado');
    } catch (e) { this.set({ error: `No se pudo liberar: ${(e as Error).message}` }); }
  }

  async soltar(): Promise<boolean> {
    if (this.estado.modo !== 'edicion') return true;
    this.detenerLatido();
    this.absorber(false);
    void this.respaldar('Al soltar el archivo');
    this.cola = this.cola.then(async () => {
      const a = await this.alm.releer();
      if (!a) return;
      const d = parseMD(a.texto);
      if (!puedeSoltar(d, this.estado.usuario)) { if ((d.meta.version || 0) > VERSION_GESTOR) this.aplicar(a.texto); return; }
      const doc = { ...this.estado.doc!, candado: null };
      this.set({ doc });
      await this.escribir(doc);
    }).catch(e => this.set({ error: `No se pudo soltar el archivo: ${(e as Error).message}` }));
    await this.cola;
    this.set({ modo: 'lectura', doc: this.estado.doc && { ...this.estado.doc, candado: null } });
    this.historial = historialVacio(); this.flags();
    this.ui.avisar('Archivo liberado');
    return true;
  }

  private avisoVersion(d: Documento) {
    return `Este archivo lo guardó una versión más nueva del gestor (v${d.meta.versionTxt || d.meta.version}) y tú tienes la v${VERSION_TXT}. Puedes ver todo, pero no se permite guardar cambios.`;
  }

  private perderCandado(d: Documento, texto: string) {
    this.detenerLatido();
    this.aplicar(texto);
    this.set({ modo: 'lectura' });
    this.ui.avisar(`${d.candado?.usuario} tomó el archivo. Lo que ya se había guardado se conserva, pero ya no puedes editar hasta que lo suelte.`);
  }
  private perderPorVersion(d: Documento, texto: string) {
    this.detenerLatido(); this.aplicar(texto); this.set({ modo: 'lectura' }); this.ui.avisar(this.avisoVersion(d));
  }

  private iniciarLatido() {
    this.detenerLatido();
    this.timer = setInterval(() => {
      this.guardar();
      if (Date.now() - this.ultimoRespaldoT > RESPALDO_AUTO) void this.respaldar('Automático mientras editabas');
    }, this.op.latidoMs ?? 60e3);
  }
  private detenerLatido() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  /** Libera recursos (timers); no escribe */
  destruir() { this.detenerLatido(); this.oyentes.clear(); }

  /* ---------- edición ---------- */

  /** Cambia el nombre de quien edita */
  async cambiarUsuario(nombre?: string) {
    if (this.estado.modo === 'edicion') { this.ui.avisar('Suelta el archivo antes de cambiar de usuario.'); return; }
    const n = (nombre ?? (await this.ui.pedirUsuario()))?.trim();
    if (!n) return;
    this.op.guardarUsuario?.(n); this.set({ usuario: n }); this.recalcular();
  }

  /** Al iniciar: en escritorio reabre el último archivo y se queda atento a cambios en disco */
  private iniciado = false;
  async iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    if (this.alm.alCambiar) this.alm.alCambiar(() => { if (this.estado.modo === 'lectura') void this.refrescar({ silencioso: true }); });
    if (!this.alm.reabrirUltimo) return;
    try {
      const a = await this.alm.reabrirUltimo();
      if (!a) return;
      this.visto = null; this.aplicar(a.texto, a.nombre); this.set({ modo: 'lectura', puedeEscribir: this.alm.puedeEscribir() });
      await this.cargarVisto(a.nombre); await this.respaldar('Al abrir el archivo', a.texto); this.avisarMenciones();
    } catch { /* sin archivo previo */ }
  }

  /** El almacenamiento (la ventana de imágenes lo usa para mostrar y pedir acceso a la carpeta) */
  get almacen(): Almacenamiento { return this.alm; }

  /**
   * Guarda imágenes en la carpeta junto al .md y las anota en el archivo (sin tomarlo, si nadie más lo edita).
   * Pide acceso a la carpeta la primera vez. Devuelve true si quedó guardada al menos una.
   */
  async agregarImagenes(id: number, archivos: File[]): Promise<boolean> {
    const { validas, grandes } = filtrarImagenes(archivos);
    if (grandes.length) this.ui.avisar(`Se omitieron ${grandes.length} ${grandes.length === 1 ? 'imagen mayor' : 'imágenes mayores'} a 15 MB.`);
    if (!validas.length || !(await this.asegurarUsuario())) return false;
    if (!(await this.alm.imagenesAcceso())) {
      const r = await this.alm.pedirCarpeta();
      if (!r.ok) { if (r.aviso) this.ui.avisar(r.aviso); return false; }
    }
    const carpeta = carpetaImagenes(this.estado.nombre), nuevas: { act: number; fecha: string; autor: string; nombre: string; archivo: string }[] = [];
    try {
      for (const f of validas) {
        const ahora = new Date(), archivo = rutaImagen(carpeta, id, f.type, f.name, ahora, Math.random().toString(36).slice(2, 6));
        await this.alm.guardarImagen(archivo, f);
        nuevas.push({ act: id, fecha: ahora.toISOString(), autor: this.estado.usuario, nombre: nombreVisible(f.name, ahora.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })), archivo });
      }
    } catch (e) { this.ui.avisar('No se pudo guardar la imagen en la carpeta: ' + (e as Error).message); if (!nuevas.length) return false; }
    const ok = await this.editarSinTomar(d => agregarImagenes(d, id, nuevas, this.estado.usuario), 'la imagen');
    if (ok) this.ui.avisar(nuevas.length === 1 ? 'Imagen agregada' : `${nuevas.length} imágenes agregadas`);
    return ok;
  }
  /** Quita la imagen del archivo y borra su archivo de la carpeta */
  async borrarImagen(archivo: string): Promise<boolean> {
    const ok = await this.editarSinTomar(d => quitarImagen(d, archivo, this.estado.usuario), 'el cambio');
    if (ok) { await this.alm.borrarImagen(archivo); this.ui.avisar('Imagen eliminada'); }
    return ok;
  }

  /** Guarda de inmediato (Ctrl+S) */
  guardarAhora() { this.guardar(); }

  /** Muestra un mensaje al usuario (lo usan las vistas) */
  avisar(m: string) { this.ui.avisar(m); }

  /** Aplica un cambio al documento (sólo con el archivo tomado) y lo guarda. */
  editar(fn: (d: Documento) => Documento) {
    const { doc, modo } = this.estado;
    if (modo !== 'edicion' || !doc) return;
    const nuevo = fn(doc);
    if (nuevo === doc) return;
    this.set({ doc: nuevo });
    this.guardar();
  }

  /**
   * Como `editar`, pero sin tener el archivo tomado (las notas se pueden escribir así): lee el archivo,
   * aplica el cambio y escribe en un solo paso, siempre que nadie más lo esté editando.
   */
  async editarSinTomar(fn: (d: Documento) => Documento, que = 'la nota'): Promise<boolean> {
    if (this.estado.modo === 'edicion') { this.editar(fn); return true; }
    if (!this.estado.doc) return false;
    if (!this.alm.puedeEscribir()) { this.ui.avisar('Este navegador no permite escribir el archivo. Usa Chrome o Edge.'); return false; }
    try { if (!(await this.alm.permisoEscritura())) { this.ui.avisar(`Se necesita permiso de escritura para guardar ${que}.`); return false; } }
    catch (e) { this.ui.avisar(`Vuelve a intentarlo. (${(e as Error).message})`); return false; }
    if (!(await this.asegurarUsuario())) return false;
    let ok = false;
    this.cola = this.cola.then(async () => {
      const a = await this.alm.releer();
      if (!a) return;
      const d = parseMD(a.texto), dec = decidirEscritura(d, this.estado.usuario);
      if (dec === 'masNuevo') { this.aplicar(a.texto); this.ui.avisar(this.avisoVersion(d)); return; }
      if (dec === 'perdido') {
        this.aplicar(a.texto);
        this.ui.avisar(`${d.candado?.usuario} acaba de tomar el archivo, así que ${que} no se pudo guardar. Inténtalo cuando lo suelte.`);
        return;
      }
      this.aplicar(a.texto);
      const nuevo = fn(d);
      if (nuevo === d) return;
      this.set({ doc: nuevo });
      this.absorber(false);
      await this.escribir(this.estado.doc!);
      this.set({ guardado: new Date() });
      ok = true;
    }).catch(e => this.set({ error: `No se pudo guardar ${que}: ${(e as Error).message}` }));
    await this.cola;
    return ok;
  }

  deshacer() { this.mover(deshacer, 'Deshecho', 'No hay nada que deshacer'); }
  rehacer() { this.mover(rehacer, 'Rehecho', 'No hay nada que rehacer'); }
  private mover(f: typeof deshacer, ok: string, vacio: string) {
    const { doc, modo } = this.estado;
    if (modo !== 'edicion' || !doc) { this.ui.avisar('Toma el archivo para deshacer cambios'); return; }
    const r = f(this.historial, doc);
    if (!r) { this.ui.avisar(vacio); return; }
    this.historial = r.h; this.set({ doc: r.doc });
    this.guardar(true);
    this.ui.avisar(`${ok}: ${r.d}`);
  }

  /** Bitácora y recurrentes: incorpora lo que acabas de cambiar al documento */
  private absorber(restaurando: boolean) {
    const { doc, usuario } = this.estado;
    if (!doc) return;
    const r = absorberPropios(doc, this.previo, usuario || 'Sin nombre', { restaurando });
    // Tus propios cambios no son novedades: se incorporan a lo "visto"
    if (this.visto) {
      for (const id of Object.keys(r.previo).map(Number)) if (JSON.stringify(r.previo[id]) !== JSON.stringify(this.previo[id])) this.visto[id] = r.previo[id];
      for (const id of Object.keys(this.previo).map(Number)) if (!r.previo[id]) delete this.visto[id];
    }
    this.previo = r.previo;
    this.set({ doc: r.doc });
    this.guardarVisto(); this.recalcular();
    if (r.creadas.length) this.ui.avisar(r.creadas.length === 1 ? `Se repite: se creó #${r.creadas[0].id}` : `Se crearon ${r.creadas.length} actividades recurrentes`);
  }

  private guardar(restaurando = false) {
    if (this.estado.modo !== 'edicion' || !this.estado.doc) return;
    this.historial = registrarDeshacer(this.historial, this.estado.doc);
    this.absorber(restaurando);
    this.historial = registrarDeshacer(this.historial, this.estado.doc!);   // incluye lo creado por recurrencia
    this.flags();
    this.cola = this.cola.then(() => this.escribirAhora()).catch(e => this.set({ error: `No se pudo guardar: ${(e as Error).message}` }));
  }

  private async escribir(doc: Documento) {
    const md = toMD(doc);
    await this.alm.escribir(md);
    this.textoCargado = md;
  }

  private async escribirAhora(sinVerificar = false) {
    if (this.estado.modo !== 'edicion') return;
    if (!sinVerificar) {
      const a = await this.alm.releer();
      if (a) {
        const d = parseMD(a.texto), dec = decidirEscritura(d, this.estado.usuario);
        if (dec === 'masNuevo') return this.perderPorVersion(d, a.texto);
        if (dec === 'perdido') return this.perderCandado(d, a.texto);
      }
    }
    const doc = this.estado.doc!;
    const conLatido = { ...doc, candado: { ...(doc.candado ?? candadoNuevo(null, this.estado.usuario)), latido: new Date().toISOString() } };
    this.set({ doc: conLatido });
    await this.escribir(conLatido);
    this.set({ guardado: new Date() });
  }

  /* ---------- novedades (lo que viste la última vez; sólo en este equipo) ---------- */

  private claveVisto = () => `visto|${this.estado.nombre}`;
  private guardarVisto() {
    if (!this.estado.nombre || !this.visto) return;
    void this.local.set(this.claveVisto(), { fecha: this.vistoFecha, acts: this.visto, notas: [...this.notasVistas] });
  }
  private async cargarVisto(nombre: string) {
    const v = await this.local.get<{ fecha: string; acts: Foto; notas?: string[] }>(`visto|${nombre}`);
    const doc = this.estado.doc;
    if (!doc) return;
    if (v?.acts) {
      this.visto = v.acts; this.vistoFecha = v.fecha;
      this.notasVistas = new Set(v.notas || doc.notas.filter(n => n.fecha <= v.fecha).map(claveNota));
    } else {   // primera vez con este archivo: lo que hay ahora es la base, sin novedades
      this.visto = foto(doc.actividades); this.vistoFecha = new Date().toISOString(); this.notasVistas = new Set(doc.notas.map(claveNota));
      this.guardarVisto();
    }
    this.inicioVisita = Date.now(); this.mencionesAvisadas = new Set();
    this.set({ vistoFecha: this.vistoFecha });
    this.recalcular();
  }
  private recalcular() {
    const { doc, usuario } = this.estado;
    this.set({ novedades: doc ? calcularNovedades(doc, this.visto, this.notasVistas, usuario) : sinNovedades() });
  }
  private avisarMenciones() {
    const nuevas = this.estado.novedades.menciones.filter(n => !this.mencionesAvisadas.has(claveNota(n)));
    if (!nuevas.length) return;
    nuevas.forEach(n => this.mencionesAvisadas.add(claveNota(n)));
    this.ui.avisar(nuevas.length === 1 ? `@ ${nuevas[0].autor} te mencionó en #${nuevas[0].act} · revisa Novedades` : `@ Te mencionaron ${nuevas.length} veces · revisa Novedades`);
  }
  /** Marca como vista una actividad (o todo, sin argumento) */
  marcarVisto(id: number | null = null) {
    const doc = this.estado.doc;
    if (!doc || !this.visto) return;
    const actual = foto(doc.actividades);
    if (id === null) { this.visto = actual; this.vistoFecha = new Date().toISOString(); this.notasVistas = new Set(doc.notas.map(claveNota)); }
    else if (actual[id]) this.visto[id] = actual[id]; else delete this.visto[id];
    this.guardarVisto(); this.set({ vistoFecha: this.vistoFecha }); this.recalcular();
  }
  marcarNotasVistas(notas: { act: number; fecha: string; autor: string }[]) {
    notas.forEach(n => this.notasVistas.add(claveNota(n)));
    this.guardarVisto(); this.recalcular();
  }
  /** Al salir (cerrar, recargar, abrir otro) tras un rato, lo visto se vuelve la nueva base */
  async cerrarVisita() {
    const doc = this.estado.doc;
    if (!doc || !this.visto || Date.now() - this.inicioVisita < VISITA_MIN) return;
    this.visto = foto(doc.actividades); this.vistoFecha = new Date().toISOString(); this.notasVistas = new Set(doc.notas.map(claveNota));
    this.guardarVisto();
  }

  /* ---------- respaldos (sólo en este equipo, por archivo) ---------- */

  async leerRespaldos(): Promise<Respaldo[]> { return (await this.local.get<Respaldo[]>(`respaldos|${this.estado.nombre}`)) ?? []; }

  /** Guarda una copia del archivo (sin candado) si cambió desde la última */
  async respaldar(motivo: string, texto?: string) {
    const { doc, nombre, usuario } = this.estado;
    if (!nombre) return;
    const t = sinCandado(texto ?? (doc ? toMD(doc) : ''));
    if (!t.trim()) return;
    const lista = await this.leerRespaldos(), h = hashTxt(t);
    if (lista.length && lista[0].hash === h) return;
    lista.unshift({ fecha: new Date().toISOString(), motivo, texto: t, hash: h, usuario, n: parseMD(t).actividades.length });
    lista.splice(MAX_RESPALDOS);
    await this.local.set(`respaldos|${nombre}`, lista);
    this.ultimoRespaldoT = Date.now();
  }

  compararRespaldo(r: Respaldo) { return this.estado.doc ? compararRespaldo(this.estado.doc, parseMD(r.texto)) : null; }

  /** Restaura un respaldo: pide confirmación, toma el archivo si hace falta y deja todo anotado en la bitácora */
  async restaurar(r: Respaldo): Promise<boolean> {
    const rd = parseMD(r.texto);
    if ((rd.meta.version || 0) > VERSION_GESTOR) { this.ui.avisar('Este respaldo es de una versión más nueva del gestor.'); return false; }
    const cuando = fmtHora(r.fecha);
    if (!(await this.ui.confirmar(`¿Restaurar el respaldo del ${cuando}?\n\nLas actividades y la meta regresarán a como estaban en ese momento. Las notas y la bitácora actuales se conservan, y antes se guarda un respaldo de la versión actual.`))) return false;
    if (this.estado.modo !== 'edicion') { await this.tomar(); if (this.getSnapshot().modo !== 'edicion') return false; }
    await this.respaldar('Antes de restaurar');
    const doc = restaurarRespaldo(this.estado.doc!, r, rd, this.estado.usuario, cuando);
    this.set({ doc });
    this.guardar(true);
    this.ui.avisar('Respaldo restaurado');
    return true;
  }

  /** Espera a que terminen las escrituras pendientes (útil en pruebas y al cerrar) */
  esperar() { return this.cola; }
}
