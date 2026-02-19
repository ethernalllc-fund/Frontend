#!/usr/bin/env bash
# =============================================================================
# fix-lint.sh — Fixes mecánicos para no-floating-promises y no-misused-promises
# Uso: bash fix-lint.sh [directorio]  (default: ./src)
# IMPORTANTE: Corré git commit ANTES de ejecutar este script
# =============================================================================

set -euo pipefail

SRC="${1:-./src}"
DRY_RUN="${DRY_RUN:-0}"   # DRY_RUN=1 bash fix-lint.sh  → solo muestra cambios

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RED="\033[31m"
RESET="\033[0m"

changed=0
skipped=0

log()  { echo -e "${BLUE}[fix-lint]${RESET} $*"; }
ok()   { echo -e "${GREEN}  ✓${RESET} $*"; changed=$((changed+1)); }
warn() { echo -e "${YELLOW}  ⚠${RESET} $*"; skipped=$((skipped+1)); }

# Verificar que estamos en un repo git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}ERROR: No estás en un repositorio git. Abortando por seguridad.${RESET}"
  exit 1
fi

# Verificar que hay archivos TypeScript/TSX
ts_files=$(find "$SRC" -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l)
log "Encontrados ${ts_files} archivos .ts/.tsx en ${SRC}"

if [[ "$DRY_RUN" == "1" ]]; then
  echo -e "${YELLOW}[DRY RUN] Solo mostrando cambios, no escribiendo archivos${RESET}"
fi

# =============================================================================
# FUNCIÓN PRINCIPAL: aplica un sed a un archivo con backup
# =============================================================================
apply_sed() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  if [[ "$DRY_RUN" == "1" ]]; then
    if grep -qP "$pattern" "$file" 2>/dev/null; then
      echo -e "${YELLOW}  [DRY]${RESET} ${file}: ${description}"
    fi
    return
  fi

  if sed -i -E "$pattern" "$file" 2>/dev/null; then
    : # ok
  fi
}

# =============================================================================
# FIX 1: no-floating-promises — navigate() sin void
# Patrón: navigate( ... ) al inicio de línea (con espacios/tabs) sin await/void
# Casos: navigate('/ruta'), navigate('/ruta', { replace: true }), etc.
# =============================================================================
fix_floating_navigate() {
  local file="$1"

  # Solo si el archivo usa navigate
  if ! grep -q "navigate(" "$file" 2>/dev/null; then return; fi

  # Líneas como: "    navigate('/ruta');" → "    void navigate('/ruta');"
  # Excluye: las que ya tienen void, await, return, =, o son declaraciones
  if grep -qP "^\s+(navigate\()" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "1" ]]; then
      warn "navigate() floating en: $file"
      grep -nP "^\s+(navigate\()" "$file" | head -5
      return
    fi
    sed -i -E 's/^(\s+)(navigate\()/\1void \2/g' "$file"

    # No duplicar si ya hay void void
    sed -i -E 's/void void /void /g' "$file"
    ok "navigate() → void navigate() en $file"
  fi
}

# =============================================================================
# FIX 2: no-floating-promises — i18n.changeLanguage() sin void
# =============================================================================
fix_floating_i18n() {
  local file="$1"
  if ! grep -q "changeLanguage(" "$file" 2>/dev/null; then return; fi

  if grep -qP "^\s+i18n\.changeLanguage\(" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "1" ]]; then
      warn "i18n.changeLanguage() floating en: $file"; return
    fi
    sed -i -E 's/^(\s+)(i18n\.changeLanguage\()/\1void \2/g' "$file"
    sed -i -E 's/void void /void /g' "$file"
    ok "i18n.changeLanguage() → void en $file"
  fi
}

# =============================================================================
# FIX 3: no-misused-promises — onClick={asyncFn} o onClick={async () => ...}
# Este es el más delicado — solo tocamos patrones MUY específicos y seguros
# =============================================================================
fix_misused_onclick_simple() {
  local file="$1"
  if ! grep -qE "onClick=\{async " "$file" 2>/dev/null; then return; fi

  # Patrón seguro: onClick={async () => { ... }} de UNA sola línea
  # Lo envuelve en: onClick={() => { void (async () => { ... })(); }}
  # SOLO si es una sola línea simple (sin anidamiento complejo)
  warn "onClick={async ...} detectado en $file — requiere revisión manual (muy complejo para sed)"
  grep -nE "onClick=\{async " "$file" | head -3
}

# =============================================================================
# FIX 4: no-unused-vars — catch (error) sin usar error
# Patrón: } catch (error) { → } catch (_error) {  o  } catch {
# Solo cuando el bloque catch no menciona "error" en su cuerpo
# =============================================================================
fix_unused_catch_var() {
  local file="$1"

  # Patrón seguro: catch (error) donde el bloque solo tiene return/throw sin usar error
  # Solo renombramos a _error si el catch solo tiene un return o está vacío
  if grep -qP "catch \(error\) \{" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "1" ]]; then
      warn "catch (error) posiblemente sin usar en: $file"; return
    fi
    # Solo renombrar si la siguiente línea es return/}/throw (bloque simple)
    # Usamos perl para look-ahead (más seguro que sed multilínea)
    perl -i -0pe 's/catch \(error\) \{\s*\n(\s*)(return|throw|\/\/|console)/catch \(_error\) {\n$1$2/g' "$file" 2>/dev/null || true
    ok "catch (error) → catch (_error) donde aplica en $file"
  fi
}

# =============================================================================
# FIX 5: no-floating-promises — llamadas async sueltas comunes
# fetch(), supabase calls, etc. al inicio de statement
# =============================================================================
fix_floating_fetch() {
  local file="$1"

  # Patrón: "  fetch(" al inicio de línea sin void/await/return/=
  if grep -qP "^\s+fetch\(" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "1" ]]; then
      warn "fetch() floating en: $file"; return
    fi
    sed -i -E 's/^(\s+)(fetch\()/\1void \2/g' "$file"
    sed -i -E 's/void void /void /g' "$file"
    ok "fetch() → void fetch() en $file"
  fi
}

# =============================================================================
# FIX 6: no-unnecessary-type-assertion — as string donde ya es string
# Ejemplos conocidos: (value as string) cuando TS ya infiere string
# Solo patrones seguros y repetidos
# =============================================================================
fix_unnecessary_assertions() {
  local file="$1"

  # Patrón: (someVar as string) donde es redundante
  # Solo tocamos los casos de env vars que vimos: import.meta.env.X as string
  if grep -qE "import\.meta\.env\.\w+ as (string|number|boolean)" "$file" 2>/dev/null; then
    warn "type assertions en import.meta.env en $file — revisar si son necesarias"
  fi
}

# =============================================================================
# FIX 7: tsconfig — archivos no incluidos (postcss.config.ts, vite.config.d.ts)
# =============================================================================
fix_tsconfig() {
  local tsconfig="tsconfig.json"
  if [[ ! -f "$tsconfig" ]]; then
    tsconfig="tsconfig.app.json"
  fi

  if [[ ! -f "$tsconfig" ]]; then
    warn "No se encontró tsconfig.json"
    return
  fi

  log "Verificando tsconfig en $tsconfig..."

  # Verificar si postcss.config.ts y vite.config.d.ts están incluidos
  if ! grep -q "postcss.config" "$tsconfig" 2>/dev/null; then
    warn "postcss.config.ts no está en tsconfig — agregarlo en 'include' o 'allowDefaultProject'"
    echo ""
    echo -e "  ${YELLOW}Fix manual para tsconfig.json:${RESET}"
    echo '  Agregar en "include": ["src", "postcss.config.ts", "vite.config.d.ts"]'
    echo '  O en compilerOptions: { "allowArbitraryExtensions": true }'
    echo ""
  fi
}

# =============================================================================
# MAIN — Iterar sobre todos los archivos TS/TSX
# =============================================================================
log "Iniciando fixes automáticos..."
echo ""

while IFS= read -r -d '' file; do
  fix_floating_navigate "$file"
  fix_floating_i18n "$file"
  fix_misused_onclick_simple "$file"
  fix_unused_catch_var "$file"
  fix_floating_fetch "$file"
  fix_unnecessary_assertions "$file"
done < <(find "$SRC" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0)

echo ""
log "Fixes de configuración..."
fix_tsconfig

echo ""
echo -e "${BOLD}═══════════════════════════════════════${RESET}"
echo -e "${GREEN}  Automáticos aplicados:  $changed${RESET}"
echo -e "${YELLOW}  Requieren revisión manual: $skipped${RESET}"
echo -e "${BOLD}═══════════════════════════════════════${RESET}"
echo ""
echo -e "${BOLD}Patrones que REQUIEREN fix manual (sed no puede manejarlos bien):${RESET}"
echo ""
echo -e "  1. ${YELLOW}onClick/onChange con async inline${RESET}"
echo -e "     Patrón problemático:  onClick={async () => { await fn(); }}"
echo -e "     Fix:                  onClick={() => { void fn(); }}"
echo -e "     (o extraer la función a un handler separado)"
echo ""
echo -e "  2. ${YELLOW}Promise en property de objeto (no-misused-promises)${RESET}"
echo -e "     Problemático:  { onSuccess: async () => { ... } }"
echo -e "     Fix:           { onSuccess: () => { void asyncFn(); } }"
echo ""
echo -e "  3. ${YELLOW}setState en useEffect (set-state-in-effect)${RESET}"
echo -e "     Envolver con startTransition(() => setState(...))"
echo ""
echo -e "  4. ${YELLOW}no-misused-promises en properties de objetos (hooks)${RESET}"
echo -e "     Ej: useWallet.ts:36 — { onConnect: asyncFn }"
echo -e "     Fix: { onConnect: () => { void asyncFn(); } }"
echo ""
echo -e "${BLUE}Próximo paso:${RESET} pnpm lint 2>&1 | grep 'error' | wc -l"
echo -e "${BLUE}             ${RESET} para ver cuántos errores quedan después del script"