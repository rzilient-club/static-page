/**
 * Rzilient - Smart Code Block Collapse
 * Solo colapsa CÓDIGO PURO, mantiene visibles DIAGRAMAS ASCII
 */

document.addEventListener('DOMContentLoaded', function() {
  
  /**
   * Detecta si un bloque de código es un diagrama ASCII o código puro
   */
  function isAsciiDiagram(codeText) {
    // Caracteres típicos de diagramas ASCII
    const asciiChars = ['┌', '└', '│', '─', '├', '┤', '┬', '┴', '┼', 
                        '╔', '╗', '╚', '╝', '║', '═', '╠', '╣', '╦', '╩', '╬',
                        '▲', '▼', '►', '◄', '→', '←', '↑', '↓', '⇒', '⇐',
                        '░', '▒', '▓', '█', '■', '□', '▪', '▫'];
    
    // Si contiene muchos caracteres ASCII especiales, es diagrama
    let asciiCount = 0;
    for (const char of asciiChars) {
      if (codeText.includes(char)) {
        asciiCount++;
      }
    }
    
    // Si tiene 3+ tipos de caracteres ASCII, probablemente es diagrama
    if (asciiCount >= 3) return true;
    
    // Detectar patrones comunes de diagramas
    const diagramPatterns = [
      /\+[-─]+\+/,           // +-----+
      /\|[\s\w]+\|/,         // | texto |
      /[┌└├]─+[┐┘┤]/,       // ┌────┐
      /^[\s]*│/m,            // Líneas verticales al inicio
      /^[\s]*[▼▲►◄→←]/m,    // Flechas al inicio
      /\[.*?\]\s*→\s*\[/,    // [A] → [B]
      /^[\s]*FASE/mi,        // Diagramas de fases
      /^[\s]*┌/m,            // Box drawing al inicio
      /^[\s]*\+---/m,        // ASCII box estilo simple
    ];
    
    for (const pattern of diagramPatterns) {
      if (pattern.test(codeText)) {
        return true;
      }
    }
    
    // Detectar arquitecturas de pipeline
    if (codeText.includes('↓') && codeText.includes('│')) return true;
    if (codeText.includes('[') && codeText.includes('→')) return true;
    
    return false;
  }
  
  /**
   * Detecta si es código de programación real
   */
  function isProgrammingCode(codeText, language) {
    // Lenguajes de programación conocidos
    const programmingLanguages = [
      'python', 'javascript', 'typescript', 'ruby', 'go', 'java',
      'cpp', 'c', 'rust', 'zig', 'swift', 'kotlin', 'php',
      'bash', 'shell', 'sql', 'html', 'css', 'scss'
    ];
    
    if (programmingLanguages.includes(language.toLowerCase())) {
      return true;
    }
    
    // Patrones de código de programación
    const codePatterns = [
      /^\s*(def|class|function|const|let|var|import|from|export)\s/m,
      /^\s*(public|private|protected|static|async|await)\s/m,
      /^\s*if\s*\(/m,
      /^\s*for\s*\(/m,
      /^\s*while\s*\(/m,
      /=>\s*{/,
      /\(\s*\)\s*{/,
      /^\s*#\s*include/m,
      /^\s*package\s/m,
    ];
    
    for (const pattern of codePatterns) {
      if (pattern.test(codeText)) {
        return true;
      }
    }
    
    return false;
  }
  
  // Encontrar todos los bloques <pre>
  const codeBlocks = document.querySelectorAll('pre');
  let collapsedCount = 0;
  let diagramCount = 0;
  
  codeBlocks.forEach((pre, index) => {
    const code = pre.querySelector('code');
    if (!code) return;
    
    const codeText = code.textContent;
    const lineCount = codeText.split('\n').length;
    
    // Detectar lenguaje
    let language = 'code';
    const classes = code.className.split(' ');
    for (let cls of classes) {
      if (cls.startsWith('language-')) {
        language = cls.replace('language-', '').trim();
        break;
      }
      if (cls.startsWith('sourceCode')) {
        // Pandoc puede agregar lenguaje así
        const match = cls.match(/sourceCode\s+(\w+)/);
        if (match) language = match[1];
        break;
      }
    }
    
    // Decidir si colapsar o no
    const isDiagram = isAsciiDiagram(codeText);
    const isCode = isProgrammingCode(codeText, language);
    
    // REGLA: Solo colapsar si es código puro, NO si es diagrama
    const shouldCollapse = isCode && !isDiagram;
    
    if (isDiagram) {
      diagramCount++;
      // Añadir badge de diagrama pero NO colapsar
      const badge = document.createElement('div');
      badge.className = 'diagram-badge';
      badge.innerHTML = '📊 Diagrama';
      badge.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 10px;
        background: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        z-index: 10;
      `;
      pre.style.position = 'relative';
      pre.appendChild(badge);
      return; // NO colapsar diagramas
    }
    
    if (!shouldCollapse) {
      return; // No colapsar si no es código
    }
    
    collapsedCount++;
    
    // Crear wrapper para código colapsable
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    wrapper.setAttribute('data-collapsed', 'true');
    
    // Crear header
    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <div class="code-info">
        <span class="code-language">${language}</span>
        <span class="code-lines">${lineCount} líneas</span>
      </div>
      <button class="code-toggle" aria-label="Expandir código">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="toggle-text">Mostrar código</span>
      </button>
    `;
    
    // Envolver el pre
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
    
    // Colapsar por defecto
    pre.style.display = 'none';
    
    // Toggle al hacer click
    const toggleBtn = header.querySelector('.code-toggle');
    toggleBtn.addEventListener('click', function() {
      const isCollapsed = wrapper.getAttribute('data-collapsed') === 'true';
      
      if (isCollapsed) {
        // Expandir
        pre.style.display = 'block';
        wrapper.setAttribute('data-collapsed', 'false');
        toggleBtn.querySelector('.toggle-text').textContent = 'Ocultar código';
        toggleBtn.setAttribute('aria-label', 'Colapsar código');
      } else {
        // Colapsar
        pre.style.display = 'none';
        wrapper.setAttribute('data-collapsed', 'true');
        toggleBtn.querySelector('.toggle-text').textContent = 'Mostrar código';
        toggleBtn.setAttribute('aria-label', 'Expandir código');
      }
    });
    
    // Añadir botón de copiar
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M5 2H11C11.5523 2 12 2.44772 12 3V5H14C14.5523 5 15 5.44772 15 6V13C15 13.5523 14.5523 14 14 14H8C7.44772 14 7 13.5523 7 13V11H5C4.44772 11 4 10.5523 4 10V3C4 2.44772 4.44772 2 5 2Z" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      Copiar
    `;
    copyBtn.style.display = 'none';
    pre.appendChild(copyBtn);
    
    // Mostrar botón copiar cuando expandido
    toggleBtn.addEventListener('click', function() {
      const isCollapsed = wrapper.getAttribute('data-collapsed') === 'true';
      copyBtn.style.display = isCollapsed ? 'none' : 'flex';
    });
    
    // Funcionalidad copiar
    copyBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(codeText);
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M13 4L6 11L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ¡Copiado!
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M5 2H11C11.5523 2 12 2.44772 12 3V5H14C14.5523 5 15 5.44772 15 6V13C15 13.5523 14.5523 14 14 14H8C7.44772 14 7 13.5523 7 13V11H5C4.44772 11 4 10.5523 4 10V3C4 2.44772 4.44772 2 5 2Z" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Copiar
          `;
        }, 2000);
      } catch (err) {
        console.error('Error copiando código:', err);
      }
    });
  });
  
  console.log(`✅ Procesamiento completo:`);
  console.log(`   📊 ${diagramCount} diagramas ASCII (visibles)`);
  console.log(`   💻 ${collapsedCount} bloques de código (colapsados)`);
  console.log(`   📄 ${codeBlocks.length} bloques totales`);
});
