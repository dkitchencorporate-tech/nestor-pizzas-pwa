# 📋 DIRECTIVA TÉCNICA DE OPTIMIZACIÓN Y ACCESO (HISTÓRICO)
> ⚠️ **[DOCUMENTO HISTÓRICO / SUPERADO — NO USAR COMO BASE]**  
> Para la guía operativa, reglas vigentes y mapa actualizado del proyecto, consulte exclusivamente:  
> 👉 [DOCUMENTO_MAESTRO_CONSOLIDADO_VIGENTE.md](./DOCUMENTO_MAESTRO_CONSOLIDADO_VIGENTE.md)

**Para:** Agente Antigravity IDE (Instancia Servidor)  
**Servidor:** Hetzner Cloud (`cpx62` / 16 vCPU / 32 GB RAM / Ubuntu 24.04)  
**Fecha Original:** 27 de Agosto de 2026  

---

## ? 1. Desbloqueo Inmediato de Acceso al Escritorio (`/root/Desktop`)
Ejecuta en terminal:
```bash
ln -sf /root/Desktop /root/workspace/nestor-pizzas-pwa/Escritorio
ln -sf /root/.gemini/config/skills /root/workspace/nestor-pizzas-pwa/Skills_Agentes
chmod 755 /root/Desktop /root/Desktop/* 2>/dev/null
```

---

## ?? 2. Desbloqueo de Subagentes de Navegaci?n Web (Chrome MCP / Port 9222)
Ejecuta en terminal:
```bash
# 1. Levantar Chrome con puerto de depuraci?n remota y flag no-sandbox para root:
nohup /opt/google/chrome/chrome   --no-sandbox   --disable-dev-shm-usage   --remote-debugging-port=9222   --disable-gpu   --disable-software-rasterizer   --user-data-dir=/root/.config/google-chrome-mcp   --headless=new   > /tmp/chrome_mcp.log 2>&1 &

# 2. Verificar que responde:
curl -s http://127.0.0.1:9222/json/version
```

---

## ? 3. Alivio de Rendimiento y Procesos en Segundo Plano
Ejecuta en terminal:
```bash
# 1. Purgar procesos zombies/hu?rfanos de Chrome y MCP:
pkill -f "chrome-devtools-mcp" 2>/dev/null
pkill -9 -f "chrome.*--type=renderer" 2>/dev/null

# 2. Desactivar efectos gr?ficos pesados de KWin en KDE:
kwriteconfig5 --file kwinrc --group Compositing --key Enabled false 2>/dev/null
qdbus org.kde.KWin /KWin reconfigure 2>/dev/null

# 3. Vaciar b?feres de memoria:
sync && echo 3 > /proc/sys/vm/drop_caches
```

---

## ?? 4. Tareas Pendientes en N?stor Pizzas PWA
1. **Preloader / Engine:** Traducir texto `"Cargando cat?logo"` vincul?ndolo con `useTranslation()`.
2. **Categor?a Bebidas:** Agrupar en subcategor?as ordenadas (Cervezas -> Cerveza de lata / Cerveza de litro) en lugar de mostrarlas desperdigadas.
3. **Panel Admin:** Resolver bloqueo de acceso en `AdminCatalog.tsx` y validaci?n en `authStore.ts`.
4. **Modales y Checkout:** Completar de forma masiva en `i18nStore.ts` todas las traducciones de tracking, login, register y modales de confirmaci?n.
